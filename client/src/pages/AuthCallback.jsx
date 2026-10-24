import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation, Link } from "react-router-dom";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [status, setStatus] = useState("verifying"); // 'verifying' | 'error'
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const processAuthCallback = async () => {
      try {
        // 1. Check for explicit error query parameters from Supabase / Google OAuth
        const errorParam =
          searchParams.get("error_description") ||
          searchParams.get("error") ||
          searchParams.get("error_code");

        if (errorParam) {
          throw new Error(decodeURIComponent(errorParam));
        }

        // 2. Check for PKCE Authorization Code
        const code = searchParams.get("code");
        let session = null;

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn("PKCE code exchange note, checking existing session:", error);
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session) {
              session = sessionData.session;
            } else {
              throw error;
            }
          } else {
            session = data?.session;
          }
        } else {
          // 3. Fallback: Check if session was already established or parsed from hash fragment
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          session = data?.session;
        }

        if (!session?.user) {
          // Brief pause for browser client hash fragment processing
          await new Promise((resolve) => setTimeout(resolve, 800));
          const { data: retryData } = await supabase.auth.getSession();
          session = retryData?.session;
        }

        if (!session?.user) {
          throw new Error("Unable to establish your authentication session. Please try logging in again.");
        }

        if (!isMounted) return;

        // 4. Handle Password Recovery flow
        const type = searchParams.get("type");
        const nextParam = searchParams.get("next");
        if (
          type === "recovery" ||
          location.hash.includes("type=recovery") ||
          nextParam === "/reset-password"
        ) {
          toast.success("Identity verified. You can now reset your password.", { id: "auth-recovery" });
          navigate("/reset-password", { replace: true });
          return;
        }

        // 5. Query user profile to determine role and block status
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role, is_blocked, full_name, name")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.is_blocked) {
          await supabase.auth.signOut().catch(() => {});
          localStorage.removeItem("sikkimpg_user");
          throw new Error("Your account has been suspended by an administrator.");
        }

        const role = profile?.role || session.user.user_metadata?.role || "student";
        const displayName =
          profile?.full_name ||
          profile?.name ||
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split("@")[0] ||
          "User";

        // Mark active session
        sessionStorage.setItem("stayaalaya_session_active", "true");
        localStorage.setItem("stayaalaya_remember_session", "true");

        toast.success(`Welcome to Stay Aalaya, ${displayName.split(" ")[0]}!`, {
          id: "auth-welcome",
        });

        // 6. Direct user cleanly based on role
        if (role === "admin") {
          navigate("/admin", { replace: true });
        } else if (role === "owner") {
          navigate("/owner", { replace: true });
        } else {
          navigate("/dashboard?verified=true", { replace: true });
        }
      } catch (err) {
        console.error("Auth callback handler error:", err);
        if (!isMounted) return;
        const msg = err?.message || "Failed to complete authentication.";
        setStatus("error");
        setErrorMessage(msg);
        toast.error(msg, { id: "auth-callback-error" });
      }
    };

    processAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate, searchParams, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center animate-fade-in">
        {status === "verifying" ? (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5 shadow-xs">
              <Loader2 size={32} className="animate-spin text-[#f5a623]" />
            </div>
            <h2 className="text-xl font-bold text-[#0f2547] tracking-tight">
              Completing Authentication
            </h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Verifying your session with Stay Aalaya...
            </p>
            <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Exchanging secure tokens</span>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-5 shadow-xs">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Sign-In Failed
            </h2>
            <p className="text-slate-600 text-sm mt-2 leading-relaxed">
              {errorMessage || "We were unable to complete your sign-in request."}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                to="/login"
                replace
                className="w-full bg-[#0f2547] hover:bg-[#153460] text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Return to Login</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/"
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                Back to Homepage
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
