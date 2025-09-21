import { useState } from "react";
import type { CreateDriverRequest, CreateDriverResponse } from "@shared/api";

export default function Drivers() {
  const [form, setForm] = useState<CreateDriverRequest>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    license_number: "",
    license_expiry: "",
    hire_date: "",
    dob: "",
    address: "",
    city: "",
    state: "",
    zipcode: "",
    experience_years: undefined,
    salary_cents: undefined,
    status: "active",
    notes: "",
  });
  const [adminToken, setAdminToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      if (!form.first_name?.trim() || !form.last_name?.trim() || !form.license_number?.trim()) {
        setError("First name, Last name, and License number are required");
        return;
      }
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken.trim().length > 0) headers["x-admin-token"] = adminToken.trim();
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...form,
          experience_years: form.experience_years ? Number(form.experience_years) : undefined,
          salary_cents: form.salary_cents ? Number(form.salary_cents) : undefined,
        } satisfies CreateDriverRequest),
      });
      const data: CreateDriverResponse = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Failed with status ${res.status}`);
      setMessage(`Driver created with ID ${data.id}`);
      setForm({
        first_name: "", last_name: "", email: "", phone: "", license_number: "",
        license_expiry: "", hire_date: "", dob: "", address: "", city: "", state: "", zipcode: "",
        experience_years: undefined, salary_cents: undefined, status: "active", notes: "",
      });
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-1">Driver Registration</h1>
      <p className="text-sm text-gray-500 mb-6">Admin-assisted: register new drivers with personal and professional details.</p>

      {message && <div className="mb-4 rounded-md bg-green-50 p-3 text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Admin Token (optional if server not configured)</label>
          <input className="w-full rounded border px-3 py-2" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name *</label>
            <input className="w-full rounded border px-3 py-2" name="first_name" value={form.first_name} onChange={onChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name *</label>
            <input className="w-full rounded border px-3 py-2" name="last_name" value={form.last_name} onChange={onChange} required />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="w-full rounded border px-3 py-2" name="email" value={form.email} onChange={onChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input className="w-full rounded border px-3 py-2" name="phone" value={form.phone} onChange={onChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">License Number *</label>
            <input className="w-full rounded border px-3 py-2" name="license_number" value={form.license_number} onChange={onChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">License Expiry</label>
            <input type="date" className="w-full rounded border px-3 py-2" name="license_expiry" value={form.license_expiry || ""} onChange={onChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hire Date</label>
            <input type="date" className="w-full rounded border px-3 py-2" name="hire_date" value={form.hire_date || ""} onChange={onChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date of Birth</label>
            <input type="date" className="w-full rounded border px-3 py-2" name="dob" value={form.dob || ""} onChange={onChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Experience (years)</label>
            <input type="number" min={0} className="w-full rounded border px-3 py-2" name="experience_years" value={form.experience_years as any || ""} onChange={onChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Salary (cents)</label>
            <input type="number" min={0} className="w-full rounded border px-3 py-2" name="salary_cents" value={form.salary_cents as any || ""} onChange={onChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input className="w-full rounded border px-3 py-2" name="address" value={form.address} onChange={onChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input className="w-full rounded border px-3 py-2" name="city" value={form.city} onChange={onChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">State</label>
            <input className="w-full rounded border px-3 py-2" name="state" value={form.state} onChange={onChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Zip Code</label>
            <input className="w-full rounded border px-3 py-2" name="zipcode" value={form.zipcode} onChange={onChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select className="w-full rounded border px-3 py-2" name="status" value={form.status} onChange={onChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea className="w-full rounded border px-3 py-2" name="notes" rows={3} value={form.notes} onChange={onChange} />
          </div>
        </div>

        <button type="submit" disabled={submitting} className="inline-flex items-center rounded bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-60">
          {submitting ? "Submitting..." : "Register Driver"}
        </button>
      </form>
    </div>
  );
}
