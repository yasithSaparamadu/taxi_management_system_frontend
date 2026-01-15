import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { CreateBookingRequest, CreateBookingResponse, ListBookingsResponse, Booking, User, UpdateBookingRequest, UpdateBookingResponse, Vehicle } from "@shared/api";
import { selectToken } from "../store/auth";
import { Button } from "../components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { ArrowLeft } from "lucide-react";

export default function Bookings() {
  const token = useSelector(selectToken);
  const directToken = localStorage.getItem('token');
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEditConfirmDialog, setShowEditConfirmDialog] = useState(false);
  const [showNoDriverConfirmDialog, setShowNoDriverConfirmDialog] = useState(false);
  const [showDriverConfirmDialog, setShowDriverConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'create' | 'edit' | null>(null);
  const [items, setItems] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');

  const [form, setForm] = useState<CreateBookingRequest>({
    service_id: 1,
    start_time: "",
    end_time: "",
    source: "phone",
    estimated_price_cents: undefined,
    admin_note: "",
    created_by_name: "",
    pickup_point: "",
    dropoff_point: "",
    special_instructions: "",
    driver_id: null,
    customer_id: undefined, // Add customer_id field
    contact_name: "", // Add contact_name field
    contact_phone: "",
    contact_email: "",
    vehicle_id: null,
  });

  const [editForm, setEditForm] = useState<UpdateBookingRequest>({});
  const [showEditForm, setShowEditForm] = useState(false);

  const headers = (): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      h["Authorization"] = `Bearer ${token}`;
    }
    return h;
  };

  // Load customers, drivers, and vehicles
  const loadUsers = async () => {
    try {
      // Load customers from users table with role='customer'
      const customersRes = await fetch(`/api/users?role=customer`, { headers: headers() });
      const customersData = await customersRes.json();
      if (customersData.users) {
        setCustomers(customersData.users);
      }

      // Load drivers
      const driversRes = await fetch(`/api/users?role=driver`, { headers: headers() });
      const driversData = await driversRes.json();
      if (driversData.users) {
        setDrivers(driversData.users);
      }

      // Load vehicles
      const vehiclesRes = await fetch(`/api/vehicles`, { headers: headers() });
      const vehiclesData = await vehiclesRes.json();
      if (vehiclesData.ok && vehiclesData.items) {
        setVehicles(vehiclesData.items);
      }
    } catch (err) {
      console.error("Failed to load users/vehicles:", err);
    }
  };

  const toDateTimeLocalValue = (v: string | null | undefined) => {
    if (!v) return '';

    // If already in datetime-local compatible form, keep only YYYY-MM-DDTHH:mm
    if (typeof v === 'string' && v.includes('T') && !v.endsWith('Z')) {
      return v.slice(0, 16);
    }

    // Convert ISO (likely with Z) to local datetime-local value
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      // Fallback for "YYYY-MM-DD HH:mm:ss" from DB
      return v.replace(' ', 'T').slice(0, 16);
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const load = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/bookings`, { headers: headers() });
      const data: ListBookingsResponse = await res.json();
      if (!res.ok || !data.ok) throw new Error("Failed to load bookings");
      setItems(data.items);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
    loadUsers();
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev };
      
      // Handle customer selection - save both customer_id and contact_name
      if (name === 'customer_id') {
        const selectedCustomer = customers.find(c => Number(c.id) === Number(value));
        if (selectedCustomer) {
          updated.customer_id = Number(value);
          updated.contact_name = `${selectedCustomer.profile?.first_name} ${selectedCustomer.profile?.last_name}`;
          updated.contact_email = selectedCustomer.email ?? '';
        }
      } else {
        updated[name] = name === 'service_id'
          ? (value === '' ? 0 : Number(value))
          : name === 'estimated_price_cents'
          ? (value === '' ? undefined : Number(value))
          : name === 'vehicle_id'
          ? (value === '' ? null : Number(value))
          : name === 'driver_id'
          ? (value === '' ? null : Number(value))
          : value;
      }
      
      return updated;
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPendingAction('create');
    if (!form.driver_id) {
      setShowNoDriverConfirmDialog(true);
    } else {
      setShowDriverConfirmDialog(true);
    }
  };

  const doCreate = async () => {
    setCreating(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/bookings`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(form),
      });
      const data: CreateBookingResponse = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to create booking");
      setMessage(`Booking #${data.id} created!`);
      setForm({
        service_id: 1,
        start_time: "",
        end_time: "",
        source: "phone",
        estimated_price_cents: undefined,
        admin_note: "",
        created_by_name: "",
        pickup_point: "",
        dropoff_point: "",
        special_instructions: "",
        driver_id: null,
        customer_id: undefined,
        contact_name: "",
        contact_phone: "",
        contact_email: "",
        vehicle_id: null,
      });
      load();
      // Notify calendar page to refresh after booking creation
      window.postMessage({ type: 'BOOKING_UPDATED', payload: { id: data.id } }, window.location.origin);
      localStorage.setItem('taxi_booking_updated', Date.now().toString());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (booking: Booking) => {
    const anyB = booking as any;
    setEditing(booking.id);
    setEditForm({
      service_id: booking.service_id,
      start_time: toDateTimeLocalValue(booking.start_time),
      end_time: toDateTimeLocalValue(booking.end_time),
      source: booking.source,
      pickup_point: booking.pickup_point ?? '',
      dropoff_point: booking.dropoff_point ?? '',
      special_instructions: booking.special_instructions ?? '',
      contact_name: booking.contact_name ?? '',
      contact_phone: booking.contact_phone ?? '',
      contact_email: booking.contact_email ?? '',
      estimated_price_cents: booking.estimated_price_cents,
      status: booking.status,
      admin_note: booking.admin_note || '',
      created_by_name: booking.created_by_name ?? '',
      driver_id: booking.driver_id,
      customer_id: anyB.customer_id ?? null,
      vehicle_id: booking.vehicle_id,
    });
    setShowEditForm(true);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({});
    setShowEditForm(false);
  };

  const onEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Keep edit experience aligned with create: selecting customer can auto-fill contact fields.
    if (name === 'customer_id') {
      const selected = customers.find(c => Number(c.id) === Number(value));
      setEditForm(prev => ({
        ...prev,
        customer_id: value === '' ? null : Number(value),
        contact_name: selected ? `${selected.profile?.first_name} ${selected.profile?.last_name}` : (prev.contact_name ?? ''),
        contact_email: selected?.email ?? (prev.contact_email ?? ''),
      }));
      return;
    }

    setEditForm(prev => ({
      ...prev,
      [name]: name === 'service_id' || name === 'estimated_price_cents' || name === 'vehicle_id'
        ? (value === '' ? 0 : Number(value))
        : name === 'driver_id'
        ? (value === '' ? null : Number(value))
        : value
    }));
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

  const confirmUpdate = async () => {
    if (!editing) return;
    setShowEditConfirmDialog(false);
    try {
      const res = await fetch(`/api/bookings/${editing}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(editForm),
      });

      const raw = await res.text();
      const data: UpdateBookingResponse = raw ? JSON.parse(raw) : { ok: false, error: 'Empty response from server' };
      if (!res.ok || !data.ok) throw new Error(data.error || raw || "Failed to update booking");
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

  const confirmNoDriver = () => {
    setShowNoDriverConfirmDialog(false);
    if (pendingAction === 'create') {
      // Set status to 'scheduled' when no driver is assigned
      setForm(prev => ({ ...prev, status: 'scheduled' }));
      doCreate();
    } else if (pendingAction === 'edit') {
      // Set status to 'scheduled' when no driver is assigned
      setEditForm(prev => ({ ...prev, status: 'scheduled' }));
      setShowEditConfirmDialog(true);
    }
  };

  const confirmDriver = () => {
    setShowDriverConfirmDialog(false);
    if (pendingAction === 'create') {
      // Set status to 'confirmed' when driver is assigned
      setForm(prev => ({ ...prev, status: 'confirmed' }));
      doCreate();
    } else if (pendingAction === 'edit') {
      // Set status to 'confirmed' when driver is assigned
      setEditForm(prev => ({ ...prev, status: 'confirmed' }));
      setShowEditConfirmDialog(true);
    }
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

    return 'Unknown customer';
  };

  const getCustomerSecondary = (b: Booking) => {
    const anyB = b as any;
    const cid = anyB.customer_id as number | undefined;
    if (b.contact_email) return b.contact_email;
    if (cid) {
      const customer = customers.find(c => Number(c.id) === Number(cid));
      if (customer?.email) return customer.email;
    }
    return '';
  };

  const formatWindow = (b: Booking) => {
    const start = new Date(b.start_time);
    const end = new Date(b.end_time);
    return {
      date: start.toLocaleDateString(),
      time: `${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`,
    };
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Booking Dashboard</h1>
        <Button variant="outline" type="button" onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {message && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{message}</div>}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

      {/* Two-column layout: Booking Register (left) and Booking Management (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Register Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Booking Register</h2>
          
          <form onSubmit={onSubmit} className="space-y-4">
          {/* Customer, Driver, and Vehicle Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Customer *</label>
              <select 
                name="customer_id" 
                className="w-full rounded border px-3 py-2" 
                onChange={onChange}
                required
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
              <label className="block text-sm font-medium mb-1">Customer Name (Auto-filled)</label>
              <input 
                name="contact_name" 
                type="text" 
                className="w-full rounded border px-3 py-2 bg-gray-50" 
                value={form.contact_name || ''} 
                onChange={onChange}
                placeholder="Customer name will be auto-filled from selection"
                readOnly
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Driver (Optional)</label>
                <select 
                  name="driver_id" 
                  className="w-full rounded border px-3 py-2" 
                  value={form.driver_id || ''} 
                  onChange={onChange}
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
                  value={(form as any).vehicle_id || ''} 
                  onChange={onChange}
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
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Phone</label>
              <input
                name="contact_phone"
                type="text"
                className="w-full rounded border px-3 py-2"
                value={form.contact_phone || ''}
                onChange={onChange}
                placeholder="Contact phone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input
                name="contact_email"
                type="email"
                className="w-full rounded border px-3 py-2"
                value={form.contact_email || ''}
                onChange={onChange}
                placeholder="Contact email"
              />
            </div>
          </div>

          {/* Service Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Service Type</label>
              <select 
                name="service_id" 
                className="w-full rounded border px-3 py-2" 
                value={form.service_id} 
                onChange={onChange}
              >
                <option value={1}>Standard Taxi</option>
                <option value={2}>Premium Taxi</option>
                <option value={3}>Airport Transfer</option>
                <option value={4}>Hourly Service</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Booking Source</label>
              <select 
                name="source" 
                className="w-full rounded border px-3 py-2" 
                value={form.source} 
                onChange={onChange}
              >
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="web">Web</option>
              </select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date & Time *</label>
              <input 
                name="start_time" 
                type="datetime-local" 
                className="w-full rounded border px-3 py-2" 
                value={form.start_time} 
                onChange={onChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date & Time *</label>
              <input 
                name="end_time" 
                type="datetime-local" 
                className="w-full rounded border px-3 py-2" 
                value={form.end_time} 
                onChange={onChange}
                required
              />
            </div>
          </div>

          {/* Pickup and Dropoff */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pickup Location *</label>
              <input 
                name="pickup_point" 
                type="text" 
                className="w-full rounded border px-3 py-2" 
                value={form.pickup_point} 
                onChange={onChange}
                placeholder="Enter pickup address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dropoff Location *</label>
              <input 
                name="dropoff_point" 
                type="text" 
                className="w-full rounded border px-3 py-2" 
                value={form.dropoff_point} 
                onChange={onChange}
                placeholder="Enter dropoff address"
                required
              />
            </div>
          </div>

          {/* Price and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Price (cents)</label>
              <input 
                name="estimated_price_cents" 
                type="number" 
                className="w-full rounded border px-3 py-2" 
                value={form.estimated_price_cents || ''} 
                onChange={onChange}
                placeholder="e.g., 2500 for $25.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Created By Name</label>
              <input 
                name="created_by_name" 
                type="text" 
                className="w-full rounded border px-3 py-2" 
                value={form.created_by_name} 
                onChange={onChange}
                placeholder="Your name"
              />
            </div>
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Admin Notes</label>
            <textarea 
              name="admin_note" 
              className="w-full rounded border px-3 py-2" 
              rows={3}
              value={form.admin_note} 
              onChange={onChange}
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
              value={form.special_instructions || ''}
              onChange={onChange}
              placeholder="Any special instructions..."
            />
          </div>

          <button 
            type="submit" 
            disabled={creating}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Booking"}
          </button>
        </form>
        </div>

        {/* Booking Management Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Booking Management</h2>
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setQ('');
                setStatusFilter('');
                setSourceFilter('');
              }}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200"
              type="button"
            >
              Clear
            </button>
            <button
              onClick={load}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200"
              type="button"
            >
              Refresh
            </button>
          </div>
        </div>
        
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="p-3 font-medium">Booking</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Driver</th>
                <th className="p-3 font-medium">Vehicle</th>
                <th className="p-3 font-medium">Route</th>
                <th className="p-3 font-medium">Time</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Price</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((b) => {
                const win = formatWindow(b);
                const secondary = getCustomerSecondary(b);
                const anyB = b as any;
                const cid = anyB.customer_id as number | undefined;

                return (
                  <tr key={b.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">#{b.id}</div>
                      <div className="text-xs text-gray-500">Service {b.service_id} · {b.source}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{getCustomerDisplay(b)}</div>
                      <div className="text-xs text-gray-500">
                        {secondary || (cid ? `Customer ID: ${cid}` : '')}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{getDriverName(b.driver_id)}</div>
                      {b.driver_id && <div className="text-gray-500 text-xs">ID: {b.driver_id}</div>}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{getVehicleName(b.vehicle_id)}</div>
                      {b.vehicle_id && <div className="text-gray-500 text-xs">ID: {b.vehicle_id}</div>}
                    </td>
                    <td className="p-3">
                      <div className="max-w-xs truncate" title={b.pickup_point || ''}>
                        <div className="font-medium">{b.pickup_point || '-'}</div>
                        <div className="text-xs text-gray-500 truncate" title={b.dropoff_point || ''}>{b.dropoff_point || '-'}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-xs">
                        <div className="font-medium">{win.date}</div>
                        <div className="text-gray-500">{win.time}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        b.status === 'completed' ? 'bg-green-100 text-green-800' :
                        b.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        b.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        b.status === 'no_show' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {b.estimated_price_cents
                        ? `$${(b.estimated_price_cents / 100).toFixed(2)}`
                        : '-'
                      }
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => startEdit(b)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {filteredItems.map((b) => {
            const win = formatWindow(b);
            const secondary = getCustomerSecondary(b);
            const anyB = b as any;
            const cid = anyB.customer_id as number | undefined;

            return (
              <div key={b.id} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">Booking #{b.id}</div>
                    <div className="text-xs text-gray-500">Service {b.service_id} · {b.source}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    b.status === 'completed' ? 'bg-green-100 text-green-800' :
                    b.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    b.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    b.status === 'no_show' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {b.status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Customer</div>
                    <div className="font-medium">{getCustomerDisplay(b)}</div>
                    <div className="text-xs text-gray-500">
                      {secondary || (cid ? `Customer ID: ${cid}` : '')}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-500">Driver</div>
                      <div className="font-medium">{getDriverName(b.driver_id)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Vehicle</div>
                      <div className="font-medium">{getVehicleName(b.vehicle_id)}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Route</div>
                    <div className="font-medium">{b.pickup_point || '-'}</div>
                    <div className="text-xs text-gray-500">{b.dropoff_point || '-'}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-500">Date</div>
                      <div className="font-medium">{win.date}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Time</div>
                      <div className="font-medium">{win.time}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">Price</div>
                      <div className="font-medium">
                        {b.estimated_price_cents
                          ? `$${(b.estimated_price_cents / 100).toFixed(2)}`
                          : '-'
                        }
                      </div>
                    </div>
                    <button
                      onClick={() => startEdit(b)}
                      className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Booking Source */}
                <div>
                  <label className="block text-sm font-medium mb-1">Booking Source</label>
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
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No bookings found
          </div>
        )}

        {/* Edit Booking Modal/Form */}
        {showEditForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Booking #{editing}</h2>
                <button
                  onClick={cancelEdit}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={onUpdate} className="space-y-4">
                {/* Customer */}
                <div>
                  <label className="block text-sm font-medium mb-1">Customer</label>
                  <select
                    name="customer_id"
                    className="w-full rounded border px-3 py-2"
                    value={(editForm as any).customer_id ?? ''}
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

                {/* Service Type and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Service Type</label>
                    <select 
                      name="service_id" 
                      className="w-full rounded border px-3 py-2" 
                      value={editForm.service_id || ''} 
                      onChange={onEditChange}
                    >
                      <option value={1}>Standard Taxi</option>
                      <option value={2}>Premium Taxi</option>
                      <option value={3}>Airport Transfer</option>
                      <option value={4}>Hourly Service</option>
                    </select>
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

                {/* Booking Source */}
                <div>
                  <label className="block text-sm font-medium mb-1">Booking Source</label>
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

                {/* Driver and Vehicle Selection */}
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

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date & Time</label>
                    <input 
                      name="start_time" 
                      type="datetime-local" 
                      className="w-full rounded border px-3 py-2" 
                      value={editForm.start_time || ''} 
                      onChange={onEditChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date & Time</label>
                    <input 
                      name="end_time" 
                      type="datetime-local" 
                      className="w-full rounded border px-3 py-2" 
                      value={editForm.end_time || ''} 
                      onChange={onEditChange}
                    />
                  </div>
                </div>

                {/* Pickup and Dropoff */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Pickup Location</label>
                    <input
                      name="pickup_point"
                      type="text"
                      className="w-full rounded border px-3 py-2"
                      value={editForm.pickup_point || ''}
                      onChange={onEditChange}
                      placeholder="Enter pickup address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Dropoff Location</label>
                    <input
                      name="dropoff_point"
                      type="text"
                      className="w-full rounded border px-3 py-2"
                      value={editForm.dropoff_point || ''}
                      onChange={onEditChange}
                      placeholder="Enter dropoff address"
                    />
                  </div>
                </div>

                {/* Contact info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Contact Name</label>
                    <input
                      name="contact_name"
                      type="text"
                      className="w-full rounded border px-3 py-2"
                      value={editForm.contact_name || ''}
                      onChange={onEditChange}
                      placeholder="Contact name"
                    />
                  </div>
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

                {/* Price */}
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

                {/* Created By Name */}
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
        )}
      </div>
      </div>

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
