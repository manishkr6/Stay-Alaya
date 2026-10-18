import imageCompression from 'browser-image-compression';
import { supabase } from '../lib/supabaseClient';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

if (!CLOUD_NAME) {
  throw new Error("Missing VITE_CLOUDINARY_CLOUD_NAME in .env file");
}

const PRESET_MAP = {
  room: import.meta.env.VITE_CLOUDINARY_PRESET_ROOMS,
  rooms: import.meta.env.VITE_CLOUDINARY_PRESET_ROOMS,
  profile: import.meta.env.VITE_CLOUDINARY_PRESET_PROFILES,
  profiles: import.meta.env.VITE_CLOUDINARY_PRESET_PROFILES,
  document: import.meta.env.VITE_CLOUDINARY_PRESET_DOCS,
  documents: import.meta.env.VITE_CLOUDINARY_PRESET_DOCS,
  doc: import.meta.env.VITE_CLOUDINARY_PRESET_DOCS,
  docs: import.meta.env.VITE_CLOUDINARY_PRESET_DOCS,
  // Backward compatibility with legacy folder names
  sikkim_pg_rooms: import.meta.env.VITE_CLOUDINARY_PRESET_ROOMS,
  sikkim_pg_kyc: import.meta.env.VITE_CLOUDINARY_PRESET_DOCS,
};

/**
 * Resolves the appropriate unsigned upload preset for the given category.
 * @param {'room' | 'profile' | 'document' | string} category
 * @returns {string}
 */
export function getUploadPreset(category = 'room') {
  const normalized = (category || 'room').toLowerCase().trim();
  const preset =
    PRESET_MAP[normalized] ||
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!preset) {
    throw new Error(
      `Missing Cloudinary upload preset for category "${category}". Please configure VITE_CLOUDINARY_PRESET_${normalized.toUpperCase()} or VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.`
    );
  }

  return preset;
}

/**
 * Extracts the user's name from Supabase auth state / metadata or user object.
 * Priority:
 * 1. user.user_metadata?.full_name
 * 2. user.user_metadata?.name
 * 3. user.full_name
 * 4. user.name
 * 5. user.email prefix (before the @ symbol)
 * 6. Default fallback 'user'
 *
 * @param {Object|string} user - Supabase user object or name string
 * @returns {string}
 */
export function extractUserName(user) {
  if (!user) return 'user';
  if (typeof user === 'string') return user;

  const rawName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.full_name ||
    user.name ||
    (user.email ? user.email.split('@')[0] : '') ||
    'user';

  return String(rawName).trim();
}

/**
 * Sanitizes a user's name for folder naming:
 * - Trims leading and trailing whitespace
 * - Converts to lowercase
 * - Replaces spaces and non-alphanumeric characters with underscores (e.g. "Manish Kumar" -> "manish_kumar")
 * - Deduplicates consecutive underscores and trims leading/trailing underscores
 *
 * @param {string} name - Raw name string
 * @returns {string} - Sanitized folder-safe string (e.g., "manish_kumar")
 */
export function sanitizeFolderName(name = '') {
  if (!name) return 'user';
  const sanitized = String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return sanitized || 'user';
}

/**
 * Compresses an image file before upload using WebP format.
 * Bypasses PDFs and other document types.
 *
 * @param {File} file - Image file to compress
 * @param {number} maxSizeMB - Max file size target in MB
 * @returns {Promise<File|Blob>}
 */
export async function compressImage(file, maxSizeMB = 0.3) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }

  const options = {
    maxSizeMB,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: 'image/webp',
  };

  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.warn('[CloudinaryUpload] Image compression fallback to original file:', error);
    return file;
  }
}

/**
 * Direct-to-Cloudinary unsigned file upload utility with strictly enforced dynamic subfolder routing.
 * Posts files directly from the browser to Cloudinary's unsigned /auto/upload endpoint
 * using sanitized user display names (e.g. user_profiles/manish_kumar/).
 *
 * Folder routing rules:
 * - "profile"  => user_profiles/${sanitizedName}
 * - "room"     => pg_rooms/${sanitizedName}
 * - "document" => user_documents/${sanitizedName}
 *
 * @param {File} file - The file object (image or PDF document)
 * @param {'room' | 'profile' | 'document' | string} category - Category mapping to preset & folder
 * @param {string|Object} userName - User name string or Supabase user object
 * @param {Object} [options] - Optional settings (e.g., skipCompression, maxSizeMB)
 * @returns {Promise<string>} - The secure_url returned by Cloudinary API
 */
export async function uploadFileToCloudinary(file, category = 'profile', userName = '', options = {}) {
  if (!userName) console.error("Missing userName for category:", category);

  if (!file) {
    throw new Error('No file provided for upload.');
  }

  // Handle flexible arguments if 3rd arg is a user object or an options object
  let resolvedUserName = userName;
  let resolvedOptions = options;

  if (typeof userName === 'object' && userName !== null) {
    if (userName.user_metadata || userName.name || userName.full_name || userName.email) {
      resolvedUserName = extractUserName(userName);
    } else {
      resolvedOptions = userName;
      resolvedUserName =
        resolvedOptions.userName ||
        resolvedOptions.name ||
        resolvedOptions.full_name ||
        resolvedOptions.userIdentifier ||
        '';
    }
  }

  // Fallback: If no name was provided, attempt to retrieve current Supabase session user name
  if (!resolvedUserName) {
    try {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data?.session?.user;
      if (sessionUser) {
        resolvedUserName = extractUserName(sessionUser);
      }
    } catch (e) {
      console.warn('[CloudinaryUpload] Could not retrieve Supabase session for user fallback:', e);
    }
  }

  // Sanitize the user name (e.g. "Manish Kumar" -> "manish_kumar")
  const sanitizedName = sanitizeFolderName(resolvedUserName || 'user');

  const normalizedCategory = (category || 'profile').toLowerCase().trim();
  const preset = getUploadPreset(normalizedCategory);
  const cloudName = CLOUD_NAME;

  if (!cloudName) {
    throw new Error('Cloudinary cloud name is not configured in environment variables.');
  }

  try {
    // Determine compression based on category and file type
    let fileToUpload = file;
    if (!resolvedOptions.skipCompression && file.type && file.type.startsWith('image/')) {
      const targetSizeMB =
        resolvedOptions.maxSizeMB ||
        (normalizedCategory === 'profile' || normalizedCategory === 'profiles' ? 0.2 : 0.35);
      fileToUpload = await compressImage(file, targetSizeMB);
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('upload_preset', preset);

    // 1. Determine baseFolder based on category
    let baseFolder = 'user_profiles';
    if (normalizedCategory === 'room' || normalizedCategory === 'rooms') {
      baseFolder = 'pg_rooms';
    } else if (
      normalizedCategory === 'document' ||
      normalizedCategory === 'documents' ||
      normalizedCategory === 'doc' ||
      normalizedCategory === 'docs'
    ) {
      baseFolder = 'user_documents';
    } else if (normalizedCategory === 'profile' || normalizedCategory === 'profiles') {
      baseFolder = 'user_profiles';
    } else {
      baseFolder = normalizedCategory;
    }

    // 2. Construct dynamic folder path: ${baseFolder}/${sanitizedUserName}
    const sanitizedUserName = sanitizedName;
    const fullFolderPath = `${baseFolder}/${sanitizedUserName}`;

    // 3. Force the folder parameter in FormData
    formData.append('folder', fullFolderPath);

    // 4. Debugging log right before fetch
    console.log("Upload Category:", category, "Target Folder:", fullFolderPath);

    // Additional detailed debug information
    console.log('[CloudinaryUpload] Upload request payload details:', {
      endpoint: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      upload_preset: preset,
      folder: fullFolderPath,
      category: normalizedCategory,
      userName: sanitizedUserName,
      rawUserName: resolvedUserName,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    // Call Cloudinary unsigned auto/upload endpoint
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const message =
        errData?.error?.message ||
        `Cloudinary upload failed with status ${response.status} (${response.statusText})`;
      throw new Error(message);
    }

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error('Cloudinary response did not contain a secure_url.');
    }

    console.log('[CloudinaryUpload] Upload successful! URL:', data.secure_url, 'Public ID:', data.public_id);
    return data.secure_url;
  } catch (error) {
    console.error(`[CloudinaryUpload error for category: ${category}, user: ${sanitizedName}]:`, error);
    throw error;
  }
}

/**
 * Primary and backwards-compatible aliases
 */
export const cloudinaryUpload = uploadFileToCloudinary;

/**
 * Backward-compatible alias for existing code referencing uploadToCloudinary.
 */
export async function uploadToCloudinary(file, categoryOrFolder = 'room', userName = '', options = {}) {
  let resolvedOptions = options;
  let resolvedUserName = userName;
  if (typeof userName === 'number') {
    resolvedOptions = { maxSizeMB: userName };
    resolvedUserName = '';
  } else if (typeof userName === 'object' && userName !== null) {
    if (userName.user_metadata || userName.name || userName.full_name || userName.email) {
      resolvedUserName = extractUserName(userName);
    } else {
      resolvedOptions = userName;
      resolvedUserName = resolvedOptions.userName || resolvedOptions.name || resolvedOptions.userIdentifier || '';
    }
  }
  return uploadFileToCloudinary(file, categoryOrFolder, resolvedUserName, resolvedOptions);
}

/**
 * Uploads multiple files in parallel to Cloudinary organized by sanitized user subfolder.
 *
 * @param {File[]} files - Array of files to upload
 * @param {'room' | 'profile' | 'document' | string} category - Category preset
 * @param {string|Object} userName - User name string or Supabase user object
 * @param {Object} [options]
 * @returns {Promise<string[]>} - Array of secure_urls
 */
export async function uploadMultipleToCloudinary(files, category = 'room', userName = '', options = {}) {
  if (!userName) console.error("Missing userName for category:", category);
  if (!files || !files.length) return [];
  let resolvedUserName = userName;
  let resolvedOptions = options;
  if (typeof userName === 'object' && userName !== null) {
    if (userName.user_metadata || userName.name || userName.full_name || userName.email) {
      resolvedUserName = extractUserName(userName);
    } else {
      resolvedOptions = userName;
      resolvedUserName = resolvedOptions.userName || resolvedOptions.name || resolvedOptions.userIdentifier || '';
    }
  }
  return Promise.all(
    files.map((file) => uploadFileToCloudinary(file, category, resolvedUserName, resolvedOptions))
  );
}

export default uploadFileToCloudinary;
