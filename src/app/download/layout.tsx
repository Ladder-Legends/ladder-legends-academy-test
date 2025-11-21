import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Download Ladder Legends Uploader | Auto-Upload SC2 Replays',
  description: 'Download the Ladder Legends Uploader for automatic StarCraft 2 replay uploads. Available for macOS and Windows. Get instant analysis and track your progress effortlessly.',
  openGraph: {
    title: 'Download Ladder Legends Uploader - Auto-Upload Your SC2 Replays',
    description: 'Download the Ladder Legends Uploader for automatic StarCraft 2 replay uploads. Available for macOS and Windows. Track your progress effortlessly.',
    url: 'https://www.ladderlegendsacademy.com/download',
    siteName: 'Ladder Legends Academy',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Download Ladder Legends Uploader - Auto-Upload Your SC2 Replays',
    description: 'Automatic StarCraft 2 replay uploads for macOS and Windows. Get instant analysis and track your progress.',
  },
};

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
