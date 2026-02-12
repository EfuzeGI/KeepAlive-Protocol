import type { Metadata } from "next";
import "./globals.css";
import { NearProvider } from "@/contexts/NearContext";

export const metadata: Metadata = {
  title: "Sentinel",
  description: "Dead Man's Switch on NEAR Protocol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#050505] text-white antialiased">
        <NearProvider>
          {children}
        </NearProvider>
      </body>
    </html>
  );
}
