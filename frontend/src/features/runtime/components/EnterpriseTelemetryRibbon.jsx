import { Activity, Cpu, Database, Radio, Server, Sparkles, Workflow } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { runtimeApi } from "../runtimeApi.js";

function workspaceId() {
  const id = localStorage.getItem("codrai_workspace_id") || "local-workspace";
  localStorage.setItem("codrai_workspace_id", id);
  return id;
}

function unwrap(result) {
  return result.status === "fulfilled" ? result.value : null;
}

function statusTone(value = "") {
  const text = String(value).toLowerCase();
  if (["ok", "ready", "healthy", "active", "running", "available", "queried", "cpu_first"].some((term) => text.includes(term))) return "is-ready";
  if (["blocked", "unavailable", "failed", "error", "missing"].some((term) => text.includes(term))) return "is-blocked";
  return "is-degraded";
}

function countFrom(value, keys = []) {
  if (!value) return 0;
  if (Array.isArray(value)) return value.length;
  for (const key of keys) {
    const nested = value[key];
    if (Array.isArray(nested)) return nested.length;
    if (nested && typeof nested === "object") {
      const count = countFrom(nested, keys);
      if (count) return count;
    }
  }
  return 0;
}

export default function EnterpriseTelemetryRibbon() {
  const [state, setState] = useState({ loading: true, aggregate: null, fallback: null, error: "" });

  useEffect(() => {
    let mounted = true;
    const params = { workspaceId: workspaceId() };

    async function load() {
      try {
        const aggregate = await runtimeApi.enterpriseCompletion(params);
        if (mounted) setState({ loading: false, aggregate, fallback: null, error: "" });
      } catch (aggregateError) {
        const [cpu, diagnostics, queues, workers, whisper] = await Promise.allSettled([
          runtimeApi.cpu(params),
          runtimeApi.diagnostics(params),
          runtimeApi.queues(params),
          runtimeApi.workers(params),
          runtimeApi.whisperDiagnostics(params),
        ]);
        if (!mounted) return;
        setState({
          loading: false,
          aggregate: null,
          fallback: {
            cpu: unwrap(cpu),
            diagnostics: unwrap(diagnostics),
            queues: unwrap(queues),
            workers: unwrap(workers),
            whisper: unwrap(whisper),
          },
          error: aggregateError.response?.data?.message || aggregateError.message || "Enterprise completion aggregate unavailable",
        });
      }
    }

    load();
    const timer = window.setInterval(load, 30000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const cards = useMemo(() => {
    const aggregate = state.aggregate || {};
    const systems = aggregate.systems || {};
    const fallback = state.fallback || {};
    const cpu = systems.cpu?.data || fallback.cpu || {};
    const diagnostics = systems.diagnostics?.data || fallback.diagnostics || {};
    const queues = systems.queues?.data || fallback.queues || {};
    const workers = systems.cluster?.data || systems.workers?.data || fallback.workers || {};
    const whisper = systems.whisper?.data || fallback.whisper || {};

    return [
      {
        label: "CPU-first mode",
        value: cpu.mode || cpu.status || aggregate.mode || "cpu_first",
        detail: cpu.cpu?.model || cpu.message || "GPU acceleration is disabled by design.",
        icon: Cpu,
      },
      {
        label: "Enterprise readiness",
        value: aggregate.completionScore ? `${aggregate.completionScore}%` : (aggregate.status || (state.error ? "fallback telemetry" : "live")),
        detail: state.error ? "Using endpoint-level runtime diagnostics." : "Aggregated by existing runtime services.",
        icon: Sparkles,
      },
      {
        label: "Queue fabric",
        value: queues.status || queues.mode || "queried",
        detail: `${countFrom(queues, ["queues", "data"])} queues visible from API`,
        icon: Workflow,
      },
      {
        label: "Worker mesh",
        value: workers.status || workers.mode || "queried",
        detail: `${countFrom(workers, ["workers", "nodes", "data"])} workers or nodes reported`,
        icon: Server,
      },
      {
        label: "Whisper runtime",
        value: whisper.status || whisper.mode || "unavailable",
        detail: whisper.message || whisper.reason || "CPU transcription reports honest availability.",
        icon: Radio,
      },
      {
        label: "Runtime diagnostics",
        value: diagnostics.status || "queried",
        detail: `${countFrom(diagnostics, ["providers", "events", "recentEvents"])} tracked signals`,
        icon: Database,
      },
    ];
  }, [state]);

  return (
    <section className="codrai-telemetry-ribbon" aria-label="Enterprise runtime telemetry ribbon">
      <div className="codrai-telemetry-ribbon__header">
        <span><Activity className="h-4 w-4" /></span>
        <div>
          <p>Realtime Enterprise Observability</p>
          <h2>{state.loading ? "Synchronizing live runtime signals" : "Production telemetry is connected to existing backend APIs"}</h2>
        </div>
      </div>
      <div className="codrai-telemetry-ribbon__grid">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className={`codrai-telemetry-card ${statusTone(value)}`}>
            <span className="codrai-telemetry-card__icon"><Icon className="h-4 w-4" /></span>
            <div>
              <p>{label}</p>
              <strong>{state.loading ? "checking" : value}</strong>
              <small>{state.loading ? "Requesting live endpoint state..." : detail}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
