import { createContext, useState, useCallback, useContext, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from './AuthContext';
import { uploadFileToCloudinary } from '../utils/cloudinaryUpload';
import { extractAvatar, extractIdDoc, extractDocUrl } from '../utils/avatarHelper';

export const DataContext = createContext(null);

/**
 * Strict role-specific filter:
 * - Admin ONLY sees platform-wide events (USER_SIGNUP, OWNER_REQUEST, DELETE_PG, ADD_PG, UPDATE_PG, REPORT_PG, REVIEW, FEEDBACK)
 *   and notifications directly addressed to the admin.
 * - Admin NEVER sees other users' private actions (e.g. "Your profile photo has been updated successfully", "Your PG listing has been published and is now live", etc.).
 * - Regular users (Students, Owners) ONLY see their own personal notifications and general announcements, NEVER admin moderation alerts.
 */
export function isNotificationRelevantForRole(n, user) {
  if (!user || !n) return false;

  const targetRole = (n.targetRole || n.target_role || '').toLowerCase();
  const notifUserId = n.userId || n.user_id;

  // 1. Explicit targetRole checks (from live Supabase schema)
  if (targetRole) {
    if (user.role === 'admin') {
      return targetRole === 'admin' || targetRole === 'all';
    }
    // For non-admin (student, owner):
    if (targetRole === 'admin') return false;
    if (targetRole === 'all') return true;
    if (notifUserId) {
      return String(notifUserId) === String(user.id);
    }
    return targetRole === user.role;
  }

  // 2. Fallback when target_role is null/omitted
  const isMe = notifUserId && String(notifUserId) === String(user.id);
  const isBroadcast = !notifUserId;

  const USER_PRIVATE_TYPES = new Set(['PROFILE_UPDATE', 'PHONE_UPDATE', 'WISHLIST', 'SAVED_PG']);
  const ADMIN_MODERATION_TYPES = new Set([
    'DELETE_PG',
    'REPORT_PG',
    'OWNER_REQUEST',
    'USER_SIGNUP',
    'ADD_PG',
    'UPDATE_PG',
    'REVIEW',
    'FEEDBACK',
  ]);

  if (user.role === 'admin') {
    if (USER_PRIVATE_TYPES.has(n.type)) return false;
    if (n.message && (
      n.message.startsWith('Your profile') ||
      n.message.startsWith('Your contact phone') ||
      n.message.startsWith('Your phone number') ||
      n.message.startsWith('Your PG listing') ||
      n.message.startsWith('Your updates to') ||
      n.message.startsWith('Your deletion request') ||
      n.message.startsWith('Your request to become') ||
      n.message.startsWith('Congratulations! Your') ||
      n.message.startsWith('Welcome to Stay Aalaya') ||
      n.message.startsWith('Welcome to Stay Alaya')
    )) {
      return false;
    }
    return Boolean(isBroadcast || ADMIN_MODERATION_TYPES.has(n.type));
  }

  // Non-admin roles (Students, Tenants, Owners)
  if (isMe) {
    return true;
  }
  if (isBroadcast) {
    if (ADMIN_MODERATION_TYPES.has(n.type)) return false;
    return true;
  }
  return false;
}

export function DataProvider({ children }) {
  const { currentUser } = useContext(AuthContext);

  const [pgs, setPgs] = useState([]);
  const [ownerPgs, setOwnerPgs] = useState([]);
  const [savedPgs, setSavedPgs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Live mutable refs so callbacks & effects never capture stale data or trigger recreation cascades
  const reviewsRef = useRef(reviews);
  reviewsRef.current = reviews;

  const pgsRef = useRef(pgs);
  pgsRef.current = pgs;

  const ownerPgsRef = useRef(ownerPgs);
  ownerPgsRef.current = ownerPgs;

  const savedPgsRef = useRef(savedPgs);
  savedPgsRef.current = savedPgs;

  const usersRef = useRef(users);
  usersRef.current = users;

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const mapPG = useCallback((pg) => {
    if (!pg) return null;
    const user = currentUserRef.current;
    const id = String(pg.id);
    const ownerId = String(pg.owner_id || pg.ownerId || '');
    const ownerProfile = pg.profiles || {};

    const cleanPgDoc = extractDocUrl(pg.kyc_doc_url);
    const cleanOwnerDoc = extractDocUrl(
      ownerProfile.kyc_doc_url || (user?.id === ownerId ? user?.kyc_doc_url : null)
    );
    const cleanOwnerIdDoc =
      extractIdDoc(ownerProfile) ||
      extractDocUrl(user?.id === ownerId ? user?.kyc_id_doc_url : null);

    const hasDocuments = Boolean(cleanPgDoc || cleanOwnerDoc || cleanOwnerIdDoc);
    const isOwnerVerified =
      ownerProfile.kyc_status === 'verified' ||
      (user?.id === ownerId && user?.kyc_status === 'verified');
    const isVerified = Boolean(hasDocuments && (isOwnerVerified || pg.is_verified === true));

    const ownerAvatar =
      extractAvatar(ownerProfile) ||
      extractAvatar({ id: ownerId }) ||
      (user?.id && String(user.id) === ownerId ? (user.avatar_url || user.avatar) : '') ||
      pg.ownerAvatar ||
      pg.owner_avatar ||
      '';

    return {
      ...pg,
      id,
      ownerId,
      ownerName:
        ownerProfile.full_name ||
        pg.ownerName ||
        (user?.id && String(user.id) === ownerId ? user.name : null) ||
        'Property Owner',
      ownerEmail:
        ownerProfile.email ||
        pg.ownerEmail ||
        (user?.id && String(user.id) === ownerId ? user.email : ''),
      ownerAvatar,
      price: Number(pg.rent ?? pg.price ?? 0),
      rent: Number(pg.rent ?? pg.price ?? 0),
      deposit: Number(pg.deposit ?? 0),
      location: {
        city: pg.locality || pg.location?.city || 'Gangtok',
        area: pg.locality || pg.location?.area || 'Central',
        address: pg.address || pg.location?.address || '',
      },
      roomType: pg.room_type || pg.roomType || 'Single',
      genderPreference: pg.gender_preference || pg.genderPreference || 'Co-ed',
      amenities: Array.isArray(pg.amenities) ? pg.amenities : [],
      rules: Array.isArray(pg.rules) ? pg.rules : [],
      images: Array.isArray(pg.images) ? pg.images : [],
      contactNumber:
        pg.contact_number ||
        pg.contactNumber ||
        ownerProfile.phone ||
        (user?.id && String(user.id) === ownerId ? user.phone : null) ||
        '+919876543210',
      averageRating:
        Number(pg.total_reviews || pg.totalReviews || 0) > 0
          ? Number(pg.average_rating || pg.averageRating || 0)
          : 0,
      totalReviews: Number(pg.total_reviews || pg.totalReviews || 0),
      status: pg.status || (pg.is_verified ? 'approved' : 'pending'),
      deleteRequestReason: pg.delete_request_reason || pg.deleteRequestReason || '',
      rejectionReason: pg.rejection_reason || pg.rejectionReason || '',
      isVerified,
      hasDocuments,
      kyc_doc_url: cleanPgDoc || cleanOwnerDoc || cleanOwnerIdDoc || null,
      isAvailable: pg.is_available !== false,
      createdAt: pg.created_at ? pg.created_at.split('T')[0] : '',
    };
  }, []);

  const mapReview = useCallback((r) => {
    const user = currentUserRef.current;
    return {
      id: String(r.id),
      pgId: String(r.pg_id || r.pgId),
      userId: String(r.user_id || r.userId),
      userName: r.profiles?.full_name || r.userName || 'Student / User',
      userAvatar:
        extractAvatar(r.profiles) ||
        extractAvatar({ id: r.user_id || r.userId }) ||
        (user?.id && String(user.id) === String(r.user_id || r.userId)
          ? (user.avatar_url || user.avatar)
          : '') ||
        r.userAvatar ||
        '',
      rating: Number(r.rating),
      comment: r.comment,
      createdAt: r.created_at ? r.created_at.split('T')[0] : '',
      rawCreatedAt: r.created_at || '',
    };
  }, []);

  const mapUser = useCallback((u) => {
    const user = currentUserRef.current;
    const avatar = extractAvatar(u) || (user?.id === String(u.id) ? (user.avatar_url || user.avatar) : '') || '';
    const cleanPropDoc = extractDocUrl(u.kyc_doc_url || u.propertyDocumentUrl, avatar);
    const cleanIdDoc = extractDocUrl(u.kyc_id_doc_url || u.identityDocumentUrl, avatar);
    const hasDocs = Boolean(cleanPropDoc || cleanIdDoc);
    const isOwner = u.role === 'owner';
    const isApprovedOwner = isOwner || u.kyc_status === 'verified';

    const hasPendingOwnerRequest = u.kyc_status === 'pending' || (!isOwner && (cleanPropDoc || cleanIdDoc));
    const ownerRequestStatus = isApprovedOwner
      ? 'approved'
      : hasPendingOwnerRequest
      ? 'pending'
      : (u.kyc_status || 'none');

    return {
      id: String(u.id),
      name: u.full_name || u.name || 'User',
      email: u.email,
      phone: u.phone || '',
      role: u.role || 'student',
      avatar,
      avatar_url: avatar,
      kyc_status: u.kyc_status,
      kyc_doc_url: cleanPropDoc || '',
      kyc_id_doc_url: cleanIdDoc || '',
      propertyDocumentUrl: cleanPropDoc || '',
      identityDocumentUrl: cleanIdDoc || '',
      ownerRequestStatus,
      ownerRequestDetails: (ownerRequestStatus === 'pending' || hasDocs)
        ? {
            id: String(u.id),
            phoneNumber: u.phone || '',
            propertyDocumentUrl: cleanPropDoc || '',
            identityDocumentUrl: cleanIdDoc || '',
            hasUploadedDocs: hasDocs,
            status: ownerRequestStatus,
            requestedAt: u.updated_at || u.created_at,
          }
        : null,
      isBlocked: !!u.is_blocked,
      lastSignIn: u.last_sign_in_at || u.updated_at || u.created_at,
      createdAt: u.created_at,
    };
  }, []);

  const fetchApprovedPgsAndReviews = useCallback(async () => {
    try {
      const [pgsRes, reviewsRes, profilesRes] = await Promise.all([
        supabase
          .from('pg_listings')
          .select('*, profiles(full_name, email, phone, avatar_url, kyc_doc_url, kyc_id_doc_url, kyc_status)')
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('*, profiles(full_name, avatar_url, kyc_doc_url, kyc_id_doc_url)')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (pgsRes.error) throw pgsRes.error;

      // Fetch actual real reviews
      const mappedReviews = (reviewsRes.data || []).map(mapReview);
      reviewsRef.current = mappedReviews;
      if (reviewsRes.data) setReviews(mappedReviews);

      // Fetch actual real student/community profiles
      if (profilesRes.data) {
        const mappedUsers = profilesRes.data.map(mapUser);
        usersRef.current = mappedUsers;
        setUsers(mappedUsers);
      }

      // Compute totalReviews and averageRating strictly from real reviews in the database
      const mappedPgs = (pgsRes.data || []).map((pg) => {
        const basePG = mapPG(pg);
        if (!basePG) return null;
        const matchingReviews = mappedReviews.filter((r) => String(r.pgId) === String(basePG.id));
        const realCount = matchingReviews.length;
        const realAvg = realCount > 0
          ? Number((matchingReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / realCount).toFixed(1))
          : 0;
        return {
          ...basePG,
          totalReviews: realCount,
          averageRating: realAvg,
        };
      }).filter(Boolean);

      pgsRef.current = mappedPgs;
      setPgs(mappedPgs);
    } catch (err) {
      console.warn('Failed to fetch PGs from Supabase:', err);
    }
  }, [mapPG, mapReview, mapUser]);

  const fetchOwnerPgs = useCallback(async () => {
    const user = currentUserRef.current;
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('pg_listings')
        .select('*, profiles(full_name, email, phone, avatar_url, kyc_doc_url, kyc_id_doc_url, kyc_status)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const currentReviews = reviewsRef.current || [];
      const mappedOwnerPgs = (data || []).map((pg) => {
        const basePG = mapPG(pg);
        if (!basePG) return null;
        const matchingReviews = currentReviews.filter((r) => String(r.pgId) === String(basePG.id));
        const realCount = matchingReviews.length;
        const realAvg = realCount > 0
          ? Number((matchingReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / realCount).toFixed(1))
          : 0;
        return { ...basePG, totalReviews: realCount, averageRating: realAvg };
      }).filter(Boolean);

      ownerPgsRef.current = mappedOwnerPgs;
      setOwnerPgs(mappedOwnerPgs);
    } catch (err) {
      console.warn('Failed to fetch owner PGs from Supabase:', err);
    }
  }, [mapPG]);

  const fetchSavedPgs = useCallback(async () => {
    const user = currentUserRef.current;
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('saved_pgs')
        .select('*, pg_listings(*, profiles(full_name, email, phone, avatar_url, kyc_doc_url, kyc_id_doc_url, kyc_status))')
        .eq('user_id', user.id);

      if (error) throw error;
      const list = (data || []).map((item) => mapPG(item.pg_listings)).filter(Boolean);
      savedPgsRef.current = list;
      setSavedPgs(list);
    } catch (err) {
      console.warn('Failed to fetch saved PGs from Supabase:', err);
    }
  }, [mapPG]);

  const fetchNotifications = useCallback(async () => {
    const user = currentUserRef.current;
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      let query;
      if (user?.role === 'admin') {
        // Real Supabase query for admin notifications using target_role = 'admin' or broadcast alerts (user_id is null) or addressed to admin
        query = supabase
          .from('notifications')
          .select('*')
          .or(`target_role.eq.admin,user_id.is.null,user_id.eq.${user.id}`)
          .order('created_at', { ascending: false });
      } else {
        // Real Supabase query for user-specific notifications
        query = supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Notice querying Supabase notifications:', error.message);
      }

      const dbList = (data || [])
        .map((n) => ({
          id: String(n.id),
          userId: n.user_id,
          targetRole: n.target_role,
          message: n.message,
          type: n.type || 'info',
          relatedId: n.related_id,
          isRead: !!n.is_read,
          createdAt: n.created_at || new Date().toISOString(),
        }))
        .filter((n) => isNotificationRelevantForRole(n, user));

      // As an admin safety check, if there are pending actions or new user signups that don't have notification rows, supplement them
      if (user?.role === 'admin') {
        try {
          const [pendingDeletesRes, pendingAddUpdateRes, allProfilesRes] = await Promise.all([
            supabase
              .from('pg_listings')
              .select('id, title, status, delete_request_reason, updated_at, created_at, profiles(full_name, phone)')
              .eq('status', 'pending_delete'),
            supabase
              .from('pg_listings')
              .select('id, title, status, updated_at, created_at, profiles(full_name, phone)')
              .in('status', ['pending', 'pending_update']),
            supabase
              .from('profiles')
              .select('id, full_name, email, phone, role, kyc_status, kyc_doc_url, kyc_id_doc_url, updated_at, created_at')
              .order('created_at', { ascending: false }),
          ]);

          const pendingDeletes = pendingDeletesRes.data || [];
          for (const item of pendingDeletes) {
            const notifId = `pending-delete-${item.id}`;
            const existing = dbList.find(
              (n) => (n.type === 'DELETE_PG' && String(n.relatedId) === String(item.id)) || String(n.id) === notifId
            );
            if (!existing) {
              const ownerName = item.profiles?.full_name || 'Property Owner';
              const reasonText = item.delete_request_reason ? ` Reason: ${item.delete_request_reason}` : '';
              dbList.push({
                id: notifId,
                userId: null,
                targetRole: 'admin',
                message: `Deletion request submitted for PG "${item.title}" by ${ownerName}.${reasonText}`,
                type: 'DELETE_PG',
                relatedId: String(item.id),
                isRead: false,
                createdAt: item.updated_at || item.created_at || new Date().toISOString(),
              });
            }
          }

          const pendingAddUpdates = pendingAddUpdateRes.data || [];
          for (const item of pendingAddUpdates) {
            const isUpdate = item.status === 'pending_update';
            const notifType = isUpdate ? 'UPDATE_PG' : 'ADD_PG';
            const notifId = `pending-${isUpdate ? 'update' : 'add'}-${item.id}`;
            const existing = dbList.find(
              (n) => (n.type === notifType && String(n.relatedId) === String(item.id)) || String(n.id) === notifId
            );
            if (!existing) {
              const ownerName = item.profiles?.full_name || 'Property Owner';
              const notifMsg = isUpdate
                ? `Update pending approval for PG "${item.title}" by ${ownerName}.`
                : `New PG submitted for approval: "${item.title}" by ${ownerName}.`;
              dbList.push({
                id: notifId,
                userId: null,
                targetRole: 'admin',
                message: notifMsg,
                type: notifType,
                relatedId: String(item.id),
                isRead: false,
                createdAt: item.updated_at || item.created_at || new Date().toISOString(),
              });
            }
          }

          const allProfiles = allProfilesRes.data || [];
          for (const item of allProfiles) {
            // Supplement user registrations if missing from notifications
            if (item.role !== 'admin') {
              const signupNotifId = `signup-user-${item.id}`;
              const existingSignup = dbList.find(
                (n) => (n.type === 'USER_SIGNUP' && String(n.relatedId) === String(item.id)) || String(n.id) === signupNotifId
              );
              if (!existingSignup) {
                const userName = item.full_name || 'User';
                dbList.push({
                  id: signupNotifId,
                  userId: null,
                  targetRole: 'admin',
                  message: `New user registration: ${userName} (${item.email || item.phone || 'No email'}) registered as ${item.role || 'student'}.`,
                  type: 'USER_SIGNUP',
                  relatedId: String(item.id),
                  isRead: false,
                  createdAt: item.created_at || item.updated_at || new Date().toISOString(),
                });
              }
            }

            const cleanProp = extractDocUrl(item.kyc_doc_url);
            const cleanId = extractDocUrl(item.kyc_id_doc_url);
            const hasDocs = Boolean(cleanProp || cleanId);
            const isOwnerPending = item.kyc_status === 'pending' || (item.role !== 'owner' && hasDocs);

            if (isOwnerPending) {
              const notifId = `pending-owner-${item.id}`;
              const existing = dbList.find(
                (n) => (n.type === 'OWNER_REQUEST' && String(n.relatedId) === String(item.id)) || String(n.id) === notifId
              );
              if (!existing) {
                const ownerName = item.full_name || 'User';
                dbList.push({
                  id: notifId,
                  userId: null,
                  targetRole: 'admin',
                  message: `Owner verification requested by ${ownerName} (${item.email || item.phone || 'No contact'})${hasDocs ? ' with verification documents' : ' (no documents attached)'}.`,
                  type: 'OWNER_REQUEST',
                  relatedId: String(item.id),
                  isRead: false,
                  createdAt: item.updated_at || item.created_at || new Date().toISOString(),
                });
              }
            }
          }
        } catch (syncErr) {
          console.warn('Notice checking pending queues for admin notifications:', syncErr);
        }
      }

      let merged = dbList
        .filter((item) => isNotificationRelevantForRole(item, user))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Friendly welcome notification for users who have no notifications yet, saved directly to Supabase
      if (merged.length === 0 && user?.role !== 'admin') {
        const welcomePayload = {
          user_id: user.id,
          target_role: user.role || 'student',
          message: `Welcome to Stay Aalaya, ${user.name || 'there'}! Explore verified PGs near colleges in Gangtok, Namchi, and Majitar. Save properties to your wishlist, compare amenities, and leave reviews.`,
          type: 'WELCOME',
          related_id: user.id,
          is_read: false,
        };

        try {
          const { data: insertedWelcome } = await supabase
            .from('notifications')
            .insert(welcomePayload)
            .select()
            .maybeSingle();

          if (insertedWelcome) {
            merged = [
              {
                id: String(insertedWelcome.id),
                userId: insertedWelcome.user_id,
                targetRole: insertedWelcome.target_role,
                message: insertedWelcome.message,
                type: insertedWelcome.type,
                relatedId: insertedWelcome.related_id,
                isRead: false,
                createdAt: insertedWelcome.created_at,
              },
            ];
          } else {
            merged = [
              {
                id: `welcome-${user.id}`,
                userId: user.id,
                targetRole: user.role || 'student',
                message: welcomePayload.message,
                type: 'WELCOME',
                relatedId: null,
                isRead: false,
                createdAt: new Date().toISOString(),
              },
            ];
          }
        } catch (e) {
          merged = [
            {
              id: `welcome-${user.id}`,
              userId: user.id,
              targetRole: user.role || 'student',
              message: welcomePayload.message,
              type: 'WELCOME',
              relatedId: null,
              isRead: false,
              createdAt: new Date().toISOString(),
            },
          ];
        }
      }

      setNotifications(merged);
      setUnreadCount(merged.filter((x) => !x.isRead).length);
    } catch (err) {
      console.warn('Failed to fetch notifications from Supabase:', err);
    }
  }, []);

  const createNotification = useCallback(
    async ({ userId, targetRole, message, type = 'info', relatedId = null }) => {
      try {
        const user = currentUserRef.current;
        const payload = {
          user_id: userId || null,
          target_role: targetRole || (userId ? null : 'admin'),
          message,
          type,
          related_id: relatedId ? String(relatedId) : null,
          is_read: false,
        };

        let insertedData = null;
        const isSelfOrAdmin =
          (userId && user?.id && String(userId) === String(user.id)) ||
          user?.role === 'admin';

        if (isSelfOrAdmin) {
          const { data, error } = await supabase
            .from('notifications')
            .insert(payload)
            .select()
            .maybeSingle();

          if (!error && data) {
            insertedData = data;
          } else if (error) {
            console.warn('Notice inserting notification with select in Supabase:', error.message);
            // Fallback to minimal insert without RETURNING * if select was rejected by RLS
            await supabase.from('notifications').insert(payload);
          }
        } else {
          // When a regular user creates an admin notification or broadcast,
          // RLS select policy blocks RETURNING *. Send pure insert without .select() so it always succeeds.
          const { error } = await supabase.from('notifications').insert(payload);
          if (error) {
            console.warn('Notice inserting admin notification in Supabase:', error.message);
          }
        }

        const newNotif = {
          id: insertedData?.id ? String(insertedData.id) : `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          userId: payload.user_id,
          targetRole: payload.target_role,
          message: payload.message,
          type: payload.type,
          relatedId: payload.related_id,
          isRead: false,
          createdAt: insertedData?.created_at || new Date().toISOString(),
        };

        await fetchNotifications();
        return newNotif;
      } catch (err) {
        console.warn('createNotification exception:', err);
        return null;
      }
    },
    [fetchNotifications]
  );

  const fetchAdminData = useCallback(async () => {
    try {
      const [pgsRes, usersRes, reviewsRes] = await Promise.all([
        supabase.from('pg_listings').select('*, profiles(*)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('reviews').select('*, profiles(full_name, avatar_url, kyc_doc_url, kyc_id_doc_url)').order('created_at', { ascending: false }),
      ]);

      const mappedReviews = (reviewsRes.data || []).map(mapReview);
      reviewsRef.current = mappedReviews;
      if (reviewsRes.data) setReviews(mappedReviews);
      if (usersRes.data) {
        const mappedUsers = usersRes.data.map(mapUser);
        usersRef.current = mappedUsers;
        setUsers(mappedUsers);
      }

      if (pgsRes.data) {
        const mappedPgs = pgsRes.data.map((pg) => {
          const basePG = mapPG(pg);
          if (!basePG) return null;
          const matchingReviews = mappedReviews.filter((r) => String(r.pgId) === String(basePG.id));
          const realCount = matchingReviews.length;
          const realAvg = realCount > 0
            ? Number((matchingReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / realCount).toFixed(1))
            : 0;
          return {
            ...basePG,
            totalReviews: realCount,
            averageRating: realAvg,
          };
        }).filter(Boolean);
        pgsRef.current = mappedPgs;
        setPgs(mappedPgs);
      }
    } catch (err) {
      console.warn('Failed to fetch admin data from Supabase:', err);
    }
  }, [mapPG, mapReview, mapUser]);

  // Stable callback refs for realtime subscription to call without triggering subscription cycles
  const fetchAdminDataRef = useRef(fetchAdminData);
  fetchAdminDataRef.current = fetchAdminData;

  const fetchApprovedPgsAndReviewsRef = useRef(fetchApprovedPgsAndReviews);
  fetchApprovedPgsAndReviewsRef.current = fetchApprovedPgsAndReviews;

  const fetchOwnerPgsRef = useRef(fetchOwnerPgs);
  fetchOwnerPgsRef.current = fetchOwnerPgs;

  const fetchNotificationsRef = useRef(fetchNotifications);
  fetchNotificationsRef.current = fetchNotifications;

  const fetchSavedPgsRef = useRef(fetchSavedPgs);
  fetchSavedPgsRef.current = fetchSavedPgs;

  // Initial load guarded by ref: runs once on mount, and once whenever user auth/role changes
  const hasFetchedInitialRef = useRef(false);
  const lastFetchedUserKeyRef = useRef(null);

  useEffect(() => {
    const user = currentUser;
    const userKey = user?.id ? `${user.id}_${user.role}` : 'guest';

    if (lastFetchedUserKeyRef.current === userKey && hasFetchedInitialRef.current) {
      return;
    }
    hasFetchedInitialRef.current = true;
    lastFetchedUserKeyRef.current = userKey;

    let mounted = true;

    (async () => {
      if (user?.role === 'admin') {
        await fetchAdminData();
      } else {
        await fetchApprovedPgsAndReviews();
        if (user?.role === 'owner') {
          await fetchOwnerPgs();
        }
      }

      if (user?.id) {
        await fetchSavedPgs();
        await fetchNotifications();
      }
    })();

    return () => {
      mounted = false;
    };
  }, [currentUser?.id, currentUser?.role, fetchAdminData, fetchApprovedPgsAndReviews, fetchOwnerPgs, fetchSavedPgs, fetchNotifications]);

  // Realtime subscription for instant notifications and listings updates without re-subscription churn
  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId) return;

    const notifChannel = supabase
      .channel(`realtime-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          if (!payload.new && !payload.old) return;
          const user = currentUserRef.current;
          if (!user) return;

          const targetUserId = payload.new ? payload.new.user_id : payload.old?.user_id;
          const targetRole = (payload.new?.target_role || payload.new?.targetRole || payload.old?.target_role || payload.old?.targetRole || '').toLowerCase();
          const isTargetedToCurrent = targetUserId && String(targetUserId) === String(user.id);
          const isAdminAlert = !targetUserId || targetRole === 'admin';

          const shouldReceive =
            user.role === 'admin'
              ? Boolean(isAdminAlert || isTargetedToCurrent)
              : Boolean(isTargetedToCurrent || (targetRole && targetRole === user.role));

          if (!shouldReceive) return;

          if (payload.eventType === 'INSERT') {
            const newNotif = {
              id: String(payload.new.id),
              userId: payload.new.user_id,
              targetRole: payload.new.target_role,
              message: payload.new.message,
              type: payload.new.type,
              relatedId: payload.new.related_id,
              isRead: !!payload.new.is_read,
              createdAt: payload.new.created_at,
            };

            if (!isNotificationRelevantForRole(newNotif, user)) {
              return;
            }

            setNotifications((prev) => [
              newNotif,
              ...prev.filter((n) => n.id !== newNotif.id),
            ]);
            setUnreadCount((c) => c + 1);
            toast(payload.new.message, {
              icon: '🔔',
              duration: 5000,
            });

            if (user.role === 'admin') {
              fetchAdminDataRef.current?.();
            }
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === String(payload.new.id)
                  ? { ...n, isRead: !!payload.new.is_read }
                  : n
              )
            );
            setUnreadCount((prev) =>
              payload.new.is_read ? Math.max(0, prev - 1) : prev + 1
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== String(payload.old.id))
            );
          }
        }
      )
      .subscribe();

    const pgChannel = supabase
      .channel(`realtime-pgs-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pg_listings',
        },
        async () => {
          const user = currentUserRef.current;
          if (user?.role === 'admin') {
            await fetchAdminDataRef.current?.();
            await fetchNotificationsRef.current?.();
          } else {
            await fetchApprovedPgsAndReviewsRef.current?.();
            if (user?.role === 'owner') {
              await fetchOwnerPgsRef.current?.();
            }
          }
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel(`realtime-profiles-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        async () => {
          const user = currentUserRef.current;
          if (user?.role === 'admin') {
            await fetchAdminDataRef.current?.();
            await fetchNotificationsRef.current?.();
          } else {
            await fetchApprovedPgsAndReviewsRef.current?.();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(pgChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [currentUser?.id]);

  // ── PG Queries ──
  const getApprovedPGs = useCallback(
    () =>
      pgs.filter(
        (pg) =>
          pg.isVerified ||
          pg.status === 'approved' ||
          pg.status === 'pending_update' ||
          pg.status === 'pending_delete'
      ),
    [pgs]
  );

  const getPGById = useCallback(
    (id) => pgs.find((pg) => String(pg.id) === String(id)) || ownerPgs.find((pg) => String(pg.id) === String(id)),
    [pgs, ownerPgs]
  );

  const getOwnerPGs = useCallback(
    (ownerId) =>
      currentUser?.role === 'admin'
        ? pgs
        : ownerPgs.length > 0
        ? ownerPgs
        : pgs.filter((p) => String(p.ownerId) === String(ownerId || currentUser?.id)),
    [currentUser?.role, currentUser?.id, ownerPgs, pgs]
  );

  const getOwnerPGById = useCallback(
    (id) => (currentUser?.role === 'admin' ? pgs : ownerPgs).find((p) => String(p.id) === String(id)),
    [currentUser?.role, pgs, ownerPgs]
  );

  // ── PG Mutations ──
  const addPG = useCallback(
    async (pgData, ownerId) => {
      const user = currentUserRef.current;
      const currentUid = user?.id || ownerId;
      const ownerName = user?.name || user?.full_name || 'Property Owner';
      const cleanDoc = extractDocUrl(pgData.kyc_doc_url || pgData.propertyDocument || user?.kyc_doc_url);
      const isVerified = Boolean(cleanDoc && user?.kyc_status === 'verified');

      const { data, error } = await supabase
        .from('pg_listings')
        .insert({
          owner_id: currentUid,
          title: pgData.title,
          description: pgData.description,
          locality: pgData.location?.city || pgData.city || 'Gangtok',
          address: pgData.location?.address || pgData.address || '',
          rent: Number(pgData.price),
          deposit: Number(pgData.deposit || 0),
          room_type: pgData.roomType,
          gender_preference: pgData.genderPreference,
          amenities: pgData.amenities || [],
          rules: pgData.rules || [],
          images: pgData.images || [],
          contact_number: pgData.contactNumber,
          kyc_doc_url: cleanDoc || null,
          is_verified: isVerified,
          status: 'approved',
        })
        .select()
        .single();

      if (error) throw error;
      await fetchApprovedPgsAndReviews();
      await fetchOwnerPgs();
      if (user?.role === 'admin') await fetchAdminData();

      // Notify the owner
      if (currentUid) {
        await createNotification({
          userId: currentUid,
          targetRole: 'owner',
          message: `Your PG listing "${pgData.title}" has been published and is now live.`,
          type: 'ADD_PG',
          relatedId: data?.id,
        });
      }

      // Notify Admin
      await createNotification({
        userId: null,
        targetRole: 'admin',
        message: `New PG "${pgData.title}" was listed by ${ownerName}.`,
        type: 'ADD_PG',
        relatedId: data?.id,
      });

      return data;
    },
    [fetchApprovedPgsAndReviews, fetchOwnerPgs, fetchAdminData, createNotification]
  );

  const updatePG = useCallback(
    async (id, pgData) => {
      const user = currentUserRef.current;
      const ownerName = user?.name || user?.full_name || 'Property Owner';
      const cleanDoc = extractDocUrl(pgData.kyc_doc_url || pgData.propertyDocument || user?.kyc_doc_url);
      const isVerified = Boolean(cleanDoc && user?.kyc_status === 'verified');

      const { error } = await supabase
        .from('pg_listings')
        .update({
          title: pgData.title,
          description: pgData.description,
          locality: pgData.location?.city || pgData.city,
          address: pgData.location?.address || pgData.address,
          rent: Number(pgData.price),
          deposit: Number(pgData.deposit || 0),
          room_type: pgData.roomType,
          gender_preference: pgData.genderPreference,
          amenities: pgData.amenities,
          rules: pgData.rules,
          images: pgData.images,
          contact_number: pgData.contactNumber,
          kyc_doc_url: cleanDoc || null,
          is_verified: isVerified,
          status: 'approved',
        })
        .eq('id', id);

      if (error) throw error;
      await fetchApprovedPgsAndReviews();
      await fetchOwnerPgs();
      if (user?.role === 'admin') await fetchAdminData();

      if (user?.id) {
        await createNotification({
          userId: user.id,
          targetRole: 'owner',
          message: `Your updates to "${pgData.title}" have been saved and are now live.`,
          type: 'UPDATE_PG',
          relatedId: id,
        });
      }

      // Notify Admin
      await createNotification({
        userId: null,
        targetRole: 'admin',
        message: `PG "${pgData.title}" was updated by ${ownerName}.`,
        type: 'UPDATE_PG',
        relatedId: id,
      });
    },
    [fetchApprovedPgsAndReviews, fetchOwnerPgs, fetchAdminData, createNotification]
  );

  const deletePG = useCallback(
    async (id, reason = '') => {
      const user = currentUserRef.current;
      const currentPgs = pgsRef.current;
      const currentOwnerPgs = ownerPgsRef.current;

      if (user?.role === 'admin') {
        const target = currentPgs.find((p) => String(p.id) === String(id));
        const { error } = await supabase.from('pg_listings').delete().eq('id', id);
        if (error) throw error;
        if (target?.ownerId && String(target.ownerId) !== String(user?.id)) {
          await createNotification({
            userId: target.ownerId,
            targetRole: 'owner',
            message: `Your PG listing "${target.title}" was deleted by admin.`,
            type: 'DELETE_PG',
            relatedId: id,
          });
        }
        await fetchApprovedPgsAndReviews();
        await fetchAdminData();
      } else {
        const { error } = await supabase
          .from('pg_listings')
          .update({ status: 'pending_delete', delete_request_reason: reason })
          .eq('id', id);
        if (error) throw error;
        await fetchOwnerPgs();

        const target = (currentOwnerPgs.length > 0 ? currentOwnerPgs : currentPgs).find((p) => String(p.id) === String(id));
        if (user?.id) {
          await createNotification({
            userId: user.id,
            targetRole: 'owner',
            message: `Your deletion request for "${target?.title || 'PG'}" was submitted for admin review.`,
            type: 'DELETE_PG',
            relatedId: id,
          });
        }

        await createNotification({
          userId: null,
          targetRole: 'admin',
          message: `Deletion request submitted for PG "${target?.title || 'PG'}" by ${user?.name || 'Owner'}. Reason: ${reason || 'Requested by owner'}`,
          type: 'DELETE_PG',
          relatedId: id,
        });
      }
    },
    [fetchAdminData, fetchApprovedPgsAndReviews, fetchOwnerPgs, createNotification]
  );

  const approveDeletePG = useCallback(
    async (id) => {
      const target = pgsRef.current.find((p) => String(p.id) === String(id));
      const { error } = await supabase.from('pg_listings').delete().eq('id', id);
      if (error) throw error;

      if (target?.ownerId) {
        await createNotification({
          userId: target.ownerId,
          targetRole: 'owner',
          message: `Your deletion request for "${target.title}" was approved by admin, and the listing has been removed.`,
          type: 'DELETE_PG',
          relatedId: id,
        });
      }

      setNotifications((prev) => {
        const next = prev.filter(
          (n) => String(n.relatedId) !== String(id) && String(n.id) !== `pending-delete-${id}`
        );
        setUnreadCount(next.filter((x) => !x.isRead).length);
        return next;
      });

      await fetchApprovedPgsAndReviews();
      await fetchAdminData();
      await fetchNotifications();
    },
    [createNotification, fetchApprovedPgsAndReviews, fetchAdminData, fetchNotifications]
  );

  const rejectDeletePG = useCallback(
    async (id, reason = '') => {
      const target = pgsRef.current.find((p) => String(p.id) === String(id));
      const { error } = await supabase
        .from('pg_listings')
        .update({
          status: 'approved',
          is_verified: true,
          delete_request_reason: null,
        })
        .eq('id', id);
      if (error) throw error;

      if (target?.ownerId) {
        await createNotification({
          userId: target.ownerId,
          targetRole: 'owner',
          message: `Your deletion request for "${target.title}" was declined by admin. Reason: ${reason || 'Listing must remain active'}`,
          type: 'PG_STATUS_UPDATE',
          relatedId: id,
        });
      }

      setNotifications((prev) => {
        const next = prev.filter(
          (n) => String(n.relatedId) !== String(id) && String(n.id) !== `pending-delete-${id}`
        );
        setUnreadCount(next.filter((x) => !x.isRead).length);
        return next;
      });

      await fetchApprovedPgsAndReviews();
      await fetchAdminData();
      await fetchNotifications();
    },
    [createNotification, fetchApprovedPgsAndReviews, fetchAdminData, fetchNotifications]
  );

  const approvePG = useCallback(
    async (id) => {
      const { error } = await supabase
        .from('pg_listings')
        .update({ is_verified: true, status: 'approved' })
        .eq('id', id);
      if (error) throw error;
      const target = pgsRef.current.find((p) => String(p.id) === String(id));
      if (target?.ownerId) {
        await createNotification({
          userId: target.ownerId,
          targetRole: 'owner',
          message: `Great news! Your PG listing "${target.title}" has been approved and is now live.`,
          type: 'PG_STATUS_UPDATE',
          relatedId: id,
        });
      }
      await fetchAdminData();
    },
    [createNotification, fetchAdminData]
  );

  const rejectPG = useCallback(
    async (id, reason) => {
      const { error } = await supabase
        .from('pg_listings')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', id);
      if (error) throw error;
      const target = pgsRef.current.find((p) => String(p.id) === String(id));
      if (target?.ownerId) {
        await createNotification({
          userId: target.ownerId,
          targetRole: 'owner',
          message: `Your PG listing "${target.title}" was rejected. Reason: ${reason || 'Guidelines not met'}`,
          type: 'PG_STATUS_UPDATE',
          relatedId: id,
        });
      }
      await fetchAdminData();
    },
    [createNotification, fetchAdminData]
  );

  // ── Save PGs ──
  const savePGToggle = useCallback(
    async (arg1, arg2) => {
      const user = currentUserRef.current;
      const pgId = arg2 !== undefined ? arg2 : arg1;
      const uid = (arg2 !== undefined && arg1) ? arg1 : user?.id;
      if (!uid || !pgId) return;

      const targetPg = pgsRef.current.find((p) => String(p.id) === String(pgId));
      const pgTitle = targetPg?.title || 'PG accommodation';
      const isSaved = savedPgsRef.current.some((s) => String(s.id) === String(pgId));

      try {
        if (isSaved) {
          await supabase.from('saved_pgs').delete().match({ user_id: uid, pg_id: pgId });
          await createNotification({
            userId: uid,
            message: `Removed "${pgTitle}" from your Saved PGs.`,
            type: 'SAVED_PG',
            relatedId: pgId,
          });
        } else {
          await supabase.from('saved_pgs').insert({ user_id: uid, pg_id: pgId });
          await createNotification({
            userId: uid,
            message: `Saved "${pgTitle}" to your wishlist! View it anytime from your dashboard.`,
            type: 'SAVED_PG',
            relatedId: pgId,
          });
        }
      } catch (err) {
        console.warn('Notice saving PG toggle in Supabase:', err);
      }

      await fetchSavedPgs();
    },
    [fetchSavedPgs, createNotification]
  );

  const getSavedPGs = useCallback(() => savedPgs, [savedPgs]);

  // ── Reviews ──
  const addReview = useCallback(
    async (pgId, userId, userName, rating, comment) => {
      const user = currentUserRef.current;
      const uid = userId || user?.id;
      const { error } = await supabase.from('reviews').insert({
        pg_id: pgId,
        user_id: uid,
        rating: Number(rating),
        comment,
      });

      if (error) throw error;

      // Re-fetch reviews for this PG
      const { data: updatedReviews } = await supabase
        .from('reviews')
        .select('*, profiles(full_name, avatar_url)')
        .eq('pg_id', pgId);

      const mappedReviews = (updatedReviews || []).map(mapReview);
      setReviews((prev) => {
        const next = [
          ...prev.filter((r) => String(r.pgId) !== String(pgId)),
          ...mappedReviews,
        ];
        reviewsRef.current = next;
        return next;
      });

      const sum = mappedReviews.reduce((acc, r) => acc + Number(r.rating), 0);
      const count = mappedReviews.length;
      const avg = count > 0 ? Number((sum / count).toFixed(1)) : 0;

      setPgs((prev) => {
        const next = prev.map((p) =>
          String(p.id) === String(pgId)
            ? { ...p, averageRating: avg, totalReviews: count }
            : p
        );
        pgsRef.current = next;
        return next;
      });

      // Update Supabase pg_listings metrics
      try {
        const { error: metricsErr } = await supabase
          .from('pg_listings')
          .update({ average_rating: avg, total_reviews: count })
          .eq('id', pgId);
        if (metricsErr) {
          console.warn('Notice updating listing rating metrics:', metricsErr.message);
        }
      } catch (err) {
        console.warn('Notice updating listing rating metrics:', err);
      }

      const targetPg = pgsRef.current.find((p) => String(p.id) === String(pgId));
      if (targetPg?.ownerId && String(targetPg.ownerId) !== String(uid)) {
        await createNotification({
          userId: targetPg.ownerId,
          message: `${userName || 'A tenant'} left a ${rating}-star review on "${targetPg.title}".`,
          type: 'REVIEW',
          relatedId: pgId,
        });
      }

      // Also create notification for the reviewer
      if (uid) {
        await createNotification({
          userId: uid,
          message: `Thank you for reviewing "${targetPg?.title || 'the accommodation'}"! Your ${rating}-star feedback helps other students.`,
          type: 'REVIEW',
          relatedId: pgId,
        });
      }
    },
    [mapReview, createNotification]
  );

  const getPGReviews = useCallback(
    (pgId) => reviews.filter((r) => String(r.pgId) === String(pgId)),
    [reviews]
  );

  // ── Reports ──
  const reportPG = useCallback(async (pgId, userId, reason) => {
    await createNotification({
      userId: null,
      targetRole: 'admin',
      message: `Report filed for PG #${pgId}: ${reason}`,
      type: 'REPORT_PG',
      relatedId: pgId,
    });
  }, [createNotification]);

  // ── Admin Users Management ──
  const approveOwner = useCallback(
    async (userId) => {
      const target = usersRef.current.find((u) => String(u.id) === String(userId));
      const hasDocs = Boolean(
        target?.kyc_doc_url ||
        target?.kyc_id_doc_url ||
        target?.propertyDocumentUrl ||
        target?.identityDocumentUrl ||
        target?.ownerRequestDetails?.propertyDocumentUrl ||
        target?.ownerRequestDetails?.identityDocumentUrl
      );

      // Optimistically update local users state immediately
      setUsers((prev) => {
        const next = prev.map((u) =>
          String(u.id) === String(userId)
            ? {
                ...u,
                role: 'owner',
                kyc_status: hasDocs ? 'verified' : 'unsubmitted',
                ownerRequestStatus: 'approved',
              }
            : u
        );
        usersRef.current = next;
        return next;
      });

      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'owner',
          kyc_status: hasDocs ? 'verified' : 'unsubmitted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        await fetchAdminData();
        throw error;
      }

      try {
        await createNotification({
          userId,
          targetRole: 'owner',
          message: hasDocs
            ? 'Congratulations! Your owner verification request and documents have been approved. Your properties will show as Verified.'
            : 'Congratulations! Your owner request has been approved. You can now list properties (they will show as Not Verified until verification documents are uploaded).',
          type: 'OWNER_APPROVED',
        });
      } catch (notifErr) {
        console.warn('Could not send owner approval notification:', notifErr);
      }

      await Promise.all([fetchAdminData(), fetchNotifications()]);
    },
    [createNotification, fetchAdminData, fetchNotifications]
  );

  const rejectOwner = useCallback(
    async (userId, reason = '') => {
      // Optimistically update local users state immediately
      setUsers((prev) => {
        const next = prev.map((u) =>
          String(u.id) === String(userId)
            ? {
                ...u,
                role: 'student',
                kyc_status: 'rejected',
                ownerRequestStatus: 'none',
              }
            : u
        );
        usersRef.current = next;
        return next;
      });

      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'student',
          kyc_status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        await fetchAdminData();
        throw error;
      }

      const rejectMessage = reason?.trim()
        ? `Your owner verification request was declined. Reason: ${reason.trim()}`
        : 'Your owner verification request was declined by admin. Please review your details and re-apply.';

      try {
        await createNotification({
          userId,
          targetRole: 'student',
          message: rejectMessage,
          type: 'OWNER_REJECTED',
        });
      } catch (notifErr) {
        console.warn('Could not send owner rejection notification:', notifErr);
      }

      await Promise.all([fetchAdminData(), fetchNotifications()]);
    },
    [createNotification, fetchAdminData, fetchNotifications]
  );

  const blockUser = useCallback(
    async (userId) => {
      const target = usersRef.current.find((u) => String(u.id) === String(userId));
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: !target?.isBlocked })
        .eq('id', userId);
      if (error) throw error;
      await fetchAdminData();
    },
    [fetchAdminData]
  );

  const changeUserRole = useCallback(
    async (userId, newRole) => {
      const updates = {
        role: newRole,
        updated_at: new Date().toISOString(),
      };
      if (newRole === 'owner') {
        const target = usersRef.current.find((u) => String(u.id) === String(userId));
        const hasDocs = Boolean(
          target?.ownerRequestDetails?.propertyDocumentUrl ||
          target?.ownerRequestDetails?.identityDocumentUrl ||
          target?.kyc_doc_url
        );
        updates.kyc_status = hasDocs ? 'verified' : 'unsubmitted';
      }
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      if (error) throw error;

      // Optimistically update local users state
      setUsers((prev) => {
        const next = prev.map((u) => {
          if (String(u.id) === String(userId)) {
            return {
              ...u,
              role: newRole,
              ownerRequestStatus: newRole === 'owner' ? 'approved' : u.ownerRequestStatus,
            };
          }
          return u;
        });
        usersRef.current = next;
        return next;
      });

      const roleLabel = (newRole === 'student' || newRole === 'user') ? 'Student / User' : newRole.toUpperCase();
      await createNotification({
        userId,
        targetRole: newRole,
        message: `Your account role has been updated to "${roleLabel}".`,
        type: 'USER_ROLE',
      });

      await fetchAdminData();
    },
    [createNotification, fetchAdminData]
  );

  const requestOwner = useCallback(
    async ({ fullName, phoneNumber, propertyDocument, identityDocument }) => {
      const user = currentUserRef.current;
      if (!user?.id) throw new Error('You must be logged in to request owner access');

      let propUrl = typeof propertyDocument === 'string' ? propertyDocument : '';
      let idUrl = typeof identityDocument === 'string' ? identityDocument : '';

      // Extract user's name from form input, auth metadata, profiles context, or email prefix fallback
      let userName =
        fullName ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.name ||
        user?.full_name ||
        (user?.email ? user.email.split('@')[0] : '');

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
          console.warn('Could not fetch Supabase session for KYC upload name:', e);
        }
      }

      if (!userName) userName = 'user';

      if (propertyDocument && typeof propertyDocument !== 'string') {
        propUrl = await uploadFileToCloudinary(propertyDocument, 'document', userName);
      }
      if (identityDocument && typeof identityDocument !== 'string') {
        idUrl = await uploadFileToCloudinary(identityDocument, 'document', userName);
      }

      // Sanitize document URLs: ensure profile photo or avatar URLs are NEVER stored as document URLs
      const userAvatar = user?.avatar_url || user?.avatar || '';
      const resolvedPropDoc =
        propUrl && propUrl !== userAvatar && !propUrl.includes('/user_profiles/')
          ? propUrl
          : (user?.kyc_doc_url && user.kyc_doc_url !== userAvatar && !user.kyc_doc_url.includes('/user_profiles/')
              ? user.kyc_doc_url
              : null);

      const resolvedIdDoc =
        idUrl && idUrl !== userAvatar && !idUrl.includes('/user_profiles/')
          ? idUrl
          : (user?.kyc_id_doc_url && user.kyc_id_doc_url !== userAvatar && !user.kyc_id_doc_url.includes('/user_profiles/')
              ? user.kyc_id_doc_url
              : null);

      const updates = {
        full_name: fullName,
        phone: phoneNumber,
        kyc_status: 'pending',
        kyc_doc_url: resolvedPropDoc,
        kyc_id_doc_url: resolvedIdDoc,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      const hasDocs = Boolean(propUrl || idUrl);

      await createNotification({
        userId: user.id,
        targetRole: 'student',
        message: hasDocs
          ? 'Your request to become a PG owner (with verification documents) has been submitted for admin review.'
          : 'Your request to become a PG owner has been submitted. (Your listings will show as Not Verified until verification documents are uploaded)',
        type: 'OWNER_REQUEST',
      });

      await createNotification({
        userId: null,
        targetRole: 'admin',
        message: `${fullName || user.name} submitted an owner request ${hasDocs ? 'with verification documents' : '(without documents - unverified)'}.`,
        type: 'OWNER_REQUEST',
        relatedId: user.id,
      });

      await Promise.all([fetchAdminData?.(), fetchNotifications?.()]);
    },
    [createNotification, fetchAdminData, fetchNotifications]
  );

  const markNotificationsRead = useCallback(async () => {
    const user = currentUserRef.current;
    if (!user?.id) return;
    try {
      if (user?.role === 'admin') {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .or('target_role.eq.admin,user_id.is.null');
      } else {
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
      }
    } catch (e) {
      console.warn('Notice updating all notifications is_read:', e);
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  const markOneRead = useCallback(
    async (id) => {
      if (!id) return;
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      } catch (e) {
        console.warn('Notice updating notification is_read:', e);
      }

      setNotifications((prev) => {
        const next = prev.map((n) => (String(n.id) === String(id) ? { ...n, isRead: true } : n));
        setUnreadCount(next.filter((x) => !x.isRead).length);
        return next;
      });
    },
    []
  );

  const markOneUnread = useCallback(
    async (id) => {
      if (!id) return;
      try {
        await supabase.from('notifications').update({ is_read: false }).eq('id', id);
      } catch (e) {
        console.warn('Notice updating notification is_read false:', e);
      }

      setNotifications((prev) => {
        const next = prev.map((n) => (String(n.id) === String(id) ? { ...n, isRead: false } : n));
        setUnreadCount(next.filter((x) => !x.isRead).length);
        return next;
      });
    },
    []
  );

  const deleteNotification = useCallback(
    async (id) => {
      if (!id) return;
      try {
        await supabase.from('notifications').delete().eq('id', id);
      } catch (e) {
        console.warn('Notice deleting notification from Supabase:', e);
      }

      setNotifications((prev) => {
        const next = prev.filter((n) => String(n.id) !== String(id));
        setUnreadCount(next.filter((x) => !x.isRead).length);
        return next;
      });
    },
    []
  );

  const clearAllNotifications = useCallback(async () => {
    const user = currentUserRef.current;
    if (!user?.id) return;
    try {
      if (user?.role === 'admin') {
        await supabase.from('notifications').delete().or('target_role.eq.admin,user_id.is.null');
      } else {
        await supabase.from('notifications').delete().eq('user_id', user.id);
      }
    } catch (e) {
      console.warn('Notice clearing notifications from Supabase:', e);
    }

    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const getUnreadCount = useCallback(() => unreadCount, [unreadCount]);

  const value = useMemo(
    () => ({
      pgs,
      notifications,
      reviews,
      users,
      getApprovedPGs,
      getPGById,
      getOwnerPGs,
      getOwnerPGById,
      addPG,
      updatePG,
      deletePG,
      approveDeletePG,
      rejectDeletePG,
      approvePG,
      rejectPG,
      savePGToggle,
      getSavedPGs,
      addReview,
      getPGReviews,
      reportPG,
      approveOwner,
      rejectOwner,
      blockUser,
      changeUserRole,
      requestOwner,
      createNotification,
      markNotificationsRead,
      markOneRead,
      markOneUnread,
      deleteNotification,
      clearAllNotifications,
      getUnreadCount,
      fetchAdminData,
      fetchNotifications,
    }),
    [
      pgs,
      notifications,
      reviews,
      users,
      getApprovedPGs,
      getPGById,
      getOwnerPGs,
      getOwnerPGById,
      addPG,
      updatePG,
      deletePG,
      approveDeletePG,
      rejectDeletePG,
      approvePG,
      rejectPG,
      savePGToggle,
      getSavedPGs,
      addReview,
      getPGReviews,
      reportPG,
      approveOwner,
      rejectOwner,
      blockUser,
      changeUserRole,
      requestOwner,
      createNotification,
      markNotificationsRead,
      markOneRead,
      markOneUnread,
      deleteNotification,
      clearAllNotifications,
      getUnreadCount,
      fetchAdminData,
      fetchNotifications,
    ]
  );

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
