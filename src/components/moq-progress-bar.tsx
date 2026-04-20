"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { tokens } from "@/lib/design-tokens";

interface MoqProgressBarProps {
  committedKits: number;
  moq: number;
  buyRoundId: string;
  className?: string;
}

export function MoqProgressBar({
  committedKits,
  moq,
  buyRoundId,
  className,
}: MoqProgressBarProps) {
  const isMet = committedKits >= moq;
  const pct = Math.min((committedKits / moq) * 100, 100);
  const overCount = committedKits > moq ? committedKits - moq : 0;
  const confettiFiredRef = useRef(false);

  // Confetti — fires once when MOQ is first reached in this session
  useEffect(() => {
    if (!isMet || confettiFiredRef.current) return;

    const sessionKey = `confetti_shown_${buyRoundId}`;
    if (typeof window !== "undefined" && !sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
      confettiFiredRef.current = true;

      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          // White + zinc particles for monochrome theme; system dark mode adds a subtle gold
          colors: ["#ffffff", "#a1a1aa", "#18181b", "#71717a"],
        });
      });
    }
  }, [isMet, buyRoundId]);

  return (
    <div className={cn("space-y-1", className)}>
      {/* Labels row */}
      <div className="flex items-center justify-between">
        <span className={cn(tokens.type.mono, "text-sm")}>
          {isMet ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              MOQ Met! 🎉
            </span>
          ) : (
            <span>{committedKits} of {moq} kits</span>
          )}
        </span>
        <span className={cn(tokens.type.muted, tokens.type.mono)}>
          {Math.round(pct)}%
        </span>
      </div>

      {/* Progress track */}
      <div
        className={cn("h-2 w-full rounded-sm overflow-hidden", tokens.progressBg)}
        role="progressbar"
        aria-valuenow={committedKits}
        aria-valuemin={0}
        aria-valuemax={moq}
        aria-label={`${committedKits} of ${moq} kits committed`}
      >
        <div
          className={cn(
            "h-full transition-all duration-500",
            isMet ? tokens.progressFillMet : tokens.progressFill
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Over-MOQ label */}
      {overCount > 0 && (
        <p className={tokens.type.muted}>
          +{overCount} above MOQ
        </p>
      )}
    </div>
  );
}

/**
 * Skeleton version for loading states
 */
export function MoqProgressBarSkeleton() {
  return (
    <div className="space-y-1 animate-pulse">
      <div className="flex justify-between">
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
        <div className="h-4 w-8 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
      <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
    </div>
  );
}
