import { cn } from "@/lib/utils"

interface FormMessageProps {
  message?: string
  id?: string
  className?: string
}

export function FormMessage({ message, id, className }: FormMessageProps) {
  if (!message) return null
  return (
    <p role="alert" id={id} className={cn("text-xs text-destructive mt-0.5", className)}>
      {message}
    </p>
  )
}
