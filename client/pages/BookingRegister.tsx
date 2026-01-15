import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { CreateBookingRequest, CreateBookingResponse, ListBookingsResponse, Booking, User, Vehicle } from "@shared/api";
import { selectToken } from "../store/auth";
import { Button } from "../components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Checkbox } from "../components/ui/checkbox";
import { ArrowLeft, Check } from "lucide-react";

export default function BookingRegister() {
  const token = useSelector(selectToken);
  const directToken = localStorage.getItem('token');
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [showNoDriverConfirmDialog, setShowNoDriverConfirmDialog] = useState(false);
  const [showDriverConfirmDialog, setShowDriverConfirmDialog] = useState(false);

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
    customer_id: undefined,
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    vehicle_id: null,
    is_registered_customer: false,
    registered_number: "",
  });

  const headers = (): Record<string, string> => {
    const tokenToUse = token || directToken;
    if (!tokenToUse) throw new Error("No authentication token available");
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenToUse}`,
    };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersRes, driversRes, vehiclesRes] = await Promise.all([
          fetch('/api/users?role=customer', { headers: headers() }),
          fetch('/api/users?role=driver', { headers: headers() }),
          fetch('/api/vehicles', { headers: headers() }),
        ]);

        const customersData = await customersRes.json();
        const driversData = await driversRes.json();
        const vehiclesData = await vehiclesRes.json();

        setCustomers(Array.isArray(customersData?.users) ? customersData.users : []);
        setDrivers(Array.isArray(driversData?.users) ? driversData.users : []);
        setVehicles(Array.isArray(vehiclesData?.items) ? vehiclesData.items : []);
      } catch (e: any) {
        setError(e.message);
      }
    };
    loadData();
  }, [token, directToken]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = {
        ...prev,
        [name]: name === 'service_id' || name === 'estimated_price_cents' || name === 'vehicle_id'
          ? (value === '' ? 0 : Number(value))
          : name === 'driver_id'
          ? (value === '' ? null : Number(value))
          : value === ''
          ? undefined  // Don't send empty strings to server
          : value
      };
      
      // Auto-fill contact_name when customer is selected
      if (name === 'customer_id') {
        const customer = customers.find(c => Number(c.id) === Number(value));
        if (customer) {
          updated.contact_name = `${customer.profile?.first_name || ''} ${customer.profile?.last_name || ''}`.trim();
          updated.contact_phone = customer.phone || '';
          updated.contact_email = customer.email || '';
          // Auto-set registration status from customer profile
          updated.is_registered_customer = customer.profile?.is_registered_customer || false;
          updated.registered_number = customer.profile?.registered_number || '';
        } else {
          // Reset registration fields when no customer is selected
          updated.is_registered_customer = false;
          updated.registered_number = '';
        }
      }
      
      return updated;
    });
  };

  
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Directly create booking without confirmation
    doCreate();
  };

  const doCreate = async () => {
    setCreating(true);
    setMessage(null);
    setError(null);
    try {
      // Filter out undefined values before sending
      const payload = Object.fromEntries(
        Object.entries(form).filter(([_, value]) => value !== undefined)
      );
      
      // Set status based on driver assignment
      const finalPayload = {
        ...payload,
        status: form.driver_id ? 'confirmed' : 'scheduled'
      };
      
      const res = await fetch(`/api/bookings`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(finalPayload),
      });
      const data: CreateBookingResponse = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to create booking");
      
      // Show success message in popup style
      alert(`✅ Booking #${data.id} created successfully!`);
      
      // Reset form
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
        is_registered_customer: false,
        registered_number: "",
      });
      setCreating(false);
      
      // Notify calendar page to refresh after booking creation
      window.postMessage({ type: 'BOOKING_UPDATED', payload: { id: data.id } }, window.location.origin);
      localStorage.setItem('taxi_booking_updated', Date.now().toString());
      
      // Refresh page after a short delay to allow user to see the message
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (e: any) {
      setError(e.message);
      setCreating(false);
    }
  };

  const doCreateAndConfirm = async () => {
    setCreating(true);
    setMessage(null);
    setError(null);
    try {
      // Filter out undefined values before sending
      const payload = Object.fromEntries(
        Object.entries(form).filter(([_, value]) => value !== undefined)
      );
      
      const res = await fetch(`/api/bookings`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const data: CreateBookingResponse = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to create booking");
      
      // Now confirm the booking
      const confirmRes = await fetch(`/api/bookings/${data.id}/confirm`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({})
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok || !confirmData.ok) throw new Error(confirmData.error || "Failed to confirm booking");
      
      setMessage(`Booking #${data.id} created and confirmed!`);
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
        is_registered_customer: false,
        registered_number: "",
      });
      setCreating(false);
      // Notify calendar page to refresh after booking creation
      window.postMessage({ type: 'BOOKING_UPDATED', payload: { id: data.id } }, window.location.origin);
      localStorage.setItem('taxi_booking_updated', Date.now().toString());
    } catch (e: any) {
      setError(e.message);
      setCreating(false);
    }
  };

  const confirmNoDriver = () => {
    setShowNoDriverConfirmDialog(false);
    setForm(prev => ({ ...prev, status: 'scheduled' }));
    doCreate();
  };

  const confirmDriver = () => {
    setShowDriverConfirmDialog(false);
    setForm(prev => ({ ...prev, status: 'confirmed' }));
    doCreate();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Booking Register</h1>
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
        <h2 className="text-xl font-semibold mb-4">Create New Booking</h2>
        
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
                    {customer.profile?.is_registered_customer ? ' [Registered' : ''}
                    {customer.profile?.is_registered_customer && customer.profile?.registered_number ? ` #${customer.profile.registered_number}` : ''}
                    {customer.profile?.is_registered_customer ? ']' : ''}
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

            <div className="flex items-center space-x-2 py-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${form.is_registered_customer ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="text-sm font-medium">
                  {form.is_registered_customer ? 'Registered Customer' : 'Regular Customer'}
                </span>
                {form.is_registered_customer && form.registered_number && (
                  <span className="text-sm text-gray-600">
                    (#{form.registered_number})
                  </span>
                )}
              </div>
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
                  value={form.vehicle_id || ''} 
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

          {/* Trip details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pickup Point *</label>
              <input 
                name="pickup_point" 
                type="text" 
                className="w-full rounded border px-3 py-2" 
                onChange={onChange}
                required
                placeholder="Pickup location"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dropoff Point</label>
              <input 
                name="dropoff_point" 
                type="text" 
                className="w-full rounded border px-3 py-2" 
                onChange={onChange}
                placeholder="Dropoff location"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input 
                    name="start_date" 
                    type="date" 
                    className="w-full rounded border px-3 py-2" 
                    value={form.start_time ? new Date(form.start_time).toISOString().slice(0, 10) : ''} 
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const existingTime = form.start_time ? new Date(form.start_time).toTimeString().slice(0, 8) : '00:00';
                      const newDateTime = `${newDate}T${existingTime}`;
                      onChange({ target: { name: 'start_time', value: newDateTime } } as any);
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Time (24h)</label>
                  <input 
                    name="start_time_only" 
                    type="time" 
                    className="w-full rounded border px-3 py-2" 
                    value={form.start_time ? new Date(form.start_time).toTimeString().slice(0, 5) : ''} 
                    onChange={(e) => {
                      const newTime = e.target.value;
                      const existingDate = form.start_time ? new Date(form.start_time).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
                      const newDateTime = `${existingDate}T${newTime}:00`;
                      onChange({ target: { name: 'start_time', value: newDateTime } } as any);
                    }}
                    required
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input 
                    name="end_date" 
                    type="date" 
                    className="w-full rounded border px-3 py-2" 
                    value={form.end_time ? new Date(form.end_time).toISOString().slice(0, 10) : ''} 
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const existingTime = form.end_time ? new Date(form.end_time).toTimeString().slice(0, 8) : '00:00';
                      const newDateTime = `${newDate}T${existingTime}`;
                      onChange({ target: { name: 'end_time', value: newDateTime } } as any);
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Time (24h)</label>
                  <input 
                    name="end_time_only" 
                    type="time" 
                    className="w-full rounded border px-3 py-2" 
                    value={form.end_time ? new Date(form.end_time).toTimeString().slice(0, 5) : ''} 
                    onChange={(e) => {
                      const newTime = e.target.value;
                      const existingDate = form.end_time ? new Date(form.end_time).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
                      const newDateTime = `${existingDate}T${newTime}:00`;
                      onChange({ target: { name: 'end_time', value: newDateTime } } as any);
                    }}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Price ($)</label>
              <input 
                name="estimated_price_cents" 
                type="number" 
                className="w-full rounded border px-3 py-2" 
                value={form.estimated_price_cents || ''} 
                onChange={onChange}
                placeholder="Enter price amount"
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

          <div className="flex gap-3">
          <button 
            type="submit" 
            disabled={creating}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Booking"}
          </button>
          <button 
            type="button"
            disabled={creating}
            onClick={(e) => {
              e.preventDefault();
              doCreateAndConfirm();
            }}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? "Creating..." : (
              <>
                <Check className="h-4 w-4" />
                Create & Confirm
              </>
            )}
          </button>
        </div>
        </form>
      </div>

    </div>
  );
}
