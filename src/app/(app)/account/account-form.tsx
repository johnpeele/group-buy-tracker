"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/database.types";

interface AccountFormProps {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export function AccountForm({ userId, email, displayName, role }: AccountFormProps) {
  const [name, setName] = useState(displayName);
  const [isPending, startTransition] = useTransition();
  const [isSigningOut, startSignOut] = useTransition();
  const router = useRouter();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === displayName) return;

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name.trim() })
        .eq("id", userId);

      if (error) {
        toast.error("Failed to update name.");
        return;
      }
      toast.success("Name updated.");
      router.refresh();
    });
  }

  function handleSignOut() {
    startSignOut(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardContent className="pt-5 pb-5">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                value={email}
                disabled
                className="min-h-[44px] opacity-60"
                aria-readonly="true"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-name">Display name</Label>
              <Input
                id="account-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  role === "admin"
                    ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                )}
              >
                {role}
              </span>
            </div>
            <Button
              type="submit"
              disabled={isPending || !name.trim() || name.trim() === displayName}
              className="w-full min-h-[44px]"
            >
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>


<Card className="shadow-sm border-red-200 dark:border-red-900">
        <CardContent className="pt-5 pb-5">
          <Button
            variant="destructive"
            className="w-full min-h-[44px]"
            disabled={isSigningOut}
            onClick={handleSignOut}
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
