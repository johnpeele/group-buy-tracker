"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { sendInvite, resendInvite } from "@/lib/actions/invites";
import { toast } from "sonner";

interface InviteFormProps {
  resendEmail?: string;
  inviteId?: string;
}

export function InviteForm({ resendEmail, inviteId }: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isResend = !!resendEmail && !!inviteId;

  function handleResend() {
    startTransition(async () => {
      const result = await resendInvite(inviteId!);
      if (!result.success) {
        toast.error(result.error ?? "Failed to resend invite.");
        return;
      }
      toast.success(`Invite resent to ${resendEmail}`);
      router.refresh();
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    const formData = new FormData();
    formData.set("email", email.trim().toLowerCase());

    startTransition(async () => {
      const result = await sendInvite(formData);
      if (!result.success) {
        toast.error(result.error ?? "Failed to send invite.");
        return;
      }
      toast.success(`Invite sent to ${email.trim()}`);
      setEmail("");
      router.refresh();
    });
  }

  // Compact resend button inline in pending list
  if (isResend) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="min-h-[36px] shrink-0"
        disabled={isPending}
        onClick={handleResend}
      >
        {isPending ? "Sending..." : "Resend"}
      </Button>
    );
  }

  // Full invite form
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5 pb-5">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="invite-email" className="sr-only">
              Email address
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="member@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="min-h-[44px]"
              aria-label="Email address to invite"
            />
          </div>
          <Button
            type="submit"
            disabled={isPending || !email.trim()}
            className="min-h-[44px] shrink-0"
          >
            {isPending ? "Sending..." : "Send invite"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
