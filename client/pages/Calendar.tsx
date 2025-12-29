import React, { useState } from "react";
import OutlookCalendar from "@/components/calendar/OutlookCalendar";
import { CalendarEvent } from "@/components/calendar/OutlookCalendar";

// Sample data for demonstration
const sampleEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Airport Pickup - John Smith",
    date: new Date(),
    startTime: "09:00",
    endTime: "10:30",
    type: "booking",
    status: "confirmed",
    customer: "John Smith",
    driver: "Mike Wilson",
    vehicle: "Toyota Camry",
    location: "Airport Terminal 1",
    description: "Business class passenger with luggage"
  },
  {
    id: "2",
    title: "City Tour - Sarah Johnson",
    date: new Date(),
    startTime: "14:00",
    endTime: "16:00",
    type: "booking",
    status: "confirmed",
    customer: "Sarah Johnson",
    driver: "Tom Davis",
    vehicle: "Honda Accord",
    location: "Downtown District",
    description: "2-hour city sightseeing tour"
  },
  {
    id: "3",
    title: "Vehicle Maintenance",
    date: new Date(new Date().setDate(new Date().getDate() + 1)),
    startTime: "10:00",
    endTime: "12:00",
    type: "maintenance",
    status: "pending",
    vehicle: "Toyota Prius",
    description: "Regular oil change and inspection"
  },
  {
    id: "4",
    title: "Driver Meeting",
    date: new Date(new Date().setDate(new Date().getDate() + 2)),
    startTime: "15:00",
    endTime: "16:30",
    type: "meeting",
    status: "confirmed",
    description: "Monthly driver safety meeting"
  },
  {
    id: "5",
    title: "Hotel Shuttle - Business Group",
    date: new Date(new Date().setDate(new Date().getDate() + 3)),
    startTime: "08:00",
    endTime: "09:30",
    type: "booking",
    status: "confirmed",
    customer: "Marriott Hotel",
    driver: "Lisa Chen",
    vehicle: "Ford Transit",
    location: "Marriott Hotel Downtown",
    description: "Group transportation to convention center"
  }
];

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents);

  return (
    <div className="h-full">
      <OutlookCalendar events={events} />
    </div>
  );
}
