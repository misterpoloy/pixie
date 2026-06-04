"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function createApiKey() {
    if (!keyName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: keyName }),
    });
    const data = await res.json();
    if (data.ok) {
      setNewKey(data.data.key);
      setKeyName("");
    }
    setCreating(false);
  }

  return (
    <>
      <h1 className="page-title">Settings</h1>

      <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 600 }}>Agent API Keys</h2>
        <p style={{ margin: "0 0 16px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Generate keys for LLM agents and MCP clients to access Pixie via Bearer token.
          Keys are shown only once — store them securely.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            className="input"
            placeholder="Key name (e.g. Claude agent)"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createApiKey()}
          />
          <button
            className="btn btn-primary"
            onClick={createApiKey}
            disabled={creating || !keyName.trim()}
            style={{ flexShrink: 0 }}
          >
            {creating ? "Creating…" : "Create key"}
          </button>
        </div>

        {newKey && (
          <div style={{
            background: "rgba(124,110,247,0.1)",
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius-sm)",
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600, marginBottom: 6 }}>
              ✓ Key created — copy it now, it won&apos;t be shown again
            </div>
            <code style={{
              display: "block",
              fontSize: "0.8rem",
              wordBreak: "break-all",
              color: "var(--text-primary)",
              fontFamily: "monospace",
            }}>{newKey}</code>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 10 }}
              onClick={() => navigator.clipboard.writeText(newKey)}
            >
              Copy to clipboard
            </button>
          </div>
        )}
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 600 }}>MCP Server</h2>
        <p style={{ margin: "0 0 12px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Connect LLM agents to Pixie using the MCP protocol. Use your API key as Bearer token.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Tool manifest:</div>
          <code style={{
            background: "rgba(255,255,255,0.04)",
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.8rem",
            color: "var(--text-primary)",
          }}>
            GET /api/mcp<br />
            Authorization: Bearer &lt;your-api-key&gt;
          </code>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4 }}>Tool execution:</div>
          <code style={{
            background: "rgba(255,255,255,0.04)",
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.8rem",
            color: "var(--text-primary)",
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
