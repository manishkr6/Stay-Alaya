import { GoogleGenAI } from '@google/genai';

// Retrieve active Gemini API key from Vite environment, localStorage, or process.env
export const getGeminiApiKey = () => {
  let storageKey = '';
  try {
    if (typeof localStorage !== 'undefined') {
      storageKey = localStorage.getItem('gemini_api_key') || '';
    }
  } catch {}

  let envKey = '';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
      envKey = import.meta.env.VITE_GEMINI_API_KEY;
    }
  } catch {}

  let procKey = '';
  try {
    if (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) {
      procKey = process.env.VITE_GEMINI_API_KEY;
    }
  } catch {}

  return (storageKey || envKey || procKey || '').trim();
};

export const setGeminiApiKey = (key) => {
  try {
    if (typeof localStorage !== 'undefined') {
      if (key && key.trim()) {
        localStorage.setItem('gemini_api_key', key.trim());
      } else {
        localStorage.removeItem('gemini_api_key');
      }
    }
  } catch {}
};

export const hasGeminiApiKey = () => Boolean(getGeminiApiKey());

const getAiClient = () => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// Available Gemini models with automatic resilience fallback
const PRIMARY_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];

async function callGeminiWithFallback(ai, params) {
  let lastError = null;
  for (const model of PRIMARY_MODELS) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err) {
      lastError = err;
      console.warn(`Gemini model ${model} temporarily unavailable, trying fallback:`, err?.status || err?.message);
    }
  }
  throw lastError;
}

/**
 * 1. AI Chat Assistant for Finding PGs in Sikkim
 */
export async function chatWithAlayaAI(userMessage, conversationHistory = [], availablePgs = []) {
  const apiKey = getGeminiApiKey();

  // Compress listings context to essential fields for token efficiency
  const pgsContext = availablePgs.slice(0, 25).map((p) => ({
    id: p.id,
    title: p.title,
    area: p.location?.area || '',
    city: p.location?.city || '',
    price: p.price,
    roomType: p.roomType,
    genderPreference: p.genderPreference,
    amenities: p.amenities || [],
    isVerified: p.isVerified,
    rating: p.rating || 4.5,
  }));

  if (apiKey) {
    try {
      const ai = getAiClient();
      const systemInstruction = `You are "Alaya AI", the friendly, knowledgeable, expert PG discovery assistant for "Stay Alaya" in Sikkim, India.
Your mission is to help college students (e.g. SMIT Majitar, Sikkim University, SRM Sikkim, SMIMS Tadong) and working professionals find their ideal paying guest accommodations in Sikkim (Gangtok, Tadong, Majitar, Deorali, Namchi, Singtam, etc.).

Here are the real, available PG listings currently on Stay Alaya:
${JSON.stringify(pgsContext, null, 2)}

Instructions:
1. Be helpful, concise, warm, and knowledgeable about Sikkim localities and college commutes.
2. If the user is looking for a PG, recommend 1 to 3 best-matching listings from the provided data based on their budget, location, gender preference, and amenities.
3. At the very end of your response, ALWAYS include a JSON block listing the IDs of any PGs you recommended, formatted strictly like this:
RECOMMENDED_PG_IDS: ["id1", "id2"]
If none match well or if it's general conversation, output: RECOMMENDED_PG_IDS: []
4. Keep responses readable, using bullet points for key features (e.g. food included, proximity to campus, geyser for cold Sikkim winters).`;

      // Build turn history for Gemini
      const contents = [
        ...conversationHistory.map((m) => `${m.role === 'user' ? 'User' : 'Alaya AI'}: ${m.text}`),
        `User: ${userMessage}`,
      ].join('\n\n');

      const response = await callGeminiWithFallback(ai, {
        contents,
        config: {
          systemInstruction,
        },
      });

      const rawText = response.text || '';

      // Extract recommended PG IDs
      let recommendedIds = [];
      const idMatch = rawText.match(/RECOMMENDED_PG_IDS:\s*(\[[^\]]*\])/);
      if (idMatch) {
        try {
          recommendedIds = JSON.parse(idMatch[1]);
        } catch {}
      }

      // Clean out the internal RECOMMENDED_PG_IDS block from user-facing text
      const cleanText = rawText.replace(/RECOMMENDED_PG_IDS:\s*\[[^\]]*\]/g, '').trim();

      return {
        text: cleanText,
        recommendedIds: Array.isArray(recommendedIds) ? recommendedIds.map(String) : [],
        isAiPowered: true,
      };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to smart matcher:', err);
    }
  }

  // Graceful Local Smart Matcher Fallback if no Gemini key or on network failure
  return smartLocalPgMatcher(userMessage, availablePgs);
}

/**
 * Fallback Local Heuristic Search when Gemini API Key is not yet configured
 */
function smartLocalPgMatcher(query, availablePgs = []) {
  const q = query.toLowerCase();

  // Keyword extraction
  const wantsGirls = q.includes('girl') || q.includes('female') || q.includes('women');
  const wantsBoys = q.includes('boy') || q.includes('male') || q.includes('men');
  const wantsSingle = q.includes('single') || q.includes('1 room') || q.includes('private');
  const wantsDouble = q.includes('double') || q.includes('2 sharing') || q.includes('sharing');
  const wantsWifi = q.includes('wifi') || q.includes('wi-fi') || q.includes('internet');
  const wantsFood = q.includes('food') || q.includes('meal') || q.includes('mess') || q.includes('dinner');
  const wantsGeyser = q.includes('geyser') || q.includes('hot water');

  // Budget detection (e.g. "under 6000", "below 7k", "6000")
  let maxBudget = Infinity;
  const budgetMatch = q.match(/(?:under|below|less than|budget of|max)\s*₹?\s*(\d+)(?:k)?/i) || q.match(/(\d+)k/i);
  if (budgetMatch) {
    let num = parseInt(budgetMatch[1], 10);
    if (q.includes(`${num}k`)) num *= 1000;
    if (num > 0 && num < 100000) maxBudget = num;
  }

  // Score listings
  const scored = availablePgs.map((pg) => {
    let score = 0;
    const pgText = `${pg.title} ${pg.location?.area || ''} ${pg.location?.city || ''} ${pg.description || ''}`.toLowerCase();

    // Location matching
    ['majitar', 'tadong', 'gangtok', 'deorali', 'namchi', 'smit', 'ranipool', 'singtam'].forEach((loc) => {
      if (q.includes(loc) && pgText.includes(loc)) score += 5;
    });

    // Gender
    if (wantsGirls && pg.genderPreference === 'Girls') score += 4;
    if (wantsBoys && pg.genderPreference === 'Boys') score += 4;

    // Room type
    if (wantsSingle && pg.roomType === 'Single') score += 3;
    if (wantsDouble && pg.roomType === 'Double') score += 3;

    // Amenities
    const amenities = (pg.amenities || []).map((a) => a.toLowerCase());
    if (wantsWifi && amenities.some((a) => a.includes('wifi'))) score += 2;
    if (wantsFood && amenities.some((a) => a.includes('food') || a.includes('meal'))) score += 2;
    if (wantsGeyser && amenities.some((a) => a.includes('geyser') || a.includes('hot'))) score += 2;

    // Budget
    if (pg.price <= maxBudget) score += 3;

    return { pg, score };
  });

  const matches = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.pg);

  if (matches.length > 0) {
    const names = matches.map((m) => `**${m.title}** in ${m.location?.area || 'Sikkim'} (₹${m.price.toLocaleString('en-IN')}/mo)`).join('\n- ');
    return {
      text: `Based on your preferences, here are the top matching PGs found for you in Sikkim:\n\n- ${names}\n\nAll verified properties include reliable power, water, and student-friendly amenities. Check the listings below!`,
      recommendedIds: matches.map((m) => String(m.id)),
      isAiPowered: false,
    };
  }

  return {
    text: "I searched all active listings in Sikkim! Could you please share a bit more detail, like your preferred area (e.g. Majitar, Tadong, Gangtok) or your monthly budget?",
    recommendedIds: availablePgs.slice(0, 2).map((m) => String(m.id)),
    isAiPowered: false,
  };
}

/**
 * 2. Natural Language Search Parser for Find PG Page
 */
export async function parseSearchQueryWithAI(userQuery) {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const ai = getAiClient();
      const prompt = `Extract structured PG search filters from this user search query: "${userQuery}".

Important Sikkim Campus & Landmark Mappings:
- "SMIT", "Manipal", "Sikkim Manipal", "Majitar Campus" -> Map to location: "Majitar"
- "SMIMS", "Manipal Medical", "CRH Hospital", "Tadong" -> Map to location: "Tadong"
- "Sikkim University", "SU", "5th Mile", "6th Mile" -> Map to location: "5th Mile"
- "Ropeway", "Deorali", "Deorali Taxi Stand" -> Map to location: "Deorali"
- "MG Marg", "Mall Road", "Central Gangtok", "Gangtok" -> Map to location: "MG Marg" or "Gangtok"
- "Namchi", "Singtam", "Rangpo", "Ravangla", "Jorethang" -> Map to their respective town.

Allowed location values: "Gangtok", "Tadong", "Majitar", "Deorali", "5th Mile", "MG Marg", "Singtam", "Namchi", "Rangpo", "Jorethang", "Ravangla" or null if no location or landmark is mentioned.
Available room types: "Single", "Double", "Triple", null
Available genders: "Boys", "Girls", "Co-ed", null
Available amenities: "WiFi", "Food", "AC", "Parking", "Laundry", "CCTV", "Water", "Gym"

Respond ONLY with valid JSON in this exact structure:
{
  "location": string or null,
  "maxPrice": number or null,
  "roomType": "Single" | "Double" | "Triple" | null,
  "genderPreference": "Boys" | "Girls" | "Co-ed" | null,
  "amenities": string[]
}`;

      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text);
      return {
        ...parsed,
        isAi: true,
      };
    } catch (err) {
      console.warn('AI search query parsing failed, using fallback:', err);
    }
  }

  // Fallback regex parser
  const q = userQuery.toLowerCase();
  let maxPrice = null;
  const priceMatch = q.match(/(?:under|below|max|budget)\s*₹?\s*([\d,]+)(?:k)?/i) || q.match(/(\d+)k/i);
  if (priceMatch) {
    const cleanStr = priceMatch[1].replace(/,/g, '');
    let num = parseInt(cleanStr, 10);
    if (!isNaN(num)) {
      if (q.includes(`${num}k`)) num *= 1000;
      maxPrice = num;
    }
  }

  let location = null;
  const localities = [
    { key: '5th mile', val: '5th Mile' },
    { key: '6th mile', val: '5th Mile' },
    { key: 'sikkim university', val: '5th Mile' },
    { key: 'su', val: '5th Mile' },
    { key: 'mg marg', val: 'MG Marg' },
    { key: 'mall road', val: 'MG Marg' },
    { key: 'smit', val: 'Majitar' },
    { key: 'manipal', val: 'Majitar' },
    { key: 'majitar', val: 'Majitar' },
    { key: 'smims', val: 'Tadong' },
    { key: 'crh', val: 'Tadong' },
    { key: 'tadong', val: 'Tadong' },
    { key: 'ropeway', val: 'Deorali' },
    { key: 'deorali', val: 'Deorali' },
    { key: 'gangtok', val: 'Gangtok' },
    { key: 'namchi', val: 'Namchi' },
    { key: 'ranipool', val: 'Ranipool' },
    { key: 'singtam', val: 'Singtam' },
    { key: 'rangpo', val: 'Rangpo' },
    { key: 'jorethang', val: 'Jorethang' },
    { key: 'ravangla', val: 'Ravangla' },
  ];
  for (const item of localities) {
    if (q.includes(item.key)) {
      location = item.val;
      break;
    }
  }

  let genderPreference = null;
  if (q.includes('girl') || q.includes('female')) genderPreference = 'Girls';
  else if (q.includes('boy') || q.includes('male')) genderPreference = 'Boys';
  else if (q.includes('co-ed') || q.includes('unisex')) genderPreference = 'Co-ed';

  let roomType = null;
  if (q.includes('single')) roomType = 'Single';
  else if (q.includes('double')) roomType = 'Double';
  else if (q.includes('triple')) roomType = 'Triple';

  const amenities = [];
  if (q.includes('wifi') || q.includes('wi-fi')) amenities.push('WiFi');
  if (q.includes('food') || q.includes('meal')) amenities.push('Food');
  if (q.includes('geyser') || q.includes('hot water')) amenities.push('Water');
  if (q.includes('laundry')) amenities.push('Laundry');
  if (q.includes('ac') || q.includes('air condition')) amenities.push('AC');
  if (q.includes('parking')) amenities.push('Parking');
  if (q.includes('gym')) amenities.push('Gym');
  if (q.includes('cctv')) amenities.push('CCTV');

  return {
    location,
    maxPrice,
    roomType,
    genderPreference,
    amenities,
    isAi: false,
  };
}

/**
 * 3. AI Listing Description Generator for PG Owners (Add / Edit PG)
 */
export async function generatePGDescriptionWithAI({
  title,
  area,
  city,
  address,
  roomType,
  genderPreference,
  price,
  amenities = [],
  rules = [],
}) {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const ai = getAiClient();
      const prompt = `Write an attractive, welcoming, professional 2-paragraph listing description for a paying guest (PG) accommodation in Sikkim, India.

Details:
- PG Title: ${title || 'Comfortable PG'}
- Location: ${address ? `${address}, ` : ''}${area || ''}, ${city || 'Sikkim'}
- Room Type: ${roomType || 'Sharing'}
- Allowed For: ${genderPreference || 'Students / Working Professionals'}
- Monthly Rent: ₹${price || ''}
- Key Amenities: ${amenities.join(', ') || 'Essential facilities'}
${rules && rules.length > 0 ? `- House Guidelines: ${rules.join(', ')}` : ''}

Guidelines:
- Highlight local Sikkim connectivity, proximity to colleges/markets, peace and study environment.
- Mention winter-friendly essentials like hot water/geyser, hygienic meals, and security.
- Keep tone warm, inviting, trustworthy. Do not include markdown headers or hashtags. Just 2 clean paragraphs.`;

      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
      });

      return response.text.trim();
    } catch (err) {
      console.warn('AI description generation failed, using fallback:', err);
    }
  }

  // High-quality local fallback description
  const amenStr = amenities.length ? `fully equipped with ${amenities.slice(0, 4).join(', ')}` : 'equipped with all essential amenities';
  return `Welcome to ${title || 'our premier PG'} located in the peaceful neighborhood of ${area || 'Sikkim'}, ${city || ''}. Designed specifically for ${genderPreference ? genderPreference.toLowerCase() : 'students and professionals'}, this ${roomType ? roomType.toLowerCase() : 'spacious'} room offers a comfortable, clean, and secure living environment with regular water supply and power backup.

Conveniently connected to local transit, nearby colleges, and daily necessities, our property is ${amenStr}. Experience homelike hospitality and focused study surroundings with 24/7 security and a warm, supportive atmosphere.`;
}

/**
 * 4. AI Insights & Highlights for PG Details Page
 */
export async function generatePGInsightsWithAI(pg) {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const ai = getAiClient();
      const prompt = `Analyze this Sikkim PG listing and generate a structured JSON insight for students and tenants looking to rent:
Title: ${pg.title}
Location: ${pg.location?.area || ''}, ${pg.location?.city || 'Sikkim'}
Price: ₹${pg.price}/mo
Room Type: ${pg.roomType}
Gender: ${pg.genderPreference}
Amenities: ${(pg.amenities || []).join(', ')}
Description: ${pg.description || ''}

Respond ONLY with valid JSON in this exact structure:
{
  "bestFor": "1-sentence summary of the ideal tenant (e.g. Perfect for SMIT Majitar students who prioritize quiet study and included meals)",
  "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
  "sikkimTip": "1 practical tip about living in this locality in Sikkim (weather, commute, or campus proximity)"
}`;

      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      return JSON.parse(response.text);
    } catch (err) {
      console.warn('AI insights generation failed, using fallback:', err);
    }
  }

  // High-quality local heuristic insight
  const isBudget = pg.price <= 7000;
  const hasFood = (pg.amenities || []).some((a) => a.toLowerCase().includes('food') || a.toLowerCase().includes('meal'));

  return {
    bestFor: `Ideal for ${pg.genderPreference || 'students'} looking for a ${pg.roomType?.toLowerCase() || 'comfortable'} accommodation in ${pg.location?.area || 'Sikkim'} with good daily convenience.`,
    highlights: [
      isBudget ? `Affordable monthly rent of ₹${pg.price.toLocaleString('en-IN')}` : `Premium ${pg.roomType} room setup with spacious layout`,
      hasFood ? 'Hygienic meals included with room accommodation' : 'Flexible dining options with nearby local cafes & eateries',
      'Verified property with essential student amenities and security',
    ],
    sikkimTip: `Located in ${pg.location?.area || 'Sikkim'}, offering convenient share-taxi access and peaceful mountain surroundings.`,
  };
}
