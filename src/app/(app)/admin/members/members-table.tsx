"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { UserRole } from "@/lib/supabase/database.types";

interface Member {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  created_at: string;
}

interface MembersTableProps {
  members: Member[];
  currentUserId: string;
}

function RoleToggle({
  member,
  currentUserId,
}: {
  member: Member;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Can't change your own role
  if (member.id === currentUserId) {
    return (
      <span className={cn(tokens.type.muted, "text-xs")}>You</span>
    );
  }

  function handleToggle() {
    const newRole: UserRole = member.role === "admin" ? "member" : "admin";
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", member.id);

      if (error) {
        toast.error("Failed to update role.");
        return;
      }
      toast.success(
        `${member.display_name} is now ${newRole === "admin" ? "an admin" : "a member"}.`
      );
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="xs"
      className="min-h-[32px]"
      disabled={isPending}
      onClick={handleToggle}
    >
      {member.role === "admin" ? "Remove admin" : "Make admin"}
    </Button>
  );
}

export function MembersTable({ members, currentUserId }: MembersTableProps) {
  if (members.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-8 text-center">
          <p className={tokens.type.muted}>No members yet. Invite someone above.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Card className="shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Email</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Role</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{member.display_name}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{member.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        member.role === "admin"
                          ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      )}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className={cn("px-4 py-3", tokens.type.muted)}>
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <RoleToggle member={member} currentUserId={currentUserId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Mobile card list */}
      <ul className="md:hidden space-y-2" role="list">
        {members.map((member) => (
          <li key={member.id}>
            <Card className="shadow-sm">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{member.display_name}</p>
                    <p className={tokens.type.muted}>{member.email}</p>
                    <span
                      className={cn(
                        "inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full",
                        member.role === "admin"
                          ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      )}
                    >
                      {member.role}
                    </span>
                  </div>
                  <RoleToggle member={member} currentUserId={currentUserId} />
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
