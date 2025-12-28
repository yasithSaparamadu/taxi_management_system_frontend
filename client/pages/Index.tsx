import { useMemo } from "react";
import AdminCalendar, { Booking } from "@/components/calendar/AdminCalendar";
import { cn } from "@/lib/utils";

const vehicles = [
  { id: "v1", name: "Toyota Prius", plate: "ABC-1234", color: "emerald" },
  { id: "v2", name: "Honda Accord", plate: "XYZ-5678", color: "sky" },
  { id: "v3", name: "Ford Transit", plate: "VAN-4321", color: "amber" },
];

const drivers = [
  { id: "d1", name: "John Doe" },
  { id: "d2", name: "Jane Smith" },
  { id: "d3", name: "Alex Lee" },
];

const customers = [
  { id: "c1", name: "Acme Corp" },
  { id: "c2", name: "Bolt Logistics" },
  { id: "c3", name: "Sunrise Hotel" },
];

function todayISO() { return new Date().toISOString().slice(0,10); }
function addDaysISO(days: number) { const d = new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }

const seedBookings: Booking[] = [
  { id: "b1", date: todayISO(), pickup: "Airport", dropoff: "Downtown", vehicleId: "v1", driverId: "d1", customer: "Acme Corp", status: "confirmed", color: "emerald" },
  { id: "b2", date: addDaysISO(1), pickup: "Warehouse", dropoff: "Harbor", vehicleId: "v2", driverId: "d2", customer: "Bolt Logistics", status: "pending", color: "sky" },
  { id: "b3", date: addDaysISO(2), pickup: "Hotel", dropoff: "Convention Ctr", vehicleId: "v3", driverId: "d3", customer: "Sunrise Hotel", status: "confirmed", color: "amber" },
];

export default function Dashboard() {
  const stats = useMemo(() => ({
    bookingsToday: seedBookings.filter(b => b.date === todayISO()).length,
    vehicles: vehicles.length,
    drivers: drivers.length,
    customers: customers.length,
    unpaidInvoices: 3,
  }), []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Welcome to your taxi management dashboard. Here's what's happening today.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard label="Active Bookings" value={stats.bookingsToday} accent="brand" />
        <StatCard label="Available Vehicles" value={stats.vehicles} accent="primary" />
        <StatCard label="Active Drivers" value={stats.drivers} accent="success" />
        <StatCard label="Customers" value={stats.customers} accent="info" />
        <StatCard label="Today's Revenue" value={`$${(3240).toLocaleString()}`} accent="warning" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <h2 className="mb-2 text-lg font-semibold tracking-tight">Calendar</h2>
          <AdminCalendar initialView="month" defaultBookings={seedBookings} />
        </div>
        <div className="space-y-4">
          <QuickActions />
          <RecentBookings bookings={seedBookings} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: "brand"|"primary"|"success"|"info"|"warning" }) {
  const accentCls = accent === "success" ? "from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-200" :
    accent === "info" ? "from-sky-500/15 to-sky-500/5 text-sky-700 dark:text-sky-200" :
    accent === "warning" ? "from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-200" :
    accent === "primary" ? "from-primary/20 to-primary/5 text-primary" :
    "from-brand/20 to-brand/5 text-brand";
  return (
    <div className={cn("rounded-lg border bg-card p-4", )}>
      <div className={cn("inline-flex rounded-md bg-gradient-to-br px-2 py-1 text-xs font-medium", accentCls)}>{label}</div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-base font-semibold">Quick Actions</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <a href="/bookings" className="rounded-md border px-3 py-2 hover:bg-muted">New Booking</a>
        <a href="/vehicles" className="rounded-md border px-3 py-2 hover:bg-muted">Add Vehicle</a>
        <a href="/admin/drivers" className="rounded-md border px-3 py-2 hover:bg-muted">Add Driver</a>
      </div>
      <div className="mt-3 rounded-md border p-3 text-xs text-muted-foreground">Admin handles all bookings, assignments, and user creation.</div>
    </div>
  );
}

function RecentBookings({ bookings }: { bookings: Booking[] }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-base font-semibold">Recent Bookings</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {bookings.map(b => (
          <li key={b.id} className="rounded-md border p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{b.customer}</div>
              <span className="text-xs capitalize text-muted-foreground">{b.status}</span>
            </div>
            <div className="text-xs text-muted-foreground">{b.pickup} → {b.dropoff} on {b.date}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
