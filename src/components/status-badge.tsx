import { cn } from "@/lib/utils";
import { statusBadge } from "@/lib/design-tokens";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  locked: "Locked",
  submitted: "Submitted",
  shipped: "Shipped",
  cancelled: "Cancelled",
  paid: "Paid ✓",
  awaiting: "Awaiting Payment",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        statusBadge(status),
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
