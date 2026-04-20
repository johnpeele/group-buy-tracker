import { AdminSidebar } from "@/components/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-0">
      <AdminSidebar />
      <div className="flex-1 min-w-0 pt-2">{children}</div>
    </div>
  );
}
