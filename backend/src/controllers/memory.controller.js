export async function searchMemory(req, res, next) {
  try {
    const memories = await req.app.locals.enterpriseMemoryService.search({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      projectId: req.query.projectId,
      query: req.query.query,
      limit: Number(req.query.limit || 10),
    });
    return res.status(200).json({ memories });
  } catch (error) {
    return next(error);
  }
}

export async function appendMemory(req, res, next) {
  try {
    const memory = await req.app.locals.enterpriseMemoryService.append({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      content: req.body.content,
      metadata: req.body.metadata || { source: "manual" },
    });
    return res.status(201).json({ memory });
  } catch (error) {
    return next(error);
  }
}

export async function memoryGraph(req, res, next) {
  try {
    const graph = await req.app.locals.enterpriseMemoryService.graph({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      projectId: req.query.projectId,
      limit: Number(req.query.limit || 40),
    });
    return res.status(200).json(graph);
  } catch (error) {
    return next(error);
  }
}

export async function memorySummary(req, res, next) {
  try {
    const summary = await req.app.locals.enterpriseMemoryService.summary({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      projectId: req.query.projectId,
    });
    return res.status(200).json(summary);
  } catch (error) {
    return next(error);
  }
}

export async function indexMemory(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseMemoryService.indexMissingEmbeddings({
      workspaceId: req.workspace?.id || req.body.workspaceId || req.query.workspaceId,
      projectId: req.body.projectId || req.query.projectId,
      limit: Number(req.body.limit || req.query.limit || 50),
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function retrieveMemory(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseMemoryService.retrieve({
      workspaceId: req.workspace?.id || req.body.workspaceId || req.query.workspaceId,
      projectId: req.body.projectId || req.query.projectId,
      userId: req.user?.id || req.body.userId || req.query.userId,
      intent: req.body.query || req.body.intent || req.query.query,
      input: { text: req.body.text || req.query.text },
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function ragSearch(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseMemoryService.ragSearch({
      workspaceId: req.workspace?.id || req.body.workspaceId || req.query.workspaceId,
      projectId: req.body.projectId || req.query.projectId,
      query: req.body.query || req.query.query,
      limit: Number(req.body.limit || req.query.limit || 8),
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function askMemory(req, res, next) {
  try {
    const workspaceId = req.workspace?.id || req.body.workspaceId;
    const projectId = req.body.projectId;
    const query = req.body.query || req.body.prompt;
    const retrieval = await req.app.locals.enterpriseMemoryService.ragSearch({
      workspaceId,
      projectId,
      query,
      limit: Number(req.body.limit || 8),
    });
    const groundedAnswer = buildGroundedAnswer({ query, sources: retrieval.sources });
    const sourceText = retrieval.sources
      .map((source) => `[${source.rank}] ${source.sourceType}${source.fileName ? `:${source.fileName}` : ""}\n${source.content}`)
      .join("\n\n")
      .slice(0, Number(process.env.RAG_CONTEXT_MAX_CHARS || 9000));
    const execution = await req.app.locals.runtimeEngine.execute({
      workspaceId,
      projectId,
      userId: req.user?.id || req.body.userId,
      taskType: req.body.taskType || "reasoning",
      qualityTier: req.body.qualityTier || "balanced",
      providerPreference: req.body.providerPreference || "auto",
      input: {
        text: [
          "Answer only from the CODRAI workspace knowledge sources below. If the sources do not contain the answer, say that clearly. Cite sources with bracket numbers.",
          `Question: ${query}`,
          `Grounded extractive answer draft: ${groundedAnswer.answer}`,
          "Sources:",
          sourceText || "No matching sources found.",
        ].join("\n\n"),
      },
      intent: query,
      model: req.body.model,
    }, {
      executionMode: req.body.stream ? "stream" : req.body.executionMode,
    });
    return res.status(202).json({ retrieval, groundedAnswer, execution });
  } catch (error) {
    return next(error);
  }
}

export async function compressMemory(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseMemoryService.compressWorkspaceContext({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
      conversationId: req.body.conversationId,
      limit: Number(req.body.limit || 40),
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function memoryAnalytics(req, res, next) {
  try {
    const workspaceId = req.workspace?.id || req.query.workspaceId;
    const projectId = req.query.projectId;
    const [summary, graph] = await Promise.all([
      req.app.locals.enterpriseMemoryService.summary({ workspaceId, projectId }),
      req.app.locals.enterpriseMemoryService.graph({ workspaceId, projectId, limit: Number(req.query.limit || 30) }),
    ]);
    return res.status(200).json({
      status: "ready",
      workspaceId,
      generatedAt: new Date().toISOString(),
      summary,
      graph: graph.summary,
      embeddingRuntime: req.app.locals.embeddingRuntime?.snapshot?.() || null,
      vectorDatabase: {
        provider: "postgres_pgvector",
        fallback: "keyword_search_and_codrai_local_hash_embedding",
        workspaceIsolation: "workspace_id_required",
      },
    });
  } catch (error) {
    return next(error);
  }
}

function buildGroundedAnswer({ query, sources }) {
  if (!sources?.length) {
    return {
      status: "empty",
      answer: `No workspace memory or file source currently answers: ${query}`,
      citations: [],
    };
  }
  const topSources = sources.slice(0, 3);
  const answer = topSources
    .map((source) => `[${source.rank}] ${String(source.content || "").replace(/\s+/g, " ").slice(0, 420)}`)
    .join(" ");
  return {
    status: "grounded",
    answer,
    citations: topSources.map((source) => ({
      rank: source.rank,
      id: source.id,
      sourceType: source.sourceType,
      fileName: source.fileName,
      score: source.score,
    })),
  };
}
