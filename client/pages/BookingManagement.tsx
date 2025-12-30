import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { ListBookingsResponse, Booking, User, UpdateBookingRequest, UpdateBookingResponse, Vehicle } from "@shared/api";
import { selectToken } from "../store/auth";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";

export default function BookingManagement() {
  const token = useSelector(selectToken);
  const directToken = localStorage.getItem('token');
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UpdateBookingRequest>({});
  const [showEditForm, setShowEditForm] = useState(false);
  const [showEditConfirmDialog, setShowEditConfirmDialog] = useState(false);
  const [showNoDriverConfirmDialog, setShowNoDriverConfirmDialog] = useState(false);
  const [showDriverConfirmDialog, setShowDriverConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'edit' | null>(null);

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');

  const headers = (): Record<string, string> => {
    const tokenToUse = token || directToken;
    if (!tokenToUse) throw new Error("No authentication token available");
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenToUse}`,
    };
  };

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [bookingsRes, customersRes, driversRes, vehiclesRes] = await Promise.all([
        fetch('/api/bookings', { headers: headers() }),
        fetch('/api/users?role=customer', { headers: headers() }),
        fetch('/api/users?role=driver', { headers: headers() }),
        fetch('/api/vehicles', { headers: headers() }),
      ]);

      const bookingsData: ListBookingsResponse = await bookingsRes.json();
      const customersData = await customersRes.json();
      const driversData = await driversRes.json();
      const vehiclesData = await vehiclesRes.json();

      setItems(bookingsData?.ok ? bookingsData.items : []);
      setCustomers(Array.isArray(customersData?.users) ? customersData.users : []);
      setDrivers(Array.isArray(driversData?.users) ? driversData.users : []);
      setVehicles(Array.isArray(vehiclesData?.items) ? vehiclesData.items : []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filteredItems = items.filter((b) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (sourceFilter && b.source !== (sourceFilter as any)) return false;

    const anyB = b as any;
    const cid = anyB.customer_id as number | undefined;
    const search = q.trim().toLowerCase();
    if (!search) return true;

    const haystack = [
      String(b.id),
      getCustomerDisplay(b),
      getCustomerSecondary(b),
      cid ? String(cid) : '',
      b.pickup_point ?? '',
      b.dropoff_point ?? '',
      String(b.service_id),
      b.status,
      b.source,
    ]
      .join(' | ')
      .toLowerCase();

    return haystack.includes(search);
  });

  const getDriverName = (driverId: number | null | undefined) => {
    if (!driverId) return 'Unassigned';
    const driver = drivers.find(d => Number(d.id) === driverId);
    return driver ? `${driver.profile?.first_name || ''} ${driver.profile?.last_name || ''}` : `Driver #${driverId}`;
  };

  const getVehicleName = (vehicleId: number | null | undefined) => {
    if (!vehicleId) return 'Unassigned';
    const vehicle = vehicles.find(v => Number(v.id) === vehicleId);
    return vehicle ? `${vehicle.name} ${vehicle.plate ? `(${vehicle.plate})` : ''}` : `Vehicle #${vehicleId}`;
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find(c => Number(c.id) === customerId);
    return customer ? `${customer.profile?.first_name} ${customer.profile?.last_name}` : `Customer #${customerId}`;
  };

  const getCustomerDisplay = (b: Booking) => {
    const nameFromBooking = (b.contact_name ?? '').trim();
    if (nameFromBooking) return nameFromBooking;

    const anyB = b as any;
    const cid = anyB.customer_id as number | undefined;
    if (cid) return getCustomerName(cid);

    return 'Unknown';
  };

  const getCustomerSecondary = (b: Booking) => {
    const phone = (b as any).contact_phone;
    const email = (b as any).contact_email;
    if (phone && email) return `${phone} • ${email}`;
    if (phone) return phone;
    if (email) return email;
    return '';
  };

  const startEdit = (booking: Booking) => {
    const anyB = booking as any;
    setEditing(booking.id);
    setEditForm({
      service_id: booking.service_id,
      start_time: booking.start_time,
      end_time: booking.end_time,
      source: booking.source,
      estimated_price_cents: booking.estimated_price_cents,
      admin_note: anyB.admin_note || '',
      created_by_name: anyB.created_by_name || '',
      pickup_point: booking.pickup_point || '',
      dropoff_point: booking.dropoff_point || '',
      special_instructions: anyB.special_instructions || '',
      driver_id: anyB.driver_id,
      customer_id: anyB.customer_id,
      contact_name: booking.contact_name || '',
      contact_phone: anyB.contact_phone || '',
      contact_email: anyB.contact_email || '',
      vehicle_id: anyB.vehicle_id,
      status: booking.status as any,
    });
    setShowEditForm(true);
  };

  const cancelEdit = () => {
    setEditing(null);
    setShowEditForm(false);
    setEditForm({});
  };

  const onEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => {
      const updated = {
        ...prev,
        [name]: name === 'service_id' || name === 'estimated_price_cents' || name === 'vehicle_id'
          ? (value === '' ? 0 : Number(value))
          : name === 'driver_id' || name === 'customer_id'
          ? (value === '' ? null : Number(value))
          : value === ''
          ? undefined  // Don't send empty strings to server
          : value
      };
      return updated;
    });
  };

  const onUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setPendingAction('edit');
    if (!editForm.driver_id) {
      setShowNoDriverConfirmDialog(true);
    } else {
      setShowDriverConfirmDialog(true);
    }
  };

  
  const confirmNoDriver = () => {
    setShowNoDriverConfirmDialog(false);
    const updatedForm = { ...editForm, status: 'scheduled' as const };
    console.log('Setting status to scheduled, form:', updatedForm); // Debug log
    setEditForm(updatedForm);
    // Call confirmUpdate directly with the updated form
    confirmUpdateWithStatus(updatedForm);
  };

  const confirmDriver = () => {
    setShowDriverConfirmDialog(false);
    const updatedForm = { ...editForm, status: 'confirmed' as const };
    console.log('Setting status to confirmed, form:', updatedForm); // Debug log
    setEditForm(updatedForm);
    // Call confirmUpdate directly with the updated form
    confirmUpdateWithStatus(updatedForm);
  };

  const confirmUpdateWithStatus = async (formWithStatus: any) => {
    if (!editing) return;
    
    try {
      console.log('Current form before filtering:', formWithStatus); // Debug log
      
      // Filter out undefined values before sending
      const payload = Object.fromEntries(
        Object.entries(formWithStatus).filter(([_, value]) => value !== undefined)
      );
      
      console.log('Sending payload after filtering:', payload); // Debug log
      
      const res = await fetch(`/api/bookings/${editing}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      const data: UpdateBookingResponse = raw ? JSON.parse(raw) : { ok: false, error: 'Empty response from server' };
      
      if (!res.ok || !data.ok) {
        console.error('Server response:', raw); // Debug log
        console.error('Parsed error:', data); // Debug log
        throw new Error(data.error || raw || "Failed to update booking");
      }
      
      setMessage(`Booking #${editing} updated!`);
      cancelEdit();
      load();
      // Notify calendar page to refresh after driver assignment
      window.postMessage({ type: 'BOOKING_UPDATED', payload: { id: editing } }, window.location.origin);
      // Fallback: localStorage event for cross-tab sync
      localStorage.setItem('taxi_booking_updated', Date.now().toString());
    } catch (e: any) {
      setError(e.message);
    }
  };

  const confirmUpdate = async () => {
    // This is now only used when clicking Update button directly
    if (!editing) return;
    setShowEditConfirmDialog(false);
    await confirmUpdateWithStatus(editForm);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Booking Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => navigate("/booking-dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button variant="outline" type="button" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>
      </div>

      {message && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{message}</div>}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Bookings</h2>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="Search by customer, id, pickup, dropoff..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded border px-3 py-2"
              >
                <option value="">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full rounded border px-3 py-2"
              >
                <option value="">All</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="web">Web</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Customer</th>
                <th className="text-left p-2">Contact</th>
                <th className="text-left p-2">Driver</th>
                <th className="text-left p-2">Vehicle</th>
                <th className="text-left p-2">Pickup</th>
                <th className="text-left p-2">Dropoff</th>
                <th className="text-left p-2">Time</th>
                <th className="text-left p-2">Price</th>
                <th className="text-left p-2">Service</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((b) => {
                const anyB = b as any;
                return (
                <tr key={b.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{b.id}</td>
                  <td className="p-2">
                    <div>
                      <div className="font-medium">{getCustomerDisplay(b)}</div>
                      <div className="text-xs text-gray-500">ID: {anyB.customer_id || '-'}</div>
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="text-xs">
                      <div>{anyB.contact_phone || '-'}</div>
                      <div>{anyB.contact_email || '-'}</div>
                    </div>
                  </td>
                  <td className="p-2">{getDriverName(anyB.driver_id)}</td>
                  <td className="p-2">{getVehicleName(anyB.vehicle_id)}</td>
                  <td className="p-2">{b.pickup_point || '-'}</td>
                  <td className="p-2">{b.dropoff_point || '-'}</td>
                  <td className="p-2">
                    <div className="text-xs">
                      <div>{new Date(b.start_time).toLocaleString('en-GB', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                      <div>{new Date(b.end_time).toLocaleString('en-GB', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </td>
                  <td className="p-2">${(b.estimated_price_cents ?? 0) / 100}</td>
                  <td className="p-2">{b.service_id || '-'}</td>
                  <td className="p-2">
                    <Badge variant="outline" className="capitalize">
                      {b.status}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => startEdit(b)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Form */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Edit Booking #{editing}</h3>
              <form onSubmit={onUpdate} className="space-y-4">
                {/* Customer */}
                <div>
                  <label className="block text-sm font-medium mb-1">Customer *</label>
                  <select 
                    name="customer_id" 
                    className="w-full rounded border px-3 py-2" 
                    value={editForm.customer_id || ''} 
                    onChange={onEditChange}
                  >
                    <option value="">Select a customer...</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.profile?.first_name} {customer.profile?.last_name} {customer.email ? `(${customer.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name</label>
                  <input 
                    name="contact_name" 
                    type="text" 
                    className="w-full rounded border px-3 py-2" 
                    value={editForm.contact_name || ''} 
                    onChange={onEditChange}
                    placeholder="Customer name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Driver (Optional)</label>
                    <select 
                      name="driver_id" 
                      className="w-full rounded border px-3 py-2" 
                      value={editForm.driver_id || ''} 
                      onChange={onEditChange}
                    >
                      <option value="">Select a driver...</option>
                      {drivers.filter(d => d.status === 'active').map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.profile?.first_name} {driver.profile?.last_name} {driver.email ? `(${driver.email})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Vehicle (Optional)</label>
                    <select 
                      name="vehicle_id" 
                      className="w-full rounded border px-3 py-2" 
                      value={editForm.vehicle_id || ''} 
                      onChange={onEditChange}
                    >
                      <option value="">Select a vehicle...</option>
                      {vehicles.filter(v => v.status === 'active').map(vehicle => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.name} {vehicle.plate ? `(${vehicle.plate})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Contact info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Contact Phone</label>
                    <input
                      name="contact_phone"
                      type="text"
                      className="w-full rounded border px-3 py-2"
                      value={editForm.contact_phone || ''}
                      onChange={onEditChange}
                      placeholder="Contact phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Contact Email</label>
                    <input
                      name="contact_email"
                      type="email"
                      className="w-full rounded border px-3 py-2"
                      value={editForm.contact_email || ''}
                      onChange={onEditChange}
                      placeholder="Contact email"
                    />
                  </div>
                </div>

                {/* Trip details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Pickup Point *</label>
                    <input 
                      name="pickup_point" 
                      type="text" 
                      className="w-full rounded border px-3 py-2" 
                      value={editForm.pickup_point || ''} 
                      onChange={onEditChange}
                      placeholder="Pickup location"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Dropoff Point</label>
                    <input 
                      name="dropoff_point" 
                      type="text" 
                      className="w-full rounded border px-3 py-2" 
                      value={editForm.dropoff_point || ''} 
                      onChange={onEditChange}
                      placeholder="Dropoff location"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time *</label>
                    <input 
                      name="start_time" 
                      type="datetime-local" 
                      className="w-full rounded border px-3 py-2" 
                      value={editForm.start_time ? new Date(editForm.start_time).toISOString().slice(0, 16) : ''} 
                      onChange={onEditChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time *</label>
                    <input 
                      name="end_time" 
                      type="datetime-local" 
                      className="w-full rounded border px-3 py-2" 
                      value={editForm.end_time ? new Date(editForm.end_time).toISOString().slice(0, 16) : ''} 
                      onChange={onEditChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Service ID</label>
                    <input 
                      name="service_id" 
                      type="number" 
                      className="w-full rounded border px-3 py-2" 
                      value={editForm.service_id || ''} 
                      onChange={onEditChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Estimated Price (cents)</label>
                    <input 
                      name="estimated_price_cents" 
                      type="number" 
                      className="w-full rounded border px-3 py-2" 
                      value={editForm.estimated_price_cents || ''} 
                      onChange={onEditChange}
                      placeholder="e.g., 2500 for $25.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Source</label>
                    <select 
                      name="source" 
                      className="w-full rounded border px-3 py-2" 
                      value={editForm.source || ''} 
                      onChange={onEditChange}
                    >
                      <option value="phone">Phone</option>
                      <option value="email">Email</option>
                      <option value="web">Web</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Created By Name</label>
                    <input 
                      name="created_by_name" 
                      type="text" 
                      className="w-full rounded border px-3 py-2" 
                      value={editForm.created_by_name || ''} 
                      onChange={onEditChange}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select 
                      name="status" 
                      className="w-full rounded border px-3 py-2" 
                      value={editForm.status || ''} 
                      onChange={onEditChange}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1">Admin Notes</label>
                  <textarea 
                    name="admin_note" 
                    className="w-full rounded border px-3 py-2" 
                    rows={3}
                    value={editForm.admin_note || ''} 
                    onChange={onEditChange}
                    placeholder="Any special instructions or notes..."
                  />
                </div>

                {/* Special Instructions */}
                <div>
                  <label className="block text-sm font-medium mb-1">Special Instructions</label>
                  <textarea
                    name="special_instructions"
                    className="w-full rounded border px-3 py-2"
                    rows={3}
                    value={editForm.special_instructions || ''}
                    onChange={onEditChange}
                    placeholder="Any special instructions..."
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Update Booking
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* No Driver Confirmation Dialog */}
      <AlertDialog open={showNoDriverConfirmDialog} onOpenChange={setShowNoDriverConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No driver assigned</AlertDialogTitle>
            <AlertDialogDescription>
              No driver assigned, booking saved without confirm and not show in the calendar view as well. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNoDriver}>Proceed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Driver Confirmation Dialog */}
      <AlertDialog open={showDriverConfirmDialog} onOpenChange={setShowDriverConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Driver assigned</AlertDialogTitle>
            <AlertDialogDescription>
              Driver assigned. This booking will be confirmed and shown in the calendar. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDriver}>Confirm Booking</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Confirmation Dialog */}
      <AlertDialog open={showEditConfirmDialog} onOpenChange={setShowEditConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the booking with the changes you made. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpdate}>Update Booking</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
