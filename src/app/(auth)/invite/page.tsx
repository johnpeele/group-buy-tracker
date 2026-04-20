import { Suspense } from "react";
import { InviteForm } from "./invite-form";

interface InvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const { token } = await searchParams;

  return (
    <Suspense>
      <InviteForm token={token ?? ""} />
    </Suspense>
  );
}
