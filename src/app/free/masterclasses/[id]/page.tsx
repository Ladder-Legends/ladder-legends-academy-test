'use client';

import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Footer } from '@/components/footer';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import masterclassesData from '@/data/masterclasses.json';
import { Masterclass } from '@/types/masterclass';
import { Play, ArrowLeft } from 'lucide-react';
import { SubscriberBadge } from '@/components/subscriber-badge';
import { PaywallLink } from '@/components/auth/paywall-link';
import { getContentVideoUrl } from '@/lib/video-helpers';
import { Video, isMuxVideo, getVideoThumbnailUrl } from '@/types/video';
import { MuxVideoPlayer } from '@/components/videos/mux-video-player';
import videosData from '@/data/videos.json';
import { use, useState, useEffect } from 'react';
import { Replay } from '@/types/replay';
import { BuildOrder } from '@/types/build-order';
import replaysData from '@/data/replays.json';
import buildOrdersData from '@/data/build-orders.json';

const allMasterclasses = masterclassesData as Masterclass[];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FreeMasterclassDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const masterclass = allMasterclasses.find(mc => mc.id === id);

  // Initialize from URL query param if present
  const [currentVideoIndex, setCurrentVideoIndex] = useState(() => {
    const vParam = searchParams.get('v');
    if (vParam !== null) {
      const index = parseInt(vParam, 10);
      return !isNaN(index) && index >= 0 ? index : 0;
    }
    return 0;
  });

  // 404 if masterclass doesn't exist OR if it's not free
  if (!masterclass || !masterclass.isFree) {
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

  // Look up videos
  const videos = videosData as Video[];
  const masterclassVideos = masterclass.videoIds && masterclass.videoIds.length > 0
    ? masterclass.videoIds.map(videoId =>
        videos.find(v => v.id === videoId || v.youtubeId === videoId)
      ).filter(Boolean) as Video[]
    : [];

  const hasMultipleVideos = masterclassVideos.length > 1;
  const currentVideo = masterclassVideos[currentVideoIndex] || null;

  // Update URL when video index changes in playlists
  const handleVideoSelect = (index: number) => {
    setCurrentVideoIndex(index);

    // Update URL with query param for playlists
    if (hasMultipleVideos) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('v', index.toString());
      router.push(`?${params.toString()}`, { scroll: false });
    }
  };

  // Update document title when video changes
  useEffect(() => {
    const displayTitle = hasMultipleVideos && currentVideo
      ? `${currentVideo.title} - ${masterclass.title} | Ladder Legends Academy`
      : `${masterclass.title} | Ladder Legends Academy`;

    document.title = displayTitle;
  }, [currentVideoIndex, hasMultipleVideos, currentVideo, masterclass.title]);

  // Look up replays
  const allReplays = replaysData as Replay[];
  const masterclassReplays = masterclass.replayIds && masterclass.replayIds.length > 0
    ? masterclass.replayIds.map(replayId =>
        allReplays.find(r => r.id === replayId)
      ).filter(Boolean) as Replay[]
    : [];

  // Look up build orders associated with the replays
  const allBuildOrders = buildOrdersData as BuildOrder[];
  const replayBuildOrders = new Map<string, BuildOrder[]>();
  masterclassReplays.forEach(replay => {
    const buildOrders = allBuildOrders.filter(bo => bo.replayId === replay.id);
    if (buildOrders.length > 0) {
      replayBuildOrders.set(replay.id, buildOrders);
    }
  });

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
      <main className="flex-1 px-4 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            {/* Back Button */}
            <Link
              href="/masterclasses"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Masterclasses
            </Link>

            {/* Video Player and Playlist Layout */}
            <div className={hasMultipleVideos ? 'grid lg:grid-cols-4 gap-6' : ''}>
              {/* Main Video Player Section */}
              <div className={hasMultipleVideos ? 'lg:col-span-3' : ''}>
                {/* Video Player - render all playlist videos but hide inactive ones to avoid reload */}
                {hasMultipleVideos ? (
                  <div className="relative">
                    {masterclassVideos.map((video, index) => (
                      <div
                        key={video.id}
                        className={currentVideoIndex === index ? 'block' : 'hidden'}
                      >
                        {isMuxVideo(video) ? (
                          video.muxPlaybackId ? (
                            <MuxVideoPlayer
                              playbackId={video.muxPlaybackId}
                              videoId={video.id}
                              title={video.title}
                              className="rounded-lg overflow-hidden"
                            />
                          ) : (
                            <div className="aspect-video bg-black/10 rounded-lg flex items-center justify-center">
                              <div className="text-center p-4">
                                <p className="text-muted-foreground">
                                  {video.muxAssetStatus === 'preparing' ? 'Video is processing...' : 'Video not available'}
                                </p>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="aspect-video bg-black rounded-lg overflow-hidden">
                            <iframe
                              width="100%"
                              height="100%"
                              src={`https://www.youtube.com/embed/${video.youtubeId}`}
                              title={video.title}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            ></iframe>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Single video (not a playlist)
                  currentVideo ? (
                    isMuxVideo(currentVideo) ? (
                      currentVideo.muxPlaybackId ? (
                        <MuxVideoPlayer
                          playbackId={currentVideo.muxPlaybackId}
                          videoId={currentVideo.id}
                          title={currentVideo.title}
                          className="rounded-lg overflow-hidden"
                        />
                      ) : (
                        <div className="aspect-video bg-black/10 rounded-lg flex items-center justify-center">
                          <div className="text-center p-4">
                            <p className="text-muted-foreground">
                              {currentVideo.muxAssetStatus === 'preparing' ? 'Video is processing...' : 'Video not available'}
                            </p>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${currentVideo.youtubeId}`}
                          title={currentVideo.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        ></iframe>
                      </div>
                    )
                  ) : null
                )}

                {/* Masterclass Info */}
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-bold">{masterclass.title}</h1>
                      <SubscriberBadge isFree={masterclass.isFree} />
                    </div>
                    <p className="text-lg text-muted-foreground leading-relaxed">{masterclass.description}</p>
                  </div>

                  {/* Info Card */}
                  <div className="border border-border rounded-lg p-6 bg-card">
                    <h2 className="text-xl font-semibold mb-4">Masterclass Information</h2>
                    <dl className="grid md:grid-cols-2 gap-4">
                      {masterclass.coach && (
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Coach</dt>
                          <dd className="font-medium">{masterclass.coach}</dd>
                        </div>
                      )}
                      {masterclass.race && (
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Race</dt>
                          <dd className={`font-medium capitalize ${getRaceColor(masterclass.race)}`}>{masterclass.race}</dd>
                        </div>
                      )}
                      {masterclass.difficulty && (
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Difficulty</dt>
                          <dd className="font-medium capitalize">{masterclass.difficulty}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-sm text-muted-foreground mb-1">Created</dt>
                        <dd className="font-medium">{new Date(masterclass.createdAt).toLocaleDateString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground mb-1">Last Updated</dt>
                        <dd className="font-medium">{new Date(masterclass.updatedAt).toLocaleDateString()}</dd>
                      </div>
                      {hasMultipleVideos && (
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Videos</dt>
                          <dd className="font-medium">{masterclassVideos.length} videos</dd>
                        </div>
                      )}
                    </dl>
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

                  {/* Replays Section */}
                  {masterclassReplays.length > 0 && (
                    <div className="border border-border rounded-lg p-6 bg-card">
                      <h2 className="text-xl font-semibold mb-4">Example Replays</h2>
                      <div className="space-y-4">
                        {masterclassReplays.map(replay => (
                          <div key={replay.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                            <Link href={`/replays/${replay.id}`} className="block">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg mb-1">{replay.title}</h3>
                                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                    <span>{replay.matchup}</span>
                                    <span>•</span>
                                    <span>{replay.map}</span>
                                    <span>•</span>
                                    <span>{replay.duration}</span>
                                  </div>
                                </div>
                                <div className="text-primary hover:underline">View →</div>
                              </div>
                            </Link>

                            {/* Associated Build Orders */}
                            {replayBuildOrders.has(replay.id) && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">Related Build Orders:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {replayBuildOrders.get(replay.id)!.map(buildOrder => (
                                    <Link
                                      key={buildOrder.id}
                                      href={`/build-orders/${buildOrder.id}`}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-md text-sm hover:bg-primary/20 transition-colors"
                                    >
                                      {buildOrder.name}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Playlist Sidebar (only shown for playlists) */}
              {hasMultipleVideos && (
                <div className="lg:col-span-1">
                  <div className="border border-border rounded-lg bg-card overflow-hidden sticky top-24">
                    <div className="h-[calc(100vh-7rem)] overflow-y-auto">
                      {masterclassVideos.map((video, index) => (
                        <div
                          key={video.id}
                          className={`relative group border-b-2 border-foreground/20 last:border-b-0 ${
                            currentVideoIndex === index ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                          }`}
                        >
                          <button
                            onClick={() => handleVideoSelect(index)}
                            className="w-full p-2 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex flex-col px-2">
                              {/* Thumbnail */}
                              <div className="aspect-video bg-muted rounded overflow-hidden mb-2 w-full">
                                <Image
                                  key={`${video.id}-thumb`}
                                  src={getVideoThumbnailUrl(video, 'medium')}
                                  alt={video.title}
                                  width={320}
                                  height={180}
                                  unoptimized
                                  className="object-cover w-full h-full"
                                />
                              </div>
                              <p className="text-xs font-medium line-clamp-2 text-center pb-1 w-full">{video.title}</p>
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
