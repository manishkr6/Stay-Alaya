import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Upload, X, ChevronLeft, AlertTriangle, MapPin, ImagePlus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { uploadMultipleToCloudinary } from '../../utils/cloudinaryUpload';
import { generatePGDescriptionWithAI } from '../../services/aiService';

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
      city: existingPG.location.city,
      area: existingPG.location.area,
      address: existingPG.location.address,
      roomType: existingPG.roomType,
      genderPreference: existingPG.genderPreference,
      contactNumber: existingPG.contactNumber,
    } : {}
  });

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
      const uploadedUrls = await uploadMultipleToCloudinary(selected, 'sikkim_pg_rooms', 0.3);
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
      toast('Add a title or location to help the AI tailor your description', { icon: 'ℹ️' });
    }
    setIsGeneratingAiDesc(true);
    try {
      const generated = await generatePGDescriptionWithAI({
        title: values.title || '',
        area: values.area || '',
        city: values.city || 'Sikkim',
        roomType: values.roomType || '',
        genderPreference: values.genderPreference || '',
        price: values.price || '',
        amenities: selectedAmenities,
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
      contactNumber: data.contactNumber,
    };

    try {
      if (editMode && existingPG) {
        await updatePG(existingPG.id, pgData);
        toast.success('PG updated! Awaiting admin re-approval.');
      } else {
        await addPG(pgData, currentUser.id);
        toast.success('PG listed successfully!');
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
            <div className="flex items-center gap-2 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle size={15} className="text-amber-600 shrink-0" />
              <p className="text-amber-700 text-sm">Editing will require admin re-approval before going live.</p>
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
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Description *</label>
                <button
                  type="button"
                  onClick={handleGenerateAiDescription}
                  disabled={isGeneratingAiDesc}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-gradient-to-r from-primary-50 to-purple-50 text-primary-700 border border-primary-200 hover:from-primary-100 hover:to-purple-100 transition-all disabled:opacity-60 shadow-xs"
                >
                  <Sparkles size={12} className={isGeneratingAiDesc ? "animate-spin text-primary-600" : "text-amber-500"} />
                  {isGeneratingAiDesc ? "Writing with AI..." : "✨ Generate with AI"}
                </button>
              </div>
              <textarea rows={4} {...register('description', { required: 'Description is required', minLength: { value: 50, message: 'At least 50 characters' } })}
                className="input-field resize-none" placeholder="Describe your PG in detail — or click 'Generate with AI' to let Gemini craft one!" />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
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

          {/* Section 6: Contact */}
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

          {/* Section 7: Contact */}
          <FormSection title="Contact Details" step="07" last>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number *</label>
              <input {...register('contactNumber', {
                required: 'Contact number is required',
                pattern: { value: /^[+]?[6-9]\d{9}$/, message: 'Enter valid Indian phone number' }
              })} className="input-field" placeholder="+919876543210" />
              {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber.message}</p>}
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
