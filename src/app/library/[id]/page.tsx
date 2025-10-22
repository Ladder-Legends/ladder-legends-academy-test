'use client';

import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import videosData from '@/data/videos.json';
import { Video, isPlaylist, getYoutubeIds } from '@/types/video';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState, use } from 'react';

const allVideos = videosData as Video[];

export default function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const video = allVideos.find(v => v.id === id);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  if (!video) {
    notFound();
  }

  const videoIsPlaylist = isPlaylist(video);
  const youtubeIds = getYoutubeIds(video);
  const currentYoutubeId = youtubeIds[currentVideoIndex];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-4 lg:px-6 py-4">
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
      <main className="flex-1 px-4 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            {/* Back Button */}
            <Link
              href="/library"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Library
            </Link>

            {/* Video Player and Playlist Layout */}
            <div className={videoIsPlaylist ? 'grid lg:grid-cols-3 gap-6' : ''}>
              {/* Main Video Player Section */}
              <div className={videoIsPlaylist ? 'lg:col-span-2' : ''}>
                {/* Video Player */}
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${currentYoutubeId}`}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>

                {/* Video Info */}
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold">{video.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        <span>{formatDate(video.date)}</span>
                      </div>
                      {video.coach && (
                        <>
                          <span>•</span>
                          <span>Coach: {video.coach}</span>
                        </>
                      )}
                      {videoIsPlaylist && (
                        <>
                          <span>•</span>
                          <span>{youtubeIds.length} videos</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {video.tags && video.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {video.tags.map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-muted hover:bg-muted/80 text-foreground border-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  {video.description && (
                    <div className="border border-border rounded-lg p-6 bg-card">
                      <h2 className="text-xl font-semibold mb-3">About</h2>
                      <p className="text-muted-foreground leading-relaxed">{video.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Playlist Sidebar (only shown for playlists) */}
              {videoIsPlaylist && (
                <div className="lg:col-span-1">
                  <div className="border border-border rounded-lg bg-card overflow-hidden sticky top-24">
                    <div className="p-4 border-b border-border bg-muted/50">
                      <h2 className="font-semibold">Playlist</h2>
                      <p className="text-sm text-muted-foreground">{youtubeIds.length} videos</p>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto">
                      {youtubeIds.map((ytId, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentVideoIndex(index)}
                          className={`w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 ${
                            currentVideoIndex === index ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 text-sm text-muted-foreground font-medium w-6">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="aspect-video bg-muted rounded overflow-hidden mb-2">
                                <Image
                                  src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                                  alt={`Video ${index + 1}`}
                                  width={120}
                                  height={68}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                              <p className="text-sm font-medium line-clamp-2">
                                {index === 0 ? video.title : `Part ${index + 1}`}
                              </p>
                            </div>
                          </div>
                        </button>
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
      <footer className="border-t border-border py-6 px-4 lg:px-8 mt-12">
        <div className="text-center text-sm text-muted-foreground">
          © 2025 Ladder Legends Academy. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
