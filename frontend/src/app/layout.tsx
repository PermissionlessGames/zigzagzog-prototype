import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/contexts/Web3Context";
import Header from "./components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zig Zag Zog",
  description: "A permissionless game of shapes and strategy",
  icons: {
    icon: [],  // This removes the default Next.js favicon
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Web3Provider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable}`}>
          <Header />
          <main className="pt-16">
            {children}
          </main>
        </body>
      </html>
    </Web3Provider>
  );
}
