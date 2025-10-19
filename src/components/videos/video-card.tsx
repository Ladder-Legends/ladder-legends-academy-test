import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video } from "@/types/video";
import { CalendarDays, PlayCircle } from "lucide-react";
import Image from "next/image";

interface VideoCardProps {
  video: Video;
}

export function VideoCard({ video }: VideoCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTagColor = (tag: string): string => {
    const tagLower = tag.toLowerCase();
    if (tagLower === 'protoss') return 'bg-[hsl(var(--chart-1))] hover:bg-[hsl(var(--chart-1))]/80';
    if (tagLower === 'terran') return 'bg-[hsl(var(--chart-2))] hover:bg-[hsl(var(--chart-2))]/80';
    if (tagLower === 'zerg') return 'bg-[hsl(var(--chart-3))] hover:bg-[hsl(var(--chart-3))]/80';
    if (tagLower === 'macro') return 'bg-[hsl(var(--chart-4))] hover:bg-[hsl(var(--chart-4))]/80';
    if (tagLower === 'micro') return 'bg-[hsl(var(--chart-5))] hover:bg-[hsl(var(--chart-5))]/80';
    return 'bg-primary hover:bg-primary/80';
  };

  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group"
    >
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:border-primary/50 h-full flex flex-col">
        <div className="relative aspect-video bg-muted overflow-hidden">
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <PlayCircle className="w-16 h-16 text-white" />
          </div>
        </div>
        <CardHeader className="flex-1">
          <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
            {video.title}
          </CardTitle>
          <CardDescription className="line-clamp-2">
            {video.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="w-4 h-4" />
            <span>{formatDate(video.date)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {video.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className={`${getTagColor(tag)} text-white border-0`}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
