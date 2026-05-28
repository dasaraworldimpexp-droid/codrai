import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import https from "node:https";
import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const COMMAND_TIMEOUT_MS = Number(process.env.MULTIMODAL_COMMAND_TIMEOUT_MS || 15000);
const MAX_TEXT_CHARS = Number(process.env.MULTIMODAL_MAX_TEXT_CHARS || 20000);

function run(command, args = [], options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: options.timeoutMs || COMMAND_TIMEOUT_MS, maxBuffer: options.maxBuffer || 1024 * 1024 * 8 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ ok: false, command, error: error.message, stderr: String(stderr || "").slice(0, 2000) });
        return;
      }
      resolve({ ok: true, command, stdout: String(stdout || ""), stderr: String(stderr || "") });
    });
  });
}

export class MultimodalCapabilityService {
  constructor({ pool, eventBus, openSourceRuntimeService, gpuCapabilityService }) {
    this.pool = pool;
    this.eventBus = eventBus;
    this.openSourceRuntimeService = openSourceRuntimeService;
    this.gpuCapabilityService = gpuCapabilityService;
  }

  async status({ workspaceId }) {
    const [gpu, tesseract, ffmpeg, ffprobe, pdftotext, runtime] = await Promise.all([
      this.gpuCapabilityService?.status?.({ workspaceId }) || this.openSourceRuntimeService?.gpu?.() || { status: "blocked", reason: "GPU runtime service unavailable." },
      run("tesseract", ["--version"]),
      run("ffmpeg", ["-version"]),
      run("ffprobe", ["-version"]),
      run("pdftotext", ["-v"]),
      this.openSourceRuntimeService?.status?.({ workspaceId }).catch((error) => ({ status: "blocked", error: error.message })),
    ]);
    const tools = {
      tesseract: this.#toolStatus(tesseract),
      ffmpeg: this.#toolStatus(ffmpeg),
      ffprobe: this.#toolStatus(ffprobe),
      pdftotext: this.#toolStatus(pdftotext),
    };
    return {
      status: Object.values(tools).some((tool) => tool.status === "available") ? "available" : "blocked",
      workspaceId,
      checkedAt: new Date().toISOString(),
      gpu,
      tools,
      pipelines: {
        ocr: tools.tesseract.status === "available" ? "available" : "blocked",
        pdfText: tools.pdftotext.status === "available" ? "available" : "blocked",
        mediaInspect: tools.ffprobe.status === "available" ? "available" : tools.ffmpeg.status === "available" ? "limited" : "blocked",
        whisper: (runtime?.runtimes || []).find((item) => item.key === "whisper")?.status || "blocked",
        desktopControl: "blocked_in_backend_container",
      },
      runtime,
    };
  }

  async ocrImage({ workspaceId, projectId, userId, file, language = "eng" }) {
    if (!file?.buffer) throw Object.assign(new Error("Image file is required."), { statusCode: 400 });
    const available = await run("tesseract", ["--version"]);
    if (!available.ok) throw Object.assign(new Error("Tesseract OCR is not available in the backend runtime."), { statusCode: 409 });
    const dir = await this.#tmpDir();
    const inputPath = path.join(dir, this.#safeName(file.originalname || "image.png"));
    try {
      await writeFile(inputPath, file.buffer);
      const result = await run("tesseract", [inputPath, "stdout", "-l", language], { timeoutMs: Number(process.env.OCR_TIMEOUT_MS || 20000) });
      if (!result.ok) throw Object.assign(new Error(`Tesseract OCR failed: ${result.stderr || result.error}`), { statusCode: 422 });
      const text = result.stdout.slice(0, MAX_TEXT_CHARS);
      const payload = { text, chars: text.length, language, fileName: file.originalname, mimeType: file.mimetype };
      await this.#memory({ workspaceId, projectId, userId, content: [`OCR extraction completed.`, `File: ${file.originalname}`, text].join("\n"), metadata: { type: "ocr_extraction", fileName: file.originalname, mimeType: file.mimetype } });
      await this.#event({ workspaceId, projectId, userId, type: "multimodal.ocr.completed", payload: { chars: text.length, fileName: file.originalname } });
      return payload;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  async parseDocument({ workspaceId, projectId, userId, file }) {
    if (!file?.buffer) throw Object.assign(new Error("Document file is required."), { statusCode: 400 });
    const dir = await this.#tmpDir();
    const inputPath = path.join(dir, this.#safeName(file.originalname || "document.pdf"));
    try {
      await writeFile(inputPath, file.buffer);
      let text = "";
      if (file.mimetype === "application/pdf" || /\.pdf$/i.test(file.originalname || "")) {
        const available = await run("pdftotext", ["-v"]);
        if (!available.ok) throw Object.assign(new Error("pdftotext is not available in the backend runtime."), { statusCode: 409 });
        const result = await run("pdftotext", [inputPath, "-"], { timeoutMs: Number(process.env.PDF_TEXT_TIMEOUT_MS || 20000) });
        if (!result.ok) throw Object.assign(new Error(`PDF parsing failed: ${result.stderr || result.error}`), { statusCode: 422 });
        text = result.stdout.slice(0, MAX_TEXT_CHARS);
      } else {
        text = file.buffer.toString("utf8").slice(0, MAX_TEXT_CHARS);
      }
      await this.#memory({ workspaceId, projectId, userId, content: [`Document parsing completed.`, `File: ${file.originalname}`, text].join("\n"), metadata: { type: "document_parse", fileName: file.originalname, mimeType: file.mimetype } });
      await this.#event({ workspaceId, projectId, userId, type: "multimodal.document.parsed", payload: { chars: text.length, fileName: file.originalname } });
      return { text, chars: text.length, fileName: file.originalname, mimeType: file.mimetype };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  async inspectMedia({ workspaceId, projectId, userId, file }) {
    if (!file?.buffer) throw Object.assign(new Error("Media file is required."), { statusCode: 400 });
    const dir = await this.#tmpDir();
    const inputPath = path.join(dir, this.#safeName(file.originalname || "media.bin"));
    try {
      await writeFile(inputPath, file.buffer);
      const probe = await run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", inputPath], { timeoutMs: Number(process.env.FFPROBE_TIMEOUT_MS || 15000) });
      if (!probe.ok) throw Object.assign(new Error(`ffprobe failed: ${probe.stderr || probe.error}`), { statusCode: 422 });
      const data = JSON.parse(probe.stdout || "{}");
      await this.#event({ workspaceId, projectId, userId, type: "multimodal.media.inspected", payload: { fileName: file.originalname, streams: data.streams?.length || 0 } });
      return { fileName: file.originalname, mimeType: file.mimetype, probe: data };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  async transcribeAudio({ workspaceId, projectId, userId, file }) {
    if (!file?.buffer) throw Object.assign(new Error("Audio file is required."), { statusCode: 400 });
    const startedAt = Date.now();
    const transcriptId = randomUUID();
    const dir = await this.#tmpDir();
    const inputPath = path.join(dir, this.#safeName(file.originalname || "audio.bin"));
    const wavPath = path.join(dir, "codrai-transcription-input.wav");
    const outputBase = path.join(dir, "codrai-transcript");
    try {
      await writeFile(inputPath, file.buffer);
      const ffmpeg = await run("ffmpeg", ["-y", "-i", inputPath, "-vn", "-ac", "1", "-ar", "16000", wavPath], {
        timeoutMs: Number(process.env.FFMPEG_AUDIO_TIMEOUT_MS || 20000),
      });
      if (!ffmpeg.ok) {
        const blocked = await this.#blockedPayload({
          workspaceId,
          projectId,
          userId,
          type: "multimodal.audio.blocked",
          reason: `ffmpeg audio preprocessing failed: ${ffmpeg.stderr || ffmpeg.error}`,
          payload: { fileName: file.originalname, stage: "preprocess" },
        });
        await this.#transcriptRecord({ id: transcriptId, workspaceId, projectId, userId, file, status: "blocked", errorMessage: blocked.reason, latencyMs: Date.now() - startedAt });
        return blocked;
      }

      const whisperRuntime = await this.#whisperRuntime();
      const whisperBin = whisperRuntime.binary;
      const whisperModel = whisperRuntime.model.path;
      const whisperCli = whisperRuntime.binaryCheck;
      if (!whisperCli.ok) {
        const blocked = await this.#blockedPayload({
          workspaceId,
          projectId,
          userId,
          type: "multimodal.audio.blocked",
          reason: "Whisper runtime is not installed or configured. Audio was preprocessed with ffmpeg, but transcription is blocked until WHISPER_CPP_BIN or a Whisper service is available.",
          payload: { fileName: file.originalname, stage: "whisper_runtime" },
          extra: {
            preprocessing: { status: "available", format: "wav", sampleRate: 16000, channels: 1 },
            diagnostics: whisperRuntime.activation,
            subtitles: [],
          },
        });
        await this.#transcriptRecord({ id: transcriptId, workspaceId, projectId, userId, file, status: "blocked", preprocessing: blocked.preprocessing, errorMessage: blocked.reason, latencyMs: Date.now() - startedAt });
        return blocked;
      }

      if (!whisperModel) {
        const blocked = await this.#blockedPayload({
          workspaceId,
          projectId,
          userId,
          type: "multimodal.audio.blocked",
          reason: "Whisper binary was detected, but CODRAI requires an explicit WHISPER_CPP_MODEL path before transcription can run safely in low-resource mode.",
          payload: { fileName: file.originalname, stage: "whisper_model" },
          extra: {
            preprocessing: { status: "available", format: "wav", sampleRate: 16000, channels: 1 },
            diagnostics: whisperRuntime.activation,
            subtitles: [],
          },
        });
        await this.#transcriptRecord({ id: transcriptId, workspaceId, projectId, userId, file, status: "blocked", preprocessing: blocked.preprocessing, errorMessage: blocked.reason, latencyMs: Date.now() - startedAt });
        return blocked;
      }

      await access(whisperModel);
      const threads = String(Math.max(1, Math.min(Number(process.env.WHISPER_CPU_THREADS || Math.floor((os.cpus()?.length || 2) / 2)), 4)));
      const durationSeconds = await this.#durationSeconds(wavPath);
      const chunkSeconds = Number(process.env.WHISPER_CHUNK_SECONDS || 300);
      const wavInputs = [];
      if (durationSeconds > chunkSeconds) {
        const segmentPattern = path.join(dir, "codrai-whisper-chunk-%03d.wav");
        const split = await run("ffmpeg", ["-y", "-i", wavPath, "-f", "segment", "-segment_time", String(chunkSeconds), "-c", "copy", segmentPattern], {
          timeoutMs: Number(process.env.FFMPEG_AUDIO_TIMEOUT_MS || 20000),
        });
        if (!split.ok) {
          const reason = `Whisper chunk preparation failed: ${split.stderr || split.error}`;
          await this.#transcriptRecord({ id: transcriptId, workspaceId, projectId, userId, file, status: "failed", preprocessing: { status: "available", format: "wav", sampleRate: 16000, channels: 1, durationSeconds }, errorMessage: reason, latencyMs: Date.now() - startedAt });
          throw Object.assign(new Error(reason), { statusCode: 422 });
        }
        const chunks = (await readdir(dir)).filter((name) => name.startsWith("codrai-whisper-chunk-") && name.endsWith(".wav")).sort();
        wavInputs.push(...chunks.map((name) => path.join(dir, name)));
      } else {
        wavInputs.push(wavPath);
      }

      const parts = [];
      const subtitles = [];
      for (let index = 0; index < wavInputs.length; index += 1) {
        const partBase = wavInputs.length === 1 ? outputBase : path.join(dir, `codrai-transcript-${String(index).padStart(3, "0")}`);
        const whisper = await run(whisperBin, ["-m", whisperModel, "-f", wavInputs[index], "-otxt", "-osrt", "-of", partBase, "-nt", "-t", threads], {
          timeoutMs: Number(process.env.WHISPER_TRANSCRIBE_TIMEOUT_MS || 120000),
          maxBuffer: 1024 * 1024 * 12,
        });
        if (!whisper.ok) {
          const reason = `Whisper transcription failed: ${whisper.stderr || whisper.error}`;
          await this.#transcriptRecord({ id: transcriptId, workspaceId, projectId, userId, file, status: "failed", preprocessing: { status: "available", format: "wav", sampleRate: 16000, channels: 1, durationSeconds, chunks: wavInputs.length }, errorMessage: reason, latencyMs: Date.now() - startedAt });
          throw Object.assign(new Error(reason), { statusCode: 422 });
        }
        parts.push((await readFile(`${partBase}.txt`, "utf8")).trim());
        const srt = await readFile(`${partBase}.srt`, "utf8").catch(() => "");
        subtitles.push(...this.#parseSrt(srt).map((item) => ({ ...item, chunkIndex: index })));
      }
      const text = parts.join("\n\n").slice(0, MAX_TEXT_CHARS);
      const result = {
        id: transcriptId,
        status: "completed",
        text,
        chars: text.length,
        subtitles,
        preprocessing: { status: "available", format: "wav", sampleRate: 16000, channels: 1, durationSeconds, chunks: wavInputs.length, chunkSeconds },
        runtime: { engine: "whisper.cpp", binary: whisperBin, model: whisperModel, cpuFirst: true, threads: Number(threads), chunked: wavInputs.length > 1 },
        latencyMs: Date.now() - startedAt,
      };
      await this.#transcriptRecord({ id: transcriptId, workspaceId, projectId, userId, file, status: "completed", transcript: text, subtitles: result.subtitles, preprocessing: result.preprocessing, runtime: result.runtime, latencyMs: result.latencyMs });
      await this.#memory({ workspaceId, projectId, userId, content: [`Audio transcription completed.`, `File: ${file.originalname}`, text].join("\n"), metadata: { type: "audio_transcription", fileName: file.originalname, transcriptId } });
      await this.#event({ workspaceId, projectId, userId, type: "multimodal.audio.transcribed", payload: { transcriptId, chars: text.length, latencyMs: result.latencyMs } });
      return result;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  async whisperDiagnostics({ workspaceId }) {
    const runtime = await this.#whisperRuntime();
    return {
      status: runtime.ffmpeg.ok && runtime.binaryCheck.ok && runtime.model.status === "available" ? "ready" : "blocked",
      workspaceId,
      mode: "cpu_first",
      generatedAt: new Date().toISOString(),
      ffmpeg: this.#toolStatus(runtime.ffmpeg),
      whisper: {
        binary: runtime.binary,
        status: runtime.binaryCheck.ok ? "available" : "blocked",
        reason: runtime.binaryCheck.ok ? null : runtime.binaryCheck.stderr || runtime.binaryCheck.error,
        candidates: runtime.candidates,
      },
      model: {
        path: runtime.model.path || null,
        status: runtime.model.status,
        reason: runtime.model.reason,
      },
      policy: {
        maxThreads: Math.max(1, Math.min(Number(process.env.WHISPER_CPU_THREADS || Math.floor((os.cpus()?.length || 2) / 2)), 4)),
        chunkSeconds: Number(process.env.WHISPER_CHUNK_SECONDS || 300),
        timeoutMs: Number(process.env.WHISPER_TRANSCRIBE_TIMEOUT_MS || 120000),
        gpu: "disabled",
      },
      activation: runtime.activation,
    };
  }

  async bootstrapWhisper({ workspaceId }) {
    const runtime = await this.#whisperRuntime();
    const downloadUrl = process.env.WHISPER_MODEL_DOWNLOAD_URL;
    const modelPath = process.env.WHISPER_MODEL_PATH || process.env.WHISPER_CPP_MODEL;
    const actions = [];

    if (!modelPath) {
      return {
        status: "blocked",
        workspaceId,
        reason: "WHISPER_MODEL_PATH must be configured before CODRAI can bootstrap a CPU Whisper model safely.",
        diagnostics: runtime.activation,
      };
    }

    if (runtime.model.status === "available") {
      return {
        status: runtime.binaryCheck.ok ? "ready" : "blocked",
        workspaceId,
        model: runtime.model,
        whisper: { binary: runtime.binary, status: runtime.binaryCheck.ok ? "available" : "blocked", reason: runtime.binaryCheck.error || runtime.binaryCheck.stderr },
        actions: ["model_already_available"],
      };
    }

    if (!downloadUrl) {
      return {
        status: "blocked",
        workspaceId,
        reason: "WHISPER_MODEL_DOWNLOAD_URL is not configured. CODRAI will not guess or download an unapproved model.",
        model: runtime.model,
        diagnostics: runtime.activation,
      };
    }

    if (!/^https:\/\//i.test(downloadUrl)) {
      return {
        status: "blocked",
        workspaceId,
        reason: "WHISPER_MODEL_DOWNLOAD_URL must be an HTTPS URL for production-safe bootstrap.",
        model: runtime.model,
      };
    }

    await mkdir(path.dirname(modelPath), { recursive: true });
    await this.#downloadFile(downloadUrl, modelPath);
    actions.push("model_downloaded");
    const refreshed = await this.#whisperRuntime();
    await this.#event({ workspaceId, type: "multimodal.whisper.bootstrap", payload: { status: refreshed.model.status, modelPath } });
    return {
      status: refreshed.binaryCheck.ok && refreshed.model.status === "available" ? "ready" : "blocked",
      workspaceId,
      actions,
      model: refreshed.model,
      whisper: { binary: refreshed.binary, status: refreshed.binaryCheck.ok ? "available" : "blocked", reason: refreshed.binaryCheck.error || refreshed.binaryCheck.stderr },
      diagnostics: refreshed.activation,
    };
  }

  async transcriptHistory({ workspaceId, projectId, limit = 20 }) {
    if (!this.pool) return { status: "blocked", reason: "PostgreSQL DATABASE_URL is not configured.", transcripts: [] };
    const result = await this.pool.query(
      `select id, project_id, file_name, mime_type, status, language, transcript, subtitles, preprocessing, runtime, error_message, latency_ms, created_at, completed_at
       from multimodal_transcripts
       where workspace_id = $1 and ($2::text is null or project_id = $2)
       order by created_at desc limit $3`,
      [workspaceId, projectId || null, limit]
    );
    return { status: "ready", workspaceId, transcripts: result.rows };
  }

  async transcriptExport({ workspaceId, transcriptId, format = "json" }) {
    if (!this.pool) return { status: "blocked", reason: "PostgreSQL DATABASE_URL is not configured." };
    const result = await this.pool.query(
      `select id, file_name, mime_type, status, transcript, subtitles, error_message, created_at, completed_at
       from multimodal_transcripts
       where id = $1 and workspace_id = $2`,
      [transcriptId, workspaceId]
    );
    const transcript = result.rows[0];
    if (!transcript) throw Object.assign(new Error("Transcript not found."), { statusCode: 404 });
    if (format === "srt") {
      const subtitles = Array.isArray(transcript.subtitles) ? transcript.subtitles : [];
      return {
        status: transcript.status,
        format,
        fileName: `${transcript.file_name || transcript.id}.srt`,
        contentType: "application/x-subrip",
        body: subtitles.map((item, index) => `${item.index || index + 1}\n${item.time || "00:00:00,000 --> 00:00:00,000"}\n${item.text || ""}`).join("\n\n"),
      };
    }
    if (format === "txt") {
      return {
        status: transcript.status,
        format,
        fileName: `${transcript.file_name || transcript.id}.txt`,
        contentType: "text/plain; charset=utf-8",
        body: transcript.transcript || transcript.error_message || "",
      };
    }
    return { status: transcript.status, format: "json", transcript };
  }

  async searchTranscripts({ workspaceId, projectId, query, limit = 20 }) {
    if (!this.pool) return { status: "blocked", reason: "PostgreSQL DATABASE_URL is not configured.", transcripts: [] };
    if (!query?.trim()) throw Object.assign(new Error("query is required."), { statusCode: 400 });
    const result = await this.pool.query(
      `select id, project_id, file_name, mime_type, status, language, transcript, subtitles, preprocessing, runtime, error_message, latency_ms, created_at, completed_at,
              ts_rank_cd(to_tsvector('simple', coalesce(transcript, '') || ' ' || coalesce(file_name, '') || ' ' || coalesce(error_message, '')), plainto_tsquery('simple', $3)) as rank
       from multimodal_transcripts
       where workspace_id = $1
         and ($2::text is null or project_id = $2)
         and to_tsvector('simple', coalesce(transcript, '') || ' ' || coalesce(file_name, '') || ' ' || coalesce(error_message, '')) @@ plainto_tsquery('simple', $3)
       order by rank desc, created_at desc
       limit $4`,
      [workspaceId, projectId || null, query.trim(), limit]
    );
    return { status: "ready", workspaceId, query: query.trim(), transcripts: result.rows };
  }

  async transcriptAnalytics({ workspaceId, projectId }) {
    if (!this.pool) return { status: "blocked", reason: "PostgreSQL DATABASE_URL is not configured." };
    const [summary, latency, recent] = await Promise.all([
      this.pool.query(
        `select status, count(*)::int as count
         from multimodal_transcripts
         where workspace_id = $1 and ($2::text is null or project_id = $2)
         group by status`,
        [workspaceId, projectId || null]
      ),
      this.pool.query(
        `select coalesce(round(avg(latency_ms))::int, 0) as avg_latency_ms,
                coalesce(max(latency_ms)::int, 0) as max_latency_ms,
                count(*) filter (where created_at >= now() - interval '24 hours')::int as last_24h
         from multimodal_transcripts
         where workspace_id = $1 and ($2::text is null or project_id = $2)`,
        [workspaceId, projectId || null]
      ),
      this.pool.query(
        `select id, file_name, status, latency_ms, error_message, created_at
         from multimodal_transcripts
         where workspace_id = $1 and ($2::text is null or project_id = $2)
         order by created_at desc limit 10`,
        [workspaceId, projectId || null]
      ),
    ]);
    return {
      status: "ready",
      workspaceId,
      summary: summary.rows,
      latency: latency.rows[0] || { avg_latency_ms: 0, max_latency_ms: 0, last_24h: 0 },
      recent: recent.rows,
      runtime: {
        mode: "cpu_first",
        engine: process.env.WHISPER_CPP_BIN ? "whisper.cpp" : "blocked_until_configured",
        maxThreads: Math.max(1, Math.min(Number(process.env.WHISPER_CPU_THREADS || Math.floor((os.cpus()?.length || 2) / 2)), 4)),
      },
    };
  }

  async analyzeImage({ workspaceId, projectId, userId, file, prompt }) {
    if (!file?.buffer) throw Object.assign(new Error("Image file is required."), { statusCode: 400 });
    const dir = await this.#tmpDir();
    const inputPath = path.join(dir, this.#safeName(file.originalname || "image.png"));
    try {
      await writeFile(inputPath, file.buffer);
      const [probe, tesseract] = await Promise.all([
        run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,codec_name,pix_fmt", "-of", "json", inputPath], {
          timeoutMs: Number(process.env.FFPROBE_TIMEOUT_MS || 15000),
        }),
        run("tesseract", [inputPath, "stdout", "-l", "eng"], { timeoutMs: Number(process.env.OCR_TIMEOUT_MS || 20000) }),
      ]);
      const metadata = probe.ok ? JSON.parse(probe.stdout || "{}") : { error: probe.stderr || probe.error };
      const ocrText = tesseract.ok ? tesseract.stdout.slice(0, MAX_TEXT_CHARS) : "";
      const analysis = {
        status: "analyzed",
        fileName: file.originalname,
        mimeType: file.mimetype,
        prompt: prompt || null,
        metadata,
        ocr: {
          status: tesseract.ok ? "available" : "blocked",
          text: ocrText,
          chars: ocrText.length,
          reason: tesseract.ok ? null : tesseract.stderr || tesseract.error,
        },
        imageCaptioning: this.#lightweightCaption({ metadata, ocrText }),
        uiStructure: this.#uiStructure({ metadata, ocrText }),
        semanticSummary: this.#semanticSummary({ metadata, ocrText, prompt }),
        routing: {
          strategy: "ocr_metadata_to_local_llm",
          safeForCpuMode: true,
        },
      };
      await this.#memory({
        workspaceId,
        projectId,
        userId,
        content: [`Vision analysis completed.`, `File: ${file.originalname}`, ocrText].join("\n").trim(),
        metadata: { type: "vision_analysis", fileName: file.originalname, mimeType: file.mimetype, captioning: "blocked" },
      });
      await this.#event({ workspaceId, projectId, userId, type: "multimodal.vision.analyzed", payload: { fileName: file.originalname, ocrChars: ocrText.length } });
      return analysis;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  async desktopAction({ workspaceId, projectId, userId, action }) {
    const payload = {
      status: "blocked",
      action: action || "unspecified",
      reason: "Host desktop control is blocked from the backend Docker container. CODRAI preserved browser automation fallback through Playwright computer-use sessions.",
      safeFallbacks: ["computer_use_session", "browser_replay", "playwright_chromium"],
      replayLogged: true,
    };
    await this.#memory({
      workspaceId,
      projectId,
      userId,
      content: `Desktop control request blocked safely: ${payload.action}`,
      metadata: { type: "desktop_control_attempt", action: payload.action, status: payload.status },
    });
    await this.#event({ workspaceId, projectId, userId, type: "multimodal.desktop.blocked", payload });
    return payload;
  }

  async desktopStatus() {
    return {
      status: "blocked",
      reason: "Desktop control is not exposed to the backend Docker container. Browser automation remains available through the sandboxed Playwright runtime.",
      safeFallbacks: ["browser_sessions", "computer_use_replay", "playwright_chromium"],
    };
  }

  #toolStatus(result) {
    return result.ok
      ? { status: "available", version: (result.stdout || result.stderr).split("\n")[0] }
      : { status: "blocked", reason: result.stderr || result.error };
  }

  async #whisperRuntime() {
    const configuredBin = process.env.WHISPER_CPP_BIN;
    const candidates = configuredBin
      ? [configuredBin]
      : ["whisper-cli", "whisper", "main"];
    const checks = [];
    for (const candidate of candidates) {
      const check = await run(candidate, ["--help"], { timeoutMs: 3000, maxBuffer: 1024 * 256 });
      checks.push({ binary: candidate, status: check.ok ? "available" : "blocked", reason: check.ok ? null : check.stderr || check.error });
      if (check.ok) {
        return this.#whisperRuntimePayload({ binary: candidate, binaryCheck: check, candidates, checks });
      }
    }
    return this.#whisperRuntimePayload({
      binary: configuredBin || "whisper-cli",
      binaryCheck: { ok: false, command: configuredBin || "whisper-cli", error: checks[0]?.reason || "Whisper CLI binary was not found." },
      candidates,
      checks,
    });
  }

  async #whisperRuntimePayload({ binary, binaryCheck, candidates, checks }) {
    const [ffmpeg, model] = await Promise.all([
      run("ffmpeg", ["-version"]),
      this.#whisperModelStatus(),
    ]);
    return {
      ffmpeg,
      binary,
      binaryCheck,
      candidates,
      checks,
      model,
      activation: {
        mode: "cpu_first",
        gpu: "disabled",
        requiredEnv: ["WHISPER_CPP_BIN", "WHISPER_MODEL_PATH"],
        optionalEnv: ["WHISPER_CPU_THREADS", "WHISPER_CHUNK_SECONDS", "WHISPER_TRANSCRIBE_TIMEOUT_MS"],
        blocked: !(ffmpeg.ok && binaryCheck.ok && model.status === "available"),
        nextRequirements: [
          !ffmpeg.ok ? "Install ffmpeg or add it to PATH inside the backend container." : null,
          !binaryCheck.ok ? "Install whisper.cpp and set WHISPER_CPP_BIN to the whisper-cli executable path." : null,
          model.status !== "available" ? "Download a tiny/base GGML Whisper model and set WHISPER_MODEL_PATH to the model file." : null,
        ].filter(Boolean),
        safety: "CPU-only, tiny/base model policy, chunked transcription, bounded worker concurrency.",
      },
    };
  }

  async #whisperModelStatus() {
    const modelPath = process.env.WHISPER_CPP_MODEL || process.env.WHISPER_MODEL_PATH;
    if (!modelPath) return { path: null, status: "not_configured", reason: "WHISPER_MODEL_PATH is not configured." };
    try {
      await access(modelPath);
      return { path: modelPath, status: "available", reason: null };
    } catch (error) {
      return { path: modelPath, status: "missing", reason: error.message };
    }
  }

  #downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
      const file = createWriteStream(destination, { flags: "wx" });
      const request = https.get(url, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          file.close(() => rm(destination, { force: true }).finally(() => {
            this.#downloadFile(response.headers.location, destination).then(resolve, reject);
          }));
          return;
        }
        if (response.statusCode !== 200) {
          file.close(() => rm(destination, { force: true }).finally(() => reject(new Error(`Whisper model download failed with HTTP ${response.statusCode}.`))));
          return;
        }
        response.pipe(file);
        file.on("finish", () => file.close(resolve));
      });
      request.on("error", (error) => {
        file.close(() => rm(destination, { force: true }).finally(() => reject(error)));
      });
      file.on("error", (error) => {
        request.destroy();
        rm(destination, { force: true }).finally(() => reject(error));
      });
    });
  }

  async #durationSeconds(wavPath) {
    const probe = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", wavPath], {
      timeoutMs: Number(process.env.FFPROBE_TIMEOUT_MS || 15000),
    });
    if (!probe.ok) return 0;
    const value = Number(String(probe.stdout || "").trim());
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  }

  async #tmpDir() {
    const dir = path.join(os.tmpdir(), `codrai-multimodal-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    return dir;
  }

  #safeName(value) {
    return String(value || "upload.bin").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  }

  async #memory({ workspaceId, projectId, userId, content, metadata }) {
    if (!this.pool || !workspaceId || !content.trim()) return;
    await this.pool.query(
      `insert into ai_memories (id, workspace_id, project_id, user_id, content, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, now())`,
      [randomUUID(), workspaceId, projectId || null, userId || null, content, metadata]
    );
  }

  async #blockedPayload({ workspaceId, projectId, userId, type, reason, payload = {}, extra = {} }) {
    const result = { status: "blocked", reason, ...extra };
    await this.#event({ workspaceId, projectId, userId, type, payload: { ...payload, reason } });
    await this.#memory({
      workspaceId,
      projectId,
      userId,
      content: `${type}: ${reason}`,
      metadata: { type, status: "blocked", ...payload },
    });
    return result;
  }

  async #transcriptRecord({ id, workspaceId, projectId, userId, file, status, transcript = null, subtitles = [], preprocessing = {}, runtime = {}, errorMessage = null, latencyMs = null }) {
    if (!this.pool || !workspaceId) return;
    await this.pool.query(
      `insert into multimodal_transcripts
       (id, workspace_id, project_id, user_id, file_name, mime_type, status, transcript, subtitles, preprocessing, runtime, error_message, latency_ms, created_at, updated_at, completed_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), now(), case when $7 in ('completed', 'failed', 'blocked') then now() else null end)
       on conflict (id) do update set
         status = excluded.status,
         transcript = excluded.transcript,
         subtitles = excluded.subtitles,
         preprocessing = excluded.preprocessing,
         runtime = excluded.runtime,
         error_message = excluded.error_message,
         latency_ms = excluded.latency_ms,
         updated_at = now(),
         completed_at = excluded.completed_at`,
      [id, workspaceId, projectId || null, userId || null, file?.originalname || null, file?.mimetype || null, status, transcript, JSON.stringify(subtitles || []), JSON.stringify(preprocessing || {}), JSON.stringify(runtime || {}), errorMessage, latencyMs]
    );
  }

  #parseSrt(text) {
    if (!text) return [];
    return text
      .split(/\r?\n\r?\n/)
      .map((block) => {
        const lines = block.split(/\r?\n/).filter(Boolean);
        if (lines.length < 3) return null;
        return { index: Number(lines[0]) || null, time: lines[1], text: lines.slice(2).join(" ") };
      })
      .filter(Boolean)
      .slice(0, 500);
  }

  #lightweightCaption({ metadata, ocrText }) {
    const stream = metadata?.streams?.[0] || {};
    const size = stream.width && stream.height ? `${stream.width}x${stream.height}` : "unknown size";
    const codec = stream.codec_name || "image";
    const text = String(ocrText || "").trim();
    return {
      status: "available",
      mode: "cpu_metadata_ocr_caption",
      caption: text
        ? `A ${size} ${codec} image containing visible text: ${text.slice(0, 240)}`
        : `A ${size} ${codec} image with no OCR-readable text detected.`,
      source: "ffprobe_metadata_and_tesseract_ocr",
      note: "This is a CPU-safe lightweight caption derived from real metadata/OCR, not a neural vision model.",
    };
  }

  #uiStructure({ metadata, ocrText }) {
    const stream = metadata?.streams?.[0] || {};
    const width = Number(stream.width || 0);
    const height = Number(stream.height || 0);
    const text = String(ocrText || "").trim();
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 24);
    return {
      status: "available",
      mode: "ocr_layout_heuristic",
      canvas: { width: width || null, height: height || null, orientation: width && height ? (width >= height ? "landscape" : "portrait") : "unknown" },
      textBlocks: lines.map((line, index) => ({
        id: `ocr-block-${index + 1}`,
        text: line,
        role: /sign in|log in|submit|save|continue|start|send|run/i.test(line) ? "action_or_button" : /dashboard|studio|settings|console|center/i.test(line) ? "heading_or_navigation" : "text",
      })),
      interactiveHints: lines.filter((line) => /sign in|log in|submit|save|continue|start|send|run|upload|browse/i.test(line)).slice(0, 12),
    };
  }

  #semanticSummary({ metadata, ocrText, prompt }) {
    const caption = this.#lightweightCaption({ metadata, ocrText }).caption;
    const structure = this.#uiStructure({ metadata, ocrText });
    return {
      status: "available",
      mode: "cpu_safe_summary",
      summary: [caption, structure.interactiveHints.length ? `Detected possible actions: ${structure.interactiveHints.join(", ")}` : "No obvious UI actions detected."].join(" "),
      promptApplied: Boolean(prompt),
      limitations: "No heavy vision transformer was loaded; analysis is derived from ffprobe metadata, OCR text, and deterministic UI heuristics.",
    };
  }

  #event({ workspaceId, projectId, userId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, projectId, actorId: userId, payload });
  }
}
