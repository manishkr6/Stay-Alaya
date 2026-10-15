import { createContext, useState, useCallback, useContext, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from './AuthContext';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

export const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { currentUser } = useContext(AuthContext);

  const [pgs, setPgs] = useState([]);
  const [ownerPgs, setOwnerPgs] = useState([]);
  const [savedPgs, setSavedPgs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const mapPG = (pg) => {
    if (!pg) return null;
    const id = String(pg.id);
    const ownerId = String(pg.owner_id || pg.ownerId || '');
    const ownerProfile = pg.profiles || {};

    const ownerDoc = ownerProfile.kyc_doc_url || (currentUser?.id === ownerId ? currentUser?.kyc_doc_url : null);
    const ownerIdDoc = ownerProfile.kyc_id_doc_url || (currentUser?.id === ownerId ? currentUser?.kyc_id_doc_url : null);
    const hasDocuments = Boolean(
      (pg.kyc_doc_url && pg.kyc_doc_url.trim()) ||
      (ownerDoc && ownerDoc.trim()) ||
      (ownerIdDoc && ownerIdDoc.trim())
    );

    return {
      ...pg,
      id,
      ownerId,
      ownerName: ownerProfile.full_name || pg.ownerName || 'Property Owner',
      ownerEmail: ownerProfile.email || pg.ownerEmail || '',
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
      contactNumber: pg.contact_number || pg.contactNumber || '+919876543210',
      averageRating: Number(pg.average_rating || pg.averageRating || 0),
      totalReviews: Number(pg.total_reviews || pg.totalReviews || 0),
      status: pg.status || (pg.is_verified ? 'approved' : 'pending'),
      deleteRequestReason: pg.delete_request_reason || pg.deleteRequestReason || '',
      rejectionReason: pg.rejection_reason || pg.rejectionReason || '',
      isVerified: hasDocuments,
      hasDocuments,
      isAvailable: pg.is_available !== false,
      createdAt: pg.created_at ? pg.created_at.split('T')[0] : '',
    };
  };

  const mapReview = (r) => ({
    id: String(r.id),
    pgId: String(r.pg_id || r.pgId),
    userId: String(r.user_id || r.userId),
    userName: r.profiles?.full_name || r.userName || 'Student / User',
    rating: Number(r.rating),
    comment: r.comment,
    createdAt: r.created_at ? r.created_at.split('T')[0] : '',
  });

  const mapUser = (u) => {
    const hasDocs = Boolean(u.kyc_doc_url || u.kyc_id_doc_url);
    const isOwner = u.role === 'owner';
    const isApprovedOwner = isOwner || u.kyc_status === 'verified' || (u.kyc_status === 'unverified' && isOwner);

    return {
      id: String(u.id),
      name: u.full_name || u.name || 'User',
      email: u.email,
      phone: u.phone || '',
      role: u.role || 'student',
      ownerRequestStatus: isApprovedOwner ? 'approved' : u.kyc_status || 'none',
      ownerRequestDetails: (u.kyc_status && u.kyc_status !== 'none') || u.kyc_doc_url || u.kyc_id_doc_url
        ? {
            id: String(u.id),
            phoneNumber: u.phone || '',
            propertyDocumentUrl: u.kyc_doc_url || '',
            identityDocumentUrl: u.kyc_id_doc_url || '',
            hasUploadedDocs: hasDocs,
            status: u.kyc_status,
            requestedAt: u.updated_at || u.created_at,
          }
        : null,
      isBlocked: !!u.is_blocked,
      lastSignIn: u.last_sign_in_at || u.updated_at || u.created_at,
      createdAt: u.created_at,
    };
  };

  const fetchApprovedPgsAndReviews = useCallback(async () => {
    try {
      const { data: pgsData, error: pgsErr } = await supabase
        .from('pg_listings')
        .select('*, profiles(full_name, email, phone, kyc_doc_url, kyc_id_doc_url, kyc_status)')
        .eq('is_verified', true)
        .order('created_at', { ascending: false });

      if (pgsErr) throw pgsErr;

      const mappedPgs = (pgsData || []).map(mapPG).filter(Boolean);
      setPgs(mappedPgs);

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      setReviews((reviewsData || []).map(mapReview));
    } catch (err) {
      console.warn('Failed to fetch PGs from Supabase:', err);
    }
  }, []);

  const fetchOwnerPgs = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('pg_listings')
        .select('*, profiles(full_name, email, phone, kyc_doc_url, kyc_id_doc_url, kyc_status)')
        .eq('owner_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOwnerPgs((data || []).map(mapPG).filter(Boolean));
    } catch (err) {
      console.warn('Failed to fetch owner PGs from Supabase:', err);
    }
  }, [currentUser?.id]);

  const fetchSavedPgs = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('saved_pgs')
        .select('*, pg_listings(*, profiles(full_name, email, phone, kyc_doc_url, kyc_id_doc_url, kyc_status))')
        .eq('user_id', currentUser.id);

      if (error) throw error;
      const list = (data || []).map((item) => mapPG(item.pg_listings)).filter(Boolean);
      setSavedPgs(list);
    } catch (err) {
      console.warn('Failed to fetch saved PGs from Supabase:', err);
    }
  }, [currentUser?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentUser?.role === 'admin') {
        // Admin sees:
        // 1. Admin/system alerts (user_id IS NULL)
        // 2. Personal notifications directly addressed to this admin
        query = query.or(`user_id.is.null,user_id.eq.${currentUser.id}`);
      } else {
        // Students, Users, Owners ONLY see their own personal notifications
        query = query.eq('user_id', currentUser.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      const mapped = (data || []).map((n) => ({
        id: String(n.id),
        userId: n.user_id,
        message: n.message,
        type: n.type,
        relatedId: n.related_id,
        isRead: !!n.is_read,
        createdAt: n.created_at,
      }));
      setNotifications(mapped);
      setUnreadCount(mapped.filter((x) => !x.isRead).length);
    } catch (err) {
      console.warn('Failed to fetch notifications from Supabase:', err);
    }
  }, [currentUser?.id, currentUser?.role]);

  const createNotification = useCallback(
    async ({ userId, message, type = 'info', relatedId = null }) => {
      try {
        const payload = {
          user_id: userId || null,
          message,
          type,
          related_id: relatedId ? String(relatedId) : null,
          is_read: false,
        };

        const { error } = await supabase
          .from('notifications')
          .insert(payload);

        if (error) {
          console.warn('Failed to insert notification in Supabase:', error);
          return null;
        }

        // Only refresh local notifications if this notification is meant for the current viewer
        const isTargetedToCurrent = payload.user_id && String(payload.user_id) === String(currentUser?.id);
        const isAdminAlert = !payload.user_id;
        const shouldRefresh =
          currentUser?.role === 'admin'
            ? Boolean(isAdminAlert || isTargetedToCurrent)
            : Boolean(isTargetedToCurrent);

        if (shouldRefresh) {
          await fetchNotifications();
        }
      } catch (err) {
        console.warn('createNotification exception:', err);
        return null;
      }
    },
    [currentUser?.id, currentUser?.role, fetchNotifications]
  );

  const fetchAdminData = useCallback(async () => {
    if (currentUser?.role !== 'admin') return;
    try {
      const [pgsRes, usersRes] = await Promise.all([
        supabase.from('pg_listings').select('*, profiles(*)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      ]);

      if (pgsRes.data) setPgs(pgsRes.data.map(mapPG));
      if (usersRes.data) setUsers(usersRes.data.map(mapUser));
    } catch (err) {
      console.warn('Failed to fetch admin data from Supabase:', err);
    }
  }, [currentUser?.role]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (currentUser?.role === 'admin') {
        await fetchAdminData();
      } else {
        await fetchApprovedPgsAndReviews();
        if (currentUser?.role === 'owner') await fetchOwnerPgs();
      }

      if (currentUser?.id) {
        await fetchSavedPgs();
        await fetchNotifications();
      }
    })();

    return () => {
      mounted = false;
    };
  }, [currentUser?.id, currentUser?.role, fetchApprovedPgsAndReviews, fetchOwnerPgs, fetchSavedPgs, fetchNotifications, fetchAdminData]);

  // Realtime subscription for instant notifications without page refresh
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel(`realtime-notifications-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          if (!payload.new && !payload.old) return;
          const targetUserId = payload.new ? payload.new.user_id : payload.old?.user_id;
          const isTargetedToCurrent = targetUserId && String(targetUserId) === String(currentUser.id);
          const isAdminAlert = !targetUserId;

          // Admin only receives:
          // 1. Admin/system alerts (user_id is null)
          // 2. Personal notifications directly addressed to this admin
          // Students, Users, Owners only receive:
          // Notifications specifically targeted to their user ID
          const shouldReceive =
            currentUser.role === 'admin'
              ? Boolean(isAdminAlert || isTargetedToCurrent)
              : Boolean(isTargetedToCurrent);

          if (!shouldReceive) return;

          if (payload.eventType === 'INSERT') {
            const newNotif = {
              id: String(payload.new.id),
              userId: payload.new.user_id,
              message: payload.new.message,
              type: payload.new.type,
              relatedId: payload.new.related_id,
              isRead: !!payload.new.is_read,
              createdAt: payload.new.created_at,
            };
            setNotifications((prev) => [
              newNotif,
              ...prev.filter((n) => n.id !== newNotif.id),
            ]);
            setUnreadCount((c) => c + 1);
            toast(payload.new.message, {
              icon: '🔔',
              duration: 5000,
            });
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.role]);

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
    (id) => pgs.find((pg) => String(pg.id) === String(id)),
    [pgs]
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
      const currentUid = currentUser?.id || ownerId;
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
          is_verified: true,
          status: 'approved',
        })
        .select()
        .single();

      if (error) throw error;
      await fetchApprovedPgsAndReviews();
      await fetchOwnerPgs();
      if (currentUser?.role === 'admin') await fetchAdminData();

      // Notify the owner
      if (currentUid) {
        await createNotification({
          userId: currentUid,
          message: `Your PG listing "${pgData.title}" has been published and is now live.`,
          type: 'ADD_PG',
          relatedId: data?.id,
        });
      }

      // Notify Admin
      await createNotification({
        userId: null,
        message: `New PG "${pgData.title}" was listed by ${currentUser?.name || 'an owner'}.`,
        type: 'ADD_PG',
        relatedId: data?.id,
      });

      return data;
    },
    [currentUser?.id, currentUser?.name, currentUser?.role, fetchApprovedPgsAndReviews, fetchOwnerPgs, fetchAdminData, createNotification]
  );

  const updatePG = useCallback(
    async (id, pgData) => {
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
          is_verified: true,
          status: 'approved',
        })
        .eq('id', id);

      if (error) throw error;
      await fetchApprovedPgsAndReviews();
      await fetchOwnerPgs();
      if (currentUser?.role === 'admin') await fetchAdminData();

      if (currentUser?.id) {
        await createNotification({
          userId: currentUser.id,
          message: `Your updates to "${pgData.title}" have been saved and are now live.`,
          type: 'UPDATE_PG',
          relatedId: id,
        });
      }

      await createNotification({
        userId: null,
        message: `PG "${pgData.title}" was updated by ${currentUser?.name || 'an owner'}.`,
        type: 'UPDATE_PG',
        relatedId: id,
      });
    },
    [currentUser?.id, currentUser?.name, currentUser?.role, fetchApprovedPgsAndReviews, fetchOwnerPgs, fetchAdminData, createNotification]
  );

  const deletePG = useCallback(
    async (id, reason = '') => {
      if (currentUser?.role === 'admin') {
        const target = pgs.find((p) => String(p.id) === String(id));
        const { error } = await supabase.from('pg_listings').delete().eq('id', id);
        if (error) throw error;
        if (target?.ownerId && String(target.ownerId) !== String(currentUser?.id)) {
          await createNotification({
            userId: target.ownerId,
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

        const target = (ownerPgs.length > 0 ? ownerPgs : pgs).find((p) => String(p.id) === String(id));
        if (currentUser?.id) {
          await createNotification({
            userId: currentUser.id,
            message: `Your deletion request for "${target?.title || 'PG'}" was submitted for admin review.`,
            type: 'DELETE_PG',
            relatedId: id,
          });
        }
        await createNotification({
          userId: null,
          message: `Deletion request submitted for PG "${target?.title || 'PG'}" by ${currentUser?.name || 'Owner'}. Reason: ${reason}`,
          type: 'DELETE_PG',
          relatedId: id,
        });
      }
    },
    [currentUser?.id, currentUser?.name, currentUser?.role, pgs, ownerPgs, fetchAdminData, fetchApprovedPgsAndReviews, fetchOwnerPgs, createNotification]
  );

  const approveDeletePG = useCallback(
    async (id) => {
      const target = pgs.find((p) => String(p.id) === String(id));
      const { error } = await supabase.from('pg_listings').delete().eq('id', id);
      if (error) throw error;

      if (target?.ownerId) {
        await createNotification({
          userId: target.ownerId,
          message: `Your deletion request for "${target.title}" was approved by admin, and the listing has been removed.`,
          type: 'DELETE_PG',
          relatedId: id,
        });
      }

      await fetchApprovedPgsAndReviews();
      await fetchAdminData();
    },
    [pgs, createNotification, fetchApprovedPgsAndReviews, fetchAdminData]
  );

  const rejectDeletePG = useCallback(
    async (id, reason = '') => {
      const target = pgs.find((p) => String(p.id) === String(id));
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
          message: `Your deletion request for "${target.title}" was declined by admin. Reason: ${reason || 'Listing must remain active'}`,
          type: 'PG_STATUS_UPDATE',
          relatedId: id,
        });
      }

      await fetchApprovedPgsAndReviews();
      await fetchAdminData();
    },
    [pgs, createNotification, fetchApprovedPgsAndReviews, fetchAdminData]
  );

  const approvePG = useCallback(
    async (id) => {
      const { error } = await supabase
        .from('pg_listings')
        .update({ is_verified: true, status: 'approved' })
        .eq('id', id);
      if (error) throw error;
      const target = pgs.find((p) => String(p.id) === String(id));
      if (target?.ownerId) {
        await createNotification({
          userId: target.ownerId,
          message: `Great news! Your PG listing "${target.title}" has been approved and is now live.`,
          type: 'PG_STATUS_UPDATE',
          relatedId: id,
        });
      }
      await fetchAdminData();
    },
    [pgs, createNotification, fetchAdminData]
  );

  const rejectPG = useCallback(
    async (id, reason) => {
      const { error } = await supabase
        .from('pg_listings')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', id);
      if (error) throw error;
      const target = pgs.find((p) => String(p.id) === String(id));
      if (target?.ownerId) {
        await createNotification({
          userId: target.ownerId,
          message: `Your PG listing "${target.title}" was rejected. Reason: ${reason || 'Guidelines not met'}`,
          type: 'PG_STATUS_UPDATE',
          relatedId: id,
        });
      }
      await fetchAdminData();
    },
    [pgs, createNotification, fetchAdminData]
  );

  // ── Save PGs ──
  const savePGToggle = useCallback(
    async (userId, pgId) => {
      const uid = userId || currentUser?.id;
      if (!uid) return;

      const isSaved = savedPgs.some((s) => String(s.id) === String(pgId));
      if (isSaved) {
        await supabase.from('saved_pgs').delete().match({ user_id: uid, pg_id: pgId });
      } else {
        await supabase.from('saved_pgs').insert({ user_id: uid, pg_id: pgId });
      }
      await fetchSavedPgs();
    },
    [currentUser?.id, savedPgs, fetchSavedPgs]
  );

  const getSavedPGs = useCallback(() => savedPgs, [savedPgs]);

  // ── Reviews ──
  const addReview = useCallback(
    async (pgId, userId, userName, rating, comment) => {
      const uid = userId || currentUser?.id;
      const { error } = await supabase.from('reviews').insert({
        pg_id: pgId,
        user_id: uid,
        rating: Number(rating),
        comment,
      });

      if (error) throw error;

      // Re-fetch reviews
      const { data: updatedReviews } = await supabase
        .from('reviews')
        .select('*, profiles(full_name)')
        .eq('pg_id', pgId);

      setReviews((prev) => [
        ...prev.filter((r) => String(r.pgId) !== String(pgId)),
        ...(updatedReviews || []).map(mapReview),
      ]);

      const targetPg = pgs.find((p) => String(p.id) === String(pgId));
      if (targetPg?.ownerId && String(targetPg.ownerId) !== String(uid)) {
        await createNotification({
          userId: targetPg.ownerId,
          message: `${userName || 'A tenant'} left a ${rating}-star review on "${targetPg.title}".`,
          type: 'REVIEW',
          relatedId: pgId,
        });
      }
    },
    [currentUser?.id, pgs, createNotification]
  );

  const getPGReviews = useCallback(
    (pgId) => reviews.filter((r) => String(r.pgId) === String(pgId)),
    [reviews]
  );

  // ── Reports ──
  const reportPG = useCallback(async (pgId, userId, reason) => {
    await createNotification({
      userId: null,
      message: `Report filed for PG #${pgId}: ${reason}`,
      type: 'REPORT_PG',
      relatedId: pgId,
    });
  }, [createNotification]);

  // ── Admin Users Management ──
  const approveOwner = useCallback(
    async (userId) => {
      const target = users.find((u) => String(u.id) === String(userId));
      const hasDocs = Boolean(
        target?.ownerRequestDetails?.propertyDocumentUrl ||
        target?.ownerRequestDetails?.identityDocumentUrl
      );

      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'owner',
          kyc_status: hasDocs ? 'verified' : 'unverified',
        })
        .eq('id', userId);
      if (error) throw error;

      await createNotification({
        userId,
        message: hasDocs
          ? 'Congratulations! Your owner verification request and documents have been approved. Your properties will show as Verified.'
          : 'Congratulations! Your owner request has been approved. You can now list properties (they will show as Not Verified until verification documents are uploaded).',
        type: 'OWNER_APPROVED',
      });

      await fetchAdminData();
    },
    [users, createNotification, fetchAdminData]
  );

  const rejectOwner = useCallback(
    async (userId, reason = '') => {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'student',
          kyc_status: 'rejected',
        })
        .eq('id', userId);
      if (error) throw error;

      const rejectMessage = reason?.trim()
        ? `Your owner verification request was declined. Reason: ${reason.trim()}`
        : 'Your owner verification request was declined by admin. Please review your details and re-apply.';

      await createNotification({
        userId,
        message: rejectMessage,
        type: 'OWNER_REJECTED',
      });

      await fetchAdminData();
    },
    [createNotification, fetchAdminData]
  );

  const blockUser = useCallback(
    async (userId) => {
      const target = users.find((u) => String(u.id) === String(userId));
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: !target?.isBlocked })
        .eq('id', userId);
      if (error) throw error;
      await fetchAdminData();
    },
    [users, fetchAdminData]
  );

  const changeUserRole = useCallback(
    async (userId, newRole) => {
      const updates = {
        role: newRole,
        updated_at: new Date().toISOString(),
      };
      if (newRole === 'owner') {
        updates.kyc_status = 'verified';
      }
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      if (error) throw error;

      // Optimistically update local users state
      setUsers((prev) =>
        prev.map((u) => {
          if (String(u.id) === String(userId)) {
            return {
              ...u,
              role: newRole,
              ownerRequestStatus: newRole === 'owner' ? 'approved' : u.ownerRequestStatus,
            };
          }
          return u;
        })
      );

      const roleLabel = (newRole === 'student' || newRole === 'user') ? 'Student / User' : newRole.toUpperCase();
      await createNotification({
        userId,
        message: `Your account role has been updated to "${roleLabel}".`,
        type: 'USER_ROLE',
      });

      await fetchAdminData();
    },
    [createNotification, fetchAdminData]
  );

  const requestOwner = useCallback(
    async ({ fullName, phoneNumber, propertyDocument, identityDocument }) => {
      if (!currentUser?.id) throw new Error('You must be logged in to request owner access');

      let propUrl = '';
      let idUrl = '';

      if (propertyDocument) {
        propUrl = await uploadToCloudinary(propertyDocument, 'sikkim_pg_kyc', 0.5);
      }
      if (identityDocument) {
        idUrl = await uploadToCloudinary(identityDocument, 'sikkim_pg_kyc', 0.5);
      }

      const updates = {
        full_name: fullName,
        phone: phoneNumber,
        kyc_status: 'pending',
        kyc_doc_url: propUrl || null,
        kyc_id_doc_url: idUrl || null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser.id);

      if (error) throw error;

      const hasDocs = Boolean(propUrl || idUrl);

      await createNotification({
        userId: currentUser.id,
        message: hasDocs
          ? 'Your request to become a PG owner (with verification documents) has been submitted for admin review.'
          : 'Your request to become a PG owner has been submitted. (Your listings will show as Not Verified until verification documents are uploaded)',
        type: 'OWNER_REQUEST',
      });

      await createNotification({
        userId: null,
        message: `${fullName || currentUser.name} submitted an owner request ${hasDocs ? 'with verification documents' : '(without documents - unverified)'}.`,
        type: 'OWNER_REQUEST',
        relatedId: currentUser.id,
      });
    },
    [currentUser, createNotification]
  );

  const markNotificationsRead = useCallback(async () => {
    if (!currentUser?.id) return;
    if (currentUser?.role === 'admin') {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .or(`user_id.is.null,user_id.eq.${currentUser.id}`);
    } else {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id);
    }
    await fetchNotifications();
  }, [currentUser?.id, currentUser?.role, fetchNotifications]);

  const markOneRead = useCallback(
    async (id) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      await fetchNotifications();
    },
    [fetchNotifications]
  );

  const getUnreadCount = useCallback(() => unreadCount, [unreadCount]);

  return (
    <DataContext.Provider
      value={{
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
        getUnreadCount,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
