"use client";

// Generic right sidebar that accepts any widget children.
// Mount this in a page; it sets a body data-layout attribute so the
// main content width auto-adjusts via CSS without touching the app layout.

import { useEffect } from "react";

interface Props {
  children: React.ReactNode;
}

export default function RightBar({ children }: Props) {
  useEffect(() => {
    document.body.dataset.layout = (document.body.dataset.layout ?? "")
      .split(" ")
      .filter(Boolean)
      .concat("right-bar")
      .join(" ");

    return () => {
      document.body.dataset.layout = (document.body.dataset.layout ?? "")
        .split(" ")
        .filter((v) => v !== "right-bar")
        .join(" ");
    };
  }, []);

  return <aside className="right-bar">{children}</aside>;
}
