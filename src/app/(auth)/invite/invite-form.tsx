"use client";

import { useState, useTransition, useEffect } from "react";
import { acceptInvite } from "@/lib/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { tokens } from "@/lib/design-tokens";

interface InviteFormProps {
  token: string;
}

export function InviteForm({ token }: InviteFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenEmail, setTokenEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }

    const supabase = createClient();
    supabase
      .rpc("check_invite_token", { p_token: token })
      .then(({ data }) => {
        setTokenValid(data?.valid ?? false);
        setTokenEmail(data?.email ?? null);
      });
  }, [token]);

  if (!token || tokenValid === false) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-8 text-center space-y-2">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            This invite link is invalid or has expired.
          </p>
          <p className={tokens.type.muted}>
            Ask your coordinator to resend your invite.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (tokenValid === null) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-8 text-center">
          <p className={tokens.type.muted}>Checking invite...</p>
        </CardContent>
      </Card>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const result = await acceptInvite(token, displayName.trim());

      if (!result.success || !result.actionLink) {
        toast.error(result.error ?? "Something went wrong. Try again.");
        return;
      }

      // Redirect to the generated magic link — Supabase processes it and signs the user in
      window.location.href = result.actionLink;
    });
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <p className={`${tokens.type.muted} text-center mb-5`}>
          You&apos;ve been invited to join {tokens.appName}.
          {tokenEmail && (
            <> Your account will use <strong>{tokenEmail}</strong>.</>
          )}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Your name</Label>
            <Input
              id="display-name"
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={80}
              className="min-h-[44px]"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending || !displayName.trim()}
            className="w-full min-h-[44px]"
          >
            {isPending ? "Setting up your account..." : "Create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
