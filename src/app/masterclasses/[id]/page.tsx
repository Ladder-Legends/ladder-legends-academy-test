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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

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
              <div className="flex flex-wrap gap-3">
                <span className={`px-3 py-1.5 text-sm font-medium text-white rounded-full ${getDifficultyColor(masterclass.difficulty)}`}>
                  {masterclass.difficulty}
                </span>
                <span className={`px-3 py-1.5 text-sm font-medium rounded-full bg-muted capitalize ${getRaceColor(masterclass.race)}`}>
                  {masterclass.race}
                </span>
                <span className="px-3 py-1.5 text-sm font-medium bg-muted rounded-full flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {masterclass.totalDuration}
                </span>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">{masterclass.description}</p>
            </div>

            {/* Info Card */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Series Information</h2>
              <dl className="grid md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Coach</dt>
                  <dd className="font-medium">{masterclass.coach}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Race</dt>
                  <dd className={`font-medium capitalize ${getRaceColor(masterclass.race)}`}>{masterclass.race}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Episodes</dt>
                  <dd className="font-medium">{masterclass.episodes.length}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Total Duration</dt>
                  <dd className="font-medium">{masterclass.totalDuration}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Difficulty</dt>
                  <dd className="font-medium capitalize">{masterclass.difficulty}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Last Updated</dt>
                  <dd className="font-medium">{new Date(masterclass.updatedAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>

            {/* Episodes */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Episodes</h2>
              <div className="space-y-4">
                {masterclass.episodes.map((episode) => (
                  <div
                    key={episode.episodeNumber}
                    className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded">
                            EP {episode.episodeNumber}
                          </span>
                          <h3 className="text-lg font-semibold">{episode.title}</h3>
                        </div>
                        {episode.description && (
                          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                            {episode.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {episode.duration}
                          </div>
                        </div>
                      </div>
                      <a
                        href={`https://youtube.com/watch?v=${episode.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium text-sm"
                      >
                        <Play className="h-4 w-4" />
                        Watch
                      </a>
                    </div>
                  </div>
                ))}
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

            {/* Start Watching Button */}
            <div className="flex gap-4">
              <a
                href={`https://youtube.com/watch?v=${masterclass.episodes[0].videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <Play className="h-5 w-5" />
                Start Watching Series
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
