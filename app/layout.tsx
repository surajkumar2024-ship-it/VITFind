import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VITFind Campus · Lost & found",
  description: "Report an item, discover a match, and arrange a safe return at VIT.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
