import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  Send,
  MapPin,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Square,
  ArrowRight,
  Radio,
  ExternalLink,
  Phone,
  MessageCircle,
  HelpCircle,
  Play,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { chatWithAalayaAI } from '../../services/aiService';

// Format inline markdown (e.g. **bold**)
function formatInline(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldContent = part.slice(2, -2);
      return (
        <strong key={index} className="font-extrabold text-amber-300">
          {boldContent}
        </strong>
      );
    }
    return part;
  });
}

// Render structured markdown messages with clean typography
function FormattedVoiceMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];
  let isNumbered = false;

  const flushList = () => {
    if (currentList.length > 0) {
      if (isNumbered) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-2 space-y-1.5 pl-1">
            {currentList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed text-slate-200">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black bg-amber-400 text-[#0f2547] shrink-0 mt-0.5 shadow-sm">
                  {idx + 1}
                </span>
                <span className="flex-1">{formatInline(item)}</span>
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 pl-1">
            {currentList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed text-slate-200">
                <span className="inline-block w-2 h-2 rounded-full mt-1.5 shrink-0 bg-amber-400 shadow-xs shadow-amber-400/50" />
                <span className="flex-1">{formatInline(item)}</span>
              </li>
            ))}
          </ul>
        );
      }
      currentList = [];
      isNumbered = false;
    }
  };

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const bulletMatch = trimmed.match(/^[\*\-•]\s+(.*)$/);
    const numberMatch = trimmed.match(/^\d+[\.\)]\s+(.*)$/);

    if (bulletMatch) {
      if (isNumbered) flushList();
      isNumbered = false;
      currentList.push(bulletMatch[1]);
    } else if (numberMatch) {
      if (!isNumbered && currentList.length > 0) flushList();
      isNumbered = true;
      currentList.push(numberMatch[1]);
    } else {
      flushList();
      elements.push(
        <p key={`p-${lineIndex}`} className="mb-2 last:mb-0 leading-relaxed text-slate-200 text-xs sm:text-sm">
          {formatInline(trimmed)}
        </p>
      );
    }
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
}

// Generate natural, concise conversational spoken summary for voice synthesizer
function generateSpokenSummary(text, matchedPgs = []) {
  if (!text) return 'Here are the details for your request.';

  const clean = text
    .replace(/RECOMMENDED_PG_IDS:\s*\[[^\]]*\]/g, '')
    .replace(/[*_#`~>]/g, '')
    .trim();

  // If specific PG listings were recommended:
  if (matchedPgs && matchedPgs.length > 0) {
    const minPrice = Math.min(...matchedPgs.map((p) => Number(p.price) || 5000));
    const formattedPrice = minPrice.toLocaleString('en-IN');
    const locations = Array.from(
      new Set(matchedPgs.map((p) => p.location?.area || p.location?.city || 'Sikkim'))
    )
      .slice(0, 2)
      .join(' and ');

    return `Namaste! I found ${matchedPgs.length} matching verified PGs in ${locations} starting from ₹${formattedPrice} per month. Check the details on your screen!`;
  }

  // If general knowledge inquiry (e.g. verification process, deposit, college proximity)
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length > 0) {
    let summary = sentences.slice(0, 2).join(' ');
    if (summary.length > 220) {
      summary = summary.slice(0, 215) + '...';
    }
    return summary;
  }

  return clean.slice(0, 200);
}

export default function AalayaVoiceAssistant({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { pgs = [], getApprovedPGs } = useData();

  // Combine live approved PGs
  const livePgs = useMemo(() => {
    if (pgs && pgs.length > 0) return pgs;
    if (getApprovedPGs) return getApprovedPGs();
    return [];
  }, [pgs, getApprovedPGs]);

  // Bot states: 'idle' | 'listening' | 'thinking' | 'speaking'
  const [botState, setBotState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [permissionError, setPermissionError] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const transcriptBufferRef = useRef('');
  const mainScrollRef = useRef(null);
  const isComponentMounted = useRef(true);

  // Quick voice query suggestions grounded in Sikkim
  const VOICE_SUGGESTIONS = [
    { label: 'ICFAI University', query: 'Verified PGs near ICFAI University with food and wifi under 7000', icon: '🎓' },
    { label: 'SMIT Majitar', query: 'Boys PG near SMIT Majitar campus under 8000', icon: '🏔️' },
    { label: 'Tadong Girls PG', query: 'Girls PG in Tadong near SMIMS hospital with winter geyser', icon: '🌸' },
    { label: 'Gangtok Single Room', query: 'Single room in Gangtok for working professionals', icon: '🛏️' },
    { label: 'Verification Process', query: 'How does Stay Aalaya verify PG properties in Sikkim?', icon: '🛡️' },
  ];

  // Auto-scroll to top of response when new response arrives so Item 1 is fully visible
  useEffect(() => {
    if (response && mainScrollRef.current) {
      setTimeout(() => {
        mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  }, [response]);

  // Check browser SpeechRecognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
    }
  }, []);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Clean speech synthesis & recognition on unmount or close
  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      stopListening();
      stopSpeaking();
    };
  }, []);

  // Trigger initial listening when assistant opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        startListening();
      }, 350);
      return () => clearTimeout(timer);
    } else {
      stopListening();
      stopSpeaking();
      setBotState('idle');
      setTranscript('');
      setInterimTranscript('');
      setPermissionError(null);
    }
  }, [isOpen]);

  // 1. Text-to-Speech (TTS) Engine with Chromium Resiliency
  const speakText = (fullText, matchedPgs = []) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    stopSpeaking();

    if (isMuted) {
      setBotState('idle');
      return;
    }

    // Generate concise, conversational spoken summary
    const spokenMessage = generateSpokenSummary(fullText, matchedPgs);
    if (!spokenMessage) {
      setBotState('idle');
      return;
    }

    try {
      // Chromium bug fix: resume speech synthesis if paused/suspended
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(spokenMessage);
      window.__alayaVoiceUtterance = utterance; // Prevent garbage collection bug in Chromium

      // Select natural sounding voice (prefer Indian English or natural English)
      const voices = window.speechSynthesis.getVoices() || [];
      const indianVoice = voices.find(
        (v) =>
          v.lang === 'en-IN' ||
          v.lang.toLowerCase().includes('in') ||
          v.name.toLowerCase().includes('india') ||
          v.lang.startsWith('hi')
      );
      const englishVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
      if (indianVoice || englishVoice) {
        utterance.voice = indianVoice || englishVoice;
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      utterance.onstart = () => {
        if (isComponentMounted.current) {
          setBotState('speaking');
        }
      };

      utterance.onend = () => {
        if (isComponentMounted.current) {
          setBotState('idle');
        }
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        if (isComponentMounted.current) {
          setBotState('idle');
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis failed:', err);
      setBotState('idle');
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    window.__alayaVoiceUtterance = null;
  };

  // 2. Speech-to-Text (STT) Engine
  const startListening = () => {
    stopSpeaking();
    setPermissionError(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      setBotState('idle');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English handles English, Hindi and Hinglish
      recognition.maxAlternatives = 1;

      transcriptBufferRef.current = '';
      setTranscript('');
      setInterimTranscript('');
      setBotState('listening');

      recognition.onstart = () => {
        if (isComponentMounted.current) {
          setBotState('listening');
        }
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        const combinedCurrent = (transcriptBufferRef.current + ' ' + final + ' ' + interim).trim();
        setTranscript(combinedCurrent);
        setInterimTranscript(interim);

        if (final) {
          transcriptBufferRef.current = (transcriptBufferRef.current + ' ' + final).trim();
        }

        // Silence detection: when user stops speaking for 1.3 seconds, automatically submit and reply!
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        const fullSpoken = (transcriptBufferRef.current + ' ' + interim).trim();
        if (fullSpoken.length >= 2) {
          silenceTimerRef.current = setTimeout(() => {
            handleUserFinishedSpeaking(fullSpoken);
          }, 1300);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'network') {
          // Brave browser blocks Google speech servers by default
          setPermissionError(
            "Brave browser blocks Google voice services by default. Enable 'Use Google services for voice recognition' in brave://settings/privacy, or tap any suggestion below!"
          );
          setBotState('idle');
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setPermissionError('Microphone permission was denied. Please allow microphone in your browser settings.');
          setBotState('idle');
        } else if (event.error === 'no-speech') {
          // Keep listening or idle
        }
      };

      recognition.onend = () => {
        // If ended while listening and we have captured text, submit it
        const pending = (transcriptBufferRef.current || transcript).trim();
        if (botState === 'listening' && pending) {
          handleUserFinishedSpeaking(pending);
        }
      };

      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setBotState('idle');
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  };

  // 3. Process User Voice Query with Real Data & Gemini AI
  const handleUserFinishedSpeaking = async (queryText) => {
    stopListening();

    const cleanQuery = (queryText || transcript || transcriptBufferRef.current || '').trim();
    if (!cleanQuery) {
      setBotState('idle');
      toast("I didn't hear anything. Tap Speak or choose a question below!", { icon: '🎙️' });
      return;
    }

    setLastQuery(cleanQuery);
    setTranscript(cleanQuery);
    setInterimTranscript('');
    setBotState('thinking');

    try {
      // Call real AI with real live PG listings from database
      const history = conversationHistory.slice(-4);
      const aiResult = await chatWithAalayaAI(cleanQuery, history, livePgs);

      // Match real PG objects from database
      const matchedPgs = (livePgs || []).filter((p) =>
        aiResult.recommendedIds?.map(String).includes(String(p.id))
      );

      const parsedResponse = {
        text: aiResult.text,
        recommendedIds: aiResult.recommendedIds || [],
        matchedPgs,
        isAiPowered: aiResult.isAiPowered,
      };

      setResponse(parsedResponse);

      // Update conversation history
      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', text: cleanQuery },
        { role: 'assistant', text: aiResult.text },
      ]);

      // Speak reply out loud automatically!
      speakText(aiResult.text, matchedPgs);
    } catch (err) {
      console.error('AI Voice Assistant query error:', err);
      const fallbackMsg = "I ran into a temporary issue finding stays. Here are our verified Sikkim listings below!";
      const fallbackMatches = livePgs.slice(0, 2);
      setResponse({
        text: fallbackMsg,
        recommendedIds: fallbackMatches.map((p) => String(p.id)),
        matchedPgs: fallbackMatches,
        isAiPowered: false,
      });
      speakText(fallbackMsg, fallbackMatches);
    }
  };

  // Manual trigger if user clicks "Stop Listening" or "Done Speaking"
  const handleManualDoneSpeaking = () => {
    const textToProcess = (transcript || transcriptBufferRef.current || interimTranscript).trim();
    if (textToProcess) {
      handleUserFinishedSpeaking(textToProcess);
    } else {
      stopListening();
      setBotState('idle');
      toast("I didn't catch your voice. Tap Speak again or choose a suggestion below!", { icon: '🎙️' });
    }
  };

  // Handle typed query submission
  const handleManualInputSubmit = (e) => {
    e?.preventDefault();
    if (!manualInput.trim()) return;
    const q = manualInput.trim();
    setManualInput('');
    handleUserFinishedSpeaking(q);
  };

  // Handle clicking a suggested prompt chip
  const handlePromptSelect = (promptQuery) => {
    setTranscript(promptQuery);
    handleUserFinishedSpeaking(promptQuery);
  };

  // Toggle voice mute
  const toggleMute = () => {
    if (!isMuted) {
      stopSpeaking();
      setIsMuted(true);
      toast.success('Bot voice muted', { icon: '🔇' });
    } else {
      setIsMuted(false);
      toast.success('Bot voice unmuted', { icon: '🔊' });
      if (response?.text) {
        speakText(response.text, response.matchedPgs);
      }
    }
  };

  // Close and clean up
  const handleClose = () => {
    stopListening();
    stopSpeaking();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-between items-center bg-[#050b18]/90 backdrop-blur-2xl text-white overflow-hidden p-3 sm:p-5 select-none transition-all duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Stay Aalaya AI Voice Assistant"
    >
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-0 right-1/4 w-80 sm:w-96 h-80 sm:h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-1/4 w-80 sm:w-96 h-80 sm:h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ========================================================
          TOP HEADER BAR
          ======================================================== */}
      <header className="w-full max-w-3xl flex items-center justify-between pb-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 border border-amber-400/50 p-1 flex items-center justify-center shadow-lg backdrop-blur-md shrink-0">
            <img
              src="/chatbot-logo.png?v=3"
              alt="Stay Aalaya AI"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = '/logo1.png';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                <span>Stay Aalaya AI Voice</span>
              </h2>

              {/* Status Pill Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  botState === 'listening'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 animate-pulse'
                    : botState === 'thinking'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                    : botState === 'speaking'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                    : 'bg-slate-700/40 text-slate-300 border-white/10'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    botState === 'listening'
                      ? 'bg-emerald-400 animate-ping'
                      : botState === 'thinking'
                      ? 'bg-indigo-400 animate-spin'
                      : botState === 'speaking'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-400'
                  }`}
                />
                <span>
                  {botState === 'listening' && 'Listening...'}
                  {botState === 'thinking' && 'Thinking...'}
                  {botState === 'speaking' && 'Speaking...'}
                  {botState === 'idle' && 'Ready'}
                </span>
              </div>
            </div>

            <p className="text-[10px] sm:text-xs text-slate-400 font-medium hidden sm:block">
              Sikkim Real-Time Voice Discovery • English • हिंदी • Hinglish
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mute / Unmute Button */}
          <button
            type="button"
            onClick={toggleMute}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 border-rose-400/40 text-rose-300 hover:bg-rose-500/30'
                : 'bg-white/10 border-white/15 text-slate-200 hover:bg-white/15 hover:text-white'
            }`}
            title={isMuted ? 'Unmute voice output' : 'Mute voice output'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shadow-md active:scale-95"
            title="Close Assistant (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ========================================================
          MAIN CONTENT AREA (FULL SCROLLING SUPPORT FOR ANSWERS & CARDS)
          ======================================================== */}
      <main
        ref={mainScrollRef}
        className={`w-full max-w-3xl flex-1 flex flex-col items-center my-2 sm:my-3 overflow-y-auto pr-1 sm:pr-2 scroll-smooth ${
          response ? 'justify-start' : 'justify-center'
        }`}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#f5a623 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* COMPACT STATUS BAR WHEN RESPONSE IS PRESENT (Preempts content clipping) */}
        {response ? (
          <div className="w-full flex items-center justify-between p-2.5 px-3.5 sm:px-4 mb-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-md shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div
                onClick={() => {
                  if (botState === 'speaking') {
                    stopSpeaking();
                    setBotState('idle');
                  } else {
                    startListening();
                  }
                }}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full p-1 bg-white border border-amber-400/60 shadow-md shrink-0 cursor-pointer transition-transform hover:scale-105 ${
                  botState === 'speaking' ? 'animate-neon-glow' : ''
                }`}
              >
                <img
                  src="/chatbot-logo.png?v=3"
                  alt="Alaya Bot"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/logo1.png';
                  }}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-xs sm:text-sm text-white truncate">Stay Alaya Bot</h4>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0 ${
                      botState === 'speaking'
                        ? 'bg-amber-400/20 text-amber-300 animate-pulse border border-amber-400/40'
                        : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                    }`}
                  >
                    {botState === 'speaking' ? 'Speaking...' : 'Ready'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate mt-0.5">
                  {lastQuery ? `"${lastQuery}"` : 'Sikkim PG Finder'}
                </p>
              </div>
            </div>

            {/* Speaking / Audio Replay Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {botState === 'speaking' ? (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="px-2.5 sm:px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Square size={11} className="fill-current" />
                  <span>Stop Voice</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => speakText(response.text, response.matchedPgs)}
                  className="px-2.5 sm:px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                  title="Replay Spoken Summary"
                >
                  <Volume2 size={13} className="text-amber-400" />
                  <span className="hidden sm:inline">Replay</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* LARGE ANIMATED MASCOT ORB (Displayed before first answer) */
          <div className="relative flex flex-col items-center justify-center py-2 sm:py-6">
            {/* Ripple Wave Rings (Active when LISTENING) */}
            {botState === 'listening' && (
              <>
                <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full border border-emerald-400/50 bg-emerald-500/10 animate-voice-ripple-1 pointer-events-none" />
                <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full border border-cyan-400/40 bg-cyan-500/10 animate-voice-ripple-2 pointer-events-none" />
                <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full border border-amber-400/30 bg-amber-500/10 animate-voice-ripple-3 pointer-events-none" />
              </>
            )}

            {/* Orbital Dual Spinning Rings (Active when THINKING) */}
            {botState === 'thinking' && (
              <>
                <div className="absolute w-40 h-40 sm:w-52 sm:h-52 rounded-full border-2 border-t-amber-400 border-r-transparent border-b-indigo-400 border-l-transparent animate-orbit pointer-events-none" />
                <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border-2 border-t-transparent border-r-cyan-400 border-b-transparent border-l-emerald-400 animate-orbit-reverse pointer-events-none" />
              </>
            )}

            {/* Golden Sound Equalizer Aura (Active when SPEAKING) */}
            {botState === 'speaking' && (
              <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-amber-300/20 animate-neon-glow pointer-events-none" />
            )}

            {/* Central Bot Mascot Sphere */}
            <div
              onClick={() => {
                if (botState === 'listening') {
                  handleManualDoneSpeaking();
                } else if (botState === 'speaking') {
                  stopSpeaking();
                  setBotState('idle');
                } else {
                  startListening();
                }
              }}
              className={`relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-full p-2.5 sm:p-3 flex items-center justify-center shadow-2xl transition-all duration-500 cursor-pointer group ${
                botState === 'listening'
                  ? 'bg-gradient-to-br from-emerald-500/30 via-slate-900 to-cyan-500/30 ring-4 ring-emerald-400/80 shadow-emerald-500/40 animate-neon-glow-cyan'
                  : botState === 'thinking'
                  ? 'bg-gradient-to-br from-indigo-600/40 via-slate-900 to-amber-500/30 ring-4 ring-indigo-400/80 shadow-indigo-500/40 scale-105'
                  : botState === 'speaking'
                  ? 'bg-gradient-to-br from-amber-500/40 via-slate-900 to-orange-500/40 ring-4 ring-amber-400/80 shadow-amber-500/50 animate-neon-glow'
                  : 'bg-white/10 hover:bg-white/15 ring-2 ring-white/20 hover:ring-amber-400/60 shadow-black/40 hover:scale-105'
              }`}
            >
              {/* White Circular Inner Frame with Logo */}
              <div className="w-full h-full rounded-full bg-white p-2 sm:p-3 flex items-center justify-center overflow-hidden shadow-inner relative">
                <img
                  src="/chatbot-logo.png?v=3"
                  alt="Stay Alaya AI Bot"
                  className={`w-full h-full object-contain transition-transform duration-300 ${
                    botState === 'listening'
                      ? 'scale-105'
                      : botState === 'speaking'
                      ? 'scale-110 animate-pulse'
                      : 'group-hover:scale-105'
                  }`}
                  onError={(e) => {
                    e.currentTarget.src = '/logo1.png';
                  }}
                />

                {/* Bot State Mini Overlay Badge */}
                <div className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 p-1 rounded-full bg-[#0f2547] text-amber-400 shadow-md border border-amber-400/60">
                  {botState === 'listening' ? (
                    <Mic size={12} className="text-emerald-400 animate-pulse" />
                  ) : botState === 'thinking' ? (
                    <Sparkles size={12} className="text-indigo-400 animate-spin" />
                  ) : botState === 'speaking' ? (
                    <Volume2 size={12} className="text-amber-400 animate-pulse" />
                  ) : (
                    <Radio size={12} className="text-slate-300" />
                  )}
                </div>
              </div>
            </div>

            {/* Sound Equalizer Animated Bars */}
            {(botState === 'listening' || botState === 'speaking') && (
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 mt-3 sm:mt-4 h-10 sm:h-12">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                  const isCenter = i === 3;
                  const isNearCenter = i === 2 || i === 4;
                  const color =
                    botState === 'listening'
                      ? 'bg-gradient-to-t from-emerald-400 to-cyan-300'
                      : 'bg-gradient-to-t from-amber-400 to-orange-300';

                  return (
                    <span
                      key={i}
                      className={`w-1.5 sm:w-2 rounded-full transition-all duration-150 ${color}`}
                      style={{
                        animation: isCenter
                          ? 'voice-bar-bounce-alt 0.8s ease-in-out infinite'
                          : isNearCenter
                          ? 'voice-bar-bounce 0.9s ease-in-out infinite 0.15s'
                          : 'voice-bar-bounce-short 0.75s ease-in-out infinite 0.3s',
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Bot State Action Caption */}
            <div className="text-center mt-2.5 sm:mt-3 space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center justify-center gap-1.5">
                {botState === 'listening' && (
                  <>
                    <span className="text-emerald-400 font-extrabold">Stay Alaya AI is Listening...</span>
                    <span className="text-xs text-slate-300 font-normal hidden sm:inline">(speak naturally)</span>
                  </>
                )}
                {botState === 'thinking' && (
                  <>
                    <Sparkles size={15} className="text-amber-400 animate-spin" />
                    <span className="text-amber-300 font-extrabold">Alaya Bot is thinking & matching Sikkim stays...</span>
                  </>
                )}
                {botState === 'speaking' && (
                  <>
                    <Volume2 size={16} className="text-amber-400 animate-pulse" />
                    <span className="text-amber-300 font-extrabold">Alaya Bot is Speaking</span>
                  </>
                )}
                {botState === 'idle' && (
                  <span className="text-slate-300 font-semibold">
                    Tap the microphone or say what PG you need
                  </span>
                )}
              </h3>

              {/* Permission or compatibility warnings */}
              {permissionError && (
                <p className="text-xs text-rose-300 font-medium bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/30 max-w-lg mx-auto leading-relaxed">
                  {permissionError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Live User Spoken Words (Transcript Bubble) */}
        {(transcript || interimTranscript) && botState === 'listening' && (
          <div className="w-full max-w-xl mx-auto my-2 px-3 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center shadow-lg shrink-0 animate-fade-in">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
              You are saying:
            </p>
            <p className="text-sm sm:text-base font-semibold text-emerald-300 italic">
              "{transcript || interimTranscript}"
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleManualDoneSpeaking}
                className="px-3.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1 cursor-pointer"
              >
                <span>Done Speaking</span>
                <CheckCircle2 size={12} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            INFORMATION DISPLAY (SHOWN BASED ON USER QUESTION ONLY)
            ======================================================== */}
        {response && (
          <div className="w-full space-y-3.5 pb-4 animate-fade-in">
            {/* Spoken Answer Bubble (Full View with Top Fully Visible & Scrollable) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-amber-400/40 text-white shadow-2xl relative">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 text-xs">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Sparkles size={14} className="text-[#f5a623]" />
                  <span>Stay Alaya Bot Answer:</span>
                </div>
                {botState === 'speaking' ? (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="text-[11px] text-amber-300 hover:text-white flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <Square size={10} className="fill-current" />
                    <span>Stop Voice</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => speakText(response.text, response.matchedPgs)}
                    className="text-[11px] text-slate-300 hover:text-amber-300 flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <Volume2 size={11} className="text-amber-400" />
                    <span>Replay Voice</span>
                  </button>
                )}
              </div>

              {/* Formatted Markdown Content */}
              <div className="leading-relaxed">
                <FormattedVoiceMessage text={response.text} />
              </div>
            </div>

            {/* ONLY SHOW REAL PG CARDS IF USER QUESTION WAS ABOUT PGS / MATCHED LISTINGS */}
            {response.matchedPgs && response.matchedPgs.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-400" />
                    <span>Matching Verified Sikkim PGs ({response.matchedPgs.length}):</span>
                  </h4>
                  <span className="text-[11px] text-amber-300 font-medium">Real Live Data</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {response.matchedPgs.map((pg) => {
                    const priceFormatted = Number(pg.price).toLocaleString('en-IN');
                    const coverImage =
                      pg.images?.[0] ||
                      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80';
                    const locality = pg.location?.area || pg.location?.city || pg.locality || 'Sikkim';

                    return (
                      <div
                        key={pg.id}
                        className="bg-slate-900/90 rounded-2xl border border-white/15 hover:border-amber-400/70 p-3 shadow-xl backdrop-blur-md transition-all group flex flex-col justify-between"
                      >
                        <div className="flex gap-3">
                          {/* Image */}
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-800 shrink-0 relative">
                            <img
                              src={coverImage}
                              alt={pg.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {pg.isVerified && (
                              <div className="absolute top-1 left-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-xs">
                                <CheckCircle2 size={11} />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                {pg.genderPreference || 'Co-ed'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                • {pg.roomType || 'Sharing'}
                              </span>
                            </div>

                            <h5 className="font-bold text-white text-xs sm:text-sm truncate mt-1 group-hover:text-amber-300 transition-colors">
                              {pg.title}
                            </h5>

                            <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate mt-0.5">
                              <MapPin size={11} className="text-amber-400 shrink-0" />
                              <span>{locality}</span>
                            </p>

                            <div className="mt-1.5">
                              <span className="text-sm font-black text-amber-400">
                                ₹{priceFormatted}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">/month</span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                          {pg.contactNumber ? (
                            <a
                              href={`tel:${pg.contactNumber}`}
                              className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 font-semibold"
                            >
                              <Phone size={11} className="text-emerald-400" />
                              <span>Call</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-500">Verified Host</span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              handleClose();
                              navigate(`/pg/${pg.id}`);
                            }}
                            className="text-[11px] font-bold text-[#0f2547] bg-[#f5a623] hover:bg-amber-400 active:scale-95 px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>View Details</span>
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================
          BOTTOM CONTROLS & VOICE PROMPT SUGGESTIONS
          ======================================================== */}
      <footer className="w-full max-w-3xl space-y-2.5 shrink-0 pt-2 border-t border-white/10">
        {/* Suggested Prompt Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
            <Sparkles size={11} className="text-amber-400" /> Try:
          </span>
          {VOICE_SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePromptSelect(s.query)}
              className="shrink-0 text-[11px] bg-white/10 hover:bg-white/20 text-slate-200 hover:text-amber-300 px-2.5 py-1 rounded-full border border-white/15 hover:border-amber-400/50 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Primary Voice Mic Action & Keyboard Input Bar */}
        <div className="flex items-center gap-2">
          {/* Main Microphone Button */}
          <button
            type="button"
            onClick={() => {
              if (botState === 'listening') {
                handleManualDoneSpeaking();
              } else if (botState === 'speaking') {
                stopSpeaking();
                setBotState('idle');
              } else {
                startListening();
              }
            }}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer shrink-0 active:scale-95 ${
              botState === 'listening'
                ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                : botState === 'speaking'
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-[#0f2547]'
            }`}
          >
            {botState === 'listening' ? (
              <>
                <Square size={16} className="fill-current" />
                <span>Stop Listening</span>
              </>
            ) : botState === 'speaking' ? (
              <>
                <Square size={16} className="fill-current" />
                <span>Stop Speaking</span>
              </>
            ) : (
              <>
                <Mic size={16} />
                <span>Speak Again</span>
              </>
            )}
          </button>

          {/* Fallback Text Input (for noisy rooms or manual questions) */}
          <form
            onSubmit={handleManualInputSubmit}
            className="flex-1 flex items-center gap-1.5 bg-white/10 rounded-2xl p-1 border border-white/15 focus-within:border-amber-400 transition-all"
          >
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Or type here: 'Boys PG in Majitar under 7000'..."
              className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-white placeholder:text-slate-400 outline-none border-0 ring-0"
            />
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="p-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#0f2547] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
              title="Send query"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
