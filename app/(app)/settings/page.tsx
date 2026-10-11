"use client";

import { useState } from "react";
import { Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";

export default function SettingsPage() {
  const { toast } = useToast();
  const [keyName, setKeyName]   = useState("");
  const [newKey, setNewKey]     = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied]     = useState(false);

  async function createApiKey() {
    if (!keyName.trim()) return;
    setCreating(true);
    setNewKey(null);
    try {
      const res  = await fetch("/api/keys", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: keyName.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        const msg = data?.error ?? `Server error (${res.status})`;
        toast(msg, { variant: "error", description: "The key was not created. Try again." });
        return;
      }

      setNewKey(data.data.key);
      setKeyName("");
      toast("API key created", {
        variant:     "success",
        description: "Copy it now — it won't be shown again.",
      });
    } catch (err) {
      console.error("[settings] createApiKey error:", err);
      toast("Network error", {
        variant:     "error",
        description: "Could not reach the server. Check your connection.",
      });
    } finally {
      setCreating(false);
    }
  }

  async function copyKey() {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      toast("Copied to clipboard", { variant: "success" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Copy failed", {
        variant:     "error",
        description: "Select the key text and copy it manually.",
      });
    }
  }

  return (
    <>
      <h1 className="page-title">Settings</h1>

      {/* ── API Keys ─────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 600 }}>
          Agent API Keys
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Generate keys for LLM agents and MCP clients to access Pixie via Bearer token.
          Keys are shown only once — store them securely.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            className="input"
            placeholder="Key name (e.g. eagle-62-jetson)"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !creating && createApiKey()}
            disabled={creating}
          />
          <button
            className="btn btn-primary"
            onClick={createApiKey}
            disabled={creating || !keyName.trim()}
            style={{ flexShrink: 0, minWidth: 110, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            {creating ? (
              <>
                <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} />
                Creating…
              </>
            ) : (
              "Create key"
            )}
          </button>
        </div>

        {/* Spinner keyframe (inline so no CSS file change needed) */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {newKey && (
          <div style={{
            background:    "rgba(124,110,247,0.1)",
            border:        "1px solid var(--accent)",
            borderRadius:  "var(--radius-sm)",
            padding:       "14px 16px",
          }}>
            <div style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600, marginBottom: 6 }}>
              ✓ Key created — copy it now, it won&apos;t be shown again
            </div>
            <code style={{
              display:     "block",
              fontSize:    "0.8rem",
              wordBreak:   "break-all",
              color:       "var(--text-primary)",
              fontFamily:  "monospace",
              userSelect:  "all",
            }}>
              {newKey}
            </code>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}
              onClick={copyKey}
            >
              {copied
                ? <><Check size={13} /> Copied!</>
                : <><Copy size={13} /> Copy to clipboard</>}
            </button>
          </div>
        )}
      </div>

      {/* ── MCP Server ───────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 600 }}>
          MCP Server
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Connect LLM agents to Pixie using the MCP protocol. Use your API key as Bearer token.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Tool manifest:</div>
          <code style={{
            background:   "rgba(255,255,255,0.04)",
            padding:      "10px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize:     "0.8rem",
            color:        "var(--text-primary)",
          }}>
            GET /api/mcp<br />
            Authorization: Bearer &lt;your-api-key&gt;
          </code>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4 }}>Tool execution:</div>
          <code style={{
            background:   "rgba(255,255,255,0.04)",
            padding:      "10px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize:     "0.8rem",
            color:        "var(--text-primary)",
          }}>
            POST /api/mcp<br />
            Authorization: Bearer &lt;your-api-key&gt;<br />
            {`{ "tool": "create_task", "input": { "title": "..." } }`}
          </code>
        </div>
      </div>
    </>
  );
}
