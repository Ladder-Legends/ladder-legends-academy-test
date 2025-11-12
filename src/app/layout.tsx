import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import { SessionProvider } from "@/components/session-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { BackgroundEffects } from "@/components/ui/background-effects";
import { Toaster } from "@/components/ui/toaster";
import { CommitButton } from "@/components/admin/commit-button";
import { Header } from "@/components/header";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.ladderlegendsacademy.com'),
  title: {
    default: "Ladder Legends Academy | Starcraft 2 Coaching",
    template: "%s | Ladder Legends Academy",
  },
  description: "Master Starcraft 2 with expert coaching from Ladder Legends Academy. Learn from Grandmaster coaches, watch professional replays, and improve your gameplay with build orders and masterclasses.",
  keywords: ["StarCraft 2", "SC2", "StarCraft coaching", "Grandmaster", "esports", "RTS", "strategy games", "Terran", "Zerg", "Protoss", "build orders", "replay analysis"],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.ladderlegendsacademy.com',
    siteName: 'Ladder Legends Academy',
    title: "Ladder Legends Academy | Starcraft 2 Coaching",
    description: "Master Starcraft 2 with expert coaching from Ladder Legends Academy. Learn from Grandmaster coaches, watch professional replays, and improve your gameplay.",
    images: [
      {
        url: 'https://www.ladderlegendsacademy.com/logos/icon-red.png',
        width: 512,
        height: 512,
        alt: 'Ladder Legends Academy Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Ladder Legends Academy | Starcraft 2 Coaching",
    description: "Master Starcraft 2 with expert coaching from Ladder Legends Academy. Learn from Grandmaster coaches, watch professional replays, and improve your gameplay.",
    images: ['https://www.ladderlegendsacademy.com/logos/icon-red.png'],
  },
  icons: {
    icon: '/logos/icon.png',
    apple: '/logos/icon.png',
  },
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

              // Utility function to clear Mux token cache (available in console)
              window.clearMuxCache = function() {
                let cleared = 0;
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.startsWith('mux-token-')) {
                    keys.push(key);
                  }
                }
                keys.forEach(key => {
                  try {
                    localStorage.removeItem(key);
                    cleared++;
                    console.log('✓ Cleared: ' + key);
                  } catch (err) {
                    console.error('✗ Failed to clear: ' + key, err);
                  }
                });
                console.log('🎉 Cleared ' + cleared + ' Mux token cache entries');
                console.log('Please refresh the page to fetch fresh tokens.');
                return cleared;
              };
            `,
          }}
        />
      </head>
      <body
        className={`${lexend.variable} antialiased`}
      >
        <BackgroundEffects />
        <SessionProvider>
          <PostHogProvider>
            <Header />
            {children}
            <CommitButton />
          </PostHogProvider>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
