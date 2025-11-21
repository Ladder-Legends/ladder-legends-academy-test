import { CoachesContent } from '@/components/coaches-content';
import { Footer } from '@/components/footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Coaches',
  description: 'Meet our team of Grandmaster StarCraft 2 coaches. Expert players specializing in Terran, Zerg, and Protoss gameplay ready to help you improve.',
  openGraph: {
    title: 'Our Coaches | Ladder Legends Academy',
    description: 'Meet our team of Grandmaster StarCraft 2 coaches. Expert players specializing in Terran, Zerg, and Protoss gameplay ready to help you improve.',
    url: 'https://www.ladderlegendsacademy.com/coaches',
    siteName: 'Ladder Legends Academy',
    type: 'website',
    images: [
      {
        url: 'https://www.ladderlegendsacademy.com/og-fallback.png',
        width: 1200,
        height: 630,
        alt: 'Ladder Legends Academy Coaches',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Our Coaches | Ladder Legends Academy',
    description: 'Meet our team of Grandmaster StarCraft 2 coaches. Expert players specializing in Terran, Zerg, and Protoss gameplay ready to help you improve.',
    images: ['https://www.ladderlegendsacademy.com/og-fallback.png'],
  },
};

export default function CoachesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <CoachesContent />

      {/* Footer */}
      <Footer />
    </div>
  );
}
