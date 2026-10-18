/**
 * Universal Avatar & Document Helper for Stay Alaya
 * Provides clean cross-role avatar and document resolution directly from Supabase live schema.
 */

/**
 * Extract avatar image URL from any profile row, user object, or review object
 */
export function extractAvatar(obj) {
  if (!obj) return '';

  // 1. Direct avatar_url column (real Supabase schema)
  if (obj.avatar_url && typeof obj.avatar_url === 'string' && obj.avatar_url.trim()) {
    return obj.avatar_url.trim();
  }
  if (obj.avatar && typeof obj.avatar === 'string' && obj.avatar.trim()) {
    return obj.avatar.trim();
  }
  if (obj.photo_url && typeof obj.photo_url === 'string' && obj.photo_url.trim()) {
    return obj.photo_url.trim();
  }
  if (obj.profile_image && typeof obj.profile_image === 'string' && obj.profile_image.trim()) {
    return obj.profile_image.trim();
  }

  // 2. Nested profiles object from Supabase joins (e.g. pg_listings.profiles or reviews.profiles)
  if (obj.profiles && typeof obj.profiles === 'object') {
    const fromJoin = extractAvatar(obj.profiles);
    if (fromJoin) return fromJoin;
  }

  // 3. Auth user_metadata
  if (obj.user_metadata && typeof obj.user_metadata === 'object') {
    const fromMeta = extractAvatar(obj.user_metadata);
    if (fromMeta) return fromMeta;
  }

  return '';
}

/**
 * Extract clean, valid document URL from any document field.
 * Strictly guarantees that only valid http(s):// or data: URLs are returned.
 */
export function extractDocUrl(val, userAvatar = '') {
  if (!val) return '';
  let raw = val;
  let resolvedAvatar = userAvatar;

  if (typeof raw === 'object' && raw !== null) {
    if (!resolvedAvatar) {
      resolvedAvatar = extractAvatar(raw);
    }
    raw =
      raw.kyc_doc_url ||
      raw.kyc_id_doc_url ||
      raw.propertyDocumentUrl ||
      raw.identityDocumentUrl ||
      raw.property_doc_url ||
      raw.identity_doc_url ||
      raw.doc ||
      raw.document ||
      '';
  }
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Guard 1: Never allow user profile photo/avatar to be treated as a document
  if (resolvedAvatar && typeof resolvedAvatar === 'string' && trimmed === resolvedAvatar.trim()) {
    return '';
  }

  // Guard 2: Reject Cloudinary user profile images (avatars are in /user_profiles/, docs in /user_documents/)
  if (trimmed.includes('/user_profiles/') && !trimmed.includes('/user_documents/')) {
    return '';
  }

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const inner =
        parsed?.kyc_doc_url ||
        parsed?.kyc_id_doc_url ||
        parsed?.propertyDocumentUrl ||
        parsed?.identityDocumentUrl ||
        parsed?.doc ||
        parsed?.document ||
        '';
      if (
        typeof inner === 'string' &&
        (inner.startsWith('http://') || inner.startsWith('https://') || inner.startsWith('data:')) &&
        (!resolvedAvatar || inner.trim() !== resolvedAvatar.trim()) &&
        !(inner.includes('/user_profiles/') && !inner.includes('/user_documents/'))
      ) {
        return inner.trim();
      }
      return '';
    } catch {
      return '';
    }
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  return '';
}

/**
 * Extract identity document URL from kyc_id_doc_url
 */
export function extractIdDoc(obj, userAvatar = '') {
  if (!obj) return '';
  const raw = typeof obj === 'string' ? obj : (obj.kyc_id_doc_url || obj.kycIdDocUrl || obj.identityDocumentUrl);
  const resolvedAvatar = userAvatar || (typeof obj === 'object' ? extractAvatar(obj) : '');
  return extractDocUrl(raw, resolvedAvatar);
}

