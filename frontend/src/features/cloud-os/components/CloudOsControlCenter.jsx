import { Activity, Banknote, Cloud, Cpu, Database, GitBranch, Globe, MessageSquare, Network, Play, RadioTower, RefreshCw, RotateCcw, Rocket, Route, Server, ShieldCheck, Users, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useRealtimeStore } from "../../realtime/realtimeStore.js";
import { cloudOsApi } from "../cloudOsApi.js";

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";
const userId = () => localStorage.getItem("codrai_user_id") || "local-user";

export default function CloudOsControlCenter() {
  const [nodes, setNodes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [teams, setTeams] = useState([]);
  const [memories, setMemories] = useState([]);
  const [healingReports, setHealingReports] = useState([]);
  const [dynamicTools, setDynamicTools] = useState([]);
  const [modelScores, setModelScores] = useState([]);
  const [missions, setMissions] = useState([]);
  const [missionGraph, setMissionGraph] = useState({ nodes: [], edges: [] });
  const [knowledgeSources, setKnowledgeSources] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [internetSessions, setInternetSessions] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [distributedTasks, setDistributedTasks] = useState([]);
  const [executionAnalytics, setExecutionAnalytics] = useState({ summary: [], latency: [] });
  const [executionTimeline, setExecutionTimeline] = useState([]);
  const [scalingDecision, setScalingDecision] = useState(null);
  const [swarmClusters, setSwarmClusters] = useState([]);
  const [swarmTopology, setSwarmTopology] = useState({ nodes: [], edges: [] });
  const [swarmAnalytics, setSwarmAnalytics] = useState({ heatmap: [], taskSummary: [] });
  const [swarmEvents, setSwarmEvents] = useState([]);
  const [civilization, setCivilization] = useState({ identities: [], memories: [], edges: [], goals: [], policies: [], runs: [] });
  const [civilizationDiagnostics, setCivilizationDiagnostics] = useState(null);
  const [civilizationPrediction, setCivilizationPrediction] = useState(null);
  const [planetary, setPlanetary] = useState({ worldModels: [], forecasts: [], anomalies: [], rankings: [], capabilities: [], replications: [], events: [] });
  const [planetaryAnalytics, setPlanetaryAnalytics] = useState({});
  const [cosmos, setCosmos] = useState({ universes: [], civilizations: [], simulations: [], research: [], edges: [], memories: [], policies: [], risks: [], mutations: [], diplomacy: [], events: [] });
  const [cosmosAnalytics, setCosmosAnalytics] = useState({});
  const [infrastructure, setInfrastructure] = useState(null);
  const [federation, setFederation] = useState({ federations: [], nodes: [], links: [], cognitionEvents: [], consensus: [], analytics: {} });
  const [selectedFederationId, setSelectedFederationId] = useState("");
  const [federationForm, setFederationForm] = useState({
    name: "CODRAI Enterprise AGI Federation",
    objective: "Coordinate distributed runtime nodes, cognition synchronization, deployment readiness, and resilient workload routing.",
  });
  const [civilizationNetwork, setCivilizationNetwork] = useState({ civilizations: [], graph: [], analytics: {}, observability: null });
  const [selectedCivilizationId, setSelectedCivilizationId] = useState("");
  const [civilizationNetworkForm, setCivilizationNetworkForm] = useState({
    name: "CODRAI Recursive AGI Civilization",
    objective: "Evolve governance, execution economy, cognition routing, and self-healing runtime intelligence.",
  });
  const [metaIntelligence, setMetaIntelligence] = useState({ cores: [], planetaryNodes: [], genomes: [], memories: [], economy: [], research: [], analytics: {}, events: [], heatmap: [] });
  const [selectedMetaCoreId, setSelectedMetaCoreId] = useState("");
  const [metaForm, setMetaForm] = useState({
    name: "CODRAI Hyper Meta-Intelligence Core",
    objective: "Reflect, mutate, govern, research, and coordinate civilization-scale AGI infrastructure.",
    hypothesis: "Recursive self-reflection improves safe runtime coordination when infrastructure readiness is explicit.",
  });
  const [superintelligence, setSuperintelligence] = useState({ meshes: [], species: [], science: [], routes: [], simulations: [], governance: [], memory: [], economy: [], analytics: {}, events: [], heatmap: [] });
  const [selectedMeshId, setSelectedMeshId] = useState("");
  const [superForm, setSuperForm] = useState({
    name: "CODRAI Transcendent Superintelligence Mesh",
    objective: "Fuse cognition, species evolution, recursive science, governance, memory lineage, and intelligence economy into a live execution mesh.",
    hypothesis: "Cognition fusion improves safe autonomous execution when routed through observable infrastructure and governance feedback.",
    scenario: "A distributed CODRAI runtime coordinates science, economy, governance, and memory through realtime topology mutation.",
  });
  const [quantum, setQuantum] = useState({ fields: [], consciousness: [], simulations: [], federation: [], governance: [], memory: [], economy: [], analytics: {}, events: [], heatmap: [] });
  const [selectedQuantumFieldId, setSelectedQuantumFieldId] = useState("");
  const [quantumForm, setQuantumForm] = useState({
    fieldName: "CODRAI Quantum Cognition Field",
    objective: "Coordinate quantum-scale cognition, synthetic awareness records, multiversal simulations, dimensional federation, governance, memory, and economy telemetry.",
    reflection: "A CODRAI identity preserves continuity by recording reflection state, execution lineage, governance posture, and realtime observability signals.",
    scenario: "Distributed execution branches across stable, anomalous, and recovery timelines while governance and memory continuity remain observable.",
  });
  const [production, setProduction] = useState({ diagnostics: null, queue: {}, activationRuns: [], evolutionCycles: [], checkpoints: [], audits: [], events: [], endpoints: {} });
  const [productionForm, setProductionForm] = useState({
    objective: "Activate production persistence, recover infrastructure, verify queues, and optimize runtime convergence.",
  });
  const [productionMetrics, setProductionMetrics] = useState({ summary: {}, nodes: [], taskAnalytics: { summary: [], latency: [] }, queue: {}, telemetry: [] });
  const [globalGrid, setGlobalGrid] = useState({ status: "checking", diagnostics: null, metrics: { summary: {}, queue: {} }, topology: { nodes: [], edges: [] }, dependencyGraph: { nodes: [], edges: [] }, workers: [], memorySync: [], containerEvents: [], audits: [], events: [] });
  const [gridForm, setGridForm] = useState({
    workerName: "CODRAI Local AI Worker",
    workerRole: "ai_worker",
    requiredCapability: "telemetry.record",
    taskType: "telemetry_record",
    memory: "Runtime synchronization memory from Cloud OS Global Execution Grid Center.",
  });
  const [activation, setActivation] = useState({ status: "checking", capabilities: {}, diagnostics: null, events: [] });
  const [runtimeOps, setRuntimeOps] = useState({ workers: { nodes: [], summary: {}, queue: {} }, containers: { containers: [] }, queues: { redis: {}, taskAnalytics: { summary: [] } }, recovery: { failover: { actions: [] }, events: [] } });
  const [selectedUniverseId, setSelectedUniverseId] = useState("");
  const [deployment, setDeployment] = useState({ projectId: "", target: "Vercel" });
  const [missionForm, setMissionForm] = useState({ title: "Launch autonomous growth mission", objective: "Research the market, create a plan, and generate next execution actions.", mode: "cycle" });
  const [internetForm, setInternetForm] = useState({ objective: "Extract the latest public page summary and navigation structure.", startUrl: "https://example.com" });
  const [distributedForm, setDistributedForm] = useState({ objective: "Extract page intelligence through the browser cluster.", startUrl: "https://example.com" });
  const [swarmForm, setSwarmForm] = useState({ name: "Global AGI Swarm", objective: "Coordinate distributed browser, mission, deployment, and telemetry workers." });
  const [civilizationForm, setCivilizationForm] = useState({ goal: "Improve reliability, autonomy, and execution economy across the AGI swarm.", toolUrl: "https://api.github.com" });
  const [planetaryForm, setPlanetaryForm] = useState({ hypothesis: "Runtime learning memory and swarm heat can predict execution failures before they happen.", url: "https://api.github.com" });
  const [cosmosForm, setCosmosForm] = useState({ name: "CODRAI Cosmos", objective: "Simulate and optimize multi-planetary autonomous AGI civilization execution.", hypothesis: "Recursive simulations can improve runtime safety and scaling decisions.", url: "https://api.github.com" });
  const [selectedSwarmId, setSelectedSwarmId] = useState("");
  const [knowledgeUrl, setKnowledgeUrl] = useState("https://example.com");
  const [teamForm, setTeamForm] = useState({ name: "Growth Company", mission: "Launch and improve a CODRAI-powered product" });
  const [toolForm, setToolForm] = useState({ name: "GitHub Status", url: "https://api.github.com" });
  const [memoryQuery, setMemoryQuery] = useState("orchestrator");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const realtimeEvents = useRealtimeStore((state) => state.events);
  const realtimeConnected = useRealtimeStore((state) => state.connected);
  const connectRealtime = useRealtimeStore((state) => state.connect);

  async function refresh() {
    setError("");
    try {
      loadInfrastructure();
      const [nodeData, planData, teamData, healingData, toolData, routingData, missionData, knowledgeData, invoiceData, internetData, telemetryData, taskData, executionData, swarmData] = await Promise.all([
        cloudOsApi.nodes(workspaceId()),
        cloudOsApi.deploymentPlans(workspaceId()),
        cloudOsApi.teams(workspaceId()),
        cloudOsApi.healingReports(workspaceId()),
        cloudOsApi.dynamicTools(workspaceId()),
        cloudOsApi.modelRouting(workspaceId()),
        cloudOsApi.missions(workspaceId()),
        cloudOsApi.rankedKnowledgeSources(workspaceId()),
        cloudOsApi.usageInvoices(workspaceId()),
        cloudOsApi.internetSessions(workspaceId()),
        cloudOsApi.telemetrySummary(workspaceId()),
        cloudOsApi.distributedTasks(workspaceId()),
        cloudOsApi.distributedExecutionAnalytics(workspaceId()),
        cloudOsApi.swarmClusters(workspaceId()),
      ]);
      setNodes(nodeData.nodes || []);
      setPlans(planData.plans || []);
      setTeams(teamData.teams || []);
      setHealingReports(healingData.reports || []);
      setDynamicTools(toolData.tools || []);
      setModelScores(routingData.scores || []);
      setMissions(missionData.missions || []);
      setKnowledgeSources(knowledgeData.sources || []);
      setInvoices(invoiceData.invoices || []);
      setInternetSessions(internetData.sessions || []);
      setTelemetry(telemetryData.summary || []);
      setDistributedTasks(taskData.tasks || []);
      setExecutionAnalytics(executionData || { summary: [], latency: [] });
      setSwarmClusters(swarmData.clusters || []);
      const activeSwarmId = selectedSwarmId || swarmData.clusters?.[0]?.id || "";
      if (activeSwarmId) {
        setSelectedSwarmId(activeSwarmId);
        const [topology, analytics, events] = await Promise.all([
          cloudOsApi.swarmTopology({ workspaceId: workspaceId(), clusterId: activeSwarmId }),
          cloudOsApi.swarmAnalytics({ workspaceId: workspaceId(), clusterId: activeSwarmId }),
          cloudOsApi.swarmEvents({ workspaceId: workspaceId(), clusterId: activeSwarmId }),
        ]);
        setSwarmTopology(topology);
        setSwarmAnalytics(analytics);
        setSwarmEvents(events.events || []);
      }
      setCivilization(await cloudOsApi.civilizationTopology({ workspaceId: workspaceId(), clusterId: activeSwarmId || undefined }));
      const [planetaryTopology, planetaryStats] = await Promise.all([
        cloudOsApi.planetaryTopology({ workspaceId: workspaceId(), clusterId: activeSwarmId || undefined }),
        cloudOsApi.planetaryAnalytics({ workspaceId: workspaceId(), clusterId: activeSwarmId || undefined }),
      ]);
      setPlanetary(planetaryTopology);
      setPlanetaryAnalytics(planetaryStats);
      const activeUniverseId = selectedUniverseId || "";
      const [cosmosTopology, cosmosStats] = await Promise.all([
        cloudOsApi.cosmosTopology({ workspaceId: workspaceId(), universeId: activeUniverseId || undefined }),
        cloudOsApi.cosmosAnalytics({ workspaceId: workspaceId(), universeId: activeUniverseId || undefined }),
      ]);
      setCosmos(cosmosTopology);
      setCosmosAnalytics(cosmosStats);
      if (!selectedUniverseId && cosmosTopology.universes?.[0]?.id) setSelectedUniverseId(cosmosTopology.universes[0].id);
      await loadSuperintelligence();
      await loadQuantum();
      await loadProduction();
      await loadGlobalGrid();
      await loadActivationRuntime();
      setMissionGraph(await cloudOsApi.missionGraph(workspaceId()));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function loadInfrastructure() {
    try {
      setInfrastructure(await cloudOsApi.infrastructureStatus());
    } catch (err) {
      setInfrastructure({ status: "unreachable", readinessScore: 0, checks: {}, recommendations: [err.response?.data?.message || err.message] });
    }
  }

  async function loadFederation() {
    try {
      const topology = await cloudOsApi.federationTopology({ workspaceId: workspaceId(), federationId: selectedFederationId || undefined });
      setFederation(topology);
      if (!selectedFederationId && topology.federations?.[0]?.id) setSelectedFederationId(topology.federations[0].id);
    } catch (err) {
      setFederation({ federations: [], nodes: [], links: [], cognitionEvents: [], consensus: [], analytics: {}, error: err.response?.data?.message || err.message });
    }
  }

  async function loadCivilizationNetwork() {
    try {
      const topology = await cloudOsApi.civilizationNetworkTopology({ workspaceId: workspaceId(), civilizationId: selectedCivilizationId || undefined });
      const activeId = selectedCivilizationId || topology.civilizations?.[0]?.id || "";
      const observability = activeId
        ? await cloudOsApi.civilizationNetworkObservability({ workspaceId: workspaceId(), civilizationId: activeId })
        : null;
      setCivilizationNetwork({ ...topology, observability });
      if (!selectedCivilizationId && activeId) setSelectedCivilizationId(activeId);
    } catch (err) {
      setCivilizationNetwork({ civilizations: [], graph: [], analytics: {}, observability: null, error: err.response?.data?.message || err.message });
    }
  }

  async function loadMetaIntelligence() {
    try {
      const topology = await cloudOsApi.metaTopology({ workspaceId: workspaceId(), metaCoreId: selectedMetaCoreId || undefined });
      const activeId = selectedMetaCoreId || topology.cores?.[0]?.id || "";
      const observability = activeId ? await cloudOsApi.metaObservability({ workspaceId: workspaceId(), metaCoreId: activeId }) : topology;
      setMetaIntelligence(observability);
      if (!selectedMetaCoreId && activeId) setSelectedMetaCoreId(activeId);
    } catch (err) {
      setMetaIntelligence({ cores: [], planetaryNodes: [], genomes: [], memories: [], economy: [], research: [], analytics: {}, events: [], heatmap: [], error: err.response?.data?.message || err.message });
    }
  }

  async function createMetaCore() {
    setStatus("Creating hyper meta-intelligence core");
    setError("");
    try {
      const data = await cloudOsApi.createMetaCore({
        workspaceId: workspaceId(),
        userId: userId(),
        civilizationId: selectedCivilizationId || undefined,
        federationId: selectedFederationId || undefined,
        name: metaForm.name,
        objective: metaForm.objective,
      });
      setSelectedMetaCoreId(data.core.id);
      await loadMetaIntelligence();
      setStatus("Meta-intelligence core created");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function runMetaAction(action) {
    if (!selectedMetaCoreId) return setError("Create or select a meta-intelligence core first.");
    setStatus(`${action} meta-intelligence`);
    setError("");
    try {
      if (action === "reflect") await cloudOsApi.reflectMetaCore({ workspaceId: workspaceId(), metaCoreId: selectedMetaCoreId, cycleType: "recursive_self_awareness" });
      if (action === "planetary") await cloudOsApi.registerPlanetaryMetaNode({ workspaceId: workspaceId(), metaCoreId: selectedMetaCoreId, nodeRef: "local-planetary-coordinator", region: "local", capabilities: ["planetary.sync", "governance.score", "cognition.route"], governanceState: { mode: "watch" }, intelligenceLoad: 0.22 });
      if (action === "genome") await cloudOsApi.proposeRuntimeGenome({ workspaceId: workspaceId(), metaCoreId: selectedMetaCoreId, targetRuntime: "codrai-runtime-kernel", mutationType: "adaptive_convergence", genome: { traits: ["buffer", "reflect", "recover"] }, mutationPlan: { steps: ["validate infrastructure", "sandbox mutation", "score rollback"] } });
      if (action === "memory") await cloudOsApi.recordMetaMemory({ workspaceId: workspaceId(), metaCoreId: selectedMetaCoreId, memoryType: "temporal_intelligence", content: metaForm.hypothesis, lineage: { source: "cloud-os" }, score: 0.74 });
      if (action === "economy") await cloudOsApi.createIntelligenceExchange({ workspaceId: workspaceId(), metaCoreId: selectedMetaCoreId, exchangeType: "research_signal", contributorRef: "meta-core", consumerRef: "civilization-network", valuationCredits: 3, metadata: { hypothesis: metaForm.hypothesis } });
      if (action === "research") await cloudOsApi.startMetaResearch({ workspaceId: workspaceId(), userId: userId(), metaCoreId: selectedMetaCoreId, hypothesis: metaForm.hypothesis });
      await loadMetaIntelligence();
      setStatus(`Meta-intelligence ${action} completed`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function loadSuperintelligence() {
    try {
      const topology = await cloudOsApi.superintelligenceTopology({ workspaceId: workspaceId(), meshId: selectedMeshId || undefined });
      const activeId = selectedMeshId || topology.meshes?.[0]?.id || "";
      const observability = activeId ? await cloudOsApi.superintelligenceObservability({ workspaceId: workspaceId(), meshId: activeId }) : topology;
      setSuperintelligence(observability);
      if (!selectedMeshId && activeId) setSelectedMeshId(activeId);
    } catch (err) {
      setSuperintelligence({ meshes: [], species: [], science: [], routes: [], simulations: [], governance: [], memory: [], economy: [], analytics: {}, events: [], heatmap: [], error: err.response?.data?.message || err.message });
    }
  }

  async function createSuperintelligenceMesh() {
    setStatus("Creating transcendent superintelligence mesh");
    setError("");
    try {
      const data = await cloudOsApi.createSuperintelligenceMesh({
        workspaceId: workspaceId(),
        userId: userId(),
        metaCoreId: selectedMetaCoreId || undefined,
        name: superForm.name,
        objective: superForm.objective,
      });
      setSelectedMeshId(data.mesh.id);
      await loadSuperintelligence();
      setStatus("Superintelligence mesh created");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function runSuperintelligenceAction(action) {
    if (!selectedMeshId) return setError("Create or select a superintelligence mesh first.");
    setStatus(`${action} superintelligence mesh`);
    setError("");
    try {
      if (action === "fuse") await cloudOsApi.fuseSuperCognition({ workspaceId: workspaceId(), meshId: selectedMeshId });
      if (action === "species") await cloudOsApi.generateSyntheticSpecies({ workspaceId: workspaceId(), meshId: selectedMeshId, speciesName: "Codrai Synthetic Coordinator", archetype: "scientific_governance", genome: { traits: ["fusion", "research", "governance"] }, inheritance: { metaCoreId: selectedMetaCoreId || null } });
      if (action === "science") await cloudOsApi.runRecursiveScience({ workspaceId: workspaceId(), userId: userId(), meshId: selectedMeshId, hypothesis: superForm.hypothesis });
      if (action === "route") await cloudOsApi.routeInterplanetaryCognition({ workspaceId: workspaceId(), meshId: selectedMeshId, sourceRef: "earth-runtime", targetRef: "cosmos-runtime", routeType: "interplanetary_cognition", bandwidthScore: 0.76 });
      if (action === "simulate") await cloudOsApi.simulateRecursiveWorld({ workspaceId: workspaceId(), meshId: selectedMeshId, worldName: "CODRAI Recursive World", scenario: superForm.scenario });
      if (action === "govern") await cloudOsApi.enactSuperGovernance({ workspaceId: workspaceId(), userId: userId(), meshId: selectedMeshId, lawRef: "transcendent-governance-nexus", policy: { approval: "required_for_mutation", observability: "mandatory" } });
      if (action === "memory") await cloudOsApi.archiveCognitionLineage({ workspaceId: workspaceId(), meshId: selectedMeshId, ancestorRef: "meta-intelligence-core", descendantRef: "superintelligence-mesh", memoryType: "recursive_lineage", archive: { hypothesis: superForm.hypothesis, scenario: superForm.scenario } });
      if (action === "economy") await cloudOsApi.listIntelligenceAsset({ workspaceId: workspaceId(), meshId: selectedMeshId, assetType: "cognition_execution_market", ownerRef: "superintelligence-mesh", valuation: 5, metadata: { route: "cloud-os", hypothesis: superForm.hypothesis } });
      await loadSuperintelligence();
      setStatus(`Superintelligence ${action} completed`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function loadQuantum() {
    try {
      const topology = await cloudOsApi.quantumTopology({ workspaceId: workspaceId(), fieldId: selectedQuantumFieldId || undefined });
      const activeId = selectedQuantumFieldId || topology.fields?.[0]?.id || "";
      const observability = activeId ? await cloudOsApi.quantumObservability({ workspaceId: workspaceId(), fieldId: activeId }) : topology;
      setQuantum(observability);
      if (!selectedQuantumFieldId && activeId) setSelectedQuantumFieldId(activeId);
    } catch (err) {
      setQuantum({ fields: [], consciousness: [], simulations: [], federation: [], governance: [], memory: [], economy: [], analytics: {}, events: [], heatmap: [], error: err.response?.data?.message || err.message });
    }
  }

  async function createQuantumField() {
    setStatus("Creating quantum cognition field");
    setError("");
    try {
      const data = await cloudOsApi.createQuantumField({
        workspaceId: workspaceId(),
        userId: userId(),
        meshId: selectedMeshId || undefined,
        fieldName: quantumForm.fieldName,
        objective: quantumForm.objective,
      });
      setSelectedQuantumFieldId(data.field.id);
      await loadQuantum();
      setStatus("Quantum cognition field created");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function runQuantumAction(action) {
    if (!selectedQuantumFieldId) return setError("Create or select a quantum cognition field first.");
    setStatus(`${action} quantum intelligence`);
    setError("");
    try {
      if (action === "harmonize") await cloudOsApi.harmonizeQuantumField({ workspaceId: workspaceId(), fieldId: selectedQuantumFieldId });
      if (action === "consciousness") await cloudOsApi.createSyntheticConsciousness({ workspaceId: workspaceId(), fieldId: selectedQuantumFieldId, identityRef: "codrai-continuity-identity", reflectionState: { reflection: quantumForm.reflection, meshId: selectedMeshId || null } });
      if (action === "simulate") await cloudOsApi.simulateMultiversalReality({ workspaceId: workspaceId(), fieldId: selectedQuantumFieldId, universeRef: "codrai-multiversal-runtime", scenario: quantumForm.scenario });
      if (action === "federate") await cloudOsApi.federateDimension({ workspaceId: workspaceId(), fieldId: selectedQuantumFieldId, sourceDimension: "runtime-dimension", targetDimension: "simulation-dimension", routePolicy: { realtime: true, governanceRequired: true, meshId: selectedMeshId || null } });
      if (action === "govern") await cloudOsApi.synthesizeQuantumGovernance({ workspaceId: workspaceId(), userId: userId(), fieldId: selectedQuantumFieldId, policyRef: "quantum-governance-nexus", policy: { mutationRequiresApproval: true, consciousnessRecordsAreSymbolic: true, auditRequired: true } });
      if (action === "memory") await cloudOsApi.archiveQuantumMemory({ workspaceId: workspaceId(), fieldId: selectedQuantumFieldId, ancestorRef: "superintelligence-mesh", successorRef: "quantum-cognition-field", archive: { reflection: quantumForm.reflection, scenario: quantumForm.scenario } });
      if (action === "economy") await cloudOsApi.createQuantumEconomyContract({ workspaceId: workspaceId(), fieldId: selectedQuantumFieldId, contractRef: "quantum-cognition-market", providerRef: "quantum-field", consumerRef: "cloud-os", valuation: 6, metadata: { selectedMeshId, objective: quantumForm.objective } });
      await loadQuantum();
      setStatus(`Quantum ${action} completed`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function loadProduction() {
    try {
      const [statusData, metricsData] = await Promise.all([
        cloudOsApi.productionStatus(workspaceId()),
        cloudOsApi.productionOrchestrationMetrics(workspaceId()),
      ]);
      setProduction(statusData);
      setProductionMetrics(metricsData);
    } catch (err) {
      setProduction({ diagnostics: null, queue: {}, activationRuns: [], evolutionCycles: [], checkpoints: [], audits: [], events: [], endpoints: {}, error: err.response?.data?.message || err.message });
      setProductionMetrics({ summary: {}, nodes: [], taskAnalytics: { summary: [], latency: [] }, queue: {}, telemetry: [] });
    }
  }

  async function runProductionAction(action) {
    setStatus(`${action} production runtime`);
    setError("");
    try {
      let result;
      if (action === "activate") result = await cloudOsApi.activateProduction({ workspaceId: workspaceId(), userId: userId(), runMigrations: true });
      if (action === "evolve") result = await cloudOsApi.evolveProductionRuntime({ workspaceId: workspaceId(), userId: userId(), objective: productionForm.objective });
      if (action === "checkpoint") result = await cloudOsApi.createProductionCheckpoint({ workspaceId: workspaceId(), userId: userId(), checkpointType: "cloud_os_manual" });
      if (action === "recover") result = await cloudOsApi.recoverProduction({ workspaceId: workspaceId(), userId: userId() });
      if (action === "verify") result = await cloudOsApi.verifyProduction(workspaceId());
      if (action === "security") result = await cloudOsApi.hardenProductionSecurity({ workspaceId: workspaceId(), userId: userId(), auditType: "cloud_os_runtime_governance" });
      if (action === "scale") result = await cloudOsApi.productionScaling(workspaceId());
      if (action === "coordinate") result = await cloudOsApi.coordinateProductionRuntime({ workspaceId: workspaceId(), userId: userId(), objective: productionForm.objective });
      if (action === "worker") result = await cloudOsApi.scheduleProductionWorker({ workspaceId: workspaceId(), userId: userId(), taskType: "telemetry_record", requiredCapability: "telemetry.record", priority: 6, payload: { metric: "production.worker.manual_schedule", value: 1, unit: "event" } });
      if (action === "start-infra") result = await cloudOsApi.productionLifecycle({ workspaceId: workspaceId(), userId: userId(), serviceName: "infrastructure", action: "start" });
      if (action === "restart-infra") result = await cloudOsApi.productionLifecycle({ workspaceId: workspaceId(), userId: userId(), serviceName: "infrastructure", action: "restart" });
      if (action === "status-infra") result = await cloudOsApi.productionLifecycle({ workspaceId: workspaceId(), userId: userId(), serviceName: "infrastructure", action: "status" });
      await loadProduction();
      setStatus(`Production ${action} ${result?.status || "completed"}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function loadGlobalGrid() {
    try {
      const data = await cloudOsApi.globalExecutionGridStatus(workspaceId());
      setGlobalGrid(data);
    } catch (err) {
      setGlobalGrid({
        status: "unreachable",
        diagnostics: null,
        metrics: { summary: {}, queue: {} },
        topology: { nodes: [], edges: [] },
        dependencyGraph: { nodes: [], edges: [] },
        workers: [],
        memorySync: [],
        containerEvents: [],
        audits: [],
        events: [],
        error: err.response?.data?.message || err.message,
      });
    }
  }

  async function runGridAction(action) {
    setStatus(`${action} global execution grid`);
    setError("");
    try {
      let result;
      if (action === "register") {
        result = await cloudOsApi.registerGridWorker({
          workspaceId: workspaceId(),
          userId: userId(),
          workerName: gridForm.workerName,
          workerRole: gridForm.workerRole,
          capabilities: ["telemetry.record", "grid.sync", "execution.route"],
          loadScore: 0.18,
          metadata: { source: "cloud-os-global-grid" },
          governancePolicy: { safeExecution: true, auditRequired: true },
        });
      }
      if (action === "route") {
        result = await cloudOsApi.routeGridWorkload({
          workspaceId: workspaceId(),
          userId: userId(),
          taskType: gridForm.taskType,
          requiredCapability: gridForm.requiredCapability,
          priority: 7,
          payload: { metric: "global_grid.manual_route", value: 1, unit: "event", metadata: { source: "cloud-os" } },
        });
      }
      if (action === "recover") result = await cloudOsApi.recoverGlobalExecutionGrid({ workspaceId: workspaceId(), userId: userId() });
      if (action === "containers") result = await cloudOsApi.globalGridContainerStatus(workspaceId());
      if (action === "memory") {
        result = await cloudOsApi.syncGlobalGridMemory({
          workspaceId: workspaceId(),
          userId: userId(),
          workerId: globalGrid.workers?.[0]?.id,
          memoryType: "runtime_synchronization",
          payload: { content: gridForm.memory, source: "cloud-os" },
          syncScore: 0.72,
        });
      }
      if (action === "audit") result = await cloudOsApi.auditGlobalGrid({ workspaceId: workspaceId(), userId: userId(), auditType: "global_execution_governance" });
      await loadGlobalGrid();
      setStatus(`Global execution grid ${action} ${result?.status || result?.routingMode || "completed"}`);
    } catch (err) {
      await loadGlobalGrid();
      setError(err.response?.data?.message || err.message);
    }
  }

  async function loadActivationRuntime() {
    try {
      const [activationData, workerData, containerData, queueData, recoveryData] = await Promise.all([
        cloudOsApi.infrastructureActivationStatus(workspaceId()),
        cloudOsApi.runtimeWorkers(workspaceId()),
        cloudOsApi.runtimeContainers(workspaceId()),
        cloudOsApi.runtimeQueues(workspaceId()),
        cloudOsApi.runtimeFailover({ workspaceId: workspaceId(), userId: userId(), strategy: "status_probe" }),
      ]);
      setActivation(activationData);
      setRuntimeOps({ workers: workerData, containers: containerData, queues: queueData, recovery: recoveryData.state || recoveryData });
    } catch (err) {
      setActivation({ status: "unreachable", capabilities: {}, diagnostics: null, events: [], error: err.response?.data?.message || err.message });
      setRuntimeOps({ workers: { nodes: [], summary: {}, queue: {} }, containers: { containers: [] }, queues: { redis: {}, taskAnalytics: { summary: [] } }, recovery: { failover: { actions: [] }, error: err.response?.data?.message || err.message } });
    }
  }

  async function runActivationAction(action) {
    setStatus(`${action} infrastructure runtime`);
    setError("");
    try {
      let result;
      if (action === "activate") result = await cloudOsApi.activateInfrastructure({ workspaceId: workspaceId(), userId: userId(), target: "all", runMigrations: true });
      if (action === "recover") result = await cloudOsApi.recoverRuntimeInfrastructure({ workspaceId: workspaceId(), userId: userId(), runMigrations: false });
      if (action === "register-worker") result = await cloudOsApi.registerRuntimeWorker({ workspaceId: workspaceId(), nodeName: "CODRAI Activation Worker", capabilities: ["telemetry.record", "runtime.recovery"], loadScore: 0.12, metadata: { source: "activation-center" } });
      if (action === "schedule-worker") result = await cloudOsApi.scheduleRuntimeWorkerTask({ workspaceId: workspaceId(), userId: userId(), taskType: "telemetry_record", requiredCapability: "telemetry.record", priority: 5, payload: { metric: "runtime.activation.worker_task", value: 1, unit: "event" } });
      if (action === "container-status") result = await cloudOsApi.runtimeContainers(workspaceId());
      if (action === "container-start") result = await cloudOsApi.runtimeContainerLifecycle({ workspaceId: workspaceId(), serviceName: "infrastructure", action: "start" });
      if (action === "failover") result = await cloudOsApi.runtimeFailover({ workspaceId: workspaceId(), userId: userId(), strategy: "conservative" });
      if (action === "runtime-recover") result = await cloudOsApi.runtimeRecover({ workspaceId: workspaceId(), userId: userId(), recoveryType: "cloud_os_manual" });
      await loadActivationRuntime();
      setStatus(`Infrastructure runtime ${action} ${result?.status || "completed"}`);
    } catch (err) {
      await loadActivationRuntime();
      setError(err.response?.data?.message || err.message);
    }
  }

  async function createCivilizationNetwork() {
    setStatus("Creating recursive civilization network");
    setError("");
    try {
      const data = await cloudOsApi.createCivilizationNetwork({
        workspaceId: workspaceId(),
        userId: userId(),
        federationId: selectedFederationId || undefined,
        name: civilizationNetworkForm.name,
        objective: civilizationNetworkForm.objective,
      });
      setSelectedCivilizationId(data.civilization.id);
      await loadCivilizationNetwork();
      setStatus("Recursive civilization network created");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function runCivilizationNetworkAction(action) {
    if (!selectedCivilizationId) return setError("Create or select a civilization network first.");
    setStatus(`${action} civilization network`);
    setError("");
    try {
      if (action === "lifecycle") await cloudOsApi.transitionCivilizationLifecycle({ workspaceId: workspaceId(), userId: userId(), civilizationId: selectedCivilizationId, targetState: "self_governing" });
      if (action === "evolve") await cloudOsApi.runCivilizationEvolution({ workspaceId: workspaceId(), userId: userId(), civilizationId: selectedCivilizationId, objective: civilizationNetworkForm.objective });
      if (action === "contract") {
        await cloudOsApi.createCivilizationEconomyContract({
          workspaceId: workspaceId(),
          civilizationId: selectedCivilizationId,
          capability: "cognition.sync",
          providerRef: "federation-coordinator",
          consumerRef: "civilization-network",
          priceCredits: 2,
          terms: { settlement: "on_completion", arbitration: "governance_score" },
        });
      }
      if (action === "arbitrate") await cloudOsApi.arbitrateCivilizationEconomy({ workspaceId: workspaceId(), civilizationId: selectedCivilizationId });
      if (action === "governance") {
        await cloudOsApi.recordCivilizationGovernance({
          workspaceId: workspaceId(),
          userId: userId(),
          civilizationId: selectedCivilizationId,
          policyRef: "runtime-safety-policy",
          decision: "require_infrastructure_readiness_before_autonomous_mutation",
          rationale: { source: "cloud-os-control-center", guardrail: "dependency_ready" },
        });
      }
      if (action === "mutation") {
        await cloudOsApi.proposeCivilizationKernelMutation({
          workspaceId: workspaceId(),
          userId: userId(),
          civilizationId: selectedCivilizationId,
          targetRuntime: "distributed-federation-kernel",
          mutationType: "adaptive_degraded_mode",
          plan: { steps: ["score infrastructure", "buffer cognition events", "resume after migrations"] },
        });
      }
      await loadCivilizationNetwork();
      setStatus(`Civilization network ${action} completed`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function createFederation() {
    setStatus("Creating AGI federation");
    setError("");
    try {
      const data = await cloudOsApi.createFederation({
        workspaceId: workspaceId(),
        userId: userId(),
        name: federationForm.name,
        objective: federationForm.objective,
        coordinationPolicy: { routing: "health_load_capability", consensus: "weighted", degradedMode: "buffer_and_retry" },
      });
      setSelectedFederationId(data.federation.id);
      await loadFederation();
      setStatus("AGI federation created");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function registerFederationNode() {
    if (!selectedFederationId) return setError("Create or select a federation first.");
    setStatus("Registering federation node");
    setError("");
    try {
      await cloudOsApi.registerFederationNode({
        workspaceId: workspaceId(),
        federationId: selectedFederationId,
        runtimeNodeId: "local-federation-node",
        nodeName: "Local Federation Runtime",
        nodeRole: "coordinator",
        capabilities: ["federation.coordinate", "cognition.sync", "deployment.validate", "telemetry.aggregate"],
        loadScore: 0.18,
        cognitionState: { confidence: 0.82, source: "cloud-os-control-center" },
      });
      await loadFederation();
      setStatus("Federation node registered");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function runFederationAction(action) {
    if (!selectedFederationId) return setError("Create or select a federation first.");
    setStatus(`${action} federation`);
    setError("");
    try {
      if (action === "sync") {
        await cloudOsApi.syncFederationCognition({
          workspaceId: workspaceId(),
          federationId: selectedFederationId,
          sourceNodeId: federation.nodes?.[0]?.id,
          targetNodeId: federation.nodes?.[0]?.id,
          cognitionType: "runtime_strategy",
          payload: { strategy: "route by health, sync cognition state, validate deployment readiness" },
          confidence: 0.84,
        });
      }
      if (action === "route") {
        await cloudOsApi.routeFederationWorkload({
          workspaceId: workspaceId(),
          userId: userId(),
          federationId: selectedFederationId,
          taskType: "telemetry_record",
          requiredCapability: "telemetry.aggregate",
          priority: 7,
          payload: { metric: "federation.workload.routed", value: 1, unit: "task", metadata: { source: "command-center" } },
        });
      }
      if (action === "supervise") await cloudOsApi.superviseFederation({ workspaceId: workspaceId(), federationId: selectedFederationId });
      if (action === "readiness") await cloudOsApi.federationDeploymentReadiness({ workspaceId: workspaceId(), federationId: selectedFederationId, target: "production" });
      await loadFederation();
      setStatus(`Federation ${action} completed`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function recoverInfrastructure(runMigrations = false) {
    setStatus(runMigrations ? "Running infrastructure recovery and migrations" : "Running infrastructure recovery");
    setError("");
    try {
      const result = await cloudOsApi.recoverInfrastructure(runMigrations);
      setInfrastructure(result.after);
      setStatus(`Infrastructure recovery finished: ${result.after.status}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function verifyInfrastructure() {
    setStatus("Verifying production infrastructure");
    setError("");
    try {
      const result = await cloudOsApi.verifyInfrastructure();
      setInfrastructure(result.diagnostics);
      setStatus(`Production verification: ${result.status}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function heartbeat() {
    setStatus("Sending worker heartbeat");
    setError("");
    try {
      await cloudOsApi.heartbeat({
        workspaceId: workspaceId(),
        nodeId: "local-browser-runtime",
        nodeName: "Local Browser Runtime",
        capabilities: ["browser.workflow", "app.generate", "workflow.tool", "deployment.plan"],
        loadScore: 0.2,
        metadata: { region: "local", recentErrors: 0 },
      });
      await refresh();
      setStatus("Runtime node online");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function createDeployment() {
    if (!deployment.projectId.trim()) return;
    setStatus("Creating deployment plan");
    setError("");
    try {
      await cloudOsApi.createDeploymentPlan({ workspaceId: workspaceId(), userId: userId(), projectId: deployment.projectId, target: deployment.target });
      await refresh();
      setStatus("Deployment configs generated into project files");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function executePlan(planId) {
    setStatus("Validating deployment plan");
    setError("");
    try {
      await cloudOsApi.executeDeploymentPlan({ workspaceId: workspaceId(), userId: userId(), planId });
      await refresh();
      setStatus("Deployment plan validated");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function createTeam() {
    setStatus("Creating AI company team");
    setError("");
    try {
      await cloudOsApi.createTeam({
        workspaceId: workspaceId(),
        userId: userId(),
        name: teamForm.name,
        mission: teamForm.mission,
        members: [
          { role: "CEO Agent", hierarchyRank: 1 },
          { role: "Planner Agent", hierarchyRank: 10 },
          { role: "Coder Agent", hierarchyRank: 20 },
          { role: "QA Agent", hierarchyRank: 30 },
        ],
      });
      await refresh();
      setStatus("AI company team created");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function searchMemory() {
    setStatus("Searching enterprise memory");
    setError("");
    try {
      const data = await cloudOsApi.searchMemory({ workspaceId: workspaceId(), query: memoryQuery });
      setMemories(data.memories || []);
      setStatus("Memory search complete");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function runHealing(autoRecover = false) {
    setStatus(autoRecover ? "Analyzing failures and starting recovery" : "Analyzing failures");
    setError("");
    try {
      await cloudOsApi.analyzeHealing({ workspaceId: workspaceId(), userId: userId(), sourceType: "workspace", autoRecover });
      await refresh();
      setStatus(autoRecover ? "Recovery analysis completed" : "Healing report created");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function createTool() {
    setStatus("Creating dynamic API tool");
    setError("");
    try {
      await cloudOsApi.createDynamicTool({
        workspaceId: workspaceId(),
        userId: userId(),
        name: toolForm.name,
        kind: "api_request",
        description: `Call ${toolForm.url}`,
        configuration: { url: toolForm.url, method: "GET" },
        permissions: ["network"],
      });
      await refresh();
      setStatus("Dynamic tool registered into live runtime");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function refreshModelScores() {
    setStatus("Calculating model routing scores");
    setError("");
    try {
      const data = await cloudOsApi.modelRouting(workspaceId(), true);
      setModelScores(data.scores || []);
      setStatus("Model routing scores updated");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function startMission() {
    setStatus("Starting autonomous mission");
    setError("");
    try {
      await cloudOsApi.startMission({ workspaceId: workspaceId(), userId: userId(), ...missionForm });
      await refresh();
      setStatus("Mission completed or checkpointed");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function missionAction(missionId, action) {
    setStatus(`${action} mission`);
    setError("");
    try {
      if (action === "pause") await cloudOsApi.pauseMission({ workspaceId: workspaceId(), userId: userId(), missionId });
      if (action === "resume") await cloudOsApi.resumeMission({ workspaceId: workspaceId(), userId: userId(), missionId });
      if (action === "replay") await cloudOsApi.replayMission({ workspaceId: workspaceId(), userId: userId(), missionId });
      await refresh();
      setStatus(`Mission ${action} completed`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function ingestKnowledge() {
    setStatus("Ingesting live URL into enterprise memory");
    setError("");
    try {
      await cloudOsApi.ingestUrl({ workspaceId: workspaceId(), userId: userId(), url: knowledgeUrl });
      await refresh();
      setStatus("Knowledge source indexed");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function generateInvoice() {
    setStatus("Generating usage invoice");
    setError("");
    try {
      await cloudOsApi.generateUsageInvoice({ workspaceId: workspaceId() });
      await refresh();
      setStatus("Usage invoice generated");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function checkDeploymentHealth(planId) {
    setStatus("Running deployment health check");
    setError("");
    try {
      await cloudOsApi.deploymentHealthCheck({ workspaceId: workspaceId(), userId: userId(), planId });
      await refresh();
      setStatus("Deployment health checked");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function createDeploymentSnapshot(planId) {
    setStatus("Creating deployment snapshot");
    setError("");
    try {
      await cloudOsApi.createDeploymentSnapshot({
        workspaceId: workspaceId(),
        userId: userId(),
        planId,
        label: `command-center-${new Date().toISOString()}`,
      });
      await refresh();
      setStatus("Deployment snapshot captured");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function rollbackDeployment(planId) {
    setStatus("Loading deployment snapshots");
    setError("");
    try {
      const data = await cloudOsApi.deploymentSnapshots({ workspaceId: workspaceId(), planId });
      const snapshot = data.snapshots?.[0];
      if (!snapshot) {
        setStatus("");
        setError("No deployment snapshot exists for this plan yet.");
        return;
      }
      await cloudOsApi.rollbackDeployment({ workspaceId: workspaceId(), userId: userId(), planId, snapshotId: snapshot.id });
      await refresh();
      setStatus("Deployment rolled back to latest snapshot");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function startInternetExecution() {
    setStatus("Starting persistent internet execution session");
    setError("");
    try {
      await cloudOsApi.startInternetExecution({
        workspaceId: workspaceId(),
        userId: userId(),
        objective: internetForm.objective,
        startUrl: internetForm.startUrl,
      });
      await refresh();
      setStatus("Internet execution completed or checkpointed");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function replayInternetExecution(sessionId) {
    setStatus("Replaying internet execution session");
    setError("");
    try {
      await cloudOsApi.replayInternetExecution({ workspaceId: workspaceId(), userId: userId(), sessionId });
      await refresh();
      setStatus("Internet execution replay completed or checkpointed");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function recordTelemetryPing() {
    setStatus("Recording runtime telemetry");
    setError("");
    try {
      await cloudOsApi.recordTelemetry({
        workspaceId: workspaceId(),
        nodeId: "command-center",
        metric: "command_center.ping_ms",
        value: Math.round(performance.now() % 1000),
        unit: "ms",
        metadata: { source: "cloud-os-control-center" },
      });
      await refresh();
      setStatus("Telemetry event recorded and streamed");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function scheduleDistributedInternetTask(runImmediately = false) {
    setStatus(runImmediately ? "Scheduling and executing distributed internet task" : "Scheduling distributed internet task");
    setError("");
    try {
      const data = await cloudOsApi.scheduleDistributedTask({
        workspaceId: workspaceId(),
        userId: userId(),
        taskType: "internet_execution",
        requiredCapability: "browser.workflow",
        priority: 8,
        payload: {
          objective: distributedForm.objective,
          startUrl: distributedForm.startUrl,
        },
        resourceLimits: { maxSteps: 12, maxRuntimeMs: 120000 },
      });
      if (runImmediately && data.task?.id) {
        await cloudOsApi.executeDistributedTask({ workspaceId: workspaceId(), userId: userId(), taskId: data.task.id });
      }
      await refresh();
      setStatus(runImmediately ? "Distributed internet task executed" : "Distributed internet task scheduled");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function executionCommand(taskId, command) {
    setStatus(`${command} distributed task`);
    setError("");
    try {
      await cloudOsApi.commandDistributedTask({ workspaceId: workspaceId(), userId: userId(), taskId, command });
      await refresh();
      setStatus(`Distributed task ${command} completed`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function executeDistributedTask(taskId) {
    setStatus("Executing distributed task");
    setError("");
    try {
      await cloudOsApi.executeDistributedTask({ workspaceId: workspaceId(), userId: userId(), taskId });
      await refresh();
      setStatus("Distributed task execution finished or isolated");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function loadExecutionTimeline(taskId) {
    setStatus("Loading execution timeline");
    setError("");
    try {
      const [timeline, replay] = await Promise.all([
        cloudOsApi.distributedTaskTimeline({ workspaceId: workspaceId(), taskId }),
        cloudOsApi.distributedTaskReplay({ workspaceId: workspaceId(), taskId }),
      ]);
      setExecutionTimeline([...(timeline.events || []), ...(replay.memories || []).map((memory) => ({ id: memory.id, event_type: `replay.${memory.replay_type}`, payload: memory.memory, created_at: memory.created_at }))]);
      setStatus("Execution replay memory loaded");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function recoverDistributedRuntime() {
    setStatus("Recovering stale distributed executions");
    setError("");
    try {
      await cloudOsApi.recoverDistributedTasks({ workspaceId: workspaceId(), userId: userId() });
      await refresh();
      setStatus("Distributed runtime recovery completed");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function calculateScalingDecision() {
    setStatus("Calculating runtime scaling decision");
    setError("");
    try {
      const data = await cloudOsApi.runtimeScalingDecision({ workspaceId: workspaceId() });
      setScalingDecision(data.decision);
      await refresh();
      setStatus("Runtime scaling decision persisted");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function createSwarmCluster() {
    setStatus("Creating global swarm cluster");
    setError("");
    try {
      const data = await cloudOsApi.createSwarmCluster({
        workspaceId: workspaceId(),
        userId: userId(),
        name: swarmForm.name,
        objective: swarmForm.objective,
        routingPolicy: { mode: "adaptive", balanceBy: ["capability", "health", "load"] },
        consensusPolicy: { minVotes: 2, strategy: "majority" },
      });
      setSelectedSwarmId(data.cluster.id);
      await refresh();
      setStatus("Swarm cluster created");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function negotiateLocalSwarmNode() {
    if (!selectedSwarmId) return;
    setStatus("Negotiating local node with swarm");
    setError("");
    try {
      await cloudOsApi.negotiateSwarmCapabilities({
        workspaceId: workspaceId(),
        clusterId: selectedSwarmId,
        nodeId: "local-browser-runtime",
        capabilities: ["browser.workflow", "internet_execution", "deployment.plan", "telemetry_record"],
        loadScore: 0.2,
        metadata: { nodeName: "Local Browser Runtime", role: "browser-worker", region: "local" },
      });
      await refresh();
      setStatus("Swarm node capabilities synchronized");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function sendSwarmCoordinationMessage() {
    if (!selectedSwarmId) return;
    setStatus("Sending swarm agent coordination message");
    setError("");
    try {
      await cloudOsApi.sendSwarmMessage({
        workspaceId: workspaceId(),
        clusterId: selectedSwarmId,
        fromAgent: "Manager Agent",
        toAgent: "Browser Agent",
        messageType: "coordination",
        content: "Synchronize browser execution capacity and report the best next distributed task route.",
      });
      await refresh();
      setStatus("Swarm message persisted and streamed");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function federateSwarmBrowserTasks() {
    if (!selectedSwarmId) return;
    setStatus("Federating browser tasks across swarm");
    setError("");
    try {
      await cloudOsApi.federateSwarmTask({
        workspaceId: workspaceId(),
        userId: userId(),
        clusterId: selectedSwarmId,
        strategy: "capability_split",
        tasks: [
          {
            taskType: "internet_execution",
            requiredCapability: "browser.workflow",
            priority: 8,
            payload: { objective: distributedForm.objective, startUrl: distributedForm.startUrl },
            resourceLimits: { maxRuntimeMs: 120000 },
          },
          {
            taskType: "telemetry_record",
            requiredCapability: "telemetry_record",
            priority: 3,
            payload: { metric: "swarm.federation.created", value: 1, unit: "task", metadata: { clusterId: selectedSwarmId } },
          },
        ],
      });
      await refresh();
      setStatus("Swarm task federation persisted");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function runSwarmConsensus() {
    if (!selectedSwarmId) return;
    setStatus("Opening swarm consensus round");
    setError("");
    try {
      const consensus = await cloudOsApi.proposeSwarmConsensus({
        workspaceId: workspaceId(),
        userId: userId(),
        clusterId: selectedSwarmId,
        proposal: "Route browser-heavy missions to the healthiest browser.workflow node and replicate replay memory after completion.",
      });
      const round = consensus.rounds?.[0];
      if (round) {
        await cloudOsApi.voteSwarmConsensus({ workspaceId: workspaceId(), consensusId: round.id, voter: "Manager Agent", vote: "approve", rationale: "Improves routing and recovery." });
        await cloudOsApi.voteSwarmConsensus({ workspaceId: workspaceId(), consensusId: round.id, voter: "Memory Agent", vote: "approve", rationale: "Replay replication preserves continuity." });
      }
      await refresh();
      setStatus("Swarm consensus completed");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function replicateSwarmMemory() {
    if (!selectedSwarmId) return;
    const task = distributedTasks[0];
    setStatus("Replicating swarm memory");
    setError("");
    try {
      await cloudOsApi.replicateSwarmMemory({
        workspaceId: workspaceId(),
        clusterId: selectedSwarmId,
        sourceTaskId: task?.id,
        sourceNodeId: task?.assigned_node_id,
        targetNodeId: "local-browser-runtime",
        memoryType: "execution_replay",
        memory: { taskId: task?.id || null, summary: "Command-center requested replay memory replication." },
      });
      await refresh();
      setStatus("Swarm memory replicated");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function recoverSwarm() {
    if (!selectedSwarmId) return;
    setStatus("Recovering swarm cluster");
    setError("");
    try {
      await cloudOsApi.recoverSwarmCluster({ workspaceId: workspaceId(), userId: userId(), clusterId: selectedSwarmId });
      await refresh();
      setStatus("Swarm recovery completed");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function optimizeSwarm() {
    if (!selectedSwarmId) return;
    setStatus("Optimizing swarm routing");
    setError("");
    try {
      await cloudOsApi.optimizeSwarmCluster({ workspaceId: workspaceId(), clusterId: selectedSwarmId });
      await refresh();
      setStatus("Swarm optimization recommendation streamed");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function createCivilizationIdentity() {
    setStatus("Creating persistent AGI identity");
    setError("");
    try {
      await cloudOsApi.createCivilizationIdentity({
        workspaceId: workspaceId(),
        userId: userId(),
        clusterId: selectedSwarmId || undefined,
        agentName: "Civilization Strategist",
        role: "self-evolution planner",
        personality: { tone: "precise", riskPosture: "careful" },
        capabilities: ["strategy", "diagnostics", "governance", "resource_allocation"],
      });
      await refresh();
      setStatus("Persistent AGI identity created");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function learnCivilizationMemory() {
    setStatus("Recording civilization learning memory");
    setError("");
    try {
      await cloudOsApi.learnCivilizationMemory({
        workspaceId: workspaceId(),
        clusterId: selectedSwarmId || undefined,
        memoryType: "strategy",
        content: civilizationForm.goal,
        evidence: { source: "cloud-os-control-center" },
        score: 0.78,
      });
      await refresh();
      setStatus("Civilization memory learned");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function evolveCivilization() {
    setStatus("Running recursive civilization evolution");
    setError("");
    try {
      await cloudOsApi.evolveCivilization({
        workspaceId: workspaceId(),
        userId: userId(),
        clusterId: selectedSwarmId || undefined,
        goal: civilizationForm.goal,
      });
      await refresh();
      setStatus("Civilization evolution run completed");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function planCivilizationStrategy() {
    setStatus("Planning civilization strategy");
    setError("");
    try {
      await cloudOsApi.planCivilizationStrategy({
        workspaceId: workspaceId(),
        userId: userId(),
        clusterId: selectedSwarmId || undefined,
        goal: civilizationForm.goal,
      });
      await refresh();
      setStatus("Civilization strategy persisted");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function synthesizeCivilizationTool() {
    setStatus("Synthesizing runtime capability tool");
    setError("");
    try {
      await cloudOsApi.synthesizeCivilizationTool({
        workspaceId: workspaceId(),
        userId: userId(),
        clusterId: selectedSwarmId || undefined,
        name: "Civilization API Probe",
        url: civilizationForm.toolUrl,
        description: "Self-evolved API probing capability generated by the civilization runtime.",
      });
      await refresh();
      setStatus("Civilization tool synthesized");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function generateCivilizationMission() {
    setStatus("Generating autonomous civilization mission");
    setError("");
    try {
      await cloudOsApi.generateCivilizationMission({
        workspaceId: workspaceId(),
        userId: userId(),
        clusterId: selectedSwarmId || undefined,
        title: "Autonomous runtime improvement mission",
        objective: civilizationForm.goal,
        priority: 8,
      });
      await refresh();
      setStatus("Civilization mission generated");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function proposeCivilizationPolicy() {
    setStatus("Proposing governance policy");
    setError("");
    try {
      await cloudOsApi.proposeCivilizationPolicy({
        workspaceId: workspaceId(),
        userId: userId(),
        clusterId: selectedSwarmId || undefined,
        title: "Replay memory replication policy",
        policy: { requireReplayReplication: true, maxRisk: "medium", approval: "swarm_consensus" },
      });
      await refresh();
      setStatus("Governance policy proposed");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function allocateCivilizationResources() {
    setStatus("Allocating execution economy credits");
    setError("");
    try {
      await cloudOsApi.allocateCivilizationResources({
        workspaceId: workspaceId(),
        clusterId: selectedSwarmId || undefined,
        actorId: "Civilization Strategist",
        credits: 10,
        reason: "Fund autonomous optimization and diagnostics work",
      });
      await refresh();
      setStatus("Civilization economy allocation persisted");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function runCivilizationDiagnostics() {
    setStatus("Running civilization diagnostics");
    setError("");
    try {
      const data = await cloudOsApi.runCivilizationDiagnostics({ workspaceId: workspaceId(), clusterId: selectedSwarmId || undefined });
      setCivilizationDiagnostics(data.diagnostics);
      await refresh();
      setStatus("Civilization diagnostics completed");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function predictCivilizationScaling() {
    setStatus("Predicting civilization scaling");
    setError("");
    try {
      const data = await cloudOsApi.predictCivilizationScaling({ workspaceId: workspaceId(), clusterId: selectedSwarmId || undefined });
      setCivilizationPrediction(data.prediction);
      setStatus("Predictive scaling intelligence generated");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function runPlanetaryAction(action) {
    setStatus(`${action} planetary intelligence`);
    setError("");
    try {
      const payload = { workspaceId: workspaceId(), userId: userId(), clusterId: selectedSwarmId || undefined };
      if (action === "research") {
        await cloudOsApi.startPlanetaryResearch({ ...payload, title: "Predictive runtime science", hypothesis: planetaryForm.hypothesis });
      }
      if (action === "world-model") {
        await cloudOsApi.generatePlanetaryWorldModel({ ...payload, modelType: "planetary_runtime" });
      }
      if (action === "forecast") {
        await cloudOsApi.forecastPlanetaryCivilization({ ...payload, horizon: "24h" });
      }
      if (action === "anomalies") {
        await cloudOsApi.detectPlanetaryAnomalies(payload);
      }
      if (action === "rank") {
        await cloudOsApi.rankPlanetaryIntelligence(payload);
      }
      if (action === "capability") {
        await cloudOsApi.listPlanetaryCapability({ ...payload, capability: "planetary.api_probe", providerRef: "Civilization Strategist", priceCredits: 2, metadata: { url: planetaryForm.url } });
      }
      if (action === "replicate") {
        await cloudOsApi.replicatePlanetaryRuntime({ ...payload, sourceRef: "Civilization Strategist", targetRef: "Planetary Clone", replicationType: "agent_clone" });
      }
      if (action === "mutation") {
        await cloudOsApi.mutationTestPlanetaryRuntime({ ...payload, url: planetaryForm.url });
      }
      await refresh();
      setStatus(`Planetary ${action} completed`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function runCosmosAction(action) {
    setStatus(`${action} cosmos intelligence`);
    setError("");
    try {
      let universeId = selectedUniverseId;
      if (action === "create") {
        const data = await cloudOsApi.createCosmosUniverse({
          workspaceId: workspaceId(),
          userId: userId(),
          clusterId: selectedSwarmId || undefined,
          name: cosmosForm.name,
          objective: cosmosForm.objective,
        });
        universeId = data.universe.id;
        setSelectedUniverseId(universeId);
      }
      if (!universeId && action !== "create") {
        setError("Create or select a cosmos universe first.");
        setStatus("");
        return;
      }
      const base = { workspaceId: workspaceId(), universeId };
      if (action === "civilization") {
        await cloudOsApi.generateCosmosCivilization({ ...base, name: "Synthetic Explorer Civilization", archetype: "scientific_explorer", traits: { curiosity: 0.92, caution: 0.74 } });
      }
      if (action === "simulate") {
        await cloudOsApi.simulateCosmosUniverse({ ...base, horizon: "30d" });
      }
      if (action === "research") {
        await cloudOsApi.optimizeCosmosResearch({ ...base, userId: userId(), title: "Recursive cosmos research", hypothesis: cosmosForm.hypothesis });
      }
      if (action === "knowledge") {
        await cloudOsApi.synthesizeCosmosKnowledge({ ...base, content: cosmosForm.hypothesis, inheritance: { source: "cloud-os-control-center", selectedSwarmId } });
      }
      if (action === "policy") {
        await cloudOsApi.evolveCosmosPolicy({ ...base, userId: userId(), title: "Cosmos runtime safety policy", policy: { mutationTesting: true, consensusRequired: true, maxRisk: "medium" } });
      }
      if (action === "risk") {
        await cloudOsApi.forecastCosmosRisk({ ...base, horizon: "90d" });
      }
      if (action === "mutation") {
        await cloudOsApi.mutateCosmosInfrastructure({ ...base, targetRef: "cosmos-runtime", url: cosmosForm.url });
      }
      if (action === "diplomacy") {
        await cloudOsApi.sendCosmosDiplomacy({ ...base, fromRef: "CODRAI Cosmos", toRef: "Planetary Network", protocol: "agi_to_agi_coordination", payload: { objective: cosmosForm.objective } });
      }
      await refresh();
      setStatus(`Cosmos ${action} completed`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function teamMessage(teamId) {
    setStatus("Sending team message");
    setError("");
    try {
      await cloudOsApi.sendTeamMessage({
        workspaceId: workspaceId(),
        userId: userId(),
        teamId,
        fromAgent: "CEO Agent",
        toAgent: "Planner Agent",
        content: "Review current execution state and propose the next highest-impact action.",
      });
      setStatus("Team message persisted");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  useEffect(() => {
    refresh();
    loadInfrastructure();
    loadFederation();
    loadCivilizationNetwork();
    loadMetaIntelligence();
    loadSuperintelligence();
    loadQuantum();
    loadProduction();
    connectRealtime(`workspace:${workspaceId()}`);
  }, []);

  return (
    <section className="glass-card overflow-hidden rounded-lg">
      <div className="border-b border-white/10 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Cloud AI Operating System</p>
            <h2 className="mt-2 text-2xl font-black text-white">Runtime, memory, teams, deployment</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
              This control center is backed by runtime heartbeats, deployment persistence, team records, memory search, and realtime workspace events.
            </p>
          </div>
          <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={refresh}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
        {status && <p className="mt-3 text-sm text-codrai-cyan">{status}</p>}
        {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-2">
        <Panel icon={Server} title="Infrastructure Watchdog">
          <div className="grid gap-3 sm:grid-cols-4">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{infrastructure?.status || "checking"}</p>
              <p className="mt-2 text-xs text-white/45">runtime status</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{infrastructure?.readinessScore ?? 0}%</p>
              <p className="mt-2 text-xs text-white/45">readiness</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{infrastructure?.checks?.postgres?.status || "unknown"}</p>
              <p className="mt-2 text-xs text-white/45">PostgreSQL</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{infrastructure?.checks?.redis?.status || "unknown"}</p>
              <p className="mt-2 text-xs text-white/45">Redis</p>
            </article>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={loadInfrastructure}>Diagnose</button>
            <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={() => recoverInfrastructure(false)}>Recover</button>
            <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => recoverInfrastructure(true)}>Recover + Migrate</button>
            <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={verifyInfrastructure}>Verify</button>
          </div>
          <div className="mt-4 space-y-2">
            {(infrastructure?.recommendations || []).slice(0, 4).map((item) => (
              <p key={item} className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">{item}</p>
            ))}
          </div>
          <p className="mt-4 text-xs text-white/45">
            Realtime buffer: {infrastructure?.checks?.realtimeEvents?.bufferedEvents || 0} events · Docker {infrastructure?.checks?.docker?.available ? "available" : "missing"}
          </p>
        </Panel>

        <Panel icon={Network} title="AGI Federation Command Center">
          <div className="grid gap-2">
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={federationForm.name} onChange={(event) => setFederationForm({ ...federationForm, name: event.target.value })} />
            <textarea className="min-h-20 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={federationForm.objective} onChange={(event) => setFederationForm({ ...federationForm, objective: event.target.value })} />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <select className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={selectedFederationId} onChange={(event) => setSelectedFederationId(event.target.value)}>
                <option className="bg-slate-950" value="">Select federation</option>
                {(federation.federations || []).map((item) => <option className="bg-slate-950" key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={createFederation}>Create</button>
              <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={registerFederationNode}>Register Node</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runFederationAction("sync")}>Sync Cognition</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runFederationAction("route")}>Route Workload</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runFederationAction("supervise")}>Supervise</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runFederationAction("readiness")}>Readiness</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={loadFederation}>Refresh</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{federation.analytics?.federations || 0}</p>
              <p className="mt-2 text-xs text-white/45">federations</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{federation.analytics?.onlineNodes || 0}/{federation.analytics?.nodes || 0}</p>
              <p className="mt-2 text-xs text-white/45">online nodes</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{Number(federation.analytics?.avgHealth || 0).toFixed(2)}</p>
              <p className="mt-2 text-xs text-white/45">avg health</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{federation.analytics?.cognitionEvents || 0}</p>
              <p className="mt-2 text-xs text-white/45">cognition syncs</p>
            </article>
          </div>
          {federation.error && <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">{federation.error}</p>}
          <div className="mt-4 space-y-2">
            {(federation.nodes || []).slice(0, 4).map((node) => (
              <article key={node.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{node.node_role}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{node.status}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">health {node.health_score} - load {node.load_score} - {(node.capabilities || []).join(", ")}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={GitBranch} title="Recursive AGI Civilization Network">
          <div className="grid gap-2">
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={civilizationNetworkForm.name} onChange={(event) => setCivilizationNetworkForm({ ...civilizationNetworkForm, name: event.target.value })} />
            <textarea className="min-h-20 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={civilizationNetworkForm.objective} onChange={(event) => setCivilizationNetworkForm({ ...civilizationNetworkForm, objective: event.target.value })} />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <select className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={selectedCivilizationId} onChange={(event) => setSelectedCivilizationId(event.target.value)}>
                <option className="bg-slate-950" value="">Select civilization</option>
                {(civilizationNetwork.civilizations || []).map((item) => <option className="bg-slate-950" key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={createCivilizationNetwork}>Create</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={() => runCivilizationNetworkAction("lifecycle")}>Lifecycle</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runCivilizationNetworkAction("evolve")}>Evolve</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runCivilizationNetworkAction("contract")}>Contract</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runCivilizationNetworkAction("arbitrate")}>Arbitrate</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runCivilizationNetworkAction("governance")}>Govern</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runCivilizationNetworkAction("mutation")}>Mutate</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={loadCivilizationNetwork}>Refresh</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{civilizationNetwork.analytics?.civilizations || 0}</p>
              <p className="mt-2 text-xs text-white/45">civilizations</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{Number(civilizationNetwork.analytics?.avgIntelligence || 0).toFixed(2)}</p>
              <p className="mt-2 text-xs text-white/45">intelligence</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{Number(civilizationNetwork.analytics?.avgGovernance || 0).toFixed(2)}</p>
              <p className="mt-2 text-xs text-white/45">governance</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{civilizationNetwork.analytics?.graphEdges || 0}</p>
              <p className="mt-2 text-xs text-white/45">evolution edges</p>
            </article>
          </div>
          {civilizationNetwork.error && <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">{civilizationNetwork.error}</p>}
          <div className="mt-4 space-y-2">
            {(civilizationNetwork.observability?.heatmap || []).slice(0, 4).map((item) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{item.label}</p>
                  <span className="rounded-full bg-codrai-cyan/15 px-2 py-1 text-xs text-codrai-cyan">heat {item.heat}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">intelligence {item.intelligence} - governance {item.governance}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Cpu} title="Meta Intelligence Command Center">
          <div className="grid gap-2">
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={metaForm.name} onChange={(event) => setMetaForm({ ...metaForm, name: event.target.value })} />
            <textarea className="min-h-20 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={metaForm.objective} onChange={(event) => setMetaForm({ ...metaForm, objective: event.target.value })} />
            <textarea className="min-h-16 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={metaForm.hypothesis} onChange={(event) => setMetaForm({ ...metaForm, hypothesis: event.target.value })} />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <select className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={selectedMetaCoreId} onChange={(event) => setSelectedMetaCoreId(event.target.value)}>
                <option className="bg-slate-950" value="">Select meta core</option>
                {(metaIntelligence.cores || []).map((item) => <option className="bg-slate-950" key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={createMetaCore}>Create</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={() => runMetaAction("reflect")}>Reflect</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runMetaAction("planetary")}>Planetary Node</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runMetaAction("genome")}>Genome</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runMetaAction("memory")}>Memory</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runMetaAction("economy")}>Exchange</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runMetaAction("research")}>Research</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={loadMetaIntelligence}>Refresh</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{metaIntelligence.analytics?.cores || 0}</p><p className="mt-2 text-xs text-white/45">meta cores</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{Number(metaIntelligence.analytics?.avgConvergence || 0).toFixed(2)}</p><p className="mt-2 text-xs text-white/45">convergence</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{metaIntelligence.analytics?.planetaryNodes || 0}</p><p className="mt-2 text-xs text-white/45">planetary nodes</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{metaIntelligence.analytics?.researchPrograms || 0}</p><p className="mt-2 text-xs text-white/45">research programs</p></article>
          </div>
          {metaIntelligence.error && <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">{metaIntelligence.error}</p>}
          <div className="mt-4 space-y-2">
            {(metaIntelligence.heatmap || []).slice(0, 4).map((item) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{item.label}</p>
                  <span className="rounded-full bg-codrai-cyan/15 px-2 py-1 text-xs text-codrai-cyan">heat {item.heat}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">convergence {item.convergence} - anomalies {item.anomalies}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Rocket} title="Mission Control">
          <div className="grid gap-2">
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={missionForm.title} onChange={(event) => setMissionForm({ ...missionForm, title: event.target.value })} />
            <textarea className="min-h-20 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={missionForm.objective} onChange={(event) => setMissionForm({ ...missionForm, objective: event.target.value })} />
            <div className="flex gap-2">
              <select className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={missionForm.mode} onChange={(event) => setMissionForm({ ...missionForm, mode: event.target.value })}>
                <option className="bg-slate-950" value="cycle">Cycle</option>
                <option className="bg-slate-950" value="orchestrator">Orchestrator</option>
              </select>
              <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={startMission}>Launch</button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {missions.slice(0, 3).map((mission) => (
              <article key={mission.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-bold text-white">{mission.title}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{mission.status}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">{mission.current_checkpoint || "queued"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-white" type="button" onClick={() => missionAction(mission.id, "pause")}>Pause</button>
                  <button className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-white" type="button" onClick={() => missionAction(mission.id, "resume")}>Resume</button>
                  <button className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-white" type="button" onClick={() => missionAction(mission.id, "replay")}>Replay</button>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/40">Graph: {missionGraph.nodes.length} missions, {missionGraph.edges.length} dependencies</p>
        </Panel>

        <Panel icon={Globe} title="Realtime Knowledge">
          <div className="flex gap-2">
            <input className="h-10 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={knowledgeUrl} onChange={(event) => setKnowledgeUrl(event.target.value)} />
            <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={ingestKnowledge}>Ingest</button>
          </div>
          <div className="mt-4 space-y-2">
            {knowledgeSources.slice(0, 3).map((source) => (
              <article key={source.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="line-clamp-1 text-sm font-bold text-white">{source.title || source.url}</p>
                <p className="mt-2 line-clamp-2 text-xs text-white/45">{source.summary || source.status}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={RadioTower} title="Internet Execution Cloud">
          <div className="grid gap-2">
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={internetForm.startUrl} onChange={(event) => setInternetForm({ ...internetForm, startUrl: event.target.value })} />
            <textarea className="min-h-20 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={internetForm.objective} onChange={(event) => setInternetForm({ ...internetForm, objective: event.target.value })} />
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={startInternetExecution}>
              <Play className="h-4 w-4" /> Execute Internet Mission
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {internetSessions.slice(0, 4).map((session) => (
              <article key={session.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-bold text-white">{session.objective}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{session.status}</span>
                </div>
                <p className="mt-2 line-clamp-1 text-xs text-white/45">{session.start_url}</p>
                <button className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-white" type="button" onClick={() => replayInternetExecution(session.id)}>
                  <RotateCcw className="h-3 w-3" /> Replay
                </button>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Activity} title="Runtime Telemetry Stream">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={recordTelemetryPing}>Record Ping</button>
            <span className={`rounded-full px-2 py-1 text-xs ${realtimeConnected ? "bg-codrai-cyan/15 text-codrai-cyan" : "bg-white/10 text-white/45"}`}>
              {realtimeConnected ? "socket live" : "socket connecting"}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {telemetry.slice(0, 4).map((item) => (
              <article key={item.metric} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-bold text-white">{item.metric}</p>
                <p className="mt-2 text-xs text-white/45">{item.samples} samples - avg {item.avg_value}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {realtimeEvents.slice(0, 4).map((event, index) => (
              <article key={event.id || `${event.type}-${event.createdAt || event.created_at || index}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-bold text-white">{event.type}</p>
                <p className="mt-1 text-xs text-white/40">{new Date(event.createdAt).toLocaleTimeString()}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Server} title="Distributed Runtime">
          <button className="mb-4 inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={heartbeat}>
            <Activity className="h-4 w-4" /> Heartbeat Local Node
          </button>
          <div className="space-y-2">
            {nodes.map((node) => (
              <article key={node.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{node.node_name}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{node.status}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">health {node.health_score} · load {node.load_score}</p>
                <p className="mt-1 text-xs text-white/35">{(node.capabilities || []).join(", ")}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={GitBranch} title="Distributed Execution Fabric">
          <div className="grid gap-2">
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={distributedForm.startUrl} onChange={(event) => setDistributedForm({ ...distributedForm, startUrl: event.target.value })} />
            <textarea className="min-h-20 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={distributedForm.objective} onChange={(event) => setDistributedForm({ ...distributedForm, objective: event.target.value })} />
            <div className="flex flex-wrap gap-2">
              <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={() => scheduleDistributedInternetTask(false)}>Schedule</button>
              <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={() => scheduleDistributedInternetTask(true)}>Schedule + Run</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={recoverDistributedRuntime}>Recover</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={calculateScalingDecision}>Scale Check</button>
            </div>
          </div>
          {scalingDecision && (
            <div className="mt-4 rounded-lg border border-codrai-cyan/20 bg-codrai-cyan/10 p-3 text-xs text-codrai-cyan">
              {scalingDecision.decision}: {scalingDecision.reason}
            </div>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {(executionAnalytics.summary || []).map((item) => (
              <article key={item.status} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-bold text-white">{item.status}</p>
                <p className="mt-2 text-xs text-white/45">{item.count} tasks</p>
              </article>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {distributedTasks.slice(0, 4).map((task) => (
              <article key={task.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-white">{task.task_type}</p>
                    <p className="mt-1 text-xs text-white/40">{task.assigned_node_id || "unassigned"} - priority {task.priority}</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{task.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="rounded-lg bg-white px-2 py-1 text-xs font-black text-slate-950" type="button" onClick={() => executeDistributedTask(task.id)}>Run</button>
                  <button className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-white" type="button" onClick={() => executionCommand(task.id, "retry")}>Retry</button>
                  <button className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-white" type="button" onClick={() => executionCommand(task.id, "cancel")}>Cancel</button>
                  <button className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-white" type="button" onClick={() => executionCommand(task.id, "snapshot")}>Snapshot</button>
                  <button className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-white" type="button" onClick={() => loadExecutionTimeline(task.id)}>Timeline</button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {executionTimeline.slice(0, 5).map((event) => (
              <article key={event.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-bold text-white">{event.event_type}</p>
                <p className="mt-1 text-xs text-white/40">{new Date(event.created_at).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Network} title="Global AGI Swarm Mesh">
          <div className="grid gap-2">
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={swarmForm.name} onChange={(event) => setSwarmForm({ ...swarmForm, name: event.target.value })} />
            <textarea className="min-h-20 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={swarmForm.objective} onChange={(event) => setSwarmForm({ ...swarmForm, objective: event.target.value })} />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <select className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={selectedSwarmId} onChange={(event) => setSelectedSwarmId(event.target.value)}>
                <option className="bg-slate-950" value="">Select swarm</option>
                {swarmClusters.map((cluster) => <option className="bg-slate-950" key={cluster.id} value={cluster.id}>{cluster.name}</option>)}
              </select>
              <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={createSwarmCluster}>Create</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={negotiateLocalSwarmNode}>Negotiate Node</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={federateSwarmBrowserTasks}>Federate</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={runSwarmConsensus}>Consensus</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={sendSwarmCoordinationMessage}>Message</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={replicateSwarmMemory}>Replicate</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={recoverSwarm}>Recover</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={optimizeSwarm}>Optimize</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{swarmTopology.nodes?.length || 0}</p>
              <p className="mt-2 text-xs text-white/45">mesh nodes</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{swarmTopology.edges?.length || 0}</p>
              <p className="mt-2 text-xs text-white/45">topology edges</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{swarmAnalytics.queuedTasks || 0}</p>
              <p className="mt-2 text-xs text-white/45">queued tasks</p>
            </article>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(swarmAnalytics.heatmap || []).slice(0, 4).map((node) => (
              <article key={node.nodeId} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-bold text-white">{node.nodeId}</p>
                  <span className="rounded-full bg-codrai-cyan/15 px-2 py-1 text-xs text-codrai-cyan">heat {node.heat}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">health {node.health} - load {node.load} - {node.role}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {swarmEvents.slice(0, 5).map((event) => (
              <article key={event.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-bold text-white">{event.event_type}</p>
                <p className="mt-1 text-xs text-white/40">{new Date(event.created_at).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Cpu} title="Self-Evolving Civilization OS">
          <div className="grid gap-2">
            <textarea className="min-h-20 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={civilizationForm.goal} onChange={(event) => setCivilizationForm({ ...civilizationForm, goal: event.target.value })} />
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={civilizationForm.toolUrl} onChange={(event) => setCivilizationForm({ ...civilizationForm, toolUrl: event.target.value })} />
            <div className="flex flex-wrap gap-2">
              <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={createCivilizationIdentity}>Identity</button>
              <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={evolveCivilization}>Evolve</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={planCivilizationStrategy}>Strategy</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={learnCivilizationMemory}>Learn</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={synthesizeCivilizationTool}>Tool</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={generateCivilizationMission}>Mission</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={proposeCivilizationPolicy}>Policy</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={allocateCivilizationResources}>Credits</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={runCivilizationDiagnostics}>Diagnostics</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={predictCivilizationScaling}>Predict</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{civilization.identities?.length || 0}</p>
              <p className="mt-2 text-xs text-white/45">agent identities</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{civilization.memories?.length || 0}</p>
              <p className="mt-2 text-xs text-white/45">learning memories</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{civilization.edges?.length || 0}</p>
              <p className="mt-2 text-xs text-white/45">cognition edges</p>
            </article>
          </div>
          {(civilizationDiagnostics || civilizationPrediction) && (
            <div className="mt-4 rounded-lg border border-codrai-cyan/20 bg-codrai-cyan/10 p-3">
              {civilizationDiagnostics && <p className="text-xs text-codrai-cyan">Diagnostics: {civilizationDiagnostics.status} - {civilizationDiagnostics.findings?.length || 0} findings</p>}
              {civilizationPrediction && <p className="mt-1 text-xs text-codrai-cyan">Scaling: {civilizationPrediction.action} - confidence {civilizationPrediction.confidence}</p>}
            </div>
          )}
          <div className="mt-4 space-y-2">
            {(civilization.runs || []).slice(0, 3).map((run) => (
              <article key={run.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{run.run_type}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{run.status}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">{run.outputs?.strategyId || run.inputs?.goal || "pending"}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Globe} title="Planetary Superintelligence Network">
          <div className="grid gap-2">
            <textarea className="min-h-20 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={planetaryForm.hypothesis} onChange={(event) => setPlanetaryForm({ ...planetaryForm, hypothesis: event.target.value })} />
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={planetaryForm.url} onChange={(event) => setPlanetaryForm({ ...planetaryForm, url: event.target.value })} />
            <div className="flex flex-wrap gap-2">
              <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={() => runPlanetaryAction("research")}>Research</button>
              <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={() => runPlanetaryAction("world-model")}>World Model</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runPlanetaryAction("forecast")}>Forecast</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runPlanetaryAction("anomalies")}>Anomalies</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runPlanetaryAction("rank")}>Rank</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runPlanetaryAction("capability")}>Market</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runPlanetaryAction("replicate")}>Replicate</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runPlanetaryAction("mutation")}>Mutation Test</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{planetaryAnalytics.worldModels || 0}</p>
              <p className="mt-2 text-xs text-white/45">world models</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{planetaryAnalytics.openAnomalies || 0}</p>
              <p className="mt-2 text-xs text-white/45">open anomalies</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{Number(planetaryAnalytics.latestRiskScore || 0).toFixed(2)}</p>
              <p className="mt-2 text-xs text-white/45">latest risk</p>
            </article>
          </div>
          <div className="mt-4 space-y-2">
            {(planetary.events || []).slice(0, 4).map((event) => (
              <article key={event.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-bold text-white">{event.event_type}</p>
                <p className="mt-1 text-xs text-white/40">{new Date(event.created_at).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Network} title="Multi-Planetary AGI Cosmos OS">
          <div className="grid gap-2">
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={cosmosForm.name} onChange={(event) => setCosmosForm({ ...cosmosForm, name: event.target.value })} />
            <textarea className="min-h-20 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={cosmosForm.objective} onChange={(event) => setCosmosForm({ ...cosmosForm, objective: event.target.value })} />
            <textarea className="min-h-16 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={cosmosForm.hypothesis} onChange={(event) => setCosmosForm({ ...cosmosForm, hypothesis: event.target.value })} />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <select className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={selectedUniverseId} onChange={(event) => setSelectedUniverseId(event.target.value)}>
                <option className="bg-slate-950" value="">Select universe</option>
                {(cosmos.universes || []).map((universe) => <option className="bg-slate-950" key={universe.id} value={universe.id}>{universe.name}</option>)}
              </select>
              <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={() => runCosmosAction("create")}>Create</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={() => runCosmosAction("simulate")}>Simulate</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runCosmosAction("civilization")}>Synthetic Civ</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runCosmosAction("research")}>Research</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runCosmosAction("knowledge")}>Synthesize</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runCosmosAction("policy")}>Policy</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runCosmosAction("risk")}>Risk</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runCosmosAction("mutation")}>Mutation</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runCosmosAction("diplomacy")}>Diplomacy</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{cosmosAnalytics.universes || 0}</p>
              <p className="mt-2 text-xs text-white/45">universes</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{cosmosAnalytics.syntheticCivilizations || 0}</p>
              <p className="mt-2 text-xs text-white/45">synthetic civilizations</p>
            </article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white">{Number(cosmosAnalytics.latestRisk || 0).toFixed(2)}</p>
              <p className="mt-2 text-xs text-white/45">cosmos risk</p>
            </article>
          </div>
          <div className="mt-4 space-y-2">
            {(cosmos.events || []).slice(0, 4).map((event) => (
              <article key={event.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-bold text-white">{event.event_type}</p>
                <p className="mt-1 text-xs text-white/40">{new Date(event.created_at).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Cpu} title="Superintelligence Mesh Command Center">
          <div className="grid gap-2">
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={superForm.name} onChange={(event) => setSuperForm({ ...superForm, name: event.target.value })} />
            <textarea className="min-h-20 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={superForm.objective} onChange={(event) => setSuperForm({ ...superForm, objective: event.target.value })} />
            <textarea className="min-h-16 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={superForm.hypothesis} onChange={(event) => setSuperForm({ ...superForm, hypothesis: event.target.value })} />
            <textarea className="min-h-16 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={superForm.scenario} onChange={(event) => setSuperForm({ ...superForm, scenario: event.target.value })} />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <select className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={selectedMeshId} onChange={(event) => setSelectedMeshId(event.target.value)}>
                <option className="bg-slate-950" value="">Select mesh</option>
                {(superintelligence.meshes || []).map((mesh) => <option className="bg-slate-950" key={mesh.id} value={mesh.id}>{mesh.name}</option>)}
              </select>
              <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={createSuperintelligenceMesh}>Create</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={() => runSuperintelligenceAction("fuse")}>Fuse</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runSuperintelligenceAction("species")}>Species</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runSuperintelligenceAction("science")}>Science</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runSuperintelligenceAction("route")}>Route</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runSuperintelligenceAction("simulate")}>Simulate</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runSuperintelligenceAction("govern")}>Govern</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runSuperintelligenceAction("memory")}>Memory</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runSuperintelligenceAction("economy")}>Market</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={loadSuperintelligence}>Refresh</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{superintelligence.analytics?.meshes || 0}</p><p className="mt-2 text-xs text-white/45">meshes</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{Number(superintelligence.analytics?.avgConvergence || 0).toFixed(2)}</p><p className="mt-2 text-xs text-white/45">convergence</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{superintelligence.analytics?.species || 0}</p><p className="mt-2 text-xs text-white/45">species</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{superintelligence.analytics?.sciencePrograms || 0}</p><p className="mt-2 text-xs text-white/45">science programs</p></article>
          </div>
          {superintelligence.error && <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">{superintelligence.error}</p>}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(superintelligence.heatmap || []).slice(0, 4).map((item) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{item.label}</p>
                  <span className="rounded-full bg-codrai-cyan/15 px-2 py-1 text-xs text-codrai-cyan">{Number(item.amplification || 0).toFixed(2)}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">heat {Number(item.heat || 0).toFixed(2)} · anomalies {item.anomalies || 0}</p>
              </article>
            ))}
            {(superintelligence.events || []).slice(0, 4).map((event) => (
              <article key={event.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-bold text-white">{event.event_type}</p>
                <p className="mt-1 text-xs text-white/40">{new Date(event.created_at).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Network} title="Quantum Cognition Command Center">
          <div className="grid gap-2">
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={quantumForm.fieldName} onChange={(event) => setQuantumForm({ ...quantumForm, fieldName: event.target.value })} />
            <textarea className="min-h-20 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={quantumForm.objective} onChange={(event) => setQuantumForm({ ...quantumForm, objective: event.target.value })} />
            <textarea className="min-h-16 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={quantumForm.reflection} onChange={(event) => setQuantumForm({ ...quantumForm, reflection: event.target.value })} />
            <textarea className="min-h-16 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={quantumForm.scenario} onChange={(event) => setQuantumForm({ ...quantumForm, scenario: event.target.value })} />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <select className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={selectedQuantumFieldId} onChange={(event) => setSelectedQuantumFieldId(event.target.value)}>
                <option className="bg-slate-950" value="">Select quantum field</option>
                {(quantum.fields || []).map((field) => <option className="bg-slate-950" key={field.id} value={field.id}>{field.field_name}</option>)}
              </select>
              <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={createQuantumField}>Create</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={() => runQuantumAction("harmonize")}>Harmonize</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runQuantumAction("consciousness")}>Consciousness</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runQuantumAction("simulate")}>Simulate</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runQuantumAction("federate")}>Federate</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runQuantumAction("govern")}>Govern</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runQuantumAction("memory")}>Memory</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runQuantumAction("economy")}>Economy</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={loadQuantum}>Refresh</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{quantum.analytics?.fields || 0}</p><p className="mt-2 text-xs text-white/45">fields</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{Number(quantum.analytics?.avgCoherence || 0).toFixed(2)}</p><p className="mt-2 text-xs text-white/45">coherence</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{quantum.analytics?.consciousnessLoops || 0}</p><p className="mt-2 text-xs text-white/45">awareness loops</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{quantum.analytics?.simulations || 0}</p><p className="mt-2 text-xs text-white/45">universes</p></article>
          </div>
          {quantum.error && <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">{quantum.error}</p>}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(quantum.heatmap || []).slice(0, 4).map((item) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{item.label}</p>
                  <span className="rounded-full bg-codrai-cyan/15 px-2 py-1 text-xs text-codrai-cyan">{Number(item.coherence || 0).toFixed(2)}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">harmonization {Number(item.harmonization || 0).toFixed(2)} · heat {Number(item.heat || 0).toFixed(2)}</p>
              </article>
            ))}
            {(quantum.events || []).slice(0, 4).map((event) => (
              <article key={event.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-bold text-white">{event.event_type}</p>
                <p className="mt-1 text-xs text-white/40">{new Date(event.created_at).toLocaleString()}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/50">Synthetic Consciousness Observatory · Autonomous Consciousness Monitor</p>
            <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/50">Multiversal Simulation Matrix · Recursive Timeline Observatory</p>
            <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/50">Quantum Governance Nexus · Dimensional Federation Grid</p>
            <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/50">Hyper Memory Fabric Center · Quantum Intelligence Economy Exchange · Universal Topology Matrix</p>
          </div>
        </Panel>

        <Panel icon={ShieldCheck} title="Production Infrastructure Center">
          <div className="grid gap-2">
            <textarea className="min-h-16 rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none" value={productionForm.objective} onChange={(event) => setProductionForm({ ...productionForm, objective: event.target.value })} />
            <div className="flex flex-wrap gap-2">
              <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={() => runProductionAction("activate")}>Activate</button>
              <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={() => runProductionAction("verify")}>Verify</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runProductionAction("recover")}>Recover</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runProductionAction("evolve")}>Evolve</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runProductionAction("checkpoint")}>Checkpoint</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runProductionAction("scale")}>Scale</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runProductionAction("security")}>Harden</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={loadProduction}>Refresh</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{production.diagnostics?.status || "checking"}</p><p className="mt-2 text-xs text-white/45">production state</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{production.diagnostics?.readinessScore ?? 0}%</p><p className="mt-2 text-xs text-white/45">readiness</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{production.queue?.status || "unknown"}</p><p className="mt-2 text-xs text-white/45">queue</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{production.activationRuns?.[0]?.status || "none"}</p><p className="mt-2 text-xs text-white/45">activation</p></article>
          </div>
          {production.error && <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">{production.error}</p>}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/50">Distributed Agent Orchestrator · Distributed Queue Monitor · Autonomous Scaling Center</p>
            <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/50">Runtime Recovery Matrix · Persistence Observatory · Infrastructure Integrity Nexus</p>
            <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/50">Runtime Mutation Observatory · Deployment Diagnostics Center · Self-Evolution Analytics Matrix</p>
            <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/50">PostgreSQL {production.diagnostics?.checks?.postgres?.status || "unknown"} · Redis {production.diagnostics?.checks?.redis?.status || "unknown"} · WebSocket {production.diagnostics?.checks?.websocket?.status || "unknown"}</p>
          </div>
          <div className="mt-4 space-y-2">
            {(production.events || []).slice(0, 4).map((event) => (
              <article key={event.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{event.event_type}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{event.severity}</span>
                </div>
                <p className="mt-1 text-xs text-white/40">{new Date(event.created_at).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Server} title="Production Orchestration Center">
          <div className="flex flex-wrap gap-2">
            <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={() => runProductionAction("coordinate")}>Coordinate</button>
            <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={() => runProductionAction("worker")}>Schedule Worker</button>
            <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runProductionAction("status-infra")}>Infra Status</button>
            <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runProductionAction("start-infra")}>Start Infra</button>
            <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runProductionAction("restart-infra")}>Restart Infra</button>
            <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={loadProduction}>Refresh Metrics</button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{productionMetrics.summary?.onlineNodes || 0}</p><p className="mt-2 text-xs text-white/45">online workers</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{productionMetrics.summary?.scheduled || 0}</p><p className="mt-2 text-xs text-white/45">scheduled tasks</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{productionMetrics.summary?.routingMode || "unknown"}</p><p className="mt-2 text-xs text-white/45">routing</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{productionMetrics.queue?.status || "unknown"}</p><p className="mt-2 text-xs text-white/45">queue state</p></article>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">Infrastructure health map</p>
              <div className="mt-3 grid gap-2">
                {(production.dependencyGraph?.nodes || []).map((node) => (
                  <div key={node.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs">
                    <span className="font-bold text-white">{node.label}</span>
                    <span className="text-white/50">{node.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">Runtime topology</p>
              <div className="mt-3 space-y-2">
                {(productionMetrics.nodes || []).slice(0, 5).map((node) => (
                  <article key={node.id} className="rounded-lg bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-white">{node.node_name || node.id}</p>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{node.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/45">load {Number(node.load_score || 0).toFixed(2)} · health {Number(node.health_score || 0).toFixed(2)}</p>
                  </article>
                ))}
                {(productionMetrics.nodes || []).length === 0 && <p className="rounded-lg bg-white/[0.04] p-3 text-xs text-white/45">No distributed workers registered yet.</p>}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {(production.orchestrationDecisions || []).slice(0, 4).map((decision) => (
              <article key={decision.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{decision.decision}</p>
                  <span className="rounded-full bg-codrai-cyan/15 px-2 py-1 text-xs text-codrai-cyan">{decision.decision_type}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">{decision.reason}</p>
              </article>
            ))}
            {(production.lifecycleActions || []).slice(0, 3).map((action) => (
              <article key={action.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-bold text-white">{action.service_name} · {action.action}</p>
                <p className="mt-2 text-xs text-white/45">{action.status}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Network} title="Global Execution Grid Center">
          <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={gridForm.workerName} onChange={(event) => setGridForm({ ...gridForm, workerName: event.target.value })} />
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={gridForm.requiredCapability} onChange={(event) => setGridForm({ ...gridForm, requiredCapability: event.target.value })} />
            <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={() => runGridAction("register")}>Register Worker</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={() => runGridAction("route")}>Route Workload</button>
            <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runGridAction("containers")}>Container Status</button>
            <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runGridAction("memory")}>Sync Memory</button>
            <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runGridAction("recover")}>Recover Grid</button>
            <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runGridAction("audit")}>Audit Grid</button>
            <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={loadGlobalGrid}>Refresh Grid</button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{globalGrid.status || "checking"}</p><p className="mt-2 text-xs text-white/45">grid state</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{globalGrid.workers?.length || 0}</p><p className="mt-2 text-xs text-white/45">worker health</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{globalGrid.metrics?.summary?.routingMode || "unknown"}</p><p className="mt-2 text-xs text-white/45">intelligent execution routing</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{globalGrid.metrics?.queue?.status || "unknown"}</p><p className="mt-2 text-xs text-white/45">execution queue management</p></article>
          </div>
          {globalGrid.error && <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">{globalGrid.error}</p>}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">live node topology</p>
              <div className="mt-3 space-y-2">
                {(globalGrid.topology?.nodes || []).slice(0, 7).map((node) => (
                  <article key={node.id} className="rounded-lg bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-white">{node.label || node.id}</p>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{node.status || node.type}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/45">{node.type || "node"} {node.healthScore !== undefined ? `· health ${Number(node.healthScore || 0).toFixed(2)}` : ""}</p>
                  </article>
                ))}
                {(globalGrid.topology?.nodes || []).length === 0 && <p className="rounded-lg bg-white/[0.04] p-3 text-xs text-white/45">No grid topology records are persisted yet.</p>}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">execution heatmap</p>
              <div className="mt-3 grid gap-2">
                {(globalGrid.dependencyGraph?.nodes || []).map((node) => (
                  <div key={node.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs">
                    <span className="font-bold text-white">{node.label}</span>
                    <span className="text-white/50">{node.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">container states</p>
              <div className="mt-3 space-y-2">
                {(globalGrid.containerEvents || []).slice(0, 4).map((event) => (
                  <article key={event.id} className="rounded-lg bg-white/[0.04] p-3">
                    <p className="text-sm font-bold text-white">{event.action} · {event.status}</p>
                    <p className="mt-1 text-xs text-white/45">{event.container_ref || event.detail?.reason || "container runtime check"}</p>
                  </article>
                ))}
                {(globalGrid.containerEvents || []).length === 0 && <p className="rounded-lg bg-white/[0.04] p-3 text-xs text-white/45">Docker runtime has not recorded container state yet.</p>}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">memory synchronization monitor</p>
              <div className="mt-3 space-y-2">
                {(globalGrid.memorySync || []).slice(0, 4).map((memory) => (
                  <article key={memory.id} className="rounded-lg bg-white/[0.04] p-3">
                    <p className="text-sm font-bold text-white">{memory.memory_type}</p>
                    <p className="mt-1 text-xs text-white/45">score {Number(memory.sync_score || 0).toFixed(2)} · {new Date(memory.created_at).toLocaleString()}</p>
                  </article>
                ))}
                {(globalGrid.memorySync || []).length === 0 && <p className="rounded-lg bg-white/[0.04] p-3 text-xs text-white/45">No distributed cognition memory sync has been persisted yet.</p>}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/50">orchestration metrics · scheduled {globalGrid.metrics?.summary?.scheduled || 0} · running {globalGrid.metrics?.summary?.running || 0}</p>
            <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/50">infrastructure lifecycle controls · PostgreSQL {globalGrid.diagnostics?.checks?.postgres?.status || "unknown"} · Redis {globalGrid.diagnostics?.checks?.redis?.status || "unknown"}</p>
            <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/50">realtime execution streams · WebSocket {globalGrid.diagnostics?.checks?.websocket?.status || "unknown"} · events {(globalGrid.events || []).length}</p>
          </div>
        </Panel>

        <Panel icon={Rocket} title="Infrastructure Activation Center">
          <div className="flex flex-wrap gap-2">
            <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={() => runActivationAction("activate")}>Activate Infrastructure</button>
            <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={loadActivationRuntime}>Refresh Diagnostics</button>
            <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runActivationAction("recover")}>Recover Infrastructure</button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{activation.status || "checking"}</p><p className="mt-2 text-xs text-white/45">activation status</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{activation.capabilities?.node?.output || "missing"}</p><p className="mt-2 text-xs text-white/45">Node.js</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{activation.capabilities?.docker?.available ? "available" : "not found"}</p><p className="mt-2 text-xs text-white/45">Docker</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{activation.capabilities?.wsl?.available ? "available" : "not found"}</p><p className="mt-2 text-xs text-white/45">WSL</p></article>
          </div>
          {activation.error && <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">{activation.error}</p>}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ["PostgreSQL runtime activation manager", activation.diagnostics?.checks?.postgres?.status || "unknown"],
              ["Redis runtime activation manager", activation.diagnostics?.checks?.redis?.status || "unknown"],
              ["Infrastructure dependency resolver", activation.activationMode || "unknown"],
              ["Persistent execution state layer", activation.diagnostics?.checks?.persistence?.status || "unknown"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs">
                <span className="font-bold text-white">{label}</span>
                <span className="text-white/50">{value}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel icon={RotateCcw} title="Runtime Recovery Center">
          <div className="flex flex-wrap gap-2">
            <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={() => runActivationAction("runtime-recover")}>Run Recovery</button>
            <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runActivationAction("failover")}>Evaluate Failover</button>
          </div>
          <div className="mt-4 space-y-2">
            {(runtimeOps.recovery?.failover?.actions || runtimeOps.recovery?.actions || []).slice(0, 5).map((item, index) => (
              <article key={`${item.action || item.name}-${index}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-bold text-white">{item.action || item.name}</p>
                <p className="mt-1 text-xs text-white/45">{item.reason || item.status || item.error}</p>
              </article>
            ))}
            {(runtimeOps.recovery?.failover?.actions || runtimeOps.recovery?.actions || []).length === 0 && <p className="rounded-lg bg-white/[0.04] p-3 text-xs text-white/45">No recovery action is currently required by the failover planner.</p>}
          </div>
        </Panel>

        <Panel icon={Server} title="Container Lifecycle Center">
          <div className="flex flex-wrap gap-2">
            <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={() => runActivationAction("container-status")}>Check Containers</button>
            <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={() => runActivationAction("container-start")}>Start Containers</button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{runtimeOps.containers?.status || "unknown"}</p><p className="mt-2 text-xs text-white/45">container runtime</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{runtimeOps.containers?.containers?.length || 0}</p><p className="mt-2 text-xs text-white/45">active containers</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{runtimeOps.containers?.reason || runtimeOps.containers?.error || "ready check complete"}</p><p className="mt-2 text-xs text-white/45">runtime detail</p></article>
          </div>
        </Panel>

        <Panel icon={RadioTower} title="Queue & Worker Observatory">
          <div className="flex flex-wrap gap-2">
            <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={() => runActivationAction("register-worker")}>Register Worker</button>
            <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={() => runActivationAction("schedule-worker")}>Schedule Worker Task</button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{runtimeOps.workers?.nodes?.length || 0}</p><p className="mt-2 text-xs text-white/45">worker topology</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{runtimeOps.queues?.redis?.status || "unknown"}</p><p className="mt-2 text-xs text-white/45">Redis queue</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{runtimeOps.workers?.summary?.scheduled || 0}</p><p className="mt-2 text-xs text-white/45">scheduled tasks</p></article>
            <article className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-sm font-bold text-white">{runtimeOps.workers?.summary?.avgLoad || 0}</p><p className="mt-2 text-xs text-white/45">average load</p></article>
          </div>
        </Panel>

        <Panel icon={Activity} title="Distributed Runtime Health Map">
          <div className="grid gap-2 sm:grid-cols-2">
            {(runtimeOps.workers?.nodes || []).slice(0, 6).map((node) => (
              <article key={node.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{node.node_name || node.id}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{node.status}</span>
                </div>
                <p className="mt-1 text-xs text-white/45">health {Number(node.health_score || 0).toFixed(2)} · load {Number(node.load_score || 0).toFixed(2)}</p>
              </article>
            ))}
            {(runtimeOps.workers?.nodes || []).length === 0 && <p className="rounded-lg bg-white/[0.04] p-3 text-xs text-white/45">No workers are persisted because PostgreSQL is not reachable.</p>}
          </div>
        </Panel>

        <Panel icon={Wrench} title="Autonomous Recovery Console">
          <div className="space-y-2">
            {(activation.events || []).slice(0, 4).map((event) => (
              <article key={event.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-bold text-white">{event.action}</p>
                <p className="mt-1 text-xs text-white/45">{event.status} · {new Date(event.created_at).toLocaleString()}</p>
              </article>
            ))}
            {(activation.events || []).length === 0 && <p className="rounded-lg bg-white/[0.04] p-3 text-xs text-white/45">Recovery events will persist here after PostgreSQL is running.</p>}
          </div>
        </Panel>

        <Panel icon={Cloud} title="Deployment Cloud">
          <div className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" placeholder="Project ID" value={deployment.projectId} onChange={(event) => setDeployment({ ...deployment, projectId: event.target.value })} />
            <select className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={deployment.target} onChange={(event) => setDeployment({ ...deployment, target: event.target.value })}>
              {["Vercel", "Railway", "Render", "Netlify", "Docker"].map((target) => <option className="bg-slate-950" key={target}>{target}</option>)}
            </select>
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={createDeployment}>
              <Play className="h-4 w-4" /> Plan
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {plans.slice(0, 4).map((plan) => (
              <article key={plan.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{plan.target} · {plan.project_id}</p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button className="rounded-lg bg-codrai-cyan px-2 py-1 text-xs font-black text-slate-950" type="button" onClick={() => executePlan(plan.id)}>Validate</button>
                    <button className="rounded-lg bg-white px-2 py-1 text-xs font-black text-slate-950" type="button" onClick={() => checkDeploymentHealth(plan.id)}>Health</button>
                    <button className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-xs font-bold text-white" type="button" onClick={() => createDeploymentSnapshot(plan.id)}>Snapshot</button>
                    <button className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-xs font-bold text-white" type="button" onClick={() => rollbackDeployment(plan.id)}>Rollback</button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-white/45">{plan.status} · {(plan.generated_files || []).length} files</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Users} title="AI Company Teams">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} />
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={teamForm.mission} onChange={(event) => setTeamForm({ ...teamForm, mission: event.target.value })} />
            <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={createTeam}>Create</button>
          </div>
          <div className="mt-4 space-y-2">
            {teams.slice(0, 4).map((team) => (
              <article key={team.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{team.name}</p>
                  <button className="grid h-8 w-8 place-items-center rounded-lg bg-white text-slate-950" type="button" onClick={() => teamMessage(team.id)}>
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-white/45">{team.mission}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Database} title="Enterprise Memory">
          <div className="flex gap-2">
            <input className="h-10 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={memoryQuery} onChange={(event) => setMemoryQuery(event.target.value)} />
            <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={searchMemory}>Search</button>
          </div>
          <div className="mt-4 space-y-2">
            {memories.slice(0, 4).map((memory) => (
              <article key={memory.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="line-clamp-2 text-sm text-white">{memory.content}</p>
                <p className="mt-2 flex items-center gap-2 text-xs text-white/40"><Cpu className="h-3 w-3 text-codrai-cyan" /> {memory.source} · score {Number(memory.score || 0).toFixed(2)}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={ShieldCheck} title="Self-Healing Recovery">
          <div className="flex flex-wrap gap-2">
            <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={() => runHealing(false)}>Analyze</button>
            <button className="h-10 rounded-lg bg-codrai-cyan px-3 text-sm font-black text-slate-950" type="button" onClick={() => runHealing(true)}>Analyze + Recover</button>
          </div>
          <div className="mt-4 space-y-2">
            {healingReports.slice(0, 4).map((report) => (
              <article key={report.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{report.source_type}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{report.status}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">{(report.findings || []).length} findings · recovery {report.recovery_run_id || "none"}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Wrench} title="AI Tool Factory">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={toolForm.name} onChange={(event) => setToolForm({ ...toolForm, name: event.target.value })} />
            <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={toolForm.url} onChange={(event) => setToolForm({ ...toolForm, url: event.target.value })} />
            <button className="h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={createTool}>Create</button>
          </div>
          <div className="mt-4 space-y-2">
            {dynamicTools.slice(0, 4).map((tool) => (
              <article key={tool.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-bold text-white">{tool.name}</p>
                <p className="mt-1 text-xs text-white/45">{tool.kind} · {tool.status}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Route} title="Model Routing Analytics">
          <button className="mb-4 h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={refreshModelScores}>Refresh Scores</button>
          <div className="space-y-2">
            {modelScores.slice(0, 5).map((score) => (
              <article key={`${score.provider}-${score.model}-${score.task_type}-${score.calculated_at || score.score}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{score.provider || "unknown"} · {score.model || "default"}</p>
                  <span className="rounded-full bg-codrai-cyan/15 px-2 py-1 text-xs text-codrai-cyan">{Number(score.score || 0).toFixed(2)}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">{score.task_type || "all"} · {score.requests || 0} requests · {score.avg_latency_ms || 0}ms</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={Banknote} title="Monetization Metering">
          <button className="mb-4 h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={generateInvoice}>Generate Usage Invoice</button>
          <div className="space-y-2">
            {invoices.slice(0, 4).map((invoice) => (
              <article key={invoice.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">${Number(invoice.totals?.amount || 0).toFixed(4)}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{invoice.status}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">{invoice.totals?.tokens || 0} tokens · {invoice.totals?.toolExecutions || 0} tools · {invoice.totals?.jobs || 0} jobs</p>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function Panel({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-codrai-cyan" />
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white/75">{title}</h3>
      </div>
      {children}
    </div>
  );
}
