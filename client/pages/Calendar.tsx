import AdminCalendar from "@/components/calendar/AdminCalendar";
import { Booking } from "@/components/calendar/AdminCalendar";

function todayISO() { return new Date().toISOString().slice(0,10); }

const bookings: Booking[] = [
  { id: "c1", date: todayISO(), pickup: "Airport", dropoff: "City Center", customer: "Acme Corp", status: "confirmed", color: "emerald" },
];

export default function CalendarPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
      <AdminCalendar defaultBookings={bookings} />
    </div>
  );
}
