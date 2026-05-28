import { Archive, Mic, Paperclip, RefreshCcw, Search, Send, Square, Trash2, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import CodeBlock from "./CodeBlock.jsx";
import { chatApi } from "../chatApi.js";
import { fileApi } from "../../files/fileApi.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const promptTemplates = [
  {
    label: "Plan",
    title: "Autonomous launch plan",
    prompt: "Create a concise autonomous execution plan for the current CODRAI workspace. Include risks, runtime dependencies, and the next three verifiable steps.",
  },
  {
    label: "Debug",
    title: "Runtime debugging",
    prompt: "Analyze the CODRAI runtime from an operator perspective. Identify likely bottlenecks, blocked states, and safe remediation steps without assuming unavailable services are healthy.",
  },
  {
    label: "Code",
    title: "Production code task",
    prompt: "Act as a production coding agent. Propose the smallest safe implementation plan, files to inspect, tests to run, and rollback risks before changing code.",
  },
  {
    label: "Summarize",
    title: "Executive summary",
    prompt: "Summarize the current autonomous AI operating system state for an enterprise stakeholder. Separate verified capabilities from remaining blockers.",
  },
];

function workspaceId() {
  const id = localStorage.getItem("codrai_workspace_id") || "local-workspace";
  localStorage.setItem("codrai_workspace_id", id);
  return id;
}

function userId() {
  const id = localStorage.getItem("codrai_user_id") || "local-user";
  localStorage.setItem("codrai_user_id", id);
  return id;
}

export default function StreamingChatWorkspace() {
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [assistant, setAssistant] = useState("balanced");
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [latencyMs, setLatencyMs] = useState(null);
  const [error, setError] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const abortRef = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const filteredConversations = useMemo(() => conversations.filter((item) => (
    !search || item.title?.toLowerCase().includes(search.toLowerCase())
  )), [conversations, search]);
  const chatInspector = useMemo(() => {
    const assistantMessages = messages.filter((message) => message.role === "assistant");
    const userMessages = messages.filter((message) => message.role === "user");
    return [
      { label: "Mode", value: assistant },
      { label: "Turns", value: String(Math.min(99, userMessages.length + assistantMessages.length)) },
      { label: "Files", value: String(attachments.length || selectedFiles.length) },
      { label: "Latency", value: latencyMs ? `${latencyMs}ms` : streaming ? "streaming" : "idle" },
    ];
  }, [assistant, attachments.length, latencyMs, messages, selectedFiles.length, streaming]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function loadConversations() {
    try {
      const data = await chatApi.listConversations({ workspaceId: workspaceId(), search });
      setConversations(data.conversations || []);
      if (!conversationId && data.conversations?.[0]) {
        await openConversation(data.conversations[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function openConversation(id) {
    setConversationId(id);
    const data = await chatApi.messages(id);
    setMessages((data.messages || []).map((message) => ({
      role: message.role,
      content: message.content,
      provider: message.provider,
      model: message.model,
      createdAt: message.created_at,
    })));
  }

  async function archiveActiveConversation() {
    if (!conversationId) return;
    await chatApi.archiveConversation(conversationId, { workspaceId: workspaceId(), userId: userId() });
    setConversationId(null);
    setMessages([]);
    await loadConversations();
  }

  async function deleteActiveConversation() {
    if (!conversationId) return;
    await chatApi.deleteConversation(conversationId, { workspaceId: workspaceId(), userId: userId() });
    setConversationId(null);
    setMessages([]);
    await loadConversations();
  }

  async function ensureConversation(prompt) {
    if (conversationId) return conversationId;
    const created = await chatApi.createConversation({
      workspaceId: workspaceId(),
      userId: userId(),
      title: prompt.slice(0, 80) || "New conversation",
    });
    setConversationId(created.id);
    await loadConversations();
    return created.id;
  }

  async function sendMessage(messageText = input) {
    const prompt = messageText.trim();
    if (!prompt || streaming) return;

    setError("");
    setInput("");
    setAttachments([]);
    setSelectedFiles([]);
    setStreaming(true);
    setStatus("Connecting");
    setLatencyMs(null);
    const startedAt = performance.now();

    const activeConversationId = await ensureConversation(prompt);
    await chatApi.appendUserMessage(activeConversationId, {
      workspaceId: workspaceId(),
      userId: userId(),
      content: prompt,
    });

    let uploadedFiles = [];
    if (selectedFiles.length > 0) {
      setStatus("Indexing files");
      const uploadResult = await fileApi.upload({
        files: selectedFiles,
        workspaceId: workspaceId(),
        userId: userId(),
      });
      uploadedFiles = uploadResult.files || [];
    }

    setMessages((current) => [...current, {
      role: "user",
      content: uploadedFiles.length ? `${prompt}\n\nAttached files: ${uploadedFiles.map((file) => file.originalName).join(", ")}` : prompt,
    }, { role: "assistant", content: "", streaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/runtime/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("codrai_token") ? { Authorization: `Bearer ${localStorage.getItem("codrai_token")}` } : {}),
        },
        body: JSON.stringify({
          userId: userId(),
          workspaceId: workspaceId(),
          conversationId: activeConversationId,
          taskType: assistant === "coder" ? "coding" : "reasoning",
          intent: prompt,
          input: { text: prompt },
          attachments: attachments.map((attachment) => ({
            name: attachment.name,
            type: attachment.type,
            size: attachment.size,
          })).concat(uploadedFiles.map((file) => ({ type: "indexed_file", fileId: file.fileId, name: file.originalName }))),
          qualityTier: assistant === "premium" ? "premium" : "balanced",
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(await response.text());
      }

      setStatus("Streaming");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let firstToken = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const dataLine = event.split("\n").find((line) => line.startsWith("data: "));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.slice(6));
          if (payload.type === "runtime.error" || payload.payload?.message) {
            throw new Error(payload.payload?.message || "AI runtime stream failed.");
          }
          const chunk = payload.payload?.chunk;
          const text = chunk?.text;

          if (text) {
            if (firstToken) {
              setLatencyMs(Math.round(performance.now() - startedAt));
              firstToken = false;
            }
            setMessages((current) => {
              const next = [...current];
              const last = next[next.length - 1];
              next[next.length - 1] = { ...last, content: `${last.content}${text}` };
              return next;
            });
          }
        }
      }

      setMessages((current) => {
        const next = [...current];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, streaming: false };
        return next;
      });
      setStatus("Complete");
      await loadConversations();
    } catch (err) {
      if (err.name !== "AbortError") {
        const message = err.message?.includes("No healthy provider")
          ? "No active AI provider is configured yet. Open Provider Settings, add a real API key, then test the provider."
          : err.message;
        setError(message);
        setStatus(err.message?.includes("No healthy provider") ? "Provider setup required" : "Failed");
      } else {
        setStatus("Stopped");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function regenerate() {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    if (lastUser) sendMessage(lastUser.content);
  }

  function onFilesSelected(event) {
    const files = [...event.target.files];
    setSelectedFiles(files);
    setAttachments(files.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
    })));
    event.target.value = "";
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not available in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const transcript = [...event.results].map((result) => result[0].transcript).join("");
      setInput(transcript);
    };
    recognition.onerror = (event) => setError(event.error || "Voice input failed.");
    recognition.start();
  }

  function speakLastAssistantMessage() {
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant" && message.content);
    if (!lastAssistant) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(lastAssistant.content));
  }

  function applyPromptTemplate(template) {
    setInput(template.prompt);
    setStatus(`Template loaded: ${template.label}`);
  }

  return (
    <section className="codrai-chat-shell grid min-h-[720px] overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] lg:grid-cols-[300px_1fr]">
      <aside className="codrai-chat-sidebar border-b border-white/10 bg-black/15 p-4 lg:border-b-0 lg:border-r">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/35" />
            <input
              className="codrai-input h-10 w-full rounded-lg border border-white/10 bg-black/20 pl-9 pr-3 text-sm outline-none"
              placeholder="Search chats"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && loadConversations()}
            />
          </div>
          <button className="codrai-primary-button h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={() => {
            setConversationId(null);
            setMessages([]);
          }}>
            New
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`codrai-conversation-item w-full rounded-lg px-3 py-3 text-left text-sm transition ${conversation.id === conversationId ? "is-active bg-cyan-300/12 text-white" : "text-white/62 hover:bg-white/10 hover:text-white"}`}
              type="button"
              onClick={() => openConversation(conversation.id)}
            >
              <span className="line-clamp-2">{conversation.title || "Conversation"}</span>
            </button>
          ))}
        </div>

        <div className="codrai-chat-inspector mt-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-codrai-cyan">Execution Inspector</p>
          <div className="mt-3 grid gap-2">
            {chatInspector.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-white/45">
            Streaming, attachments, persistence, and voice controls use the existing chat, file, and runtime endpoints.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="codrai-chat-header flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-white">CODRAI Chat</h2>
            <p className="mt-1 text-xs text-white/50">{status}{latencyMs ? ` - first token ${latencyMs} ms` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="codrai-input h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none" value={assistant} onChange={(event) => setAssistant(event.target.value)}>
              <option value="balanced">Balanced</option>
              <option value="coder">Coding</option>
              <option value="premium">Premium reasoning</option>
            </select>
            <button className="codrai-ghost-button h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={regenerate} disabled={streaming || messages.length === 0}>
              <RefreshCcw className="inline h-4 w-4" /> Regenerate
            </button>
            <button className="codrai-icon-button grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-white/70 disabled:opacity-40" type="button" onClick={archiveActiveConversation} disabled={streaming || !conversationId} title="Archive conversation">
              <Archive className="h-4 w-4" />
            </button>
            <button className="codrai-danger-button grid h-10 w-10 place-items-center rounded-lg border border-red-300/20 bg-red-400/10 text-red-100 disabled:opacity-40" type="button" onClick={deleteActiveConversation} disabled={streaming || !conversationId} title="Delete conversation">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="codrai-chat-scroll flex-1 space-y-5 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="grid h-full min-h-80 place-items-center text-center">
              <div className="codrai-chat-empty-state">
                <p className="text-2xl font-black text-white">Ask CODRAI anything</p>
                <p className="mt-3 max-w-lg text-sm leading-6 text-white/55">
                  Messages stream from real configured providers. Conversation persistence requires PostgreSQL migrations and `DATABASE_URL`.
                </p>
                <div className="codrai-chat-templates" aria-label="Prompt templates">
                  {promptTemplates.map((template) => (
                    <button key={template.label} type="button" onClick={() => applyPromptTemplate(template)}>
                      <span>{template.label}</span>
                      <strong>{template.title}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <article key={index} className={`codrai-message mx-auto max-w-4xl ${message.role === "user" ? "text-right" : "text-left"}`}>
                <div className={`codrai-message-bubble inline-block max-w-full rounded-lg border border-white/10 p-4 text-left text-sm leading-7 ${message.role === "user" ? "is-user bg-cyan-300/10" : "is-assistant bg-white/[0.05]"}`}>
                  {message.role === "assistant" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        code({ inline, className, children }) {
                          return inline ? <code className="rounded bg-white/10 px-1 py-0.5">{children}</code> : <CodeBlock className={className}>{children}</CodeBlock>;
                        },
                      }}
                    >
                      {message.content || (message.streaming ? "Thinking..." : "")}
                    </ReactMarkdown>
                  ) : (
                    message.content
                  )}
                </div>
              </article>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {error && <div className="mx-4 mb-3 rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</div>}

        <form className="codrai-chat-composer border-t border-white/10 p-4" onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}>
          <div className="codrai-composer-shell flex items-end gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
            <input ref={fileInputRef} className="hidden" type="file" multiple onChange={onFilesSelected} />
            <button className="codrai-composer-icon grid h-10 w-10 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white" type="button" title="Upload" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-white/35"
              placeholder="Message CODRAI..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button className="codrai-composer-icon grid h-10 w-10 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white" type="button" title="Voice input" onClick={startVoiceInput}>
              <Mic className="h-5 w-5" />
            </button>
            <button className="codrai-composer-icon grid h-10 w-10 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white" type="button" title="Voice output" onClick={speakLastAssistantMessage}>
              <Volume2 className="h-5 w-5" />
            </button>
            {streaming ? (
              <button className="codrai-primary-button grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-950" type="button" onClick={stop} title="Stop">
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button className="codrai-primary-button grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-950" type="submit" title="Send">
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <span key={`${attachment.name}-${attachment.size}`} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/60">
                  {attachment.name}
                </span>
              ))}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
