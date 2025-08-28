import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import * as Tooltip from "@radix-ui/react-tooltip";
import App from "./App";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Astraea",
  description: "Astraea",
  icons: {
    icon: "/astraea-logo.svg",
    shortcut: "/astraea-logo.svg",
    apple: "/astraea-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Tooltip.Provider
          delayDuration={150}
          skipDelayDuration={150}
          disableHoverableContent
        >
          <App>{children}</App>
        </Tooltip.Provider>
      </body>
    </html>
  );
}
