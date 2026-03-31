import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Virtual Try-On - Batch Warmup",
  description:
    "Pre-generate try-on images for the entire catalog for instant display",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-950 text-white">{children}</body>
    </html>
  );
}
