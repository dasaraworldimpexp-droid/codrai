import { Check, Copy } from "lucide-react";
import { useState } from "react";

export default function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const language = /language-(\w+)/.exec(className || "")?.[1];
  const code = String(children || "").replace(/\n$/, "");

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-white/50">
        <span>{language || "code"}</span>
        <button className="inline-flex items-center gap-1 text-white/70 hover:text-white" type="button" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-6">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
