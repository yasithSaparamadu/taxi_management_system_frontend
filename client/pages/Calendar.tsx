import React, { useState, useEffect } from "react";
import OutlookCalendar from "@/components/calendar/OutlookCalendar";
import { CalendarEvent } from "@/components/calendar/OutlookCalendar";
import { Booking, ListBookingsResponse } from "@shared/api";

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    fetchBookings();
    // Listen for booking updates from other pages (e.g., driver assignment in Bookings)
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'BOOKING_UPDATED') {
        fetchBookings();
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'taxi_booking_updated') {
        fetchBookings();
      }
    };
    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []); // Added closing bracket here

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Check if token exists and is not empty/null
      if (!token || token === 'null' || token === 'undefined') {
        console.error('No valid authentication token found');
        setAuthError(true);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: ListBookingsResponse = await response.json();
        if (data.ok && data.items) {
          const calendarEvents = data.items
            .filter(booking => booking.status === 'confirmed')
            .map(transformBookingToEvent);
          setEvents(calendarEvents);
          setAuthError(false);
        }
      } else if (response.status === 401) {
        console.error('Authentication failed - token may be expired');
        setAuthError(true);
        localStorage.removeItem('token');
      } else {
        console.error('Failed to fetch bookings:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    setAuthError(false);
    fetchBookings();
  };

  const transformBookingToEvent = (booking: Booking): CalendarEvent => {
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);
    
    return {
      id: booking.id.toString(),
      title: `${booking.pickup_point || 'Booking'} - ${booking.contact_name || 'Customer'}`,
      date: startDate,
      startTime: formatTime(startDate),
      endTime: formatTime(endDate),
      type: "booking",
      status: booking.status as "confirmed" | "pending" | "cancelled" | "completed",
      customer: booking.contact_name || undefined,
      driver: booking.driver_id ? `Driver ID: ${booking.driver_id}` : undefined,
      location: booking.pickup_point || undefined,
      description: booking.special_instructions || booking.dropoff_point || '',
      color: getStatusColor(booking.status)
    };
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed': return '#10b981'; // green
      case 'scheduled': return '#3b82f6'; // blue
      case 'completed': return '#6b7280'; // gray
      case 'cancelled': return '#ef4444'; // red
      case 'no_show': return '#f59e0b'; // amber
      default: return '#6b7280'; // gray
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading calendar...</div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="text-lg text-red-600">Authentication Required</div>
        <div className="text-sm text-gray-600">Please log in to view the calendar</div>
        <button 
          onClick={() => window.location.href = '/login'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="h-full">
      <OutlookCalendar events={events} onRefresh={handleRefresh} />
    </div>
  );
}
