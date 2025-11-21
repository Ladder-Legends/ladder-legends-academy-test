import { AboutContent } from '@/components/about-content';
import { Footer } from '@/components/footer';

export const metadata = {
  title: 'About',
  description: 'Learn about Ladder Legends Academy and our mission to help StarCraft II players improve through expert coaching and educational content.',
  openGraph: {
    title: 'About | Ladder Legends Academy',
    description: 'Learn about Ladder Legends Academy and our mission to help StarCraft II players improve through expert coaching and educational content.',
    url: 'https://www.ladderlegendsacademy.com/about',
    siteName: 'Ladder Legends Academy',
    type: 'website',
    images: [
      {
        url: 'https://www.ladderlegendsacademy.com/og-fallback.png',
        width: 1200,
        height: 630,
        alt: 'About Ladder Legends Academy',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About | Ladder Legends Academy',
    description: 'Learn about Ladder Legends Academy and our mission to help StarCraft II players improve through expert coaching and educational content.',
    images: ['https://www.ladderlegendsacademy.com/og-fallback.png'],
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <AboutContent />

      {/* Footer */}
      <Footer />
    </div>
  );
}
