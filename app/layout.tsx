import type { Metadata } from "next";
import "./globals.css";
import { TopBar } from "@/components/layout/TopBar";
import { LayoutProvider } from "@/components/layout/LayoutContext";
import MobileNav from "@/components/layout/MobileNav";

export const metadata: Metadata = {
  title: "Pixie — Smart Tasks",
  description: "Beautiful task management for humans and agents",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LayoutProvider>
          <TopBar />
          <div className="pt-11">{children}</div>
          <MobileNav />
        </LayoutProvider>
      </body>
    </html>
  );
}
