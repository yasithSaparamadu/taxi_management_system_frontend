import { useMemo, useState } from "react";
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Booking = {
  id: string;
  date: string; // ISO date (no time) used for month/week views
  pickup: string;
  dropoff: string;
  vehicleId?: string;
  driverId?: string;
  customer?: string;
  status?: "pending" | "confirmed" | "completed" | "cancelled";
  color?: string; // tailwind bg-* class
};

type View = "month" | "week" | "day";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default function AdminCalendar({
  initialDate,
  initialView = "month",
  defaultBookings = [],
  onChange,
}: {
  initialDate?: Date;
  initialView?: View;
  defaultBookings?: Booking[];
  onChange?: (b: Booking[]) => void;
}) {
  const [view, setView] = useState<View>(initialView);
  const [cursor, setCursor] = useState<Date>(initialDate ?? new Date());
  const [bookings, setBookings] = useState<Booking[]>(defaultBookings);

  const weeks = useMemo(() => buildMonthMatrix(cursor), [cursor]);

  function moveCursor(delta: number) {
    if (view === "month") {
      const next = new Date(cursor);
      next.setMonth(cursor.getMonth() + delta);
      setCursor(next);
    } else if (view === "week") {
      setCursor(addDays(cursor, 7 * delta));
    } else {
      setCursor(addDays(cursor, delta));
    }
  }

  function updateBookings(next: Booking[]) {
    setBookings(next);
    onChange?.(next);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, date: Date) {
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    updateBookings(
      bookings.map((b) => (b.id === id ? { ...b, date: dayKey(date) } : b))
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted" onClick={() => moveCursor(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted" onClick={() => moveCursor(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="text-sm font-medium">{format(cursor, view === "month" ? "MMMM yyyy" : view === "week" ? "wo 'week' yyyy" : "PPPP")}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView("day")} className={cn("rounded-md border px-2 py-1 text-xs", view === "day" && "bg-brand/10 border-brand text-brand")}>Day</button>
          <button onClick={() => setView("week")} className={cn("rounded-md border px-2 py-1 text-xs", view === "week" && "bg-brand/10 border-brand text-brand")}>Week</button>
          <button onClick={() => setView("month")} className={cn("rounded-md border px-2 py-1 text-xs", view === "month" && "bg-brand/10 border-brand text-brand")}>Month</button>
        </div>
      </div>

      {view === "month" && (
        <MonthView weeks={weeks} cursor={cursor} bookings={bookings} onDrop={handleDrop} />
      )}
      {view === "week" && (
        <WeekView weekCursor={cursor} bookings={bookings} onDrop={handleDrop} />
      )}
      {view === "day" && (
        <DayView date={cursor} bookings={bookings} onDrop={handleDrop} />
      )}
    </div>
  );
}

function MonthView({ weeks, cursor, bookings, onDrop }: { weeks: Date[][]; cursor: Date; bookings: Booking[]; onDrop: (e: React.DragEvent<HTMLDivElement>, date: Date) => void; }) {
  const headers = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return (
    <div className="p-3">
      <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground mb-2">
        {headers.map(h => <div key={h} className="px-2">{h}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {weeks.flat().map((day, idx) => {
          const key = dayKey(day);
          const dayBookings = bookings.filter(b => b.date === key);
          const isCurrentMonth = isSameMonth(day, cursor);
          return (
            <div
              key={key + idx}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, day)}
              className={cn("min-h-[120px] rounded-md border p-2", !isCurrentMonth && "bg-muted/30 text-muted-foreground")}
            >
              <div className={cn("mb-1 text-xs font-semibold", isToday(day) && "text-brand")}>{format(day, "d")}</div>
              <div className="space-y-1">
                {dayBookings.map(b => (
                  <div
                    key={b.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", b.id)}
                    className={cn("group cursor-grab rounded-md border px-2 py-1 text-xs", colorClass(b.color))}
                    title={`${b.pickup} → ${b.dropoff}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{b.customer ?? "Booking"}</span>
                      <span className="shrink-0 text-[10px] capitalize opacity-80">{b.status ?? "confirmed"}</span>
                    </div>
                    <div className="truncate opacity-80">{b.pickup} → {b.dropoff}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-muted-foreground">Drag a booking card to reschedule. Colors indicate vehicle/driver assignment.</div>
    </div>
  );
}

function WeekView({ weekCursor, bookings, onDrop }: { weekCursor: Date; bookings: Booking[]; onDrop: (e: React.DragEvent<HTMLDivElement>, date: Date) => void; }) {
  const start = startOfWeek(weekCursor, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="p-3">
      <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground mb-2">
        {days.map(d => <div key={dayKey(d)} className="px-2">{format(d, "EEE d")}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = dayKey(day);
          const dayBookings = bookings.filter(b => b.date === key);
          return (
            <div key={key} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, day)} className="min-h-[220px] rounded-md border p-2">
              <div className={cn("mb-1 text-xs font-semibold", isToday(day) && "text-brand")}>{format(day, "EEEE d")}</div>
              <div className="space-y-1">
                {dayBookings.map(b => (
                  <div key={b.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", b.id)} className={cn("rounded-md border px-2 py-1 text-xs", colorClass(b.color))}>
                    <div className="font-medium">{b.customer ?? "Booking"} <span className="opacity-80">({b.pickup} → {b.dropoff})</span></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ date, bookings, onDrop }: { date: Date; bookings: Booking[]; onDrop: (e: React.DragEvent<HTMLDivElement>, date: Date) => void; }) {
  const dayBookings = bookings.filter(b => b.date === dayKey(date));
  return (
    <div className="p-3">
      <div className="mb-2 text-sm font-medium text-muted-foreground">{format(date, "PPPP")}</div>
      <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, date)} className="min-h-[280px] rounded-md border p-2">
        <div className="space-y-2">
          {dayBookings.length === 0 && (
            <div className="text-xs text-muted-foreground">No bookings</div>
          )}
          {dayBookings.map(b => (
            <div key={b.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", b.id)} className={cn("rounded-md border p-2 text-xs", colorClass(b.color))}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{b.customer ?? "Booking"}</div>
                <span className="shrink-0 text-[10px] capitalize opacity-80">{b.status ?? "confirmed"}</span>
              </div>
              <div className="opacity-80">{b.pickup} → {b.dropoff}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildMonthMatrix(date: Date) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
  const days: Date[][] = [];
  let current = start;
  while (current <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(current);
      current = addDays(current, 1);
    }
    days.push(week);
  }
  return days;
}

function colorClass(color?: string) {
  switch (color) {
    case "emerald":
      return "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-100 dark:border-emerald-800";
    case "sky":
      return "bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-900/30 dark:text-sky-100 dark:border-sky-800";
    case "amber":
      return "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-800";
    case "rose":
      return "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-900/30 dark:text-rose-100 dark:border-rose-800";
    default:
      return "bg-muted text-foreground border-muted";
  }
}
