import { useEffect, useMemo, useState } from "react";
import type {
  Vehicle,
  ListVehiclesResponse,
  CreateVehicleRequest,
  CreateVehicleResponse,
  AddVehicleDocumentRequest,
  AddMaintenanceRequest,
  AddMileageRequest,
  AddInsurancePolicyRequest,
  AddInsuranceClaimRequest,
  AddFuelLogRequest,
} from "@shared/api";

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState("");

  // Create form state
  const [form, setForm] = useState<CreateVehicleRequest>({ name: "", status: "active" });
  const canCreate = useMemo(() => form.name.trim().length > 0, [form.name]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/vehicles");
      const data: ListVehiclesResponse = await res.json();
      if (!data.ok) throw new Error("Failed to load vehicles");
      setVehicles(data.items);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const createVehicle = async () => {
    if (!canCreate) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { "x-admin-token": adminToken } : {}),
        },
        body: JSON.stringify(form),
      });
      const data: CreateVehicleResponse = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Failed to create vehicle");
      setForm({ name: "", status: "active" });
      await fetchVehicles();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create vehicle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Vehicles</h1>
        <p className="text-sm text-gray-600">Register vehicles; manage documents, maintenance, mileage, insurance, and fuel logs.</p>
      </header>

      <section className="space-y-3 border rounded-md p-4">
        <h2 className="font-medium">Admin Token</h2>
        <input
          type="password"
          placeholder="x-admin-token (optional if server has no ADMIN_TOKEN)"
          className="border rounded px-2 py-1 w-full"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
        />
      </section>

      <section className="space-y-4 border rounded-md p-4">
        <h2 className="font-medium">Register New Vehicle</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextField label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
          <TextField label="Make" value={form.make ?? ""} onChange={(v) => setForm((f) => ({ ...f, make: v }))} />
          <TextField label="Model" value={form.model ?? ""} onChange={(v) => setForm((f) => ({ ...f, model: v }))} />
          <NumberField label="Year" value={form.year as number | undefined} onChange={(v) => setForm((f) => ({ ...f, year: v ?? undefined }))} />
          <TextField label="Color" value={form.color ?? ""} onChange={(v) => setForm((f) => ({ ...f, color: v }))} />
          <TextField label="Plate" value={form.plate ?? ""} onChange={(v) => setForm((f) => ({ ...f, plate: v }))} />
          <TextField label="VIN" value={form.vin ?? ""} onChange={(v) => setForm((f) => ({ ...f, vin: v }))} />
          <NumberField label="Capacity" value={form.capacity as number | undefined} onChange={(v) => setForm((f) => ({ ...f, capacity: v ?? undefined }))} />
          <div className="flex items-center gap-2">
            <label className="text-sm w-28">Status</label>
            <select
              className="border rounded px-2 py-1"
              value={form.status ?? "active"}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="bg-blue-600 text-white px-4 py-1.5 rounded disabled:opacity-50"
            onClick={createVehicle}
            disabled={!canCreate || loading}
          >
            {loading ? "Saving..." : "Create Vehicle"}
          </button>
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Fleet ({vehicles.length})</h2>
        <div className="grid grid-cols-1 gap-4">
          {vehicles.map((v) => (
            <VehicleCard key={v.id} v={v} adminToken={adminToken} onChanged={fetchVehicles} />
          ))}
          {vehicles.length === 0 && <div className="text-sm text-gray-600">No vehicles yet.</div>}
        </div>
      </section>
    </div>
  );
}

function VehicleCard({ v, adminToken, onChanged }: { v: Vehicle; adminToken: string; onChanged: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="border rounded-md p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium">{v.name}</div>
          <div className="text-sm text-gray-600">{v.make ?? ""} {v.model ?? ""} {v.year ?? ""} • Plate {v.plate ?? "-"} • VIN {v.vin ?? "-"}</div>
          <div className="text-xs text-gray-500">Status: {v.status} • Capacity: {v.capacity ?? "-"}</div>
        </div>
        <div className="flex gap-2 text-sm">
          <button className="px-3 py-1 border rounded" onClick={() => setOpen(open === "doc" ? null : "doc")}>+ Document</button>
          <button className="px-3 py-1 border rounded" onClick={() => setOpen(open === "maint" ? null : "maint")}>+ Maintenance</button>
          <button className="px-3 py-1 border rounded" onClick={() => setOpen(open === "mileage" ? null : "mileage")}>+ Mileage</button>
          <button className="px-3 py-1 border rounded" onClick={() => setOpen(open === "policy" ? null : "policy")}>+ Policy</button>
          <button className="px-3 py-1 border rounded" onClick={() => setOpen(open === "claim" ? null : "claim")}>+ Claim</button>
          <button className="px-3 py-1 border rounded" onClick={() => setOpen(open === "fuel" ? null : "fuel")}>+ Fuel</button>
        </div>
      </div>

      {open === "doc" && <AddDocForm vehicleId={v.id} adminToken={adminToken} onDone={() => { setOpen(null); onChanged(); }} />}
      {open === "maint" && <AddMaintForm vehicleId={v.id} adminToken={adminToken} onDone={() => { setOpen(null); onChanged(); }} />}
      {open === "mileage" && <AddMileageForm vehicleId={v.id} onDone={() => { setOpen(null); onChanged(); }} />}
      {open === "policy" && <AddPolicyForm vehicleId={v.id} adminToken={adminToken} onDone={() => { setOpen(null); onChanged(); }} />}
      {open === "claim" && <AddClaimForm vehicleId={v.id} adminToken={adminToken} onDone={() => { setOpen(null); onChanged(); }} />}
      {open === "fuel" && <AddFuelForm vehicleId={v.id} onDone={() => { setOpen(null); onChanged(); }} />}
    </div>
  );
}

function TextField({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm w-28">{label}{required && <span className="text-red-600">*</span>}</label>
      <input className="border rounded px-2 py-1 flex-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value?: number; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm w-28">{label}</label>
      <input
        type="number"
        className="border rounded px-2 py-1 flex-1"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}

function AddDocForm({ vehicleId, adminToken, onDone }: { vehicleId: number; adminToken: string; onDone: () => void }) {
  const [data, setData] = useState<AddVehicleDocumentRequest>({ type: "other", title: "", file_url: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    try {
      setSaving(true); setErr(null);
      const res = await fetch(`/api/vehicles/${vehicleId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(adminToken ? { "x-admin-token": adminToken } : {}) },
        body: JSON.stringify(data),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "Failed");
      onDone();
    } catch (e: any) { setErr(e?.message ?? "Failed"); } finally { setSaving(false); }
  };
  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm w-28">Type</label>
        <select className="border rounded px-2 py-1" value={data.type} onChange={(e) => setData((d) => ({ ...d, type: e.target.value as any }))}>
          <option value="registration">registration</option>
          <option value="insurance">insurance</option>
          <option value="maintenance">maintenance</option>
          <option value="other">other</option>
        </select>
      </div>
      <TextField label="Title" value={data.title} onChange={(v) => setData((d) => ({ ...d, title: v }))} />
      <TextField label="File URL" value={data.file_url} onChange={(v) => setData((d) => ({ ...d, file_url: v }))} />
      <div className="flex items-center gap-3">
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded" onClick={submit} disabled={saving}>Save</button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  );
}

function AddMaintForm({ vehicleId, adminToken, onDone }: { vehicleId: number; adminToken: string; onDone: () => void }) {
  const [data, setData] = useState<AddMaintenanceRequest>({ title: "", schedule_date: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    try {
      setSaving(true); setErr(null);
      const res = await fetch(`/api/vehicles/${vehicleId}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(adminToken ? { "x-admin-token": adminToken } : {}) },
        body: JSON.stringify(data),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "Failed");
      onDone();
    } catch (e: any) { setErr(e?.message ?? "Failed"); } finally { setSaving(false); }
  };
  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <TextField label="Title" value={data.title} onChange={(v) => setData((d) => ({ ...d, title: v }))} />
      <div className="flex items-center gap-2">
        <label className="text-sm w-28">Schedule Date</label>
        <input type="date" className="border rounded px-2 py-1" value={data.schedule_date} onChange={(e) => setData((d) => ({ ...d, schedule_date: e.target.value }))} />
      </div>
      <TextField label="Notes" value={(data as any).notes ?? ""} onChange={(v) => setData((d) => ({ ...(d as any), notes: v }))} />
      <div className="flex items-center gap-3">
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded" onClick={submit} disabled={saving}>Save</button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  );
}

function AddMileageForm({ vehicleId, onDone }: { vehicleId: number; onDone: () => void }) {
  const [data, setData] = useState<AddMileageRequest>({ odometer_km: 0, job_sheet_url: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    try {
      setSaving(true); setErr(null);
      const res = await fetch(`/api/vehicles/${vehicleId}/mileage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "Failed");
      onDone();
    } catch (e: any) { setErr(e?.message ?? "Failed"); } finally { setSaving(false); }
  };
  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <NumberField label="Driver ID" value={(data.driver_id as number | undefined)} onChange={(v) => setData((d) => ({ ...d, driver_id: v ?? undefined }))} />
      <NumberField label="Odometer (km)" value={data.odometer_km} onChange={(v) => setData((d) => ({ ...d, odometer_km: v ?? 0 }))} />
      <TextField label="Job Sheet URL" value={data.job_sheet_url} onChange={(v) => setData((d) => ({ ...d, job_sheet_url: v }))} />
      <TextField label="Note" value={data.note ?? ""} onChange={(v) => setData((d) => ({ ...d, note: v }))} />
      <div className="flex items-center gap-3">
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded" onClick={submit} disabled={saving}>Save</button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  );
}

function AddPolicyForm({ vehicleId, adminToken, onDone }: { vehicleId: number; adminToken: string; onDone: () => void }) {
  const [data, setData] = useState<AddInsurancePolicyRequest>({ provider: "", policy_number: "", start_date: "", expiry_date: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    try {
      setSaving(true); setErr(null);
      const res = await fetch(`/api/vehicles/${vehicleId}/insurance/policies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(adminToken ? { "x-admin-token": adminToken } : {}) },
        body: JSON.stringify(data),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "Failed");
      onDone();
    } catch (e: any) { setErr(e?.message ?? "Failed"); } finally { setSaving(false); }
  };
  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <TextField label="Provider" value={data.provider} onChange={(v) => setData((d) => ({ ...d, provider: v }))} />
      <TextField label="Policy #" value={data.policy_number} onChange={(v) => setData((d) => ({ ...d, policy_number: v }))} />
      <div className="flex items-center gap-2">
        <label className="text-sm w-28">Category</label>
        <select className="border rounded px-2 py-1" value={data.category ?? ""} onChange={(e) => setData((d) => ({ ...d, category: (e.target.value || undefined) as any }))}>
          <option value="">(optional)</option>
          <option value="comprehensive">comprehensive</option>
          <option value="third_party">third_party</option>
          <option value="collision">collision</option>
          <option value="liability">liability</option>
          <option value="other">other</option>
        </select>
      </div>
      <TextField label="Coverage Details" value={data.coverage_details ?? ""} onChange={(v) => setData((d) => ({ ...d, coverage_details: v }))} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm w-28">Start Date</label>
          <input type="date" className="border rounded px-2 py-1" value={data.start_date} onChange={(e) => setData((d) => ({ ...d, start_date: e.target.value }))} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm w-28">Expiry Date</label>
          <input type="date" className="border rounded px-2 py-1" value={data.expiry_date} onChange={(e) => setData((d) => ({ ...d, expiry_date: e.target.value }))} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded" onClick={submit} disabled={saving}>Save</button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  );
}

function AddClaimForm({ vehicleId, adminToken, onDone }: { vehicleId: number; adminToken: string; onDone: () => void }) {
  const [data, setData] = useState<AddInsuranceClaimRequest>({ incident_date: "", description: "", status: "open" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    try {
      setSaving(true); setErr(null);
      const res = await fetch(`/api/vehicles/${vehicleId}/insurance/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(adminToken ? { "x-admin-token": adminToken } : {}) },
        body: JSON.stringify(data),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "Failed");
      onDone();
    } catch (e: any) { setErr(e?.message ?? "Failed"); } finally { setSaving(false); }
  };
  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <NumberField label="Policy ID" value={(data.policy_id as number | undefined)} onChange={(v) => setData((d) => ({ ...d, policy_id: v ?? undefined }))} />
      <div className="flex items-center gap-2">
        <label className="text-sm w-28">Incident Date</label>
        <input type="date" className="border rounded px-2 py-1" value={data.incident_date} onChange={(e) => setData((d) => ({ ...d, incident_date: e.target.value }))} />
      </div>
      <TextField label="Description" value={data.description} onChange={(v) => setData((d) => ({ ...d, description: v }))} />
      <div className="flex items-center gap-2">
        <label className="text-sm w-28">Status</label>
        <select className="border rounded px-2 py-1" value={data.status ?? "open"} onChange={(e) => setData((d) => ({ ...d, status: e.target.value as any }))}>
          <option value="open">open</option>
          <option value="pending">pending</option>
          <option value="closed">closed</option>
        </select>
      </div>
      <TextField label="Claim #" value={data.claim_number ?? ""} onChange={(v) => setData((d) => ({ ...d, claim_number: v }))} />
      <div className="flex items-center gap-3">
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded" onClick={submit} disabled={saving}>Save</button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  );
}

function AddFuelForm({ vehicleId, onDone }: { vehicleId: number; onDone: () => void }) {
  const [data, setData] = useState<AddFuelLogRequest>({ liters: 0, cost_cents: 0, filled_at: new Date().toISOString().slice(0,16) });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    try {
      setSaving(true); setErr(null);
      const res = await fetch(`/api/vehicles/${vehicleId}/fuel-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "Failed");
      onDone();
    } catch (e: any) { setErr(e?.message ?? "Failed"); } finally { setSaving(false); }
  };
  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <NumberField label="Driver ID" value={(data.driver_id as number | undefined)} onChange={(v) => setData((d) => ({ ...d, driver_id: v ?? undefined }))} />
      <NumberField label="Liters" value={data.liters as any} onChange={(v) => setData((d) => ({ ...d, liters: (v ?? 0) as any }))} />
      <NumberField label="Cost (cents)" value={data.cost_cents} onChange={(v) => setData((d) => ({ ...d, cost_cents: v ?? 0 }))} />
      <NumberField label="Odometer (km)" value={data.odometer_km as number | undefined} onChange={(v) => setData((d) => ({ ...d, odometer_km: v ?? undefined }))} />
      <div className="flex items-center gap-2">
        <label className="text-sm w-28">Filled At</label>
        <input type="datetime-local" className="border rounded px-2 py-1" value={data.filled_at} onChange={(e) => setData((d) => ({ ...d, filled_at: e.target.value }))} />
      </div>
      <div className="flex items-center gap-3">
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded" onClick={submit} disabled={saving}>Save</button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  );
}

