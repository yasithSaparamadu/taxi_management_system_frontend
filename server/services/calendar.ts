// Placeholder calendar service. Later, integrate Microsoft Graph API:
// - Use client credentials or delegated auth
// - Create/Update/Delete events based on booking lifecycle
// - Store event ID in bookings.outlook_event_id

export async function upsertCalendarEvent(bookingId: number) {
  // Fetch booking from DB here in a real integration, build event payload and call Graph
  console.log(`[calendar] upsert event for booking`, bookingId);
}
