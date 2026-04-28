"use client";

import * as React from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
        aria-label="Toggle theme"
      >
        <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem
            checked={theme === "light"}
            onCheckedChange={() => setTheme("light")}
          >
            <SunIcon />
            Light
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={theme === "dark"}
            onCheckedChange={() => setTheme("dark")}
          >
            <MoonIcon />
            Dark
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={theme === "system"}
            onCheckedChange={() => setTheme("system")}
          >
            <MonitorIcon />
            System
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
