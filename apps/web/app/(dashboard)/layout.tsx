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
    <div className="flex h-screen bg-slate-50">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar (drawer + header bar) — hidden on desktop */}
      <MobileSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-60 min-w-0 min-h-screen">
        {/* Desktop topbar */}
        <div className="hidden md:block">
          <Topbar />
        </div>
        {/* Spacer on mobile to account for fixed header bar */}
        <div className="h-14 md:hidden" />
        <main className="flex-1 overflow-auto bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
