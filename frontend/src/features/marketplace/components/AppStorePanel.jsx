import { CloudDownload, RefreshCw, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { marketplaceApi } from "../marketplaceApi.js";

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";
const userId = () => localStorage.getItem("codrai_user_id") || "local-user";

export default function AppStorePanel() {
  const [extensions, setExtensions] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const [data, installData] = await Promise.all([
        marketplaceApi.extensions({ workspaceId: workspaceId() }),
        marketplaceApi.installations({ workspaceId: workspaceId() }).catch(() => ({ installations: [] })),
      ]);
      setExtensions(data.extensions || []);
      setInstallations(installData.installations || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function install(extensionId) {
    setStatus("Installing tool extension");
    setError("");
    try {
      await marketplaceApi.install({ workspaceId: workspaceId(), userId: userId(), extensionId });
      await refresh();
      setStatus("Extension installed and persisted for this workspace");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setStatus("");
    }
  }

  async function review(extensionId) {
    setStatus("Publishing marketplace rating");
    setError("");
    try {
      await marketplaceApi.review(extensionId, { workspaceId: workspaceId(), userId: userId(), rating: 5, review: "Verified inside CODRAI runtime." });
      await refresh();
      setStatus("Review saved");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setStatus("");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const installedIds = new Set(installations.map((installation) => installation.extension_id || installation.extensionId));

  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-mint">AI App Store</p>
          <h2 className="mt-2 text-xl font-black text-white">Plugins, tools, templates, workflows</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06]" type="button" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
          </button>
          <Store className="h-6 w-6 text-codrai-mint" />
        </div>
      </div>

      {status && <p className="mb-3 text-sm text-codrai-cyan">{status}</p>}
      {error && <p className="mb-3 text-sm text-red-200">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {extensions.map((extension) => (
          <article key={extension.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <h3 className="text-sm font-bold text-white">{extension.name}</h3>
            <p className="mt-2 text-sm text-white/55">{extension.description}</p>
            <p className="mt-2 text-xs text-white/40">v{extension.version} - rating {Number(extension.rating || 0).toFixed(1)} - {(extension.permissions || []).join(", ")}</p>
            {installedIds.has(extension.id) && <p className="mt-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-xs font-bold text-emerald-100">Installed in workspace</p>}
            <div className="mt-3 flex gap-2">
              <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => install(extension.id)} disabled={installedIds.has(extension.id)}>
                <CloudDownload className="h-4 w-4" /> {installedIds.has(extension.id) ? "Installed" : "Install"}
              </button>
              <button className="h-9 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-xs font-bold text-white" type="button" onClick={() => review(extension.id)}>
                Rate
              </button>
            </div>
          </article>
        ))}
        {extensions.length === 0 && <p className="text-sm text-white/45">No extensions available from the marketplace API.</p>}
      </div>
    </section>
  );
}
