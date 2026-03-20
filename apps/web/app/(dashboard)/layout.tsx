import { auth } from "../../lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "../../components/layout/Sidebar";
import { Topbar } from "../../components/layout/Topbar";
import { MobileSidebar } from "../../components/layout/MobileSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) redirect("/login");
  if (!session.user?.businessId) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0" style={{ width: "var(--sidebar-width)" }}>
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 min-h-screen overflow-hidden">
        {/* Topbar — desktop only, sticky */}
        <div className="hidden md:block shrink-0">
          <Topbar />
        </div>

        {/* Mobile spacer */}
        <div className="md:hidden shrink-0" style={{ height: "var(--topbar-height)" }} />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
