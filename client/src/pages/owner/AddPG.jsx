import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Upload, X, ChevronLeft, AlertTriangle, MapPin, ImagePlus, Sparkles, UserCheck, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { uploadFileToCloudinary, uploadMultipleToCloudinary } from '../../utils/cloudinaryUpload';
import { generatePGDescriptionWithAI } from '../../services/aiService';
import { supabase } from '../../lib/supabaseClient';

const AMENITIES = ['WiFi', 'Food', 'AC', 'Parking', 'Laundry', 'CCTV', 'Water', 'Gym'];
const CITIES = ['Gangtok', 'Singtam', 'Namchi', 'Jorethang', 'Gyalshing', 'Mangan', 'Ravangla', 'Pakyong', 'Rangpo'];

export default function AddPG({ editMode = false, existingPG = null }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { addPG, updatePG } = useData();
  const [selectedAmenities, setSelectedAmenities] = useState(existingPG?.amenities || []);
  const [images, setImages] = useState(existingPG?.images || []);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [rulesText, setRulesText] = useState((existingPG?.rules || []).join('\n'));
  const [isLocating, setIsLocating] = useState(false);
  const [isGeneratingAiDesc, setIsGeneratingAiDesc] = useState(false);

  const { register, handleSubmit, setValue, getValues, formState: { errors, isSubmitting } } = useForm({
    defaultValues: existingPG ? {
      title: existingPG.title,
      price: existingPG.price,
      description: existingPG.description,
      city: existingPG.location?.city || existingPG.city || 'Gangtok',
      area: existingPG.location?.area || existingPG.area || '',
      address: existingPG.location?.address || existingPG.address || '',
      roomType: existingPG.roomType,
      genderPreference: existingPG.genderPreference,
      contactNumber: existingPG.contactNumber || currentUser?.phone || '',
    } : {
      contactNumber: currentUser?.phone || '',
      city: 'Gangtok',
    }
  });

  // Automatically detect and populate owner's phone number if not yet set
  useEffect(() => {
    if (currentUser?.phone && !getValues('contactNumber')) {
      setValue('contactNumber', currentUser.phone);
    }
  }, [currentUser, setValue, getValues]);

  const toggleAmenity = (a) => {
    setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const addImage = () => {
    if (newImageUrl.trim() && images.length < 6) {
      setImages(prev => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleGallerySelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remaining = Math.max(0, 6 - images.length);
    const selected = files.slice(0, remaining);

    const toastId = toast.loading('Compressing and uploading images...');
    try {
      // 1. Extract logged-in user's name from Supabase auth session, metadata, or auth context
      let userName =
        currentUser?.user_metadata?.full_name ||
        currentUser?.user_metadata?.name ||
        currentUser?.name ||
        currentUser?.full_name ||
        (currentUser?.email ? currentUser.email.split('@')[0] : '');

      if (!userName || userName.toLowerCase() === 'user' || userName.toLowerCase() === 'owner') {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const authUser = sessionData?.session?.user;
          if (authUser) {
            userName =
              authUser.user_metadata?.full_name ||
              authUser.user_metadata?.name ||
              authUser.email?.split('@')[0] ||
              userName;
          }
        } catch (e) {
          console.warn('Could not fetch Supabase session for room upload name:', e);
        }
      }

      if (!userName) userName = 'owner';

      // 2. Upload each room photo directly passing userName as the 3rd argument
      const uploadedUrls = await Promise.all(
        selected.map((roomFile) =>
          uploadFileToCloudinary(roomFile, 'room', userName, { maxSizeMB: 0.3 })
        )
      );
      setImages(prev => [...prev, ...uploadedUrls]);
      toast.success('Images uploaded successfully', { id: toastId });
      if (files.length > remaining) {
        toast.error('You can upload maximum 6 images');
      }
    } catch (err) {
      toast.error(err.message || 'Could not upload selected images', { id: toastId });
    } finally {
      event.target.value = '';
    }
  };

  const normalizeCityFromAddress = (parts) => {
    const lowerMap = CITIES.reduce((acc, city) => {
      acc[city.toLowerCase()] = city;
      return acc;
    }, {});

    for (const p of parts) {
      const clean = String(p || '').toLowerCase().trim();
      if (lowerMap[clean]) return lowerMap[clean];
    }
    return '';
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
          const response = await fetch(url);
          if (!response.ok) throw new Error('Failed to fetch location');
          const data = await response.json();
          const address = data.address || {};

          const cityCandidates = [
            address.city,
            address.town,
            address.village,
            address.county,
            address.state_district,
            address.state,
          ].filter(Boolean);

          const city = normalizeCityFromAddress(cityCandidates);
          const area = address.suburb || address.neighbourhood || address.city_district || address.county || '';
          const fullAddress = data.display_name || '';

          if (city) setValue('city', city, { shouldValidate: true });
          setValue('area', area, { shouldValidate: true });
          setValue('address', fullAddress, { shouldValidate: true });
          toast.success('Location filled from your current position');
        } catch {
          toast.error('Could not auto-fill location. Please enter manually.');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        toast.error('Location permission denied or unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleGenerateAiDescription = async () => {
    const values = getValues();
    if (!values.title?.trim() && !values.city) {
      toast('Please fill Title, Rent, Location, and Amenities first so AI can craft an accurate description', { icon: 'ℹ️' });
    }
    setIsGeneratingAiDesc(true);
    try {
      const parsedRules = rulesText
        ? rulesText.split('\n').map((r) => r.trim()).filter(Boolean)
        : [];

      const generated = await generatePGDescriptionWithAI({
        title: values.title || '',
        area: values.area || '',
        city: values.city || 'Sikkim',
        address: values.address || '',
        roomType: values.roomType || '',
        genderPreference: values.genderPreference || '',
        price: values.price || '',
        amenities: selectedAmenities,
        rules: parsedRules,
      });

      setValue('description', generated, { shouldValidate: true });
      toast.success('Description generated with AI!');
    } catch (err) {
      console.error('AI description error:', err);
      toast.error('Could not generate description');
    } finally {
      setIsGeneratingAiDesc(false);
    }
  };

  const onSubmit = async (data) => {
    const phoneToSave = data.contactNumber?.trim() || currentUser?.phone || '';
    const pgData = {
      title: data.title,
      description: data.description,
      price: Number(data.price),
      location: { city: data.city, area: data.area, address: data.address },
      roomType: data.roomType,
      genderPreference: data.genderPreference,
      amenities: selectedAmenities,
      rules: rulesText.split('\n').map(r => r.trim()).filter(Boolean),
      images,
      kyc_doc_url: existingPG?.kycDocUrl || existingPG?.kyc_doc_url || currentUser?.kyc_doc_url || null,
      contactNumber: phoneToSave,
      ownerName: currentUser?.name || 'Property Owner',
    };

    // If profile phone was missing, sync it to Supabase profile
    if (currentUser?.id && phoneToSave && !currentUser?.phone) {
      supabase.from('profiles').update({ phone: phoneToSave }).eq('id', currentUser.id).then(() => {}).catch(() => {});
    }

    try {
      if (editMode && existingPG) {
        await updatePG(existingPG.id, pgData);
      } else {
        await addPG(pgData, currentUser.id);
      }
      navigate('/owner');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button onClick={() => navigate('/owner')} className="flex items-center gap-2 text-slate-500 hover:text-primary-600 mb-6 text-sm transition-colors">
          <ChevronLeft size={16} /> Back to My PGs
        </button>

        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-slate-900">{editMode ? 'Edit PG Listing' : 'Add New PG'}</h1>
          {editMode && (
            <div className="flex items-center gap-2 mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <Sparkles size={15} className="text-emerald-600 shrink-0" />
              <p className="text-emerald-700 text-sm">Your updates will be published immediately to your live listing.</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Section 1: Basic Info */}
          <FormSection title="Basic Information" step="01">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">PG Title *</label>
              <input {...register('title', { required: 'Title is required', minLength: { value: 10, message: 'At least 10 characters' } })}
                className="input-field" placeholder="e.g., Sunrise PG for Boys near MG Road" />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Monthly Rent (₹) *</label>
              <input type="number" {...register('price', { required: 'Price is required', min: { value: 1000, message: 'Minimum ₹1,000' } })}
                className="input-field" placeholder="5000" />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
            </div>
          </FormSection>

          {/* Section 2: Location */}
          <FormSection title="Location" step="02">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-primary-200 bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 disabled:opacity-60"
              >
                <MapPin size={14} />
                {isLocating ? 'Detecting...' : 'Use Current Location'}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">City *</label>
              <select {...register('city', { required: 'City is required' })} className="input-field">
                <option value="">Select city</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Area / Locality *</label>
              <input {...register('area', { required: 'Area is required' })} className="input-field" placeholder="e.g., MG Road, Tadong" />
              {errors.area && <p className="text-red-500 text-xs mt-1">{errors.area.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Address *</label>
              <textarea rows={2} {...register('address', { required: 'Address is required' })} className="input-field resize-none" placeholder="Street address, landmark" />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
            </div>
          </FormSection>

          {/* Section 3: Details */}
          <FormSection title="Property Details" step="03">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Room Type *</label>
              <div className="flex gap-3 flex-wrap">
                {['Single', 'Double', 'Triple'].map(rt => (
                  <label key={rt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={rt} {...register('roomType', { required: 'Select a room type' })} className="text-primary-600" />
                    <span className="text-sm text-slate-700">{rt}</span>
                  </label>
                ))}
              </div>
              {errors.roomType && <p className="text-red-500 text-xs mt-1">{errors.roomType.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Gender Preference *</label>
              <div className="flex gap-3 flex-wrap">
                {['Boys', 'Girls', 'Co-ed'].map(g => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={g} {...register('genderPreference', { required: 'Select gender preference' })} className="text-primary-600" />
                    <span className="text-sm text-slate-700">{g}</span>
                  </label>
                ))}
              </div>
              {errors.genderPreference && <p className="text-red-500 text-xs mt-1">{errors.genderPreference.message}</p>}
            </div>
          </FormSection>

          {/* Section 4: Amenities */}
          <FormSection title="Amenities" step="04">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {AMENITIES.map(a => (
                <label key={a} className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedAmenities.includes(a) ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}>
                  <input type="checkbox" checked={selectedAmenities.includes(a)} onChange={() => toggleAmenity(a)} className="sr-only" />
                  <span className="text-sm font-medium">{a}</span>
                </label>
              ))}
            </div>
          </FormSection>

          {/* Section 5: Images */}
          <FormSection title="Property Images" step="05">
            <p className="text-sm text-slate-500 mb-3">Add image URLs (up to 6 images). Use Unsplash or other image URLs.</p>
            <div className="flex gap-2 mb-4">
              <input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImage())}
                className="input-field text-sm flex-1" placeholder="https://images.unsplash.com/..." />
              <button type="button" onClick={addImage} disabled={images.length >= 6} className="btn-primary text-sm px-4 disabled:opacity-50">
                Add
              </button>
            </div>
            <div className="mb-4">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer text-sm font-medium">
                <ImagePlus size={14} /> Select from Gallery
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleGallerySelect}
                />
              </label>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 group">
                    <img src={img} alt="" className="w-full h-full object-cover" onError={e => e.target.src = 'https://placehold.co/300x200?text=Invalid+URL'} />
                    <button type="button" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          {/* Section 6: PG Rules */}
          <FormSection title="PG Rules" step="06">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Rules (optional)</label>
              <textarea
                rows={5}
                value={rulesText}
                onChange={(e) => setRulesText(e.target.value)}
                className="input-field resize-none"
                placeholder={"Add one rule per line\nExample:\nNo loud music after 10 PM\nNo outside guests after 9 PM"}
              />
              <p className="text-xs text-slate-500 mt-1">Each line will be shown as a separate rule on PG details page.</p>
            </div>
          </FormSection>

          {/* Section 7: Host & Contact Details */}
          <FormSection title="Host & Contact Details" step="07">
            {/* Auto-detected Host Card */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3.5">
              {currentUser?.avatar_url || currentUser?.avatar ? (
                <img
                  src={currentUser.avatar_url || currentUser.avatar}
                  alt={currentUser?.name || "Host"}
                  className="w-11 h-11 rounded-full object-cover border border-amber-400/50 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#0f2547] text-[#f5a623] flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  {(currentUser?.name || 'O').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {currentUser?.name || 'Property Owner'}
                  </p>
                  <span className="inline-flex items-center gap-1 bg-emerald-100/90 text-emerald-800 text-[10.5px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    <UserCheck size={11} className="text-emerald-700" /> Auto-Detected Host
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {currentUser?.email || 'Logged in account'} • Listing will be linked with your real owner profile
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Contact Phone Number *
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  {...register('contactNumber', {
                    required: 'Contact number is required',
                    pattern: { value: /^[+]?[6-9]\d{9}$/, message: 'Enter valid Indian phone number' }
                  })}
                  className="input-field pl-10"
                  placeholder="+919876543210"
                />
              </div>
              {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber.message}</p>}
              <p className="text-xs text-slate-500 mt-1">
                Auto-detected from your account. Students and prospective tenants will call and WhatsApp this number.
              </p>
            </div>
          </FormSection>

          {/* Section 8: AI-Powered Description (Placed Last) */}
          <FormSection title="Property Description" step="08" last>
            {/* AI Generator Action Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 via-primary-50 to-purple-50 border border-primary-200/90 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-primary-600 shrink-0" />
                    <h4 className="text-sm font-bold text-slate-900">AI Description Generator</h4>
                    <span className="text-[10px] font-bold bg-[#0f2547] text-white px-2 py-0.5 rounded-full">Gemini AI</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Now that you&apos;ve filled all the information above (Title, Rent, Location, Room Type, Amenities, Rules, and Contact), click <strong>Generate with AI</strong> to synthesize everything into a captivating, professional description.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAiDescription}
                  disabled={isGeneratingAiDesc}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0f2547] to-primary-700 hover:from-primary-900 hover:to-primary-800 text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 shrink-0 cursor-pointer"
                >
                  <Sparkles size={15} className={isGeneratingAiDesc ? "animate-spin text-amber-300" : "text-amber-300"} />
                  {isGeneratingAiDesc ? "Crafting with Gemini..." : "✨ Generate with AI"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Full Description *
              </label>
              <textarea
                rows={5}
                {...register('description', {
                  required: 'Description is required',
                  minLength: { value: 50, message: 'At least 50 characters' }
                })}
                className="input-field resize-y font-normal"
                placeholder="Click '✨ Generate with AI' above to let Gemini craft an engaging description from your property details, or type your own!"
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
              <p className="text-xs text-slate-500 mt-1">
                Tip: The AI description only generates when you click the button above. You can freely edit or tweak the generated text before listing.
              </p>
            </div>
          </FormSection>

          <div className="flex gap-4">
            <button type="button" onClick={() => navigate('/owner')} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 py-3 disabled:opacity-60">
              {isSubmitting ? 'Submitting...' : editMode ? 'Update PG' : 'List PG'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormSection({ title, step, children, last = false }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-7 h-7 bg-primary-600 text-white text-xs font-bold rounded-lg flex items-center justify-center">{step}</span>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
