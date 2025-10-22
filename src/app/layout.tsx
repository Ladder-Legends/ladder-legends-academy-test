import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/session-provider";
import { BackgroundEffects } from "@/components/ui/background-effects";
import { Toaster } from "@/components/ui/toaster";
import { CommitButton } from "@/components/admin/commit-button";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ladder Legends Academy | Starcraft 2 Coaching",
  description: "Master Starcraft 2 with expert coaching from Ladder Legends Academy",
  icons: {
    icon: '/LL_LOGO.png',
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
        <BackgroundEffects />
        <SessionProvider>
          {children}
          <CommitButton />
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
