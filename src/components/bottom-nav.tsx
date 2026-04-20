"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, Wrench, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  isAdmin: boolean;
}

export function BottomNav({ isAdmin }: BottomNavProps) {
  const pathname = usePathname();

  const tabs = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/history", label: "History", icon: Clock },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Wrench }] : []),
    { href: "/account", label: "Account", icon: User },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 md:hidden"
    >
      <ul className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 min-h-[44px] justify-center rounded-md transition-colors",
                  isActive
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  aria-hidden="true"
                />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
