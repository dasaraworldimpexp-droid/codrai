import {
  Activity,
  Brain,
  Cpu,
  Database,
  Gauge,
  Globe2,
  History,
  Image,
  Layers3,
  Mic2,
  Play,
  Radio,
  RefreshCw,
  Save,
  Search,
  Server,
  Sparkles,
  Video,
  Workflow,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CodraiBrandMark from "../components/CodraiBrandMark.jsx";
import { aiStudioApi } from "../features/ai-studio/aiStudioApi.js";

const mediaModes = {
  image: ["standard", "logo", "banner", "product", "realistic-human", "anime", "cinematic", "upscale", "variation", "background-removal"],
  video: ["text-to-video", "image-to-video", "avatar", "subtitles", "voice-sync", "youtube-short", "cinematic"],
  voice: ["voiceover", "podcast", "dubbing", "receptionist", "live-call", "multilingual"],
};

const DEFAULT_PROVIDER_BY_MEDIA = {
  image: "auto-media",
  video: "fal",
  voice: "elevenlabs",
};

export default function AiStudioPage() {
  const [mediaType, setMediaType] = useState("image");
  const [mode, setMode] = useState("standard");
  const [prompt, setPrompt] = useState("Create a premium futuristic CODRAI launch visual");
  const [providerPreference, setProviderPreference] = useState("auto");
  const [modelPreference, setModelPreference] = useState("");
  const [readiness, setReadiness] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [runtime, setRuntime] = useState(null);
  const [operatorConsole, setOperatorConsole] = useState(null);
  const [queues, setQueues] = useState(null);
  const [workers, setWorkers] = useState(null);
  const [autonomousOs, setAutonomousOs] = useState(null);
  const [openSourceRuntime, setOpenSourceRuntime] = useState(null);
  const [localModelToPull, setLocalModelToPull] = useState("tinyllama");
  const [agentCatalog, setAgentCatalog] = useState([]);
  const [agentStatus, setAgentStatus] = useState(null);
  const [agentRuns, setAgentRuns] = useState([]);
  const [agentMessages, setAgentMessages] = useState([]);
  const [agentDag, setAgentDag] = useState(null);
  const [agentReplay, setAgentReplay] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState("runtime");
  const [agentObjective, setAgentObjective] = useState("Inspect CODRAI local runtime readiness");
  const [memoryQuery, setMemoryQuery] = useState("CODRAI runtime");
  const [memoryDraft, setMemoryDraft] = useState("");
  const [memoryResults, setMemoryResults] = useState([]);
  const [memoryGraph, setMemoryGraph] = useState(null);
  const [memorySummary, setMemorySummary] = useState(null);
  const [multimodalStatus, setMultimodalStatus] = useState(null);
  const [desktopStatus, setDesktopStatus] = useState(null);
  const [gpuTelemetry, setGpuTelemetry] = useState(null);
  const [cpuTelemetry, setCpuTelemetry] = useState(null);
  const [runtimeCluster, setRuntimeCluster] = useState(null);
  const [deploymentReplay, setDeploymentReplay] = useState(null);
  const [deploymentTemplates, setDeploymentTemplates] = useState([]);
  const [audioFile, setAudioFile] = useState(null);
  const [visionFile, setVisionFile] = useState(null);
  const [transcriptionResult, setTranscriptionResult] = useState(null);
  const [transcriptionHistory, setTranscriptionHistory] = useState([]);
  const [whisperDiagnostics, setWhisperDiagnostics] = useState(null);
  const [visionResult, setVisionResult] = useState(null);
  const [browserUrl, setBrowserUrl] = useState("https://example.com");
  const [browserSessions, setBrowserSessions] = useState([]);
  const [browserReplay, setBrowserReplay] = useState(null);
  const [promptVersions, setPromptVersions] = useState(() => readPromptVersions());
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [ready, templateData, jobData, runtimeData, operatorData, queueData, workerData, osData, localRuntimeData, agentCatalogData, agentStatusData, agentRunsData, browserData, memoryGraphData, memorySummaryData, multimodalData, desktopData, gpuData, cpuData, clusterData, deploymentData, deploymentTemplateData, transcriptionData, whisperData] = await Promise.all([
        aiStudioApi.readiness(),
        aiStudioApi.templates(),
        aiStudioApi.jobs(),
        aiStudioApi.runtimeDiagnostics(),
        aiStudioApi.operatorConsole(),
        aiStudioApi.queues(),
        aiStudioApi.workers(),
        aiStudioApi.autonomousOs(),
        aiStudioApi.openSourceRuntime(),
        aiStudioApi.agentCatalog(),
        aiStudioApi.agentStatus(),
        aiStudioApi.agentRuns(),
        aiStudioApi.browserSessions(),
        aiStudioApi.memoryGraph(),
        aiStudioApi.memorySummary(),
        aiStudioApi.multimodalStatus(),
        aiStudioApi.desktopStatus(),
        aiStudioApi.gpuTelemetry(),
        aiStudioApi.cpuTelemetry(),
        aiStudioApi.runtimeCluster(),
        aiStudioApi.deploymentReplay(),
        aiStudioApi.deploymentTemplates(),
        aiStudioApi.transcriptionHistory(),
        aiStudioApi.whisperDiagnostics(),
      ]);
      setReadiness(ready);
      setTemplates(templateData.templates || []);
      setJobs(jobData.jobs || []);
      setRuntime(runtimeData);
      setOperatorConsole(operatorData);
      setQueues(queueData);
      setWorkers(workerData);
      setAutonomousOs(osData);
      setOpenSourceRuntime(localRuntimeData);
      setAgentCatalog(agentCatalogData.agents || []);
      setAgentStatus(agentStatusData);
      setAgentRuns(agentRunsData.runs || []);
      setBrowserSessions(browserData.sessions || []);
      setMemoryGraph(memoryGraphData);
      setMemorySummary(memorySummaryData);
      setMultimodalStatus(multimodalData);
      setDesktopStatus(desktopData);
      setGpuTelemetry(gpuData);
      setCpuTelemetry(cpuData);
      setRuntimeCluster(clusterData);
      setDeploymentReplay(deploymentData);
      setDeploymentTemplates(deploymentTemplateData.templates || []);
      setTranscriptionHistory(transcriptionData.transcripts || []);
      setWhisperDiagnostics(whisperData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  useEffect(() => {
    const runId = agentRuns[0]?.id;
    if (!runId) {
      setAgentMessages([]);
      return;
    }
    let cancelled = false;
    aiStudioApi.agentMessages(runId)
      .then(async (data) => {
        const [dagData, replayData] = await Promise.all([
          aiStudioApi.agentDag(runId).catch(() => null),
          aiStudioApi.agentReplay(runId).catch(() => null),
        ]);
        if (!cancelled) {
          setAgentMessages(data.messages || []);
          setAgentDag(dagData);
          setAgentReplay(replayData);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAgentMessages([]);
          setAgentDag(null);
          setAgentReplay(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [agentRuns]);

  const providerCards = useMemo(() => {
    const runtimeProviders = runtime?.providers || [];
    const readinessMap = new Map((readiness?.providers || []).map((provider) => [provider.name, provider]));
    const providerValidation = autonomousOs?.providerValidation?.data || autonomousOs?.providerValidation || autonomousOs?.providerIntelligence?.validation?.data || autonomousOs?.providerIntelligence?.validation || {};
    const validationMap = new Map((providerValidation.checks || []).map((provider) => [provider.provider || provider.name, provider]));
    const names = [...new Set([...runtimeProviders.map((provider) => provider.name), ...readinessMap.keys(), ...validationMap.keys()])];
    return names.map((name) => {
      const runtimeProvider = runtimeProviders.find((provider) => provider.name === name) || {};
      const studioProvider = readinessMap.get(name) || {};
      const validation = validationMap.get(name) || {};
      const healthy = validation.status === "available" || validation.ok === true;
      const blocked = validation.status === "unavailable" || validation.ok === false || studioProvider.registered === false;
      return {
        name,
        type: runtimeProvider.type || studioProvider.type || "provider",
        status: healthy ? "available" : blocked ? "blocked" : "registered",
        supportsStreaming: Boolean(runtimeProvider.supportsStreaming || studioProvider.supportsStreaming),
        capabilities: studioProvider.capabilities || [],
        latency: validation.latencyMs ?? runtimeProvider.score?.latencyScore ?? null,
        reason: validation.error || studioProvider.error || "Runtime registered",
      };
    });
  }, [autonomousOs, readiness, runtime]);

  const providerLabel = useMemo(() => {
    if (providerPreference !== "auto") return providerPreference;
    if (mediaType === "voice") return "ElevenLabs";
    if (mediaType === "video") return "fal.ai";
    return "fal.ai / Stability";
  }, [mediaType, providerPreference]);

  async function submit() {
    setError("");
    setStatus("Submitting to real AI runtime...");
    try {
      const result = await aiStudioApi.createJob({
        mediaType,
        mode,
        prompt,
        input: {
          mode,
          providerPreference: providerPreference === "auto" ? DEFAULT_PROVIDER_BY_MEDIA[mediaType] : providerPreference,
          modelPreference: modelPreference || null,
        },
      });
      await load();
      setStatus(result.job.status === "blocked" ? `Blocked: ${result.job.errorMessage || result.job.error_message}` : `Job ${result.job.status}`);
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  async function refreshRuntime() {
    setError("");
    setStatus("Refreshing live AI Studio runtime state...");
    try {
      await load();
      setStatus("Runtime state refreshed from backend diagnostics.");
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  async function searchMemory() {
    if (!memoryQuery.trim()) {
      setError("Enter a memory search query.");
      return;
    }
    setError("");
    setStatus("Searching pgvector-backed memory...");
    try {
      const result = await aiStudioApi.searchMemory(memoryQuery.trim());
      setMemoryResults(result.memories || []);
      setStatus(`Memory search returned ${(result.memories || []).length} result(s).`);
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  async function saveMemory() {
    if (!memoryDraft.trim()) {
      setError("Enter a memory note to persist.");
      return;
    }
    setError("");
    setStatus("Saving workspace memory...");
    try {
      await aiStudioApi.appendMemory(memoryDraft.trim(), { source: "ai_studio", type: "workspace_note" });
      setMemoryDraft("");
      await searchMemory();
      setStatus("Workspace memory persisted.");
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  async function runBrowser() {
    if (!browserUrl.trim()) {
      setError("Enter a browser URL.");
      return;
    }
    setError("");
    setStatus("Running lightweight browser extraction...");
    try {
      await aiStudioApi.runBrowserSession(browserUrl.trim());
      const result = await aiStudioApi.browserSessions();
      setBrowserSessions(result.sessions || []);
      setStatus("Browser session completed and persisted to memory.");
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  async function inspectBrowserReplay(sessionId) {
    setError("");
    setStatus("Loading persisted browser replay...");
    try {
      const result = await aiStudioApi.browserReplay(sessionId);
      setBrowserReplay(result);
      setStatus("Browser replay loaded from PostgreSQL session memory.");
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  async function recoverStaleExecutions() {
    setError("");
    setStatus("Recovering stale executions through runtime recovery service...");
    try {
      const result = await aiStudioApi.recoverStaleExecutions(false);
      await load();
      setStatus(`Stale execution recovery ${result.status}. Jobs: ${result.actions?.find((item) => item.name === "jobs.stale_recovery")?.count ?? 0}`);
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  async function indexVectorMemory() {
    setError("");
    setStatus("Indexing workspace memories with local lightweight embeddings...");
    try {
      const result = await aiStudioApi.indexMemory(50);
      await load();
      setStatus(`Vector indexing ${result.status}: ${result.indexed} memories updated.`);
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  async function submitTranscription() {
    if (!audioFile) {
      setError("Choose an audio file first.");
      return;
    }
    setError("");
    setStatus("Submitting audio to the real multimodal runtime...");
    try {
      const formData = new FormData();
      formData.set("file", audioFile);
      const result = await aiStudioApi.transcribeAudio(formData);
      setTranscriptionResult(result);
      const history = await aiStudioApi.transcriptionHistory();
      setTranscriptionHistory(history.transcripts || []);
      setStatus(result.status === "blocked" ? `Whisper blocked honestly: ${result.reason}` : "Audio transcription completed.");
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  async function queueTranscription() {
    if (!audioFile) {
      setError("Choose an audio file first.");
      return;
    }
    setError("");
    setStatus("Queueing audio transcription through Redis worker runtime...");
    try {
      const formData = new FormData();
      formData.set("file", audioFile);
      const result = await aiStudioApi.queueTranscription(formData);
      await load();
      setStatus(`Transcription queued: ${result.job?.id || "job persisted"} (${result.job?.status || result.status})`);
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  async function submitVisionAnalysis() {
    if (!visionFile) {
      setError("Choose an image file first.");
      return;
    }
    setError("");
    setStatus("Submitting image to OCR and vision analysis runtime...");
    try {
      const formData = new FormData();
      formData.set("file", visionFile);
      formData.set("prompt", "Analyze this image for CODRAI multimodal task execution.");
      const result = await aiStudioApi.analyzeImage(formData);
      setVisionResult(result);
      setStatus(`Vision analysis completed with OCR status ${result.ocr?.status || "unknown"}.`);
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  async function requestDesktopControl() {
    setError("");
    setStatus("Requesting safe desktop-control capability check...");
    try {
      const result = await aiStudioApi.desktopAction("capability_check");
      setDesktopStatus(result);
      setStatus(result.status === "blocked" ? `Desktop control blocked safely: ${result.reason}` : `Desktop control ${result.status}.`);
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  async function pullLocalModel() {
    setError("");
    setStatus(`Requesting Ollama model pull: ${localModelToPull}`);
    try {
      const result = await aiStudioApi.pullLocalModel(localModelToPull);
      await load();
      setStatus(`Ollama pull ${result.status}: ${result.model}`);
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  async function startAgent() {
    if (!agentObjective.trim()) {
      setError("Enter an agent objective.");
      return;
    }
    setError("");
    setStatus(`Starting ${selectedAgent} agent...`);
    try {
      const result = await aiStudioApi.startAgentRun({ agentType: selectedAgent, objective: agentObjective });
      await load();
      setStatus(result.status === "failed" ? `Agent blocked: ${result.error?.message || "runtime unavailable"}` : `Agent ${result.status}: ${result.runId}`);
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  function useTemplate(template) {
    setMediaType(template.category);
    setMode(template.parameters?.mode || mediaModes[template.category]?.[0] || "standard");
    setPrompt(template.prompt.replace("{{brand}}", "CODRAI").replace("{{product}}", "CODRAI AI Cloud").replace("{{topic}}", "CODRAI Global AI Operating System"));
  }

  function savePromptVersion() {
    const version = {
      id: crypto.randomUUID(),
      mediaType,
      mode,
      prompt,
      providerPreference,
      modelPreference,
      createdAt: new Date().toISOString(),
    };
    const next = [version, ...promptVersions].slice(0, 12);
    localStorage.setItem(promptVersionKey(), JSON.stringify(next));
    setPromptVersions(next);
    setStatus("Prompt draft saved locally for this workspace.");
  }

  function loadPromptVersion(version) {
    setMediaType(version.mediaType);
    setMode(version.mode);
    setPrompt(version.prompt);
    setProviderPreference(version.providerPreference || "auto");
    setModelPreference(version.modelPreference || "");
    setStatus("Prompt draft loaded.");
  }

  return (
    <main className="codrai-os-bg min-h-screen bg-codrai-ink px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="codrai-page-header mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CodraiBrandMark compact className="mb-4" />
            <Link className="mb-4 inline-block text-sm font-bold text-white/55 hover:text-white" to="/dashboard">Back to dashboard</Link>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">AI Studio</p>
            <h1 className="mt-2 text-3xl font-black">Production AI Studio</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">Generate media through CODRAI's real provider-gated runtime. Jobs persist in PostgreSQL, route through the runtime engine, and emit workspace events.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="codrai-ghost-button inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white" type="button" onClick={refreshRuntime} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh runtime
            </button>
            <Link className="codrai-primary-button inline-flex h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-slate-950" to="/global-control-center">Global Control Center</Link>
          </div>
        </header>

        {(status || error) && <div className={`mb-5 rounded-lg border p-3 text-sm ${error ? "border-red-300/20 bg-red-400/10 text-red-100" : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"}`}>{error || status}</div>}

        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={Image} label="Image jobs" value={countJobs(jobs, "image")} />
          <Metric icon={Video} label="Video jobs" value={countJobs(jobs, "video")} />
          <Metric icon={Mic2} label="Voice jobs" value={countJobs(jobs, "voice")} />
          <Metric icon={Radio} label="Runtime status" value={runtime?.status || "loading"} />
        </section>

        <section className="codrai-model-orchestration mt-5 grid gap-3 lg:grid-cols-5">
          {providerCards.map((provider) => (
            <article key={provider.name} className={`codrai-model-card is-${provider.status === "available" ? "cyan" : provider.status === "blocked" ? "purple" : "blue"}`}>
              <span>{provider.status}{provider.supportsStreaming ? " / stream" : ""}</span>
              <strong>{provider.name}</strong>
              <small>{provider.reason}</small>
            </article>
          ))}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_440px]">
          <Panel title="Open-source AI core" icon={Gauge}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {(openSourceRuntime?.runtimes || []).map((runtimeItem) => (
                <article key={runtimeItem.key} className="codrai-studio-provider rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{runtimeItem.name}</strong>
                    <span className={runtimeItem.status === "available" ? "text-emerald-200" : "text-red-200"}>{runtimeItem.status}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-white/45">{runtimeItem.status === "available" ? runtimeItem.baseUrl || runtimeItem.version : runtimeItem.reason}</p>
                  <p className="mt-2 text-xs text-white/35">{(runtimeItem.supports || []).join(", ")}</p>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Local model inventory" icon={Brain}>
            <div className="space-y-2">
              <StatusRow label="Open-source runtime" value={openSourceRuntime?.status || "loading"} />
              <StatusRow label="Active runtimes" value={String(openSourceRuntime?.activeRuntimes ?? 0)} />
              <StatusRow label="GPU" value={openSourceRuntime?.gpu?.status || "unknown"} />
              <StatusRow label="pgvector" value={openSourceRuntime?.memory?.pgvector ? "ready" : "blocked"} />
              <StatusRow label="Redis queues" value={openSourceRuntime?.queues?.status || "unknown"} />
            </div>
            <div className="mt-3 flex gap-2">
              <select className="codrai-input h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-xs outline-none" value={localModelToPull} onChange={(event) => setLocalModelToPull(event.target.value)}>
                {(openSourceRuntime?.models || []).map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}
              </select>
              <button className="codrai-ghost-button inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-white" type="button" onClick={pullLocalModel}>
                Pull
              </button>
            </div>
            <p className="mt-2 text-xs text-white/40">Pull uses Ollama's real `/api/pull` endpoint. It is blocked unless Ollama is reachable.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(openSourceRuntime?.models || []).map((model) => (
                <span key={model.name} className={`rounded-full border px-3 py-1 text-xs font-bold ${model.installed ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/45"}`}>
                  {model.name}{model.installed ? " installed" : " missing"}
                </span>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_440px]">
          <article className="glass-card codrai-studio-panel rounded-lg p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {["image", "video", "voice"].map((type) => (
                <button key={type} type="button" className={`codrai-studio-tab rounded-lg border p-4 text-left font-black capitalize ${mediaType === type ? "is-active border-cyan-300/40 bg-cyan-300/10" : "border-white/10 bg-white/[0.04]"}`} onClick={() => { setMediaType(type); setMode(mediaModes[type][0]); }}>
                  {type}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-sm font-bold text-white/70">Mode</label>
                <select className="codrai-input mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none" value={mode} onChange={(event) => setMode(event.target.value)}>
                  {(mediaModes[mediaType] || []).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-white/70">Provider route</label>
                <select className="codrai-input mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none" value={providerPreference} onChange={(event) => setProviderPreference(event.target.value)}>
                  <option value="auto">auto runtime route</option>
                  {providerCards.map((provider) => <option key={provider.name} value={provider.name}>{provider.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-white/70">Model hint</label>
                <input className="codrai-input mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none" value={modelPreference} onChange={(event) => setModelPreference(event.target.value)} placeholder="optional model id" />
              </div>
            </div>

            <label className="mt-5 block text-sm font-bold text-white/70">Prompt</label>
            <textarea className="codrai-input mt-2 min-h-36 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none" value={prompt} onChange={(event) => setPrompt(event.target.value)} />

            <div className="mt-4 flex flex-wrap gap-3">
              <button className="codrai-primary-button inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="button" onClick={submit}>
                <Play className="h-4 w-4" />
                Generate through runtime
              </button>
              <button className="codrai-ghost-button inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white" type="button" onClick={savePromptVersion}>
                <Save className="h-4 w-4" />
                Save prompt draft
              </button>
            </div>
            <p className="mt-3 text-xs text-white/45">Provider path: {providerLabel}. If keys are missing, CODRAI records a blocked job instead of faking output.</p>
          </article>

          <aside className="grid gap-5">
            <Panel title="Runtime console" icon={Server}>
              <div className="grid gap-2 text-sm">
                <StatusRow label="Diagnostics" value={runtime?.status || "loading"} />
                <StatusRow label="PostgreSQL" value={checkStatus(runtime, "postgres")} />
                <StatusRow label="Redis" value={checkStatus(runtime, "redis")} />
                <StatusRow label="Queue runtime" value={queues?.status || checkStatus(runtime, "queues")} />
                <StatusRow label="Worker nodes" value={String(workers?.workers?.length ?? workers?.nodes?.length ?? 0)} />
                <StatusRow label="WebSocket clients" value={String(runtime?.realtime?.websocket?.clients ?? runtime?.realtime?.socketio?.clients ?? 0)} />
              </div>
            </Panel>

            <Panel title="Provider readiness" icon={RefreshCw}>
              <div className="space-y-2">
                {providerCards.map((provider) => (
                  <div key={provider.name} className="codrai-studio-provider rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold">{provider.name}</span>
                      <span className={`text-xs ${provider.status === "blocked" ? "text-red-200" : provider.status === "available" ? "text-emerald-200" : "text-white/50"}`}>{provider.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/45">{provider.capabilities.join(", ") || provider.type}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_440px]">
          <Panel title="Workflow canvas handoff" icon={Workflow}>
            <div className="codrai-studio-workflow-band">
              <article>
                <Workflow className="h-5 w-5 text-codrai-cyan" />
                <div>
                  <p>Enterprise workflow handoff</p>
                  <h2>Convert prompts into saved orchestration runs</h2>
                  <span>Open the PostgreSQL-backed Workflow Builder, chain AI/tool nodes, and execute through the existing runtime engine.</span>
                </div>
              </article>
              <Link to="/dashboard#workflow-builder">Open workflow builder</Link>
            </div>
          </Panel>

          <Panel title="Vector memory inspector" icon={Database}>
            <textarea className="codrai-input mb-2 min-h-20 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none" value={memoryDraft} onChange={(event) => setMemoryDraft(event.target.value)} placeholder="Persist a workspace memory note for future agents" />
            <button className="codrai-ghost-button mb-3 inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-white" type="button" onClick={saveMemory}>
              Save memory
            </button>
            <div className="flex gap-2">
              <input className="codrai-input h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none" value={memoryQuery} onChange={(event) => setMemoryQuery(event.target.value)} placeholder="Search workspace memory" />
              <button className="codrai-primary-button inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="button" onClick={searchMemory}>
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {memoryResults.length === 0 && <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/50">No memory results loaded yet. Searches use the existing backend memory endpoint.</p>}
              {memoryResults.map((memory) => (
                <article key={memory.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                  <p className="font-bold text-white/80">{memory.title || memory.kind || memory.type || "Memory"}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-white/50">{memory.content || memory.summary || JSON.stringify(memory.metadata || memory.payload || {})}</p>
                </article>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-5">
          <Panel title="Autonomous browser intelligence" icon={Globe2}>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <input className="codrai-input h-11 min-w-0 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none" value={browserUrl} onChange={(event) => setBrowserUrl(event.target.value)} placeholder="https://example.com" />
              <button className="codrai-primary-button inline-flex h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="button" onClick={runBrowser}>
                Run browser extract
              </button>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {browserSessions.length === 0 && <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/50">No browser sessions yet. Runs use the existing Playwright computer-use service and persist page memory.</p>}
              {browserSessions.map((session) => (
                <article key={session.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 font-bold text-white/80">{session.current_url}</p>
                    <span className={session.status === "failed" ? "text-red-200" : "text-emerald-200"}>{session.status}</span>
                  </div>
                  <button className="codrai-ghost-button mt-3 inline-flex h-9 items-center rounded-lg border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-white" type="button" onClick={() => inspectBrowserReplay(session.id)}>
                    Inspect replay
                  </button>
                  <p className="mt-2 text-xs text-white/45">{(session.navigation_memory || []).length} snapshots · {new Date(session.created_at).toLocaleString()}</p>
                </article>
              ))}
            </div>
            {browserReplay && (
              <div className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-cyan-100">Replay: {browserReplay.session?.id}</p>
                  <span className="text-xs text-cyan-100/70">{browserReplay.replay?.status}</span>
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {(browserReplay.replay?.timeline || []).map((item) => (
                    <article key={`${item.index}:${item.capturedAt}`} className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
                      <p className="font-bold text-white/80">{item.index + 1}. {item.action}</p>
                      <p className="mt-1 line-clamp-1 text-white/45">{item.url}</p>
                      <p className="mt-2 line-clamp-3 text-white/55">{item.textPreview}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_440px]">
          <Panel title="Realtime execution graph" icon={Workflow}>
            <div className="grid gap-3 md:grid-cols-4">
              <Metric icon={Workflow} label="Graph nodes" value={operatorConsole?.executionGraph?.nodes?.length ?? 0} />
              <Metric icon={Radio} label="Graph edges" value={operatorConsole?.executionGraph?.edges?.length ?? 0} />
              <Metric icon={Activity} label="24h events" value={(operatorConsole?.telemetry?.realtimeEvents || []).reduce((total, item) => total + Number(item.count || 0), 0)} />
              <Metric icon={Gauge} label="Recovery" value={operatorConsole?.recovery?.status || "loading"} />
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {(operatorConsole?.executionGraph?.nodes || []).slice(0, 10).map((item) => (
                <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 font-bold text-white/80">{item.label}</p>
                    <span className={`text-xs ${item.status === "failed" ? "text-red-200" : item.status === "completed" || item.status === "active" ? "text-emerald-200" : "text-cyan-100"}`}>{item.status}</span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/35">{item.type}</p>
                </article>
              ))}
              {(!operatorConsole?.executionGraph?.nodes || operatorConsole.executionGraph.nodes.length === 0) && <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/50">Execution graph is waiting for runtime activity.</p>}
            </div>
          </Panel>

          <Panel title="Self-healing intelligence" icon={RefreshCw}>
            <div className="space-y-2 text-sm">
              <StatusRow label="Local-first routing" value={operatorConsole?.routing?.localFirst ? "enabled" : "disabled"} />
              <StatusRow label="Tiny model" value={operatorConsole?.routing?.roles?.tiny || "unknown"} />
              <StatusRow label="Default execution" value={operatorConsole?.routing?.roles?.fast || "unknown"} />
              <StatusRow label="Reasoning" value={operatorConsole?.routing?.roles?.reasoning || "unknown"} />
              <StatusRow label="GPU" value={operatorConsole?.routing?.gpu || "unverified"} />
            </div>
            <button className="codrai-ghost-button mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-white" type="button" onClick={recoverStaleExecutions}>
              Recover stale executions
            </button>
            <div className="mt-3 space-y-2">
              {recoveryItems(operatorConsole).length === 0 && <p className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">No stale agents, browser sessions, or queued jobs detected by the runtime snapshot.</p>}
              {recoveryItems(operatorConsole).map((item) => (
                <article key={`${item.kind}:${item.id}`} className="rounded-lg border border-yellow-300/20 bg-yellow-400/10 p-3 text-sm text-yellow-50">
                  <p className="font-bold">{item.kind}: {item.id}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-yellow-50/70">{item.label}</p>
                </article>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[440px_1fr]">
          <Panel title="Semantic memory graph" icon={Database}>
            <div className="space-y-2 text-sm">
              <StatusRow label="Memory nodes" value={String(memoryGraph?.summary?.nodes ?? 0)} />
              <StatusRow label="Memory edges" value={String(memoryGraph?.summary?.edges ?? 0)} />
              <StatusRow label="Total workspace memories" value={String(operatorConsole?.memory?.total ?? 0)} />
              <StatusRow label="Vector coverage" value={`${Math.round((memorySummary?.totals?.vectorCoverage || 0) * 100)}%`} />
              <StatusRow label="Source" value={memoryGraph?.summary?.source || "loading"} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(memorySummary?.byType || []).map((item) => (
                <span key={item.type} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                  {item.type}: {item.count}
                </span>
              ))}
            </div>
            <button className="codrai-ghost-button mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-white" type="button" onClick={indexVectorMemory}>
              Index vector memory
            </button>
          </Panel>

          <Panel title="Contextual recall stream" icon={Brain}>
            <div className="grid gap-3 lg:grid-cols-2">
              {(memoryGraph?.nodes || []).slice(0, 8).map((item) => (
                <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-white/80">{item.label}</p>
                    <span className="text-xs text-codrai-cyan">{item.type}</span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs text-white/55">{item.summary}</p>
                  <p className="mt-2 text-xs text-white/35">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "unknown"}</p>
                </article>
              ))}
              {(!memoryGraph?.nodes || memoryGraph.nodes.length === 0) && <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/50">No memory graph nodes yet. Save a memory or run browser extraction to grow workspace recall.</p>}
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-3">
          <Panel title="Agent and OS orchestration" icon={Brain}>
            <div className="space-y-2 text-sm">
              <StatusRow label="Autonomous OS" value={autonomousOs?.status || "loading"} />
              <StatusRow label="Provider validation" value={autonomousOs?.providerValidation?.data?.status || autonomousOs?.providerValidation?.status || autonomousOs?.providerIntelligence?.validation?.data?.status || "unknown"} />
              <StatusRow label="Memory status" value={autonomousOs?.memory?.status || "unknown"} />
              <StatusRow label="Blocked items" value={String((autonomousOs?.blocked || []).length)} />
            </div>
          </Panel>
          <Panel title="Queue and worker observatory" icon={Cpu}>
            <div className="space-y-2 text-sm">
              <StatusRow label="Queues" value={queues?.status || "unknown"} />
              <StatusRow label="Waiting jobs" value={String(queueMetric(queues, "waiting"))} />
              <StatusRow label="Active jobs" value={String(queueMetric(queues, "active"))} />
              <StatusRow label="Failed jobs" value={String(queueMetric(queues, "failed"))} />
            </div>
          </Panel>
          <Panel title="Realtime event fabric" icon={Activity}>
            <div className="space-y-2 text-sm">
              <StatusRow label="Event bus" value={runtime?.realtime?.eventBus ? "available" : "unknown"} />
              <StatusRow label="Channels" value={String(runtime?.realtime?.eventBus?.channels ?? 0)} />
              <StatusRow label="Socket.IO" value={runtime?.realtime?.socketio ? "available" : "unknown"} />
              <StatusRow label="Native WS" value={runtime?.realtime?.websocket ? "available" : "unknown"} />
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_440px]">
          <Panel title="Autonomous multi-agent command" icon={Brain}>
            <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
              <select className="codrai-input h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none" value={selectedAgent} onChange={(event) => setSelectedAgent(event.target.value)}>
                {agentCatalog.map((agent) => <option key={agent.type} value={agent.type}>{agent.name}</option>)}
              </select>
              <input className="codrai-input h-11 min-w-0 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none" value={agentObjective} onChange={(event) => setAgentObjective(event.target.value)} placeholder="Agent objective" />
              <button className="codrai-primary-button inline-flex h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="button" onClick={startAgent}>
                Run agent
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <Metric icon={Brain} label="Agent types" value={agentStatus?.agents ?? agentCatalog.length} />
              <Metric icon={Cpu} label="Run modes" value={(agentStatus?.executionModes || []).length} />
              <Metric icon={Activity} label="Recent runs" value={agentRuns.length} />
              <Metric icon={Database} label="Memory sharing" value={autonomousOs?.memory?.status || "unknown"} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <StatusRow label="Avg latency" value={`${agentStatus?.performance?.avg_latency_ms ?? 0} ms`} />
              <StatusRow label="Messages" value={String(agentStatus?.collaborationMessages ?? agentMessages.length)} />
              <StatusRow label="Worker mode" value={`x${agentStatus?.lowResourceMode?.workerConcurrency || 1}`} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(agentStatus?.modelRoles || {}).map(([role, model]) => (
                <span key={role} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                  {role}: {model || "unassigned"}
                </span>
              ))}
            </div>
          </Panel>

          <Panel title="Agent execution history" icon={Activity}>
            <div className="space-y-2">
              {agentRuns.length === 0 && <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/50">No agent runs yet. Runtime and monitoring agents can execute diagnostics without paid APIs.</p>}
              {agentRuns.map((run) => (
                <article key={run.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-2 font-bold text-white/80">{run.objective}</p>
                    <span className={run.status === "failed" ? "text-red-200" : "text-emerald-200"}>{run.status}</span>
                  </div>
                  {run.error && <p className="mt-2 text-xs text-red-200">{run.error.message}</p>}
                </article>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-5">
          <Panel title="Agent communication bus" icon={Radio}>
            <div className="grid gap-3 lg:grid-cols-2">
              {agentMessages.length === 0 && <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/50">No collaboration messages recorded for the latest run yet.</p>}
              {agentMessages.map((message) => (
                <article key={message.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-white/80">{message.from_agent} <span className="text-white/35">to</span> {message.to_agent || "workspace"}</p>
                    <span className="text-xs text-codrai-cyan">{message.type}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-white/55">{message.content || "runtime event"}</p>
                  <p className="mt-2 text-xs text-white/35">{new Date(message.created_at).toLocaleString()}</p>
                </article>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_440px]">
          <Panel title="Agent DAG and execution replay" icon={Workflow}>
            <div className="grid gap-3 md:grid-cols-4">
              <Metric icon={Workflow} label="DAG nodes" value={agentDag?.nodes?.length ?? 0} />
              <Metric icon={Radio} label="DAG edges" value={agentDag?.edges?.length ?? 0} />
              <Metric icon={Activity} label="Timeline events" value={agentDag?.timeline?.length ?? 0} />
              <Metric icon={Database} label="Replay memories" value={agentReplay?.replay?.memories?.length ?? 0} />
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {(agentDag?.timeline || []).slice(-10).map((item) => (
                <article key={`${item.type}:${item.ref}:${item.at}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 font-bold text-white/80">{item.label}</p>
                    <span className="text-xs text-codrai-cyan">{item.status}</span>
                  </div>
                  {item.content && <p className="mt-2 line-clamp-2 text-xs text-white/50">{item.content}</p>}
                  <p className="mt-2 text-xs text-white/35">{item.at ? new Date(item.at).toLocaleString() : "unknown"}</p>
                </article>
              ))}
              {(!agentDag?.timeline || agentDag.timeline.length === 0) && <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/50">Run an agent to populate replayable DAG telemetry.</p>}
            </div>
          </Panel>

          <Panel title="CPU-first multimodal readiness" icon={Image}>
            <div className="space-y-2 text-sm">
              <StatusRow label="Acceleration mode" value={gpuTelemetry?.mode || "cpu_first"} />
              <StatusRow label="CPU cores" value={String(cpuTelemetry?.cpu?.cores ?? "unknown")} />
              <StatusRow label="RAM used" value={cpuTelemetry?.memory?.usedPercent != null ? `${cpuTelemetry.memory.usedPercent}%` : "unknown"} />
              <StatusRow label="OCR" value={multimodalStatus?.pipelines?.ocr || "unknown"} />
              <StatusRow label="PDF text" value={multimodalStatus?.pipelines?.pdfText || "unknown"} />
              <StatusRow label="ffmpeg" value={multimodalStatus?.tools?.ffmpeg?.status || "unknown"} />
              <StatusRow label="Whisper" value={multimodalStatus?.pipelines?.whisper || "unknown"} />
              <StatusRow label="Desktop control" value={desktopStatus?.status || "unknown"} />
            </div>
            <p className="mt-3 text-xs text-white/45">{gpuTelemetry?.safety?.fallback || "CODRAI is optimized for CPU-first Intel UHD hardware. CUDA/NVIDIA acceleration is intentionally disabled."}</p>
            <button className="codrai-ghost-button mt-3 inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-white" type="button" onClick={requestDesktopControl}>
              Check desktop control
            </button>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-3">
          <Panel title="Whisper transcription runtime" icon={Mic2}>
            <div className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
              <StatusRow label="Mode" value={whisperDiagnostics?.mode || "cpu-first"} />
              <StatusRow label="Status" value={whisperDiagnostics?.status || multimodalStatus?.pipelines?.whisper || "unknown"} />
              <StatusRow label="Binary" value={whisperDiagnostics?.binary?.status || whisperDiagnostics?.tools?.whisper?.status || "checked by API"} />
              <StatusRow label="Model" value={whisperDiagnostics?.model?.status || whisperDiagnostics?.model || "tiny/base only"} />
            </div>
            <input className="codrai-input mb-3 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none" type="file" accept="audio/*,video/*" onChange={(event) => setAudioFile(event.target.files?.[0] || null)} />
            <div className="flex flex-wrap gap-2">
              <button className="codrai-primary-button inline-flex h-10 items-center rounded-lg bg-white px-3 text-xs font-black text-slate-950" type="button" onClick={submitTranscription}>
                Run transcription
              </button>
              <button className="codrai-ghost-button inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-white" type="button" onClick={queueTranscription}>
                Queue transcription
              </button>
            </div>
            {transcriptionResult && (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/55">
                <p className="font-black text-white/80">{transcriptionResult.status}</p>
                <p className="mt-1">{transcriptionResult.reason || transcriptionResult.text || "No transcript returned."}</p>
              </div>
            )}
            <div className="mt-3 space-y-2">
              {transcriptionHistory.slice(0, 3).map((item) => (
                <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/55">
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-1 font-black text-white/75">{item.file_name || "Audio transcript"}</p>
                    <span className="text-codrai-cyan">{item.status}</span>
                  </div>
                  <p className="mt-1 line-clamp-2">{item.transcript || item.error_message || "Transcript pending."}</p>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Vision upload center" icon={Image}>
            <input className="codrai-input mb-3 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none" type="file" accept="image/*" onChange={(event) => setVisionFile(event.target.files?.[0] || null)} />
            <button className="codrai-primary-button inline-flex h-10 items-center rounded-lg bg-white px-3 text-xs font-black text-slate-950" type="button" onClick={submitVisionAnalysis}>
              Analyze image
            </button>
            {visionResult && (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/55">
                <p className="font-black text-white/80">OCR {visionResult.ocr?.status} · {visionResult.ocr?.chars || 0} chars</p>
                <p className="mt-1 line-clamp-4">{visionResult.ocr?.text || visionResult.imageCaptioning?.reason || "No visible text detected."}</p>
              </div>
            )}
          </Panel>

          <Panel title="Cluster and deployment monitor" icon={Server}>
            <div className="space-y-2 text-sm">
              <StatusRow label="Cluster" value={runtimeCluster?.status || "loading"} />
              <StatusRow label="Topology" value={runtimeCluster?.topology?.mode || "unknown"} />
              <StatusRow label="Nodes" value={String(runtimeCluster?.topology?.nodeCount ?? 0)} />
              <StatusRow label="Redis queues" value={runtimeCluster?.queues?.status || "unknown"} />
              <StatusRow label="Deployment events" value={String(deploymentReplay?.timeline?.length ?? 0)} />
              <StatusRow label="CPU deploy templates" value={String(deploymentTemplates.length)} />
            </div>
            <div className="mt-3 space-y-2">
              {deploymentTemplates.slice(0, 2).map((template) => (
                <article key={template.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/55">
                  <p className="font-black text-white/80">{template.name}</p>
                  <p className="mt-1">{template.profile} · GPU {template.resources?.gpu}</p>
                </article>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/45">Cluster telemetry uses the existing worker supervisor, Redis queue, deployment replay, and runtime diagnostics APIs.</p>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[440px_1fr]">
          <aside className="grid gap-5">
            <Panel title="Prompt templates" icon={Sparkles}>
              <div className="space-y-2">
                {templates.map((template) => (
                  <button key={template.id} type="button" className="codrai-studio-template w-full rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left text-sm hover:bg-white/[0.08]" onClick={() => useTemplate(template)}>
                    <p className="font-bold">{template.name}</p>
                    <p className="mt-1 text-xs text-white/45">{template.category}</p>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Prompt version history" icon={History}>
              <div className="space-y-2">
                {promptVersions.length === 0 && <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/50">No local prompt drafts saved yet.</p>}
                {promptVersions.map((version) => (
                  <button key={version.id} type="button" className="codrai-studio-template w-full rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left text-sm hover:bg-white/[0.08]" onClick={() => loadPromptVersion(version)}>
                    <p className="font-bold capitalize">{version.mediaType} / {version.mode}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-white/45">{version.prompt}</p>
                    <p className="mt-2 text-xs text-white/35">{new Date(version.createdAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-white/40">Draft versions are stored locally per workspace. Submitted jobs persist through the backend AI Studio job API.</p>
            </Panel>
          </aside>

          <Panel title="Live execution and media job history" icon={Layers3}>
            <div className="grid gap-3 lg:grid-cols-2">
              {jobs.length === 0 && <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-white/50">No media jobs yet. Submit a generation request to create a PostgreSQL-backed runtime job.</p>}
              {jobs.map((job) => (
                <article key={job.id} className="codrai-studio-job rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black capitalize">{job.mediaType || job.media_type} / {job.mode}</p>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/60">{job.status}</span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-white/55">{job.prompt}</p>
                  <div className="mt-3 grid gap-2 text-xs text-white/45 sm:grid-cols-2">
                    <span>Provider: {job.provider || "not assigned"}</span>
                    <span>Latency: {job.latencyMs || job.latency_ms || 0} ms</span>
                    <span>Runtime job: {job.runtimeJobId || job.runtime_job_id || "none"}</span>
                    <span>{new Date(job.createdAt || job.created_at).toLocaleString()}</span>
                  </div>
                  {(job.errorMessage || job.error_message) && <p className="mt-2 text-xs text-red-200">{job.errorMessage || job.error_message}</p>}
                </article>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function countJobs(jobs, type) {
  return jobs.filter((job) => (job.mediaType || job.media_type) === type).length;
}

function promptVersionKey() {
  return `codrai_ai_studio_prompt_versions:${localStorage.getItem("codrai_workspace_id") || "local-workspace"}`;
}

function readPromptVersions() {
  try {
    const value = JSON.parse(localStorage.getItem(promptVersionKey()) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function checkStatus(runtime, name) {
  const check = runtime?.checks?.find((item) => item.name === name);
  if (!check) return "unknown";
  return check.ok ? "ok" : "degraded";
}

function queueMetric(queues, name) {
  if (!queues) return 0;
  const queueList = queues.queues || queues.data?.queues || [];
  return queueList.reduce((total, queue) => total + Number(queue.counts?.[name] || queue[name] || 0), 0);
}

function recoveryItems(operatorConsole) {
  const recovery = operatorConsole?.recovery || {};
  return [
    ...(recovery.staleAgents || []).map((item) => ({ kind: "agent", id: item.id, label: item.objective || item.status })),
    ...(recovery.staleBrowserSessions || []).map((item) => ({ kind: "browser", id: item.id, label: item.current_url || item.status })),
    ...(recovery.staleJobs || []).map((item) => ({ kind: "job", id: item.id, label: `${item.queue_name || "queue"} / ${item.kind || item.status}` })),
  ];
}

function Metric({ icon: Icon, label, value }) {
  return <div className="glass-card codrai-studio-metric rounded-lg p-5"><Icon className="h-5 w-5 text-codrai-cyan" /><p className="mt-4 text-sm text-white/55">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;
}

function Panel({ title, icon: Icon, children }) {
  return <article className="glass-card codrai-studio-side-panel rounded-lg p-5"><div className="mb-4 flex items-center gap-2"><Icon className="h-5 w-5 text-codrai-cyan" /><h2 className="font-black">{title}</h2></div>{children}</article>;
}

function StatusRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
      <span className="text-white/55">{label}</span>
      <span className="font-bold text-white/80">{value}</span>
    </div>
  );
}
