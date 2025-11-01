import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/session-provider";
import { PostHogProvider } from "@/components/posthog-provider";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Check localStorage first (user preference)
                  const stored = localStorage.getItem('theme');
                  if (stored) {
                    if (stored === 'dark') {
                      document.documentElement.classList.add('dark');
                    }
                    return;
                  }

                  // Fall back to system preference
                  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {
                  // Ignore errors (e.g., localStorage not available)
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <BackgroundEffects />
        <SessionProvider>
          <PostHogProvider>
            {children}
            <CommitButton />
          </PostHogProvider>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
