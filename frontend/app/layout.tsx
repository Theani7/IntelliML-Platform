import type { Metadata } from "next";
import { Inter, Gloock } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const gloock = Gloock({ weight: "400", subsets: ["latin"], variable: "--font-gloock" });
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "IntelliML",
  description: "Upload data. Ask questions. Get instant ML insights.",
  openGraph: {
    title: "IntelliML",
    description: "Upload data. Ask questions. Get instant ML insights.",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1731,
        height: 909,
        alt: "IntelliML - Intelligent Data Future",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IntelliML",
    description: "Upload data. Ask questions. Get instant ML insights.",
    images: ["/og-image.png"],
  },
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
