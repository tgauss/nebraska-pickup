import type { Metadata, Viewport } from "next";
import { Oswald, Source_Serif_4, Geist_Mono } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/components/ChatWidget";

const oswald = Oswald({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-serif",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nebraska Devaney Pickup",
  description: "Schedule your Devaney arena seat and memorabilia pickup",
  icons: {
    icon: [{ url: "/favicon.png", sizes: "any", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#D00000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${oswald.variable} ${sourceSerif.variable} ${geistMono.variable} scroll-smooth`}>
      <body className="font-sans antialiased min-h-[100svh] bg-background text-foreground">
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
