import { tokens } from "@/lib/design-tokens";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {tokens.appName}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {tokens.appDescription}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
