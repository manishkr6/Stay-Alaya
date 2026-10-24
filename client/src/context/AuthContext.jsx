import { createContext, useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabaseClient";
import {
  extractAvatar,
  extractIdDoc,
} from "../utils/avatarHelper";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleInvalidUser = useCallback(
    async (reason) => {
      localStorage.removeItem("sikkimpg_user");
      await supabase.auth.signOut().catch(() => {});
      setCurrentUser(null);

      if (reason === "blocked") {
        toast.error("Your account has been suspended by an administrator.", {
          id: "auth-status-toast",
          duration: 7000,
        });
      } else if (reason === "deleted") {
        toast.error("Your account has been deleted or no longer exists.", {
          id: "auth-status-toast",
          duration: 7000,
        });
      }
      navigate("/login", { replace: true });
    },
    [navigate]
  );

  const fetchProfile = useCallback(async (sessionUser) => {
    if (!sessionUser) return null;
    try {
      let { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile from Supabase:", error);
      }

      // Check for Google OAuth metadata
      const googleName =
        sessionUser.user_metadata?.full_name ||
        sessionUser.user_metadata?.name ||
        "";
      const googleAvatar =
        sessionUser.user_metadata?.avatar_url ||
        sessionUser.user_metadata?.picture ||
        sessionUser.identities?.find((i) => i.identity_data?.avatar_url || i.identity_data?.picture)?.identity_data?.avatar_url ||
        sessionUser.identities?.find((i) => i.identity_data?.avatar_url || i.identity_data?.picture)?.identity_data?.picture ||
        "";

      // If user row is missing from profiles, auto-create for OAuth users
      if (!profile) {
        const isOAuth =
          sessionUser.app_metadata?.provider === "google" ||
          sessionUser.identities?.some((i) => i.provider === "google") ||
          Boolean(googleAvatar);

        if (isOAuth) {
          const newProfile = {
            id: sessionUser.id,
            full_name: googleName || sessionUser.email?.split("@")[0] || "User",
            email: sessionUser.email,
            avatar_url: googleAvatar || "",
            role: "student",
            kyc_status: "unsubmitted",
            is_blocked: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
          };

          const { data: upserted } = await supabase
            .from("profiles")
            .upsert(newProfile)
            .select()
            .maybeSingle();

          profile = upserted || newProfile;
        } else {
          return { isDeleted: true };
        }
      } else {
        // If profile exists, ensure Google name and avatar photo are auto-saved to database
        const needsAvatarSync = !profile.avatar_url && Boolean(googleAvatar);
        const needsNameSync = !profile.full_name && Boolean(googleName);
        if (needsAvatarSync || needsNameSync) {
          const syncUpdates = {
            updated_at: new Date().toISOString(),
          };
          if (needsAvatarSync) syncUpdates.avatar_url = googleAvatar;
          if (needsNameSync) syncUpdates.full_name = googleName;

          supabase
            .from("profiles")
            .update(syncUpdates)
            .eq("id", sessionUser.id)
            .then(() => {})
            .catch(() => {});

          profile = { ...profile, ...syncUpdates };
        }
      }

      // If user has been blocked/banned by an administrator
      if (profile.is_blocked) {
        return { isBlocked: true, name: profile.full_name, email: sessionUser.email };
      }

      return {
        id: sessionUser.id,
        email: sessionUser.email,
        name:
          profile.full_name ||
          sessionUser.user_metadata?.full_name ||
          sessionUser.user_metadata?.name ||
          sessionUser.email?.split("@")[0] ||
          "User",
        role: profile.role || sessionUser.user_metadata?.role || "student",
        phone: profile.phone || sessionUser.user_metadata?.phone || "",
        avatar:
          extractAvatar(profile) ||
          profile.avatar_url ||
          profile.avatar ||
          profile.photo_url ||
          profile.profile_image ||
          sessionUser.user_metadata?.avatar_url ||
          sessionUser.user_metadata?.avatar ||
          "",
        avatar_url:
          extractAvatar(profile) ||
          profile.avatar_url ||
          profile.avatar ||
          profile.photo_url ||
          profile.profile_image ||
          sessionUser.user_metadata?.avatar_url ||
          sessionUser.user_metadata?.avatar ||
          "",
        kyc_status: profile.kyc_status || "unsubmitted",
        kyc_doc_url: profile.kyc_doc_url || "",
        kyc_id_doc_url: extractIdDoc(profile) || profile.kyc_id_doc_url || "",
        ownerRequestStatus:
          profile.role === "owner" || profile.kyc_status === "verified"
            ? "approved"
            : profile.kyc_status === "pending"
            ? "pending"
            : "none",
        last_sign_in_at: profile.last_sign_in_at || sessionUser.last_sign_in_at || null,
        isBlocked: false,
      };
    } catch (e) {
      console.error("fetchProfile exception:", e);
      return null;
    }
  }, []);

  // Restore and strictly validate session on mount
  useEffect(() => {
    let mounted = true;
    let channel = null;

    const validateSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          // Double-check with server to confirm user wasn't deleted or banned in auth.users
          const { data: authData, error: authErr } = await supabase.auth.getUser();
          if (authErr || !authData?.user) {
            await handleInvalidUser("deleted");
            return;
          }

          const user = await fetchProfile(authData.user);
          if (!mounted) return;

          if (user?.isDeleted) {
            await handleInvalidUser("deleted");
            return;
          }
          if (user?.isBlocked) {
            await handleInvalidUser("blocked");
            return;
          }

          const isRecoveryFlow =
            window.location.pathname.startsWith("/reset-password") ||
            window.location.hash.includes("type=recovery");
          const isCallbackFlow =
            window.location.pathname.startsWith("/auth/callback");

          // Check Remember Me persistence: If user chose not to be remembered,
          // clear session on fresh browser launch when session storage is empty
          const rememberSession = localStorage.getItem("stayaalaya_remember_session") || localStorage.getItem("stayalaya_remember_session");
          const sessionActive = sessionStorage.getItem("stayaalaya_session_active") || sessionStorage.getItem("stayalaya_session_active");
          if (rememberSession === "false" && !sessionActive && !isRecoveryFlow && !isCallbackFlow) {
            await supabase.auth.signOut().catch(() => {});
            setCurrentUser(null);
            localStorage.removeItem("sikkimpg_user");
            return;
          }

          if (!isRecoveryFlow) {
            setCurrentUser(user);
            localStorage.setItem("sikkimpg_user", JSON.stringify(user));
            sessionStorage.setItem("stayaalaya_session_active", "true");
          }

          // Sync last_sign_in_at to profiles table so admin always sees real sign-in time
          const sessionSignIn = authData.user.last_sign_in_at || new Date().toISOString();
          supabase
            .from("profiles")
            .update({ last_sign_in_at: sessionSignIn })
            .eq("id", authData.user.id)
            .then(() => {})
            .catch(() => {});

          // Set up realtime listener for immediate logout if user is deleted or banned while online
          if (!channel) {
            channel = supabase
              .channel(`user-status-monitor-${authData.user.id}`)
              .on(
                "postgres_changes",
                {
                  event: "*",
                  schema: "public",
                  table: "profiles",
                  filter: `id=eq.${authData.user.id}`,
                },
                async (payload) => {
                  if (payload.eventType === "DELETE") {
                    await handleInvalidUser("deleted");
                  } else if (payload.eventType === "UPDATE") {
                    if (payload.new?.is_blocked) {
                      await handleInvalidUser("blocked");
                    } else if (payload.new) {
                      setCurrentUser((prev) =>
                        prev
                          ? {
                              ...prev,
                              name: payload.new.full_name || prev.name,
                              phone: payload.new.phone || prev.phone,
                              role: payload.new.role || prev.role,
                              avatar: payload.new.avatar_url || prev.avatar,
                              avatar_url: payload.new.avatar_url || prev.avatar_url,
                            }
                          : null
                      );
                    }
                  }
                }
              )
              .subscribe();
          }

          if (
            (window.location.hash.includes("access_token") ||
              window.location.search.includes("verified=true")) &&
            !isRecoveryFlow
          ) {
            if (user?.role === "admin") navigate("/admin");
            else if (user?.role === "owner") navigate("/owner");
            else navigate("/dashboard");
          }
        } else {
          // No active Supabase session - purge any stale localStorage user
          localStorage.removeItem("sikkimpg_user");
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Session verification error:", err);
        localStorage.removeItem("sikkimpg_user");
        setCurrentUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    validateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const user = await fetchProfile(session.user);
        if (!mounted) return;

        if (user?.isDeleted) {
          await handleInvalidUser("deleted");
          return;
        }
        if (user?.isBlocked) {
          await handleInvalidUser("blocked");
          return;
        }

        const isRecoveryFlow =
          event === "PASSWORD_RECOVERY" ||
          window.location.pathname.startsWith("/reset-password") ||
          window.location.hash.includes("type=recovery");

        if (!isRecoveryFlow) {
          setCurrentUser(user);
          localStorage.setItem("sikkimpg_user", JSON.stringify(user));
        }

        if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
          const authSignIn = session.user.last_sign_in_at || new Date().toISOString();
          supabase
            .from("profiles")
            .update({ last_sign_in_at: authSignIn })
            .eq("id", session.user.id)
            .then(() => {})
            .catch(() => {});
        }

        if (
          (window.location.hash.includes("access_token") ||
            window.location.search.includes("verified=true")) &&
          !isRecoveryFlow
        ) {
          if (user?.role === "admin") navigate("/admin");
          else if (user?.role === "owner") navigate("/owner");
          else navigate("/dashboard");
        }
      } else if (event === "SIGNED_OUT") {
        if (mounted) {
          setCurrentUser(null);
          localStorage.removeItem("sikkimpg_user");
        }
      }
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        validateSession();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      if (channel) supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchProfile, handleInvalidUser, navigate]);

  const login = useCallback(
    async (email, password, remember = true) => {
      const trimmedEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        const user = await fetchProfile(data.user);
        if (user?.isDeleted) {
          await supabase.auth.signOut().catch(() => {});
          throw new Error("Your account has been deleted or no longer exists.");
        }
        if (user?.isBlocked) {
          await supabase.auth.signOut().catch(() => {});
          throw new Error("Your account has been suspended by an administrator.");
        }

        // Store remember session preference
        localStorage.setItem("stayaalaya_remember_session", remember ? "true" : "false");
        sessionStorage.setItem("stayaalaya_session_active", "true");

        // Non-blocking update of last_sign_in_at on public.profiles
        supabase
          .from("profiles")
          .update({ last_sign_in_at: new Date().toISOString() })
          .eq("id", data.user.id)
          .then(() => {})
          .catch(() => {});

        setCurrentUser(user);
        localStorage.setItem("sikkimpg_user", JSON.stringify(user));
        return { user };
      }
    },
    [fetchProfile]
  );

  const loginWithGoogle = useCallback(async () => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) throw error;

    if (data?.url) {
      // Pre-check if Google OAuth endpoint is available before redirecting window
      try {
        const check = await fetch(data.url, { method: "GET" });
        if (!check.ok) {
          const json = await check.json().catch(() => null);
          console.warn("Google OAuth service check:", json?.msg || json?.error_code || check.status);
          const err = new Error("Google sign-in is temporarily unavailable. Please sign in with email.");
          err.code = "AUTH_PROVIDER_UNAVAILABLE";
          throw err;
        }
      } catch (err) {
        if (err.code === "AUTH_PROVIDER_UNAVAILABLE") {
          throw err;
        }
        // If fetch threw a cross-origin redirect error, that means Supabase accepted the request and forwarded to Google accounts!
      }

      // If checks pass, navigate window to Google OAuth
      window.location.href = data.url;
    }
    return data;
  }, []);

  // Development helper to simulate Google OAuth login and auto-sync name and photo into Dashboard
  const simulateGoogleSignIn = useCallback(async (customInfo = {}) => {
    const simulatedId = "google-" + Date.now();
    const mockGoogleUser = {
      id: simulatedId,
      email: customInfo.email || "manishkr786@gmail.com",
      user_metadata: {
        full_name: customInfo.name || "Manish Kumar",
        name: customInfo.name || "Manish Kumar",
        avatar_url:
          customInfo.avatar ||
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80",
        picture:
          customInfo.avatar ||
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80",
        provider: "google",
      },
      last_sign_in_at: new Date().toISOString(),
    };

    const profile = await fetchProfile(mockGoogleUser);
    setCurrentUser(profile);
    localStorage.setItem("sikkimpg_user", JSON.stringify(profile));
    sessionStorage.setItem("stayaalaya_session_active", "true");
    toast.success(`Welcome to Stay Aalaya, ${profile?.name?.split(" ")[0] || "User"}!`);
    navigate("/dashboard?verified=true");
    return profile;
  }, [fetchProfile, navigate]);

  const logout = useCallback(async (redirectPath = "/") => {
    await supabase.auth.signOut().catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem("sikkimpg_user");
    if (redirectPath) navigate(redirectPath);
  }, [navigate]);

  const signup = useCallback(async (name, email, password, role = "student") => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        data: {
          full_name: cleanName,
          name: cleanName,
          role,
        },
      },
    });
    if (error) throw error;

    const newUserId = data?.user?.id || null;

    // 1. Broadcast new registration to admin via live notifications table
    try {
      const notifMsg = `New user registration: ${cleanName} (${cleanEmail}) registered as ${role}.`;
      await supabase.from('notifications').insert({
        user_id: null,
        target_role: 'admin',
        message: notifMsg,
        type: 'USER_SIGNUP',
        related_id: newUserId,
        is_read: false,
      });
    } catch (e) {
      console.warn('Notice logging signup notification to Supabase for admin:', e);
    }

    // 2. Insert persistent welcome notification directly for the new user
    try {
      if (newUserId) {
        await supabase.from('notifications').insert({
          user_id: newUserId,
          target_role: role || 'student',
          message: `Welcome to Stay Aalaya, ${cleanName}! Your account has been created successfully. Explore verified PGs near colleges in Gangtok, Namchi, and Majitar. Save properties to your wishlist, compare amenities, and leave reviews.`,
          type: 'WELCOME',
          related_id: newUserId,
          is_read: false,
        });
      }
    } catch (userNotifErr) {
      console.warn('Notice logging welcome notification to Supabase for user:', userNotifErr);
    }

    return data;
  }, []);

  const forgotPassword = useCallback(async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery&next=/reset-password`,
    });
    if (error) throw error;
    return data;
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    const { data, error } = await supabase.auth.updateUser({
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  const updateCurrentUser = useCallback(
    async (updates) => {
      if (!currentUser?.id) return;

      const dbPayload = {};
      if (updates.name !== undefined) dbPayload.full_name = updates.name.trim();
      if (updates.full_name !== undefined) dbPayload.full_name = updates.full_name.trim();
      if (updates.phone !== undefined) dbPayload.phone = updates.phone.trim();
      const avatarVal = updates.avatar_url !== undefined ? updates.avatar_url : updates.avatar;
      if (avatarVal !== undefined) {
        dbPayload.avatar_url = avatarVal || null;
      }
      if (updates.kyc_status !== undefined && updates.kyc_status !== 'unsubmitted') {
        dbPayload.kyc_status = updates.kyc_status;
      } else if (updates.ownerRequestStatus === 'pending') {
        dbPayload.kyc_status = 'pending';
      } else if (updates.kyc_status !== undefined) {
        dbPayload.kyc_status = updates.kyc_status;
      }
      if (updates.kyc_doc_url !== undefined && updates.kyc_doc_url !== '') {
        dbPayload.kyc_doc_url = updates.kyc_doc_url;
      }
      if (updates.kyc_id_doc_url !== undefined && updates.kyc_id_doc_url !== '') {
        dbPayload.kyc_id_doc_url = updates.kyc_id_doc_url;
      }

      if (Object.keys(dbPayload).length > 0) {
        const { error } = await supabase
          .from("profiles")
          .update({ ...dbPayload, updated_at: new Date().toISOString() })
          .eq("id", currentUser.id);

        if (error) {
          console.error("Error updating profile in Supabase profiles table:", error);
          throw error;
        }
      }

      // Also update auth user metadata if name, phone, or avatar changed
      const meta = {};
      if (updates.name !== undefined) meta.full_name = updates.name.trim();
      if (updates.phone !== undefined) meta.phone = updates.phone.trim();
      if (avatarVal !== undefined) {
        meta.avatar_url = avatarVal || null;
      }
      if (Object.keys(meta).length > 0) {
        try {
          await supabase.auth.updateUser({ data: meta });
        } catch (authErr) {
          console.warn("Notice updating auth user metadata:", authErr);
        }
      }

      setCurrentUser((prev) => {
        if (!prev) return null;
        const avatarVal = updates.avatar_url !== undefined ? updates.avatar_url : updates.avatar;
        const updated = {
          ...prev,
          ...updates,
          avatar: avatarVal !== undefined ? avatarVal : prev?.avatar,
          avatar_url: avatarVal !== undefined ? avatarVal : prev?.avatar_url,
        };
        try {
          localStorage.setItem("sikkimpg_user", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      return true;
    },
    [currentUser?.id]
  );

  const isAuthenticated = !!currentUser;

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      isAuthenticated,
      login,
      loginWithGoogle,
      simulateGoogleSignIn,
      logout,
      signup,
      forgotPassword,
      resetPassword,
      updateCurrentUser,
    }),
    [
      currentUser,
      loading,
      isAuthenticated,
      login,
      loginWithGoogle,
      simulateGoogleSignIn,
      logout,
      signup,
      forgotPassword,
      resetPassword,
      updateCurrentUser,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
