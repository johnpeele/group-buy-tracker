"use client";

import { useState, useTransition, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { tokens } from "@/lib/design-tokens";

const LAST_PROVIDER_KEY = "batchkit_last_provider";

const fadeSlide = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: "easeIn" } },
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function LoginForm() {
  const [mode, setMode] = useState<"default" | "email">("default");
  const [email, setEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [usedGoogleBefore, setUsedGoogleBefore] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorParam = searchParams.get("error");
  const errorMessage =
    errorParam === "not_invited"
      ? "No invite found for that Google account. Ask your coordinator for an invite."
      : errorParam === "auth_error"
      ? "Something went wrong during sign in. Please try again."
      : null;

  useEffect(() => {
    setUsedGoogleBefore(localStorage.getItem(LAST_PROVIDER_KEY) === "google");
    if (errorParam === "not_invited") {
      localStorage.removeItem(LAST_PROVIDER_KEY);
      setUsedGoogleBefore(false);
    }
  }, [errorParam]);

  function resetToDefault() {
    setMode("default");
    setMagicSent(false);
    setShowCodeInput(false);
    setCode("");
    setEmail("");
  }

  function handleGoogleSignIn() {
    localStorage.setItem(LAST_PROVIDER_KEY, "google");
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    });
  }

  function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error(error.message ?? "Could not send magic link. Check your email address.");
        return;
      }
      setMagicSent(true);
    });
  }

  function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      if (error) {
        toast.error("Invalid or expired code. Please try again.");
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();
        if (!profile) {
          await supabase.auth.signOut();
          router.push("/login?error=not_invited");
          return;
        }
      }
      router.push("/");
      router.refresh();
    });
  }

  // ── Confirmation screen ─────────────────────────────────────
  if (magicSent) {
    return (
      <div className="space-y-5 text-center">
        <div className="space-y-2">
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Check your email
          </p>
          <p className={tokens.type.muted}>
            We&apos;ve sent you a temporary login link. Please check your inbox at{" "}
            <strong className="text-zinc-700 dark:text-zinc-300">{email}</strong>.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!showCodeInput ? (
            <motion.div key="prompt" {...fadeSlide} className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full min-h-[44px]"
                onClick={() => setShowCodeInput(true)}
              >
                Enter code manually
              </Button>
              <button
                type="button"
                className={`text-sm ${tokens.type.muted} hover:text-foreground transition-colors`}
                onClick={resetToDefault}
              >
                Back to login
              </button>
            </motion.div>
          ) : (
            <motion.div key="code-form" {...fadeSlide}>
              <form onSubmit={handleVerifyCode} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="sr-only">Login code</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    autoFocus
                    className="text-center tracking-[0.4em] font-mono text-lg min-h-[44px]"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isPending || code.length < 6}
                  className="w-full min-h-[44px]"
                >
                  {isPending ? "Verifying..." : "Continue with login code"}
                </Button>
                <button
                  type="button"
                  className={`text-sm ${tokens.type.muted} hover:text-foreground transition-colors`}
                  onClick={resetToDefault}
                >
                  Back to login
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Email entry ─────────────────────────────────────────────
  if (mode === "email") {
    return (
      <div className="space-y-5">
        <p className="text-xl font-semibold text-center text-zinc-900 dark:text-zinc-100">
          What&apos;s your email address?
        </p>
        <form onSubmit={handleMagicLinkSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="sr-only">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="min-h-[44px]"
            />
          </div>
          <Button type="submit" disabled={isPending} className="w-full min-h-[44px]">
            {isPending ? "Sending..." : "Continue with email"}
          </Button>
        </form>
        <p className="text-center">
          <button
            type="button"
            className={`text-sm ${tokens.type.muted} hover:text-foreground transition-colors`}
            onClick={resetToDefault}
          >
            Back to login
          </button>
        </p>
      </div>
    );
  }

  // ── Default ─────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2">
          {errorMessage}
        </p>
      )}

      <div className="space-y-1.5">
        <Button
          type="button"
          className="w-full min-h-[44px] gap-2"
          disabled={isPending}
          onClick={handleGoogleSignIn}
        >
          <GoogleIcon />
          Continue with Google
        </Button>
        {usedGoogleBefore && (
          <p className={`text-xs text-center ${tokens.type.muted}`}>
            You used Google to sign in last time
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full min-h-[44px]"
        disabled={isPending}
        onClick={() => setMode("email")}
      >
        Continue with email
      </Button>

      <p className={`text-xs ${tokens.type.muted} text-center pt-1`}>
        No account? You need an invite from the group coordinator.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
