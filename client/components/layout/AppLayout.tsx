import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Calendar, LayoutDashboard, X } from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: Calendar },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-16 border-r bg-sidebar px-2 py-4 transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="mb-2 flex items-center justify-between px-1 lg:hidden">
            <div className="flex items-center gap-2 font-semibold">
            <div className="h-7 w-7 rounded-md bg-brand text-brand-foreground grid place-items-center font-bold">F</div>
            <span className="text-lg tracking-tight">FleetWise</span>
          </div>
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="mt-1 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => cn(
                  "flex items-center justify-center rounded-md py-2 text-sm font-medium hover:bg-sidebar-accent w-12 h-12",
                  isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground"
                )}
                title={item.label}
              >
                <Icon className="h-6 w-6" />
              </NavLink>
            );
          })}
        </nav>
      
      </aside>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />
      )}
    </>
  );
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen text-foreground">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <main className="lg:pl-16">
        <div className="px-4 py-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
