import React, { useState, useMemo } from "react";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, MapPin, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: "booking" | "maintenance" | "meeting" | "other";
  status: "confirmed" | "pending" | "cancelled" | "completed";
  customer?: string;
  driver?: string;
  vehicle?: string;
  location?: string;
  description?: string;
  color?: string;
};

type ViewType = "day" | "week" | "month";

const OutlookCalendar: React.FC<{
  events?: CalendarEvent[];
  initialDate?: Date;
  initialView?: ViewType;
  onRefresh?: () => void;
}> = ({ events = [], initialDate = new Date(), initialView = "day", onRefresh }) => {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [viewType, setViewType] = useState<ViewType>(initialView);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
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
                    >
                      <div 
                        className={cn(
                          "w-2 h-2 rounded-full mr-1",
                          getEventColor(event)
                        )}
                        style={getEventStyle(event)}
                      />
                      <div className="text-xs truncate text-gray-700">
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
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
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
                          "text-xs p-1 rounded border mb-1",
                          getEventColor(event)
                        )}
                        style={getEventStyle(event)}
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
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
              </div>
              <div className="flex-1 min-h-[60px] border-l border-gray-100 p-2">
                {dayEvents
                  .filter(event => parseInt(event.startTime.split(":")[0]) === hour)
                  .map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "p-2 rounded border mb-2",
                        getEventColor(event)
                      )}
                      style={getEventStyle(event)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{event.title}</div>
                        <Badge variant="outline" className="text-xs">
                          {event.status}
                        </Badge>
                      </div>
                      <div className="text-sm opacity-75 mt-1">
                        {event.startTime} - {event.endTime}
                      </div>
                      {event.customer && (
                        <div className="text-sm opacity-75 mt-1">Customer: {event.customer}</div>
                      )}
                      {event.driver && (
                        <div className="text-sm opacity-75 mt-1">👤 {event.driver}</div>
                      )}
                      {event.location && (
                        <div className="text-sm opacity-75 mt-1">📍 {event.location}</div>
                      )}
                      {event.description && (
                        <div className="text-sm opacity-75 mt-1">{event.description}</div>
                      )}
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
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {event.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <Clock className="inline w-3 h-3 mr-1" />
                        {format(event.date, "MMM d, yyyy")} • {event.startTime} - {event.endTime}
                      </div>
                      {event.customer && (
                        <div className="text-sm text-gray-500 mt-1">
                          <Users className="inline w-3 h-3 mr-1" />
                          {event.customer}
                        </div>
                      )}
                      {event.location && (
                        <div className="text-sm text-gray-500 mt-1">
                          <MapPin className="inline w-3 h-3 mr-1" />
                          {event.location}
                        </div>
                      )}
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                      )}
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
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search"
                className="pl-8 w-48"
              />
            </div>

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
                    className={cn(
                      "p-2 rounded border text-xs",
                      getEventColor(event)
                    )}
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className="text-xs opacity-75">
                      {event.startTime} - {event.endTime}
                    </div>
                    {event.customer && (
                      <div className="text-xs opacity-75">
                        {event.customer}
                      </div>
                    )}
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
