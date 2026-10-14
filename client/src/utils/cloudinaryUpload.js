import imageCompression from 'browser-image-compression';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Compresses an image file to WebP format with size limits.
 * @param {File} file - Image file to compress
 * @param {number} maxSizeMB - Maximum file size in MB
 * @returns {Promise<File|Blob>}
 */
export async function compressImage(file, maxSizeMB = 0.3) {
  if (!file.type.startsWith('image/')) return file;

  const options = {
    maxSizeMB,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: 'image/webp',
  };

  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.warn('Image compression fallback to original file:', error);
    return file;
  }
}

/**
 * Uploads a single file (image or PDF) to Cloudinary.
 * @param {File} file - File to upload
 * @param {'sikkim_pg_rooms' | 'sikkim_pg_kyc'} folder - Target folder
 * @param {number} maxSizeMB - Max size for image compression
 * @returns {Promise<string>} - secure_url returned by Cloudinary
 */
export async function uploadToCloudinary(file, folder = 'sikkim_pg_rooms', maxSizeMB = 0.3) {
  if (!file) throw new Error('No file provided for upload');

  // If cloud name or preset is not configured, fallback to base64 Data URL for local development demo
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.warn('Cloudinary credentials missing in .env. Falling back to local data URL.');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  let fileToUpload = file;
  if (file.type.startsWith('image/')) {
    fileToUpload = await compressImage(file, maxSizeMB);
  }

  const formData = new FormData();
  formData.append('file', fileToUpload);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to upload file to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
}

/**
 * Uploads multiple files in parallel to Cloudinary.
 * @param {File[]} files
 * @param {'sikkim_pg_rooms' | 'sikkim_pg_kyc'} folder
 * @param {number} maxSizeMB
 * @returns {Promise<string[]>}
 */
export async function uploadMultipleToCloudinary(files, folder = 'sikkim_pg_rooms', maxSizeMB = 0.3) {
  if (!files || !files.length) return [];
  return Promise.all(files.map((f) => uploadToCloudinary(f, folder, maxSizeMB)));
}
