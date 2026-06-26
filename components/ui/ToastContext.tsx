"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  description?: string;
}

interface ToastContextValue {
  toast: (message: string, options?: { variant?: ToastVariant; description?: string }) => void;
}

// ── Context ────────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function Icon({ variant }: { variant: ToastVariant }) {
  if (variant === "success") return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7.5" cy="7.5" r="6.5" stroke="var(--success)" strokeWidth="1.4" />
      <path d="M4.5 7.5L6.5 9.5L10.5 5.5" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (variant === "error") return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7.5" cy="7.5" r="6.5" stroke="var(--danger)" strokeWidth="1.4" />
      <path d="M5 5l5 5M10 5l-5 5" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7.5" cy="7.5" r="6.5" stroke="var(--info)" strokeWidth="1.4" />
      <path d="M7.5 5v1M7.5 7.5v3" stroke="var(--info)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Single toast item ──────────────────────────────────────────────────────────

const ACCENT: Record<ToastVariant, string> = {
  success: "var(--success)",
  error:   "var(--danger)",
  info:    "var(--info)",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <div
      className="toast-item"
      style={{ borderLeft: `3px solid ${ACCENT[toast.variant]}` }}
      onClick={() => onDismiss(toast.id)}
      role="alert"
    >
      <Icon variant={toast.variant} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="toast-message">{toast.message}</div>
        {toast.description && (
          <div className="toast-description">{toast.description}</div>
        )}
      </div>
      <button className="toast-close" onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((
    message: string,
    options?: { variant?: ToastVariant; description?: string },
  ) => {
    const id = `toast-${++counter.current}`;
    const item: Toast = {
      id,
      message,
      variant: options?.variant ?? "info",
      description: options?.description,
    };
    setToasts((prev) => [...prev, item]);
    // Auto-dismiss after 4s
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-stack" aria-live="polite">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
