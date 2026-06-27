"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

interface LayoutContextValue {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  sidebarOpen: true,
  openSidebar: () => {},
  closeSidebar: () => {},
  toggleSidebar: () => {},
});

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  // Default true (visible) on desktop; mobile overrides via CSS anyway
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Restore desktop preference from localStorage
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) {
      const saved = localStorage.getItem("pixie:sidebar");
      if (saved === "false") setSidebarOpen(false);
    } else {
      setSidebarOpen(false); // mobile: always start closed
    }
  }, []);

  // Sync body data attr for CSS-driven layout shifts
  useEffect(() => {
    document.body.dataset.sidebar = sidebarOpen ? "open" : "closed";
  }, [sidebarOpen]);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => {
      const next = !v;
      if (window.innerWidth > 768) {
        localStorage.setItem("pixie:sidebar", String(next));
      }
      return next;
    });
  }, []);

  return (
    <LayoutContext.Provider value={{ sidebarOpen, openSidebar, closeSidebar, toggleSidebar }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
