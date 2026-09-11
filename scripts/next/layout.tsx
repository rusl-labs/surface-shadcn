import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Surface / installed Next consumer",
  description: "A clean shadcn registry installation of Surface.",
};

// shadcn init installs the chosen font into this consumer layout.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
