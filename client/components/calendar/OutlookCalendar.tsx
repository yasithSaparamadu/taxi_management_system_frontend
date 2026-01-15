import React, { useState, useMemo } from "react";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameMonth, isSameDay, addMonths, subMonths, isToday, parse, isValid } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, MapPin, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: "booking" | "maintenance" | "meeting" | "other";
  status: "confirmed" | "pending" | "cancelled" | "completed" | "deleted";
  customer?: string;
  driver?: string;
  vehicle?: string;
  location?: string;
  description?: string;
  color?: string;
  originalDate?: Date; // For showing moved bookings on original dates
  isMoved?: boolean; // Flag to indicate if this is a moved booking
  isDeleted?: boolean; // Flag to indicate if this booking was deleted
};

type ViewType = "day" | "week" | "month";

const OutlookCalendar: React.FC<{
  events?: CalendarEvent[];
  initialDate?: Date;
  initialView?: ViewType;
  onRefresh?: () => void;
  onDeleteBooking?: (bookingId: string) => void;
}> = ({ events = [], initialDate = new Date(), initialView = "day", onRefresh, onDeleteBooking }) => {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [viewType, setViewType] = useState<ViewType>(initialView);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const openEventDialog = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const openDeleteDialog = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteBooking = () => {
    if (selectedEvent && onDeleteBooking) {
      onDeleteBooking(selectedEvent.id);
      setIsDeleteDialogOpen(false);
      setSelectedEvent(null);
    }
  };

  // Navigation functions
  const navigatePrevious = () => {
    if (viewType === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewType === "week") {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const navigateNext = () => {
    if (viewType === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewType === "week") {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Date search functionality
  const parseDateSearch = (query: string): Date | null => {
    const trimmedQuery = query.trim().toLowerCase();
    
    if (!trimmedQuery) return null;
    
    // Handle "today" keyword
    if (trimmedQuery === 'today') {
      return new Date();
    }
    
    const currentYear = new Date().getFullYear();
    
    // Try parsing different date formats
    const formats = [
      // Full date formats
      { pattern: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parse: (m: RegExpMatchArray) => new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2])) },
      { pattern: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, parse: (m: RegExpMatchArray) => new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2])) },
      { pattern: /^(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})$/i, parse: (m: RegExpMatchArray) => new Date(parseInt(m[3]), new Date(m[2] + " 1, 2000").getMonth(), parseInt(m[1])) },
      { pattern: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s+(\d{4})$/i, parse: (m: RegExpMatchArray) => new Date(parseInt(m[3]), new Date(m[1] + " 1, 2000").getMonth(), parseInt(m[2])) },
      
      // Month formats
      { pattern: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})$/i, parse: (m: RegExpMatchArray) => new Date(parseInt(m[2]), new Date(m[1] + " 1, 2000").getMonth(), 1) },
      { pattern: /^(\d{1,2})\/(\d{4})$/, parse: (m: RegExpMatchArray) => new Date(parseInt(m[2]), parseInt(m[1]) - 1, 1) },
      
      // Year format
      { pattern: /^(\d{4})$/, parse: (m: RegExpMatchArray) => new Date(parseInt(m[1]), 0, 1) },
      
      // Day and month (assume current year)
      { pattern: /^(\d{1,2})\/(\d{1,2})$/, parse: (m: RegExpMatchArray) => new Date(currentYear, parseInt(m[1]) - 1, parseInt(m[2])) },
      { pattern: /^(\d{1,2})-(\d{1,2})$/, parse: (m: RegExpMatchArray) => new Date(currentYear, parseInt(m[1]) - 1, parseInt(m[2])) },
      { pattern: /^(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i, parse: (m: RegExpMatchArray) => new Date(currentYear, new Date(m[2] + " 1, 2000").getMonth(), parseInt(m[1])) },
      { pattern: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})$/i, parse: (m: RegExpMatchArray) => new Date(currentYear, new Date(m[1] + " 1, 2000").getMonth(), parseInt(m[2])) },
      
      // Month only (current year)
      { pattern: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i, parse: (m: RegExpMatchArray) => new Date(currentYear, new Date(m[1] + " 1, 2000").getMonth(), 1) },
    ];
    
    for (const { pattern, parse } of formats) {
      const match = trimmedQuery.match(pattern);
      if (match) {
        const date = parse(match);
        if (isValid(date)) {
          return date;
        }
      }
    }
    
    return null;
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const parsedDate = parseDateSearch(query);
    if (parsedDate) {
      setCurrentDate(parsedDate);
      setSelectedDate(parsedDate);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  // Get events for a specific date (including moved bookings on original dates)
  const getEventsForDate = (date: Date) => {
    const dateEvents = events.filter(event => isSameDay(event.date, date));
    
    // Also show moved bookings on their original dates in gray
    const movedEvents = events
      .filter(event => event.originalDate && isSameDay(event.originalDate, date))
      .map(event => ({
        ...event,
        isMoved: true,
        title: `${event.title} (Moved)`,
        color: '#9ca3af' // Gray color for moved bookings
      }));
    
    return [...dateEvents, ...movedEvents];
  };

  // Get week dates
  const getWeekDates = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  // Get month dates
  const getMonthDates = (date: Date) => {
    const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
    const dates = [];
    let current = start;
    while (current <= end) {
      dates.push(current);
      current = addDays(current, 1);
    }
    return dates;
  };

  // Format header text
  const getHeaderText = () => {
    switch (viewType) {
      case "month":
        return format(currentDate, "MMMM yyyy");
      case "week":
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
      default:
        return "";
    }
  };

  // Get event color
  const getEventColor = (event: CalendarEvent) => {
    // Use custom color if provided
    if (event.color) {
      return "";
    }
    
    switch (event.type) {
      case "booking":
        return "bg-blue-500";
      case "maintenance":
        return "bg-orange-500";
      case "meeting":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  // Get event style with custom color
  const getEventStyle = (event: CalendarEvent) => {
    if (event.color) {
      return {
        backgroundColor: event.color,
        borderColor: event.color,
      };
    }
    return {};
  };

  // Render month view
  const renderMonthView = () => {
    const dates = getMonthDates(currentDate);
    const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

    return (
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Week headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((day) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {dates.map((date, index) => {
            const dayEvents = getEventsForDate(date);
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isCurrentDay = isToday(date);

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[80px] p-1 border-r border-b border-gray-100 cursor-pointer hover:bg-gray-50 relative",
                  !isCurrentMonth && "bg-gray-50 text-gray-400",
                  isCurrentDay && "bg-blue-50"
                )}
                onClick={() => setSelectedDate(date)}
              >
                <div className={cn(
                  "text-sm font-medium mb-1",
                  isCurrentDay && "text-blue-600 font-bold"
                )}>
                  {format(date, "d")}
                </div>
                
                {/* Event indicators */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center"
                      title={event.title}
                    >
                      <div 
                        className={cn(
                          "w-2 h-2 rounded-full mr-1",
                          event.isMoved ? "bg-gray-400" : getEventColor(event)
                        )}
                        style={!event.isMoved ? getEventStyle(event) : {}}
                      />
                      <div className={cn(
                        "text-xs truncate text-gray-700",
                        event.isMoved && "text-gray-500 italic"
                      )}>
                        {event.title}
                      </div>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500 pl-3">
                      +{dayEvents.length - 2}
                    </div>
                  )}
                </div>

                {/* Today indicator */}
                {isCurrentDay && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex-1 bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-8 border-b border-gray-200">
          <div className="p-3 text-center text-xs font-medium text-gray-600 bg-gray-50">
            Time
          </div>
          {weekDates.map((date) => (
            <div key={date.toISOString()} className="p-3 text-center text-xs font-medium text-gray-600 bg-gray-50">
              <div>{format(date, "EEE")}</div>
              <div className={cn("text-lg", isToday(date) && "text-blue-600 font-bold")}>
                {format(date, "d")}
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-auto" style={{ height: "600px" }}>
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
              <div className="p-2 text-xs text-gray-500 text-right">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDates.map((date) => {
                const hourEvents = getEventsForDate(date).filter(event => {
                  const eventHour = parseInt(event.startTime.split(":")[0]);
                  return eventHour === hour;
                });

                return (
                  <div key={date.toISOString()} className="border-l border-gray-100 min-h-[60px] p-1">
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "text-xs p-1 rounded border mb-1 cursor-pointer",
                          getEventColor(event)
                        )}
                        style={getEventStyle(event)}
                        onClick={() => openEventDialog(event)}
                      >
                        <div className="font-medium">{event.title}</div>
                        <div className="text-xs opacity-75">{event.startTime} - {event.endTime}</div>
                        {event.customer && (
                          <div className="text-xs opacity-75">Customer: {event.customer}</div>
                        )}
                        {event.location && (
                          <div className="text-xs opacity-75">📍 {event.location}</div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex-1 bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold">{format(currentDate, "EEEE, MMMM d, yyyy")}</h3>
        </div>

        <div className="overflow-auto" style={{ height: "600px" }}>
          {hours.map((hour) => (
            <div key={hour} className="flex border-b border-gray-100">
              <div className="w-20 p-2 text-xs text-gray-500 text-right">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1 min-h-[60px] border-l border-gray-100 p-2">
                {dayEvents
                  .filter(event => parseInt(event.startTime.split(":")[0]) === hour)
                  .map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "p-2 rounded border mb-2 cursor-pointer",
                        getEventColor(event)
                      )}
                      style={getEventStyle(event)}
                      onClick={() => openEventDialog(event)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-sm">
                          <span className="font-medium">{event.title}</span>
                          <span className="opacity-75"> • {event.startTime}-{event.endTime}</span>
                          {event.customer && <span className="opacity-75"> • Customer: {event.customer}</span>}
                          {event.driver && <span className="opacity-75"> • {event.driver}</span>}
                          {event.location && <span className="opacity-75"> • {event.location}</span>}
                          {event.description && <span className="opacity-75"> • {event.description}</span>}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {event.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render agenda view
  const renderAgendaView = () => {
    const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());

    return (
      <div className="flex-1 bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold">Agenda</h3>
        </div>

        <div className="overflow-auto" style={{ height: "600px" }}>
          {sortedEvents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No events scheduled</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sortedEvents.map((event) => (
                <div key={event.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className={cn("w-3 h-3 rounded-full", getEventColor(event))} 
                         style={getEventStyle(event)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-sm text-gray-700">
                          <button
                            type="button"
                            className="font-medium text-gray-900 hover:underline"
                            onClick={() => openEventDialog(event)}
                          >
                            {event.title}
                          </button>
                          <span className="text-gray-500"> • {format(event.date, "MMM d, yyyy")}</span>
                          <span className="text-gray-500"> • {event.startTime}-{event.endTime}</span>
                          {event.customer && <span className="text-gray-500"> • {event.customer}</span>}
                          {event.location && <span className="text-gray-500"> • {event.location}</span>}
                          {event.description && <span className="text-gray-600"> • {event.description}</span>}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {event.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Dialog
        open={isEventDialogOpen}
        onOpenChange={(open) => {
          setIsEventDialogOpen(open);
          if (!open) setSelectedEvent(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full border"
                style={{ backgroundColor: selectedEvent?.color || undefined, borderColor: selectedEvent?.color || undefined }}
              />
              {selectedEvent?.title ?? "Event Details"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            {selectedEvent?.date && (
              <div className="text-muted-foreground">
                {format(selectedEvent.date, "PPPP")} • {selectedEvent.startTime}-{selectedEvent.endTime}
              </div>
            )}

            {selectedEvent?.originalDate && (
              <div className="text-orange-600 text-xs">
                Originally scheduled: {format(selectedEvent.originalDate, "PPPP")}
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="capitalize">{selectedEvent?.status ?? ""}</Badge>
            </div>

            {selectedEvent?.customer && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Customer</span>
                <span className="text-right">{selectedEvent.customer}</span>
              </div>
            )}

            {selectedEvent?.driver && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Driver</span>
                <span className="text-right">{selectedEvent.driver}</span>
              </div>
            )}

            {selectedEvent?.vehicle && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Vehicle</span>
                <span className="text-right">{selectedEvent.vehicle}</span>
              </div>
            )}

            {selectedEvent?.location && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Location</span>
                <span className="text-right">{selectedEvent.location}</span>
              </div>
            )}

            {selectedEvent?.description && (
              <div>
                <div className="text-muted-foreground mb-1">Details</div>
                <div className="whitespace-pre-wrap break-words rounded-md border bg-muted/20 p-3">
                  {selectedEvent.description}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsEventDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">Calendar</h1>
            
            {/* Navigation */}
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="sm" onClick={navigatePrevious}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={navigateToday}>
                Today
              </Button>
              <Button variant="ghost" size="sm" onClick={navigateNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Current date display */}
            <div className="text-lg font-medium text-gray-700">
              {getHeaderText()}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Refresh button */}
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh} title="Refresh bookings">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
            )}
            
           

            {/* View buttons */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
              {(["day", "week", "month"] as ViewType[]).map((view) => (
                <Button
                  key={view}
                  variant={viewType === view ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewType(view)}
                  className="capitalize text-xs"
                >
                  {view}
                </Button>
              ))}
            </div>

            {/* New event button */}
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1">
        {/* Left sidebar - Date selection */}
        <div className="w-80 bg-white border-r border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Date Selection</h3>
          
          {/* Date Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search any date, month, or year..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="pl-10 w-full"
              />
            </div>
           
          </div>

       

          {/* Year and Month Selectors */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Select Year & Month</h4>
            <div className="space-y-2">
              {/* Year Selector */}
              <div className="flex items-center gap-2">
                <select
                  value={currentDate.getFullYear()}
                  onChange={(e) => {
                    const newDate = new Date(currentDate);
                    newDate.setFullYear(parseInt(e.target.value));
                    setCurrentDate(newDate);
                    setSelectedDate(newDate);
                  }}
                  className="flex-1 text-xs border rounded px-2 py-1"
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - 5 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
                <span className="text-xs text-gray-500">Year</span>
              </div>
              
              {/* Month Selector */}
              <div className="flex items-center gap-2">
                <select
                  value={currentDate.getMonth()}
                  onChange={(e) => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(parseInt(e.target.value));
                    setCurrentDate(newDate);
                    setSelectedDate(newDate);
                  }}
                  className="flex-1 text-xs border rounded px-2 py-1"
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">Month</span>
              </div>
            </div>
          </div>
          
          {/* Mini calendar */}
          <div className="mb-6">
            <div className="text-center text-sm font-medium text-gray-700 mb-2">
              {format(currentDate, "MMMM yyyy")}
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs">
              {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
                <div key={day} className="text-center font-medium text-gray-600 p-1">
                  {day}
                </div>
              ))}
              {getMonthDates(currentDate).map((date, index) => {
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isCurrentDay = isToday(date);
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const hasEvents = getEventsForDate(date).length > 0;
                
                return (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedDate(date);
                      setCurrentDate(date);
                    }}
                    className={cn(
                      "text-center p-1 cursor-pointer rounded",
                      !isCurrentMonth && "text-gray-400",
                      isCurrentDay && "bg-blue-100 text-blue-600 font-bold",
                      isSelected && "bg-blue-500 text-white",
                      !isSelected && isCurrentDay && "hover:bg-blue-200",
                      !isSelected && !isCurrentDay && "hover:bg-gray-100"
                    )}
                  >
                    <div className="relative">
                      {format(date, "d")}
                      {hasEvents && (
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected date details */}
          {selectedDate && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                {format(selectedDate, "MMMM d, yyyy")}
              </h4>
              <div className="space-y-2">
                {getEventsForDate(selectedDate).map((event) => (
                  <div
                    key={event.id}
                    className="p-2 rounded border text-xs bg-white cursor-pointer"
                    style={{
                      borderLeftWidth: 4,
                      borderLeftStyle: 'solid',
                      borderLeftColor: event.color || undefined,
                    }}
                    onClick={() => openEventDialog(event)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                        <span className="font-medium">{event.title}</span>
                        <span className="opacity-75"> • {event.startTime}-{event.endTime}</span>
                        {event.customer && <span className="opacity-75"> • {event.customer}</span>}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                        {event.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {getEventsForDate(selectedDate).length === 0 && (
                  <div className="text-xs text-gray-500 text-center py-4">
                    No events scheduled
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right content - Calendar view */}
        <div className="flex-1 p-6">
          {viewType === "month" && renderMonthView()}
          {viewType === "week" && renderWeekView()}
          {viewType === "day" && renderDayView()}
        </div>
      </div>
    </div>
  );
};

export default OutlookCalendar;
