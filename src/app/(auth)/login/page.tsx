"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { tokens } from "@/lib/design-tokens";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorParam = searchParams.get("error");
  const errorMessage =
    errorParam === "not_invited"
      ? "No invite found for that Google account. Ask your coordinator for an invite."
      : errorParam === "auth_error"
      ? "Something went wrong during sign in. Please try again."
      : null;

  function handleGoogleSignIn() {
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
        toast.error("Could not send magic link. Check your email address.");
        return;
      }
      setMagicSent(true);
    });
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6 space-y-4">
        {errorMessage && (
          <p className="text-sm text-red-600 dark:text-red-400 text-center rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2">
            {errorMessage}
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full min-h-[44px] gap-2"
          disabled={isPending}
          onClick={handleGoogleSignIn}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className={`${tokens.type.muted} text-xs`}>or</span>
          <Separator className="flex-1" />
        </div>

        {magicSent ? (
          <div className="space-y-3 text-center py-2">
            <p className="text-sm font-medium">Check your email</p>
            <p className={tokens.type.muted}>
              We sent a sign-in link to <strong>{email}</strong>.
            </p>
            <button
              type="button"
              className={`${tokens.type.muted} hover:text-foreground underline underline-offset-4 transition-colors text-sm`}
              onClick={() => { setMagicSent(false); setEmail(""); }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="min-h-[44px]"
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full min-h-[44px]"
            >
              {isPending ? "Sending..." : "Send magic link"}
            </Button>
          </form>
        )}

        <p className={`text-xs ${tokens.type.muted} text-center`}>
          No account? You need an invite from the group coordinator.
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
