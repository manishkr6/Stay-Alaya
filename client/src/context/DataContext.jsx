import { createContext, useState, useCallback, useContext, useEffect } from 'react';
import api from '../utils/api';
import { AuthContext } from './AuthContext';

export const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { currentUser } = useContext(AuthContext);

  // In backend mode, everything should come from the API (no mocked seed data).
  const [pgs, setPgs] = useState([]);
  const [ownerPgs, setOwnerPgs] = useState([]);
  const [savedPgs, setSavedPgs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  const HAS_BACKEND = import.meta.env.DEV ? true : !!import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!HAS_BACKEND) return;
    // Clear previously stored mock/demo data so it never shows in backend mode.
    localStorage.removeItem('sikkimpg_pgs');
    localStorage.removeItem('sikkimpg_notifications');
    localStorage.removeItem('sikkimpg_reviews');
  }, [HAS_BACKEND]);

  const dateOnly = (value) => {
    if (!value) return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString().split('T')[0];
  };

  const mapPG = (pg) => {
    const id = String(pg.id ?? pg._id);
    const ownerId = pg.ownerId
      ? String(pg.ownerId)
      : pg.owner
        ? String(pg.owner._id ?? pg.owner.id ?? pg.owner)
        : '';

    return {
      ...pg,
      id,
      ownerId,
      ownerName: pg.owner?.name,
      ownerEmail: pg.owner?.email,
      location: pg.location || { city: '', area: '', address: '' },
      rules: Array.isArray(pg.rules) ? pg.rules : [],
      createdAt: dateOnly(pg.createdAt),
    };
  };

  const mapReview = (r) => ({
    id: String(r.id ?? r._id),
    pgId: String(r.pgId ?? r.pg?._id ?? r.pg),
    userId: String(r.userId ?? r.user?._id ?? r.user?.id ?? r.user),
    userName: r.userName ?? r.user?.name ?? '',
    rating: Number(r.rating),
    comment: r.comment,
    createdAt: dateOnly(r.createdAt),
  });

  const mapNotification = (n) => ({
    id: String(n.id ?? n._id),
    message: n.message,
    type: n.type,
    userId: n.userId ? String(n.userId._id ?? n.userId.id ?? n.userId) : null,
    relatedId: n.relatedId ? String(n.relatedId) : null,
    isRead: !!n.isRead,
    createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
  });

  const mapUser = (u) => ({
    id: String(u.id ?? u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    ownerRequestStatus: u.ownerRequestStatus ?? 'none',
    ownerRequestDetails: u.ownerRequestDetails
      ? {
          id: String(u.ownerRequestDetails.id ?? u.ownerRequestDetails._id),
          phoneNumber: u.ownerRequestDetails.phoneNumber || '',
          propertyDocumentUrl: u.ownerRequestDetails.propertyDocumentUrl || '',
          identityDocumentUrl: u.ownerRequestDetails.identityDocumentUrl || '',
          status: u.ownerRequestDetails.status || '',
          requestedAt: u.ownerRequestDetails.requestedAt || '',
        }
      : null,
    isBlocked: !!u.isBlocked,
    avatar: u.avatar,
  });

  const deriveOwnersFromPgs = (pgList) => {
    const owners = new Map();
    for (const pg of pgList) {
      if (!pg.ownerId) continue;
      if (!owners.has(pg.ownerId)) {
        owners.set(pg.ownerId, { id: pg.ownerId, name: pg.ownerName || 'Owner', email: pg.ownerEmail || '' });
      }
    }
    return Array.from(owners.values());
  };

  const chunkArray = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const fetchApprovedPgsAndReviews = useCallback(async () => {
    if (!HAS_BACKEND) return;

    // 1) Fetch all approved PGs (client filtering depends on having the full list).
    const limit = 50;
    let page = 1;
    let totalPages = 1;
    const allPgsRaw = [];

    while (page <= totalPages) {
      const res = await api.get('/pgs', { params: { page, limit } });
      const payload = res.data;
      totalPages = payload.totalPages || 1;
      allPgsRaw.push(...(payload.data || []));
      page += 1;
    }

    const mappedPgs = allPgsRaw.map(mapPG);
    setPgs(mappedPgs);
    setUsers(deriveOwnersFromPgs(mappedPgs));

    // 2) Fetch reviews for each approved PG.
    const allReviews = [];
    for (const pgChunk of chunkArray(mappedPgs, 5)) {
      const reviewResps = await Promise.all(pgChunk.map(pg => api.get(`/reviews/${pg.id}`)));
      for (const rr of reviewResps) {
        const data = rr.data?.data || [];
        allReviews.push(...data.map(mapReview));
      }
    }
    setReviews(allReviews);
  }, [HAS_BACKEND]);

  const fetchOwnerPgs = useCallback(async () => {
    if (!HAS_BACKEND || !currentUser?.id) return;
    if (currentUser.role !== 'owner' && currentUser.role !== 'admin') return;

    const res = await api.get('/owner');
    const payload = res.data;
    const mappedOwnerPgs = (payload.data || []).map(mapPG);
    setOwnerPgs(mappedOwnerPgs);
  }, [HAS_BACKEND, currentUser?.id, currentUser?.role]);

  const fetchSavedPgs = useCallback(async () => {
    if (!HAS_BACKEND || !currentUser?.id) return;

    const res = await api.get('/user/saved');
    const payload = res.data;
    setSavedPgs((payload.data || []).map(mapPG));
  }, [HAS_BACKEND, currentUser?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!HAS_BACKEND || !currentUser?.id) return;

    const [notifRes, unreadRes] = await Promise.all([
      api.get('/notifications', { params: { page: 1, limit: 100 } }),
      api.get('/notifications/unread-count'),
    ]);

    const notifPayload = notifRes.data;
    setNotifications((notifPayload.data || []).map(mapNotification));
    setUnreadCount(unreadRes.data?.count || 0);
  }, [HAS_BACKEND, currentUser?.id]);

  const fetchChatUnreadCount = useCallback(async () => {
    if (!HAS_BACKEND || !currentUser?.id) return;
    const res = await api.get('/chat/conversations');
    const conversations = res.data?.data || [];
    const total = conversations.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0);
    setChatUnreadCount(total);
  }, [HAS_BACKEND, currentUser?.id]);

  const fetchAdminData = useCallback(async () => {
    if (!HAS_BACKEND || currentUser?.role !== 'admin') return;

    const limit = 100;
    let page = 1;
    let totalPages = 1;

    // Admin PGs
    const allAdminPgsRaw = [];
    page = 1;
    totalPages = 1;
    while (page <= totalPages) {
      const res = await api.get('/admin/pgs', { params: { page, limit } });
      const payload = res.data;
      totalPages = payload.totalPages || 1;
      allAdminPgsRaw.push(...(payload.data || []));
      page += 1;
    }
    const mappedAdminPgs = allAdminPgsRaw.map(mapPG);
    setPgs(mappedAdminPgs);

    // Admin Users
    page = 1;
    totalPages = 1;
    const allUsersRaw = [];
    while (page <= totalPages) {
      const res = await api.get('/admin/users', { params: { page, limit } });
      const payload = res.data;
      totalPages = payload.totalPages || 1;
      allUsersRaw.push(...(payload.data || []));
      page += 1;
    }
    setUsers(allUsersRaw.map(mapUser));

  }, [HAS_BACKEND, currentUser?.role]);

  useEffect(() => {
    if (!HAS_BACKEND) return;

    let cancelled = false;
    (async () => {
      try {
        if (currentUser?.role === 'admin') {
          await fetchAdminData();
        } else {
          await fetchApprovedPgsAndReviews();
          if (cancelled) return;
          if (currentUser?.role === 'owner' || currentUser?.role === 'admin') await fetchOwnerPgs();
        }

        if (cancelled) return;
        if (currentUser?.id) await fetchSavedPgs();
        if (cancelled) return;
        if (currentUser?.id) await fetchNotifications();
        if (cancelled) return;
        if (currentUser?.id) await fetchChatUnreadCount();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Data sync failed:', e?.message || e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [HAS_BACKEND, currentUser?.id, currentUser?.role, fetchAdminData, fetchApprovedPgsAndReviews, fetchOwnerPgs, fetchSavedPgs, fetchNotifications, fetchChatUnreadCount]);

  useEffect(() => {
    if (!HAS_BACKEND || !currentUser?.id) return;
    const timer = setInterval(() => {
      fetchNotifications().catch(() => {});
      fetchChatUnreadCount().catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [HAS_BACKEND, currentUser?.id, fetchNotifications, fetchChatUnreadCount]);

  // ── PG Queries ──
  const getApprovedPGs = useCallback(
    () =>
      pgs.filter(
        (pg) =>
          ['approved', 'pending_update', 'pending_delete'].includes(pg.status) &&
          !pg.isDeleted
      ),
    [pgs]
  );

  const getPGById = useCallback((id) =>
    pgs.find(pg => pg.id === id), [pgs]);

  const getOwnerPGs = useCallback((ownerId) =>
    ownerPgs.filter(pg => pg.ownerId === ownerId && !pg.isDeleted), [ownerPgs]);

  const getOwnerPGById = useCallback((ownerId, pgId) =>
    ownerPgs.find(pg => pg.ownerId === ownerId && pg.id === pgId && !pg.isDeleted), [ownerPgs]);

  // ── PG Mutations ──
  const addPG = useCallback(async (pgData, ownerId) => {
    if (!HAS_BACKEND) return;

    const form = new FormData();
    form.append('title', pgData.title || '');
    form.append('description', pgData.description || '');
    form.append('price', String(pgData.price ?? ''));
    form.append('city', pgData.location?.city || '');
    form.append('area', pgData.location?.area || '');
    form.append('address', pgData.location?.address || '');
    form.append('roomType', pgData.roomType || '');
    form.append('genderPreference', pgData.genderPreference || '');
    form.append('amenities', (pgData.amenities || []).join(','));
    form.append('rules', (pgData.rules || []).join('\n'));
    form.append('contactNumber', pgData.contactNumber || '');

    // Backend accepts uploaded image files; we try to fetch URLs into Blobs,
    // but if CORS fails we still allow the PG to be created (images empty).
    const images = Array.isArray(pgData.images) ? pgData.images : [];
    for (let i = 0; i < images.length; i += 1) {
      const url = images[i];
      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        if (!blob.type.startsWith('image/')) continue;
        const file = new File([blob], `pg_${Date.now()}_${i}.${blob.type.split('/')[1] || 'jpg'}`, { type: blob.type });
        form.append('images', file);
      } catch (_) {
        // Ignore image upload failures (still create PG).
      }
    }

    await api.post('/owner', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    // Refresh only what matters (owner dashboard).
    if (currentUser?.role === 'admin') await fetchAdminData();
    else await fetchOwnerPgs();
  }, [HAS_BACKEND, currentUser?.role, fetchAdminData, fetchOwnerPgs]);

  const updatePG = useCallback(async (id, pgData) => {
    if (!HAS_BACKEND) return;

    // Fetch current PG images so we can send removeImages for deleted ones.
    const existingRes = await api.get(`/pgs/${id}`);
    const existingPg = existingRes.data?.data || {};
    const existingImages = Array.isArray(existingPg.images) ? existingPg.images : [];

    const newImages = Array.isArray(pgData.images) ? pgData.images : [];
    const removedImages = existingImages.filter(img => !newImages.includes(img));
    const addedImages = newImages.filter(img => !existingImages.includes(img));

    const form = new FormData();
    form.append('title', pgData.title || '');
    form.append('description', pgData.description || '');
    form.append('price', String(pgData.price ?? ''));
    form.append('city', pgData.location?.city || '');
    form.append('area', pgData.location?.area || '');
    form.append('address', pgData.location?.address || '');
    form.append('roomType', pgData.roomType || '');
    form.append('genderPreference', pgData.genderPreference || '');
    form.append('amenities', (pgData.amenities || []).join(','));
    form.append('rules', (pgData.rules || []).join('\n'));
    form.append('contactNumber', pgData.contactNumber || '');

    for (const rem of removedImages) form.append('removeImages', rem);

    for (let i = 0; i < addedImages.length; i += 1) {
      const url = addedImages[i];
      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        if (!blob.type.startsWith('image/')) continue;
        const file = new File([blob], `pg_${Date.now()}_${i}.${blob.type.split('/')[1] || 'jpg'}`, { type: blob.type });
        form.append('images', file);
      } catch (_) {
        // Ignore image upload failures.
      }
    }

    await api.put(`/owner/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (currentUser?.role === 'admin') await fetchAdminData();
    else await fetchOwnerPgs();
  }, [HAS_BACKEND, currentUser?.role, fetchAdminData, fetchOwnerPgs]);

  const deletePG = useCallback(async (id, reason = '') => {
    if (!HAS_BACKEND) return;

    if (currentUser?.role === 'admin') {
      await api.delete(`/admin/pgs/${id}`);
      await fetchAdminData();
    } else {
      await api.delete(`/owner/${id}`, { data: { reason } });
      await fetchOwnerPgs();
    }
  }, [HAS_BACKEND, currentUser?.role, fetchAdminData, fetchOwnerPgs]);

  const approvePG = useCallback(async (id) => {
    if (!HAS_BACKEND) return;
    await api.put(`/admin/pgs/${id}/approve`);
    await fetchAdminData();
  }, [HAS_BACKEND, fetchAdminData]);

  const rejectPG = useCallback(async (id, reason) => {
    if (!HAS_BACKEND) return;
    await api.put(`/admin/pgs/${id}/reject`, { reason });
    await fetchAdminData();
  }, [HAS_BACKEND, fetchAdminData]);

  // ── Save PGs ──
  const savePGToggle = useCallback(async (_userId, pgId) => {
    if (!HAS_BACKEND) return;
    await api.post(`/user/save/${pgId}`);
    await fetchSavedPgs();
  }, [HAS_BACKEND, fetchSavedPgs]);

  const getSavedPGs = useCallback((_userId) => savedPgs, [savedPgs]);

  // ── Reviews ──
  const addReview = useCallback(async (pgId, _userId, _userName, rating, comment) => {
    if (!HAS_BACKEND) return;

    await api.post(`/reviews/${pgId}`, { rating, comment });

    // Refresh reviews and PG rating for this PG.
    const [reviewsRes, pgRes] = await Promise.all([
      api.get(`/reviews/${pgId}`),
      api.get(`/pgs/${pgId}`),
    ]);

    const updatedReviews = (reviewsRes.data?.data || []).map(mapReview);
    setReviews(prev => [
      ...prev.filter(r => r.pgId !== pgId),
      ...updatedReviews,
    ]);

    const updatedPg = mapPG(pgRes.data?.data || {});
    setPgs(prev => prev.map(p => (p.id === pgId ? updatedPg : p)));
  }, [HAS_BACKEND, setPgs, setReviews]);

  const getPGReviews = useCallback((pgId) =>
    reviews.filter(r => r.pgId === pgId), [reviews]);

  // ── Reports ──
  const reportPG = useCallback(async (pgId, _userId, reason) => {
    if (!HAS_BACKEND) return;
    await api.post(`/reports/${pgId}`, { reason });

    if (currentUser?.role === 'admin') await fetchAdminData();
  }, [HAS_BACKEND, currentUser?.role, fetchAdminData]);

  // ── Admin/Owner management ──
  const approveOwner = useCallback(async (userId) => {
    if (!HAS_BACKEND) return;
    await api.put(`/admin/users/${userId}/approve-owner`);
    await fetchAdminData();
  }, [HAS_BACKEND, fetchAdminData]);

  const blockUser = useCallback(async (userId) => {
    if (!HAS_BACKEND) return;
    await api.put(`/admin/users/${userId}/block`);
    await fetchAdminData();
  }, [HAS_BACKEND, fetchAdminData]);

  const requestOwner = useCallback(async ({ fullName, phoneNumber, propertyDocument, identityDocument }) => {
    if (!HAS_BACKEND) return;

    const form = new FormData();
    form.append('fullName', fullName || '');
    form.append('phoneNumber', phoneNumber || '');
    form.append('propertyDocument', propertyDocument);
    form.append('identityDocument', identityDocument);

    await api.post('/user/request-owner', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    // This action creates an OWNER_REQUEST notification in the backend.
    if (currentUser?.role === 'admin') await fetchAdminData();
  }, [HAS_BACKEND, currentUser?.role, fetchAdminData]);

  const markNotificationsRead = useCallback(async () => {
    if (!HAS_BACKEND) return;
    await api.put('/notifications/mark-read');
    await fetchNotifications();
  }, [HAS_BACKEND, fetchNotifications]);

  const markOneRead = useCallback(async (id) => {
    if (!HAS_BACKEND) return;
    await api.put(`/notifications/${id}/read`);
    await fetchNotifications();
  }, [HAS_BACKEND, fetchNotifications]);

  const getUnreadCount = useCallback(() => unreadCount, [unreadCount]);
  const getChatUnreadCount = useCallback(() => chatUnreadCount, [chatUnreadCount]);

  return (
    <DataContext.Provider value={{
      pgs, notifications, reviews,
      users,
      getApprovedPGs, getPGById, getOwnerPGs,
      getOwnerPGById,
      addPG, updatePG, deletePG, approvePG, rejectPG,
      savePGToggle, getSavedPGs,
      addReview, getPGReviews,
      reportPG,
      approveOwner, blockUser, requestOwner,
      markNotificationsRead, markOneRead, getUnreadCount, getChatUnreadCount,
    }}>
      {children}
    </DataContext.Provider>
  );
}
