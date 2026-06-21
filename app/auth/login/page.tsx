"use client";

import { useState, FormEvent, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/today";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!res || res.error) {
      setError(
        res?.error === "CredentialsSignin"
          ? "Invalid email or password"
          : "Something went wrong — try again"
      );
      setStatus("idle");
      return;
    }

    // Hard navigation so the session cookie is picked up by middleware
    setStatus("success");
    window.location.href = callbackUrl;
  }

  return (
    <div className="auth-shell">
      <div className="auth-card slide-up">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "var(--accent)",
            boxShadow: "var(--accent-glow)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
            fontSize: 24,
          }}>✦</div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Welcome back
          </h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Sign in to Pixie
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="input-label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={status !== "idle"}
            />
          </div>
          <div>
            <label className="input-label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={status !== "idle"}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(255,69,58,0.1)",
              border: "1px solid rgba(255,69,58,0.3)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              color: "var(--danger)",
              fontSize: "0.85rem",
            }}>
              {error}
            </div>
          )}

          {status === "success" && (
            <div style={{
              background: "rgba(48,209,88,0.1)",
              border: "1px solid rgba(48,209,88,0.3)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              color: "var(--success)",
              fontSize: "0.85rem",
            }}>
              ✓ Signed in — redirecting…
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={status !== "idle"}
            style={{ marginTop: 4, width: "100%", justifyContent: "center" }}
          >
            {status === "loading" && "Signing in…"}
            {status === "success" && "Redirecting…"}
            {status === "idle" && "Sign in"}
          </button>
        </form>

        <div className="divider" style={{ margin: "20px 0" }} />

        <p style={{ margin: 0, textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

// useSearchParams requires Suspense in Next.js App Router
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
