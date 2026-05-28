import "@xyflow/react/dist/style.css";
import { Background, Controls, MiniMap, ReactFlow, addEdge, useEdgesState, useNodesState } from "@xyflow/react";
import { Play, Plus, Save, Workflow } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { workflowApi } from "../workflowApi.js";

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";
const userId = () => localStorage.getItem("codrai_user_id") || "local-user";

const initialNodes = [
  {
    id: "goal",
    position: { x: 80, y: 80 },
    data: { label: "AI task: plan objective", stepType: "ai_task", taskType: "reasoning", prompt: "Plan the requested workflow." },
    type: "default",
  },
  {
    id: "tool",
    position: { x: 380, y: 80 },
    data: { label: "Tool: browser.search", stepType: "tool", toolName: "browser.search", input: { query: "CODRAI AI OS", limit: 5 } },
  },
];

const initialEdges = [{ id: "goal-tool", source: "goal", target: "tool" }];
const workflowTemplates = [
  {
    name: "Research to summary",
    nodes: [
      { id: "research", position: { x: 70, y: 90 }, data: { label: "AI task: research objective", stepType: "ai_task", taskType: "reasoning", prompt: "Research the objective and identify reliable facts." } },
      { id: "synthesize", position: { x: 370, y: 90 }, data: { label: "AI task: synthesize result", stepType: "ai_task", taskType: "reasoning", prompt: "Summarize findings, blockers, and next actions." } },
    ],
    edges: [{ id: "research-synthesize", source: "research", target: "synthesize" }],
  },
  {
    name: "Coding repair loop",
    nodes: [
      { id: "inspect", position: { x: 70, y: 90 }, data: { label: "AI task: inspect code", stepType: "ai_task", taskType: "coding", prompt: "Inspect the target code and identify the smallest safe patch." } },
      { id: "verify", position: { x: 370, y: 90 }, data: { label: "AI task: verify patch", stepType: "ai_task", taskType: "coding", prompt: "Define verification steps and rollback risks." } },
    ],
    edges: [{ id: "inspect-verify", source: "inspect", target: "verify" }],
  },
  {
    name: "Runtime diagnostics",
    nodes: [
      { id: "diagnose", position: { x: 70, y: 90 }, data: { label: "AI task: diagnose runtime", stepType: "ai_task", taskType: "reasoning", prompt: "Inspect runtime health and summarize degraded systems honestly." } },
      { id: "api", position: { x: 370, y: 90 }, data: { label: "Tool: api.request", stepType: "tool", toolName: "api.request", input: { url: "http://backend:5000/api/health", method: "GET" } } },
    ],
    edges: [{ id: "diagnose-api", source: "diagnose", target: "api" }],
  },
];

export default function VisualWorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [workflows, setWorkflows] = useState([]);
  const [name, setName] = useState("Autonomous workflow");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [lastRun, setLastRun] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const onConnect = useCallback((params) => setEdges((current) => addEdge(params, current)), [setEdges]);

  const definition = useMemo(() => {
    const steps = nodes.map((node) => {
      const dependsOn = edges.filter((edge) => edge.target === node.id).map((edge) => edge.source);
      const data = node.data || {};
      if (data.stepType === "tool") {
        return {
          id: node.id,
          type: "tool",
          title: data.label,
          dependsOn,
          toolName: data.toolName,
          input: data.input || {},
        };
      }
      return {
        id: node.id,
        type: "ai_task",
        title: data.label,
        dependsOn,
        task: {
          taskType: data.taskType || "reasoning",
          intent: data.label,
          input: { text: data.prompt || data.label },
          qualityTier: "balanced",
        },
      };
    });
    return { id: selectedWorkflowId || `workflow-${Date.now()}`, name, steps };
  }, [edges, name, nodes, selectedWorkflowId]);

  async function refresh() {
    setError("");
    try {
      const data = await workflowApi.list({ workspaceId: workspaceId() });
      setWorkflows(data.workflows || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  function addNode(stepType) {
    const id = `${stepType}-${crypto.randomUUID()}`;
    setNodes((current) => [
      ...current,
      {
        id,
        position: { x: 120 + current.length * 70, y: 200 + current.length * 35 },
        data: stepType === "tool"
          ? { label: "Tool: api.request", stepType: "tool", toolName: "api.request", input: { url: "https://api.github.com", method: "GET" } }
          : { label: "AI task: analyze", stepType: "ai_task", taskType: "reasoning", prompt: "Analyze the prior step and continue." },
      },
    ]);
  }

  function applyTemplate(template) {
    setName(template.name);
    setSelectedWorkflowId("");
    setLastRun(null);
    setNodes(template.nodes);
    setEdges(template.edges);
    setStatus(`${template.name} template loaded`);
  }

  async function save() {
    setStatus("Saving workflow");
    setError("");
    try {
      const result = await workflowApi.save({
        id: selectedWorkflowId || definition.id,
        workspaceId: workspaceId(),
        name,
        definition,
        createdBy: userId(),
      });
      setSelectedWorkflowId(result.workflow.id);
      await refresh();
      setStatus("Workflow saved");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function run() {
    if (!selectedWorkflowId) {
      await save();
    }
    const workflowId = selectedWorkflowId || definition.id;
    setStatus("Starting workflow run");
    setError("");
    try {
      const result = await workflowApi.runSaved({ workspaceId: workspaceId(), userId: userId(), workflowId });
      const runId = result.id || result.run?.id;
      setStatus(`Workflow run ${runId || "started"}`);
      if (runId) {
        const runData = await workflowApi.getRun(runId).catch(() => null);
        setLastRun(runData || result);
      } else {
        setLastRun(result);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  function loadWorkflow(workflow) {
    setSelectedWorkflowId(workflow.id);
    setName(workflow.name);
    setLastRun(null);
    const steps = workflow.definition?.steps || [];
    setNodes(steps.map((step, index) => ({
      id: step.id,
      position: { x: 80 + index * 260, y: 90 + (index % 2) * 140 },
      data: step.type === "tool"
        ? { label: step.title || `Tool: ${step.toolName}`, stepType: "tool", toolName: step.toolName, input: step.input || {} }
        : { label: step.title || step.task?.intent, stepType: "ai_task", taskType: step.task?.taskType, prompt: step.task?.input?.text },
    })));
    setEdges(steps.flatMap((step) => (step.dependsOn || []).map((source) => ({ id: `${source}-${step.id}`, source, target: step.id }))));
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="glass-card overflow-hidden rounded-lg">
      <div className="border-b border-white/10 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Visual Workflow Builder</p>
            <h2 className="mt-2 text-xl font-black text-white">Drag, connect, save, execute</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => addNode("ai_task")}>
              <Plus className="h-4 w-4" /> AI Node
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => addNode("tool")}>
              <Plus className="h-4 w-4" /> Tool Node
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={save}>
              <Save className="h-4 w-4" /> Save
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={run}>
              <Play className="h-4 w-4" /> Run
            </button>
          </div>
        </div>
        <input className="mt-4 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={name} onChange={(event) => setName(event.target.value)} />
        {status && <p className="mt-3 text-sm text-codrai-cyan">{status}</p>}
        {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
      </div>

      <div className="grid min-h-[520px] lg:grid-cols-[280px_1fr_280px]">
        <aside className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-white/70"><Workflow className="h-4 w-4 text-codrai-cyan" /> Saved workflows</p>
          <div className="space-y-2">
            {workflows.map((workflow) => (
              <button key={workflow.id} className="w-full rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left hover:bg-white/[0.07]" type="button" onClick={() => loadWorkflow(workflow)}>
                <p className="text-sm font-bold text-white">{workflow.name}</p>
                <p className="mt-1 text-xs text-white/40">{workflow.definition?.steps?.length || 0} steps</p>
              </button>
            ))}
          </div>
          <p className="mb-3 mt-5 text-xs font-black uppercase tracking-[0.16em] text-white/45">Templates</p>
          <div className="space-y-2">
            {workflowTemplates.map((template) => (
              <button key={template.name} className="w-full rounded-lg border border-cyan-300/15 bg-cyan-300/10 p-3 text-left hover:bg-cyan-300/15" type="button" onClick={() => applyTemplate(template)}>
                <p className="text-sm font-bold text-white">{template.name}</p>
                <p className="mt-1 text-xs text-white/45">{template.nodes.length} nodes · {template.edges.length} link</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="h-[520px] bg-black/20">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
            <MiniMap pannable zoomable />
            <Controls />
            <Background gap={20} color="rgba(255,255,255,0.08)" />
          </ReactFlow>
        </div>
        <aside className="border-t border-white/10 p-4 lg:border-l lg:border-t-0">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-codrai-cyan">Execution Inspector</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <span className="text-white/45">Nodes</span>
              <p className="mt-1 font-black text-white">{nodes.length}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <span className="text-white/45">Edges</span>
              <p className="mt-1 font-black text-white">{edges.length}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <span className="text-white/45">Last run</span>
              <p className="mt-1 break-all text-xs font-bold text-white/75">{lastRun?.id || lastRun?.run?.id || "No run inspected yet"}</p>
              <p className="mt-1 text-xs text-white/45">{lastRun?.status || lastRun?.run?.status || "Run a workflow to load backend state."}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
