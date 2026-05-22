import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kichkintoy",
  description: "Kindergarten communication platform for Uzbekistan"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
