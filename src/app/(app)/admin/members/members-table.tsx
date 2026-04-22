"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { updateMember, setMemberRole, deleteMember } from "@/lib/actions/members";
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

function RoleBadge({ role }: { role: UserRole }) {
  return (
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
  );
}

function MemberActions({ member, currentUserId }: { member: Member; currentUserId: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(member.display_name);
  const [email, setEmail] = useState(member.email);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isSelf = member.id === currentUserId;

  function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateMember(member.id, { display_name: name, email });
      if (result.success) {
        toast.success("Member updated.");
        setEditOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to update member.");
      }
    });
  }

  function handleMakeAdmin() {
    const newRole: UserRole = member.role === "admin" ? "member" : "admin";
    startTransition(async () => {
      const result = await setMemberRole(member.id, newRole);
      if (result.success) {
        toast.success(`${member.display_name} is now ${newRole === "admin" ? "an admin" : "a member"}.`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to update role.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMember(member.id);
      if (result.success) {
        toast.success(`${member.display_name} has been removed.`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to delete member.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label={`Actions for ${member.display_name}`}
        >
          <MoreHorizontal size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          {!isSelf && (
            <DropdownMenuItem onClick={handleMakeAdmin} disabled={isPending}>
              {member.role === "admin" ? "Remove admin" : "Make admin"}
            </DropdownMenuItem>
          )}
          {!isSelf && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              >
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="min-h-[44px]"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {member.display_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove them from the group buy tracker. Their commitment history will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={handleDelete}
              disabled={isPending}
            >
              Delete member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400 w-12">Actions</th>
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
                  <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                  <td className={cn("px-4 py-3", tokens.type.muted)}>
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MemberActions member={member} currentUserId={currentUserId} />
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
                    <div className="mt-1">
                      <RoleBadge role={member.role} />
                    </div>
                  </div>
                  <MemberActions member={member} currentUserId={currentUserId} />
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
