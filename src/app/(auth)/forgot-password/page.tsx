"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { tokens } from "@/lib/design-tokens";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const supabase = createClient();
      // Always show success to prevent email enumeration
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      setSent(true);
    });
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        {sent ? (
          <div className="space-y-3 text-center">
            <p className="text-sm font-medium">Check your email</p>
            <p className={tokens.type.muted}>
              If an account exists for <strong>{email}</strong>, you&apos;ll receive a password reset link shortly.
            </p>
            <Link href="/login" className="text-sm text-primary hover:underline underline-offset-4">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
              {isPending ? "Sending..." : "Send reset link"}
            </Button>

            <p className="text-center">
              <Link href="/login" className={`${tokens.type.muted} hover:text-foreground hover:underline underline-offset-4 transition-colors`}>
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
