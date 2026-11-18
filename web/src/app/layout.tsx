import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "aligned: New York jobs, sorted by what you want",
  description: "Every open job in New York, matched to what you actually want.",
};

// The screens' inline styles name "Inter" and "Instrument Serif" directly, as in the mockup.
const FONTS =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>{children}</body>
    </html>
  );
}
