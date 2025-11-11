import { AboutContent } from '@/components/about-content';
import { Footer } from '@/components/footer';

export const metadata = {
  title: 'About - Ladder Legends Academy',
  description: 'Learn about Ladder Legends Academy and our mission to help StarCraft II players improve',
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
