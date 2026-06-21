import type { Metadata } from "next";
import "./globals.css";
import { TopBar } from "@/components/layout/TopBar";

export const metadata: Metadata = {
  title: "Pixie — Smart Tasks",
  description: "Beautiful task management for humans and agents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        <div className="pt-11">{children}</div>
      </body>
    </html>
  );
}
