import type { Metadata } from "next";
import { Inter, Gloock } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const gloock = Gloock({ weight: "400", subsets: ["latin"], variable: "--font-gloock" });

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
      <body className={`${inter.variable} ${gloock.variable} antialiased transition-colors duration-300 font-sans`}>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
