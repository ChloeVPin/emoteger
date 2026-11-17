import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

/* One family. The opsz axis gives headings Inter Display's optics automatically. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Emoteger", template: "%s · Emoteger" },
  description: "Manage your Discord server's emotes.",
  // Already dark: ask Dark Reader not to rewrite the page (it also breaks hydration).
  other: { "darkreader-lock": "" },
};

export const viewport: Viewport = {
  themeColor: "#141312",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
