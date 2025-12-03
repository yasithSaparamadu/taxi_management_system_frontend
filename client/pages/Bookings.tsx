import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { CreateBookingRequest, CreateBookingResponse, ListBookingsResponse, Booking } from "@shared/api";
import { selectToken } from "../store/auth";

export default function Bookings() {
  const token = useSelector(selectToken);
  const directToken = localStorage.getItem('token');
  console.log("Bookings component - token from Redux:", token);
  console.log("Bookings component - token from localStorage:", directToken);
  console.log("Bookings component - tokens match:", token === directToken);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Booking[]>([]);

  const [form, setForm] = useState<CreateBookingRequest>({
    customer_id: 1,
    service_id: 1,
    start_time: "",
    end_time: "",
    source: "phone",
    estimated_price_cents: undefined,
    admin_note: "",
    created_by_name: "",
  });

  const headers = (): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    console.log("Bookings.tsx - token:", token);
    console.log("Bookings.tsx - directToken:", directToken);
    if (token) {
      h["Authorization"] = `Bearer ${token}`;
      console.log("Bookings.tsx - Authorization header set:", h["Authorization"]);
    } else {
      console.log("Bookings.tsx - No token found!");
    }
    return h;
  };

  const load = async () => {
    try {
      setError(null);
      console.log("Bookings.tsx - Making request to /api/bookings");
      const res = await fetch(`/api/bookings`, { headers: headers() });
      console.log("Bookings.tsx - Response status:", res.status);
      console.log("Bookings.tsx - Response headers:", res.headers);
      const data: ListBookingsResponse = await res.json();
      console.log("Bookings.tsx - Response data:", data);
      if (!res.ok || !data.ok) throw new Error("Failed to load bookings");
      setItems(data.items);
    } catch (e: any) {
      console.error("Bookings.tsx - Error in load:", e);
      setError(e?.message ?? "Failed to load bookings");
    }
  };

  const testAuth = async () => {
    try {
      console.log("Bookings.tsx - Testing auth with /api/auth-test");
      const res = await fetch(`/api/auth-test`, { headers: headers() });
      console.log("Bookings.tsx - Auth test response status:", res.status);
      const data = await res.json();
      console.log("Bookings.tsx - Auth test response data:", data);
    } catch (e: any) {
      console.error("Bookings.tsx - Auth test error:", e);
    }
  };

  useEffect(() => {
    if (token) {
      load();
    } else {
      console.log("Bookings useEffect - No token available, skipping load");
    }
  }, [token]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setForm((f) => ({ ...f, [name]: name.endsWith("_id") ? Number(value) : value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    setError(null);
    try {
      if (!form.customer_id || !form.service_id || !form.start_time || !form.end_time) {
        throw new Error("customer_id, service_id, start_time and end_time are required");
      }
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(form),
      });
      const data: CreateBookingResponse = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Failed with status ${res.status}`);
      setMessage(`Booking created with ID ${data.id}`);
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">Bookings</h1>
      <p className="text-sm text-gray-500 mb-4">Manage booking operations</p>

      {!token && (
        <div className="mb-4 rounded-md bg-yellow-50 p-3 text-yellow-700">
          Please log in to access bookings. Token status: {token ? "Available" : "Not available"}
        </div>
      )}

      {message && <div className="mb-4 rounded-md bg-green-50 p-3 text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</div>}


      <div>
        <h1 className="text-2xl font-semibold mb-1">Create Booking</h1>
        <p className="text-sm text-gray-500 mb-4">Create new bookings for customers</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Customer ID</label>
              <input name="customer_id" type="number" className="w-full rounded border px-3 py-2" value={form.customer_id} onChange={onChange} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Service ID</label>
              <input name="service_id" type="number" className="w-full rounded border px-3 py-2" value={form.service_id} onChange={onChange} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <select name="source" className="w-full rounded border px-3 py-2" value={form.source} onChange={onChange}>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="web">Web</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input name="start_time" type="datetime-local" className="w-full rounded border px-3 py-2" value={form.start_time} onChange={onChange} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input name="end_time" type="datetime-local" className="w-full rounded border px-3 py-2" value={form.end_time} onChange={onChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Price (cents, optional)</label>
              <input name="estimated_price_cents" type="number" className="w-full rounded border px-3 py-2" value={(form.estimated_price_cents as any) || ""} onChange={onChange} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Created By (name)</label>
              <input name="created_by_name" className="w-full rounded border px-3 py-2" value={form.created_by_name} onChange={onChange} placeholder="Staff name (optional)" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Admin Note (not visible to customer)</label>
            <textarea name="admin_note" rows={3} className="w-full rounded border px-3 py-2" value={form.admin_note} onChange={onChange} />
          </div>

          <button type="submit" disabled={creating} className="inline-flex items-center rounded bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-60">
            {creating ? "Creating..." : "Create Booking"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Recent Bookings</h2>
        <button onClick={load} className="mb-3 inline-flex items-center rounded border px-3 py-1 text-sm">Refresh</button>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">ID</th>
                <th className="p-2">Customer</th>
                <th className="p-2">Service</th>
                <th className="p-2">Start</th>
                <th className="p-2">End</th>
                <th className="p-2">Status</th>
                <th className="p-2">Source</th>
                <th className="p-2">Est. Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{b.id}</td>
                  <td className="p-2">{b.customer_id}</td>
                  <td className="p-2">{b.service_id}</td>
                  <td className="p-2">{b.start_time}</td>
                  <td className="p-2">{b.end_time}</td>
                  <td className="p-2">{b.status}</td>
                  <td className="p-2">{b.source}</td>
                  <td className="p-2">{b.estimated_price_cents ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
