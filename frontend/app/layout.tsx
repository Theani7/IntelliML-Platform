import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IntelliML Platform",
  description: "Voice-Activated Intelligent ML Platform with Multi-Modal Analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}