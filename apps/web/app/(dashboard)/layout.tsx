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
    <div className="flex h-screen" style={{ background: "var(--background)" }}>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block" style={{ width: "var(--sidebar-width)", flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* Mobile sidebar (drawer + header bar) — hidden on desktop */}
      <MobileSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Desktop topbar */}
        <div className="hidden md:block sticky top-0 z-20">
          <Topbar />
        </div>
        {/* Spacer on mobile to account for fixed header bar */}
        <div className="md:hidden" style={{ height: "var(--topbar-height)" }} />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
