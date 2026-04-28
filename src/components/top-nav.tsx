"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

interface TopNavProps {
  displayName: string;
  isAdmin: boolean;
}

export function TopNav({ displayName, isAdmin }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navLinks = [
    { href: "/", label: "Open Buys" },
    { href: "/history", label: "History" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="hidden md:flex sticky top-0 z-50 items-center justify-between h-14 px-6 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
      {/* Logo */}
      <Link href="/" className="shrink-0">
        <Image src="/logo.svg" alt="Logo" width={212} height={44} style={{ width: "120px", height: "auto" }} preload />
      </Link>

      {/* Nav links */}
      <nav aria-label="Main navigation" className="flex items-center gap-1">
        {navLinks.map(({ href, label }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center",
                isActive
                ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right side controls */}
      <div className="flex items-center gap-1">
        <ModeToggle />

        {/* Account dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-full min-h-11 cursor-pointer"
            aria-label="Account menu"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{displayName}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/account")}>
              Account settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              variant="destructive"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
