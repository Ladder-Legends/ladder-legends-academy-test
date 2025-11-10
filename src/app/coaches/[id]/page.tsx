import { notFound } from 'next/navigation';
import coachesData from '@/data/coaches.json';
import videosData from '@/data/videos.json';
import { CoachDetailClient } from './coach-detail-client';

export async function generateStaticParams() {
  return coachesData.map((coach) => ({
    id: coach.id,
  }));
}

export default function CoachDetailPage({ params }: { params: { id: string } }) {
  const coach = coachesData.find((c) => c.id === params.id);

  if (!coach) {
    notFound();
  }

  // Find all videos by this coach
  // Match by coachId first, then fall back to coach name comparison
  const coachVideos = videosData.filter((video) => {
    // Match by coachId (preferred)
    if (video.coachId && video.coachId === coach.id) {
      return true;
    }
    // Fall back to name matching (case-insensitive)
    if (video.coach?.toLowerCase() === coach.name.toLowerCase()) {
      return true;
    }
    // Also match if video.coach matches the displayName
    if (video.coach?.toLowerCase() === coach.displayName.toLowerCase()) {
      return true;
    }
    return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any; // Cast to any to handle the type mismatch from JSON

  return <CoachDetailClient coach={coach} videos={coachVideos} />;
}
