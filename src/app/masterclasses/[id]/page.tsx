import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import masterclassesData from '@/data/masterclasses.json';
import { Masterclass } from '@/types/masterclass';
import { Play, ArrowLeft, Clock } from 'lucide-react';

const allMasterclasses = masterclassesData as Masterclass[];

export async function generateStaticParams() {
  return allMasterclasses.map((masterclass) => ({
    id: masterclass.id,
  }));
}

export default function MasterclassDetailPage({ params }: { params: { id: string } }) {
  const masterclass = allMasterclasses.find(mc => mc.id === params.id);

  if (!masterclass) {
    notFound();
  }

  const getRaceColor = (race: string) => {
    switch (race.toLowerCase()) {
      case 'terran': return 'text-orange-500';
      case 'zerg': return 'text-purple-500';
      case 'protoss': return 'text-cyan-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                <Image
                  src="/LL_LOGO.png"
                  alt="Ladder Legends"
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
                <h1 className="text-2xl font-bold hidden lg:block">Ladder Legends Academy</h1>
              </Link>

              <MainNav />
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-8">
            {/* Back Button */}
            <Link
              href="/masterclasses"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Masterclasses
            </Link>

            {/* Title Section */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold">{masterclass.title}</h1>
              <p className="text-lg text-muted-foreground leading-relaxed">{masterclass.description}</p>
            </div>

            {/* Info Card */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Masterclass Information</h2>
              <dl className="grid md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Coach</dt>
                  <dd className="font-medium">{masterclass.coach}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Race</dt>
                  <dd className={`font-medium capitalize ${getRaceColor(masterclass.race)}`}>{masterclass.race}</dd>
                </div>
                {masterclass.duration && (
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Duration</dt>
                    <dd className="font-medium flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {masterclass.duration}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Difficulty</dt>
                  <dd className="font-medium capitalize">{masterclass.difficulty}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Created</dt>
                  <dd className="font-medium">{new Date(masterclass.createdAt).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Last Updated</dt>
                  <dd className="font-medium">{new Date(masterclass.updatedAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>

            {/* Video Player */}
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${masterclass.videoId}`}
                  title={masterclass.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Tags */}
            {masterclass.tags && masterclass.tags.length > 0 && (
              <div className="border border-border rounded-lg p-6 bg-card">
                <h2 className="text-xl font-semibold mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {masterclass.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-muted text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Watch on YouTube Button */}
            <div className="flex gap-4">
              <a
                href={`https://youtube.com/watch?v=${masterclass.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <Play className="h-5 w-5" />
                Watch on YouTube
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-8 mt-12">
        <div className="text-center text-sm text-muted-foreground">
          © 2025 Ladder Legends Academy. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
