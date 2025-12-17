import type { Metadata } from "next";
import { Press_Start_2P, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const pressStart = Press_Start_2P({
  weight: "400",
  variable: "--font-press-start",
  subsets: ["latin"],
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  variable: "--font-share-tech",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SlitherMoney - Crypto Snake Battle",
  description: "Stake tokens, battle opponents, win the pot!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${pressStart.variable} ${shareTechMono.variable} antialiased bg-gray-900 text-white`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
