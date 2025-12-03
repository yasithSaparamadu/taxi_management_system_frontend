import { useState } from "react";
import { useSelector } from "react-redux";
import type { CreateCustomerRequest, CreateCustomerResponse } from "@shared/api";
import { selectToken } from "../store/auth";

export default function Customers() {
  const token = useSelector(selectToken);
  // Simple admin registration form (no auth gating yet)
  const [form, setForm] = useState<CreateCustomerRequest>({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First name and Last name are required");
      return;
    }
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });
      const data: CreateCustomerResponse = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Failed with status ${res.status}`);
      }
      setMessage(`Customer created with ID ${data.id}`);
      setForm({ first_name: "", last_name: "", email: "", phone: "", notes: "" });
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold mb-1">Customer Registration</h1>
      <p className="text-sm text-gray-500 mb-6">Admin-only: register new customers at the beginning.</p>

      {message && <div className="mb-4 rounded-md bg-green-50 p-3 text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name *</label>
            <input
              className="w-full rounded border px-3 py-2"
              name="first_name"
              value={form.first_name}
              onChange={onChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name *</label>
            <input
              className="w-full rounded border px-3 py-2"
              name="last_name"
              value={form.last_name}
              onChange={onChange}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded border px-3 py-2"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              className="w-full rounded border px-3 py-2"
              name="phone"
              value={form.phone}
              onChange={onChange}
              placeholder="optional"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            className="w-full rounded border px-3 py-2"
            name="notes"
            rows={3}
            value={form.notes}
            onChange={onChange}
            placeholder="optional"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Register Customer"}
        </button>
      </form>
    </div>
  );
}
