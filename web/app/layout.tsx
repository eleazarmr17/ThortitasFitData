import type { Metadata } from "next";
import "./globals.css";
import Pwa from "./pwa";

export const metadata: Metadata = {
  title: "Thortitas Fit Data — Stronger together",
  description: "Your private space to train, track your progress, and grow stronger together.",
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
      <body className="antialiased">{children}<Pwa /></body>
    </html>
  );
}
