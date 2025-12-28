import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { CreateBookingRequest, CreateBookingResponse, ListBookingsResponse, Booking, User } from "@shared/api";
import { selectToken } from "../store/auth";

export default function Bookings() {
  const token = useSelector(selectToken);
  const directToken = localStorage.getItem('token');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);

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
    driver_id: null,
  });

  const headers = (): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      h["Authorization"] = `Bearer ${token}`;
    }
    return h;
  };

  // Load customers and drivers
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
    } catch (err) {
      console.error("Failed to load users:", err);
    }
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
    setForm(prev => ({
      ...prev,
      [name]: name === 'customer_id' || name === 'service_id' || name === 'estimated_price_cents' 
        ? (value === '' ? 0 : Number(value)) 
        : name === 'driver_id'
        ? (value === '' ? null : Number(value))
        : value
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        driver_id: null,
      });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find(c => Number(c.id) === customerId);
    return customer ? `${customer.profile?.first_name} ${customer.profile?.last_name}` : `Customer #${customerId}`;
  };

  const getDriverName = (driverId: number | null | undefined) => {
    if (!driverId) return 'Unassigned';
    const driver = drivers.find(d => Number(d.id) === driverId);
    return driver ? `${driver.profile?.first_name || ''} ${driver.profile?.last_name || ''}` : `Driver #${driverId}`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Bookings</h1>

      {message && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{message}</div>}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Create New Booking</h2>
        
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Customer and Driver Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Customer *</label>
              <select 
                name="customer_id" 
                className="w-full rounded border px-3 py-2" 
                onChange={onChange}
                required
              >
                <option value={0}>Select a customer...</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.profile?.first_name} {customer.profile?.last_name} {customer.email ? `(${customer.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Driver (Optional)</label>
              <select 
                name="driver_id" 
                className="w-full rounded border px-3 py-2" 
                value={form.driver_id || ''} 
                onChange={onChange}
              >
                <option value="">Select a driver...</option>
                {drivers.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.profile?.first_name || ''} {driver.profile?.last_name || ''} ({driver.email})
                  </option>
                ))}
              </select>
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

          <button 
            type="submit" 
            disabled={creating}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Booking"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Bookings</h2>
        <button onClick={load} className="mb-4 bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200">
          Refresh
        </button>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="p-3 font-medium">ID</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Driver</th>
                <th className="p-3 font-medium">Service</th>
                <th className="p-3 font-medium">Pickup</th>
                <th className="p-3 font-medium">Dropoff</th>
                <th className="p-3 font-medium">Start</th>
                <th className="p-3 font-medium">End</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{b.id}</td>
                 
                  <td className="p-3">
                    <div>
                      <div className="font-medium">{getDriverName(b.driver_id)}</div>
                      {b.driver_id && <div className="text-gray-500 text-xs">ID: {b.driver_id}</div>}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      Service {b.service_id}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="max-w-xs truncate" title={b.pickup_point || ''}>
                      {b.pickup_point || '-'}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="max-w-xs truncate" title={b.dropoff_point || ''}>
                      {b.dropoff_point || '-'}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-xs">
                      {new Date(b.start_time).toLocaleDateString()}
                      <br />
                      {new Date(b.start_time).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-xs">
                      {new Date(b.end_time).toLocaleDateString()}
                      <br />
                      {new Date(b.end_time).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      b.status === 'completed' ? 'bg-green-100 text-green-800' :
                      b.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      b.status === 'cancelled' ? 'bg-red-100 text-red-800' :
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
                </tr>
              ))}
            </tbody>
          </table>
          
          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No bookings found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
