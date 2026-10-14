import { createContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabaseClient";

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
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile from Supabase:", error);
      }

      // If user row is missing from profiles, they have been deleted from database
      if (!profile) {
        return { isDeleted: true };
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
        kyc_status: profile.kyc_status || "unsubmitted",
        kyc_doc_url: profile.kyc_doc_url || "",
        kyc_id_doc_url: profile.kyc_id_doc_url || "",
        ownerRequestStatus:
          profile.kyc_status === "verified"
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

          if (!isRecoveryFlow) {
            setCurrentUser(user);
            localStorage.setItem("sikkimpg_user", JSON.stringify(user));
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
    async (email, password) => {
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

  const logout = useCallback(async (redirectPath = "/") => {
    await supabase.auth.signOut().catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem("sikkimpg_user");
    if (redirectPath) navigate(redirectPath);
  }, [navigate]);

  const signup = useCallback(async (name, email, password, role = "student") => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard?verified=true`,
        data: {
          full_name: name.trim(),
          name: name.trim(),
          role,
        },
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const forgotPassword = useCallback(async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
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
      if (updates.phone !== undefined) dbPayload.phone = updates.phone.trim();
      if (updates.kyc_status !== undefined) dbPayload.kyc_status = updates.kyc_status;
      if (updates.kyc_doc_url !== undefined) dbPayload.kyc_doc_url = updates.kyc_doc_url;
      if (updates.kyc_id_doc_url !== undefined) dbPayload.kyc_id_doc_url = updates.kyc_id_doc_url;

      if (Object.keys(dbPayload).length > 0) {
        const { error } = await supabase
          .from("profiles")
          .update({ ...dbPayload, updated_at: new Date().toISOString() })
          .eq("id", currentUser.id);

        if (error) {
          console.error("Error updating profile in Supabase:", error);
          throw error;
        }
      }

      // Also update auth user metadata if name or phone changed
      if (updates.name !== undefined || updates.phone !== undefined) {
        const meta = {};
        if (updates.name !== undefined) meta.full_name = updates.name.trim();
        if (updates.phone !== undefined) meta.phone = updates.phone.trim();
        supabase.auth.updateUser({ data: meta }).catch(() => {});
      }

      setCurrentUser((prev) => {
        const updated = { ...prev, ...updates };
        localStorage.setItem("sikkimpg_user", JSON.stringify(updated));
        return updated;
      });

      return true;
    },
    [currentUser]
  );

  const isAuthenticated = !!currentUser;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isAuthenticated,
        login,
        logout,
        signup,
        forgotPassword,
        resetPassword,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
