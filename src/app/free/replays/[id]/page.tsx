import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Footer } from '@/components/footer';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import replaysData from '@/data/replays.json';
import { Replay } from '@/types/replay';
import { Download, Video, ArrowLeft, Calendar, Clock, Map } from 'lucide-react';
import { PaywallLink } from '@/components/auth/paywall-link';
import { SubscriberBadge } from '@/components/subscriber-badge';

const allReplays = replaysData as Replay[];

// Generate static paths for all FREE replays at build time
export async function generateStaticParams() {
  return allReplays
    .filter(replay => replay.isFree === true)
    .map((replay) => ({
      id: replay.id,
    }));
}

// Enable static generation with revalidation
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FreeReplayDetailPage({ params }: PageProps) {
  const { id } = await params;
  const replay = allReplays.find(r => r.id === id);

  // 404 if replay doesn't exist OR if it's not free
  if (!replay || !replay.isFree) {
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
                  unoptimized
                  className="object-contain"
                  priority
                />
                <h1 className="text-2xl font-bold hidden lg:block">Ladder Legends Academy</h1>
              </Link>

              <MainNav />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-8">
            {/* Back Button */}
            <Link
              href="/replays"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Replays
            </Link>

            {/* Title Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold">{replay.title}</h1>
                <SubscriberBadge isFree={replay.isFree} />
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(replay.gameDate).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {replay.duration}
                </div>
                <div className="flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  {replay.map}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{replay.matchup}</span>
                </div>
              </div>
            </div>

            {/* Players Card */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Players</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className={`p-4 rounded-lg border-2 ${replay.player1.result === 'win' ? 'border-green-500 bg-green-500/5' : 'border-border bg-muted/30'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${getRaceColor(replay.player1.race)}`}>
                        {replay.player1.race.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="text-lg font-semibold">{replay.player1.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">{replay.player1.race}</div>
                      </div>
                    </div>
                    {replay.player1.result === 'win' && (
                      <span className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">
                        WIN
                      </span>
                    )}
                  </div>
                  {replay.player1.mmr && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">MMR:</span>{' '}
                      <span className="font-semibold">{replay.player1.mmr}</span>
                    </div>
                  )}
                </div>

                <div className={`p-4 rounded-lg border-2 ${replay.player2.result === 'win' ? 'border-green-500 bg-green-500/5' : 'border-border bg-muted/30'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${getRaceColor(replay.player2.race)}`}>
                        {replay.player2.race.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="text-lg font-semibold">{replay.player2.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">{replay.player2.race}</div>
                      </div>
                    </div>
                    {replay.player2.result === 'win' && (
                      <span className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">
                        WIN
                      </span>
                    )}
                  </div>
                  {replay.player2.mmr && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">MMR:</span>{' '}
                      <span className="font-semibold">{replay.player2.mmr}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Details Card */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Replay Details</h2>
              <dl className="grid md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Map</dt>
                  <dd className="font-medium">{replay.map}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Matchup</dt>
                  <dd className="font-medium">{replay.matchup}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Duration</dt>
                  <dd className="font-medium">{replay.duration}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Game Date</dt>
                  <dd className="font-medium">{new Date(replay.gameDate).toLocaleDateString()}</dd>
                </div>
                {replay.patch && (
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Patch</dt>
                    <dd className="font-medium">{replay.patch}</dd>
                  </div>
                )}
                {replay.coach && (
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Coach</dt>
                    <dd className="font-medium">{replay.coach}</dd>
                  </div>
                )}
              </dl>

              {replay.notes && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{replay.notes}</p>
                </div>
              )}

              {replay.tags && replay.tags.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {replay.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-muted text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              {replay.downloadUrl && (
                <a
                  href={replay.downloadUrl}
                  download
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <Download className="h-5 w-5" />
                  Download Replay
                </a>
              )}
              {replay.videoIds && replay.videoIds.length > 0 && (
                <PaywallLink
                  href={`/library/${replay.videoIds[0]}`}
                  isFree={replay.isFree}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-primary text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium"
                >
                  <Video className="h-5 w-5" />
                  Watch Coaching VOD
                </PaywallLink>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
