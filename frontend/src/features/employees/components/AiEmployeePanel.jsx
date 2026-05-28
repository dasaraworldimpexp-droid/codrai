import { Play, Plus, RefreshCw, UserCog } from "lucide-react";
import { useEffect, useState } from "react";
import { employeeApi } from "../employeeApi.js";

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";
const userId = () => localStorage.getItem("codrai_user_id") || "local-user";

export default function AiEmployeePanel() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ name: "", role: "", objective: "" });
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const data = await employeeApi.list({ workspaceId: workspaceId() });
      setEmployees(data.employees || []);
      if (!selectedId && data.employees?.[0]) setSelectedId(data.employees[0].id);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function createEmployee(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.role.trim()) return;
    setStatus("Creating AI employee");
    setError("");
    try {
      const result = await employeeApi.create({
        workspaceId: workspaceId(),
        userId: userId(),
        name: form.name,
        role: form.role,
        personality: { tone: "professional", autonomy: "approval-aware" },
        goals: [form.role],
        toolPermissions: ["browser.search", "api.request", "app.generate"],
      });
      setSelectedId(result.employee.id);
      setForm((current) => ({ ...current, name: "", role: "" }));
      await refresh();
      setStatus("Employee created");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function assign() {
    if (!selectedId || !form.objective.trim()) return;
    setStatus("Assigning autonomous work");
    setError("");
    try {
      await employeeApi.assign({ workspaceId: workspaceId(), userId: userId(), employeeId: selectedId, objective: form.objective });
      setForm((current) => ({ ...current, objective: "" }));
      setStatus("Assignment started through orchestrator");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">AI Employees</p>
          <h2 className="mt-2 text-xl font-black text-white">Persistent autonomous workers</h2>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06]" type="button" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={createEmployee}>
        <input className="h-11 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input className="h-11 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" placeholder="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="submit">
          <Plus className="h-4 w-4" />
          Create
        </button>
      </form>

      <div className="mt-4 grid gap-3 lg:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          {employees.map((employee) => (
            <button key={employee.id} className={`w-full rounded-lg border p-3 text-left ${selectedId === employee.id ? "border-codrai-cyan bg-codrai-cyan/10" : "border-white/10 bg-white/[0.04]"}`} type="button" onClick={() => setSelectedId(employee.id)}>
              <p className="flex items-center gap-2 text-sm font-bold text-white"><UserCog className="h-4 w-4 text-codrai-cyan" /> {employee.name}</p>
              <p className="mt-1 text-xs text-white/45">{employee.role}</p>
            </button>
          ))}
        </div>
        <div>
          <textarea className="min-h-24 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" placeholder="Assign a real autonomous task to this employee..." value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} />
          <button className="mt-2 inline-flex h-10 items-center gap-2 rounded-lg bg-codrai-cyan px-4 text-sm font-black text-slate-950" type="button" onClick={assign}>
            <Play className="h-4 w-4" />
            Assign
          </button>
        </div>
      </div>

      {status && <p className="mt-3 text-sm text-codrai-cyan">{status}</p>}
      {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
    </section>
  );
}
