"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Users, LayoutList, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Summary", icon: LayoutList },
  { href: "/admin/open-buys", label: "Open Buys", icon: ShoppingBag },
  { href: "/admin/catalog", label: "Catalog", icon: Package },
  { href: "/admin/members", label: "Members", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col gap-1 w-48 shrink-0 pt-1 pr-6">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </aside>
  );
}
