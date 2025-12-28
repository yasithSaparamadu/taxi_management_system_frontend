import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Calendar, LayoutDashboard, Menu, X } from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: Calendar },
];

function Header({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-3 px-4">
        <button className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted" onClick={onMenu} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 font-semibold">
          <div className="h-7 w-7 rounded-md bg-brand text-brand-foreground grid place-items-center font-bold">F</div>
          <span className="text-lg tracking-tight">FleetWise Admin</span>
        </div>
       
        
      </div>
    </header>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 border-r bg-sidebar px-3 py-4 transition-transform lg:translate-x-0",
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
                  "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium hover:bg-sidebar-accent",
                  isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-4 rounded-md border p-3 text-xs text-muted-foreground">
          Role-based access control. Only Admins can create users and bookings.
        </div>
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
    <div className="min-h-screen bg-background text-foreground">
      <Header onMenu={() => setOpen(true)} />
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <main className="lg:pl-64">
        <div className="px-4 py-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
