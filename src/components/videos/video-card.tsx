'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video } from "@/types/video";
import { CalendarDays, PlayCircle, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { PaywallLink } from "@/components/auth/paywall-link";
import { PermissionGate } from "@/components/auth/permission-gate";

interface VideoCardProps {
  video: Video;
  onEdit?: (video: Video) => void;
  onDelete?: (video: Video) => void;
}

export function VideoCard({ video, onEdit, onDelete }: VideoCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Monochrome tags - no color coding
  const getTagColor = (): string => {
    return 'bg-muted hover:bg-muted/80 text-foreground';
  };

  return (
    <div className="relative group">
      <PaywallLink
        href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
        external
        className="block"
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
                  className={`${getTagColor()} border-0`}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </PaywallLink>

      {/* Admin Edit/Delete Buttons */}
      <PermissionGate requiredRole="coach">
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onEdit && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 bg-background/90 backdrop-blur-sm hover:bg-background"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(video);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 w-8 p-0 bg-destructive/90 backdrop-blur-sm hover:bg-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(video);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}
