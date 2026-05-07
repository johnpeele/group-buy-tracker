"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useTiks } from "@rexa-developer/tiks/react";

type WithViewTransition = Document & {
  startViewTransition: (cb: () => void) => { ready: Promise<void> };
};

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const { toggle: playToggle } = useTiks();

  function toggle() {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    playToggle(next === "dark");

    if (!("startViewTransition" in document)) {
      setTheme(next);
      return;
    }

    const rect = triggerRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = (document as WithViewTransition).startViewTransition(() => {
      setTheme(next);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        { pseudoElement: "::view-transition-new(root)", duration: 400, easing: "ease-in-out" },
      );
    });
  }

  return (
    <button
      ref={triggerRef}
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
      aria-label="Toggle theme"
    >
      <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
