import { notFound } from 'next/navigation';
import replaysData from '@/data/replays.json';
import { Replay } from '@/types/replay';
import { ReplayDetailClient } from './replay-detail-client';

const allReplays = replaysData as Replay[];

export async function generateStaticParams() {
  return allReplays.map((replay) => ({
    id: replay.id,
  }));
}

export default function ReplayDetailPage({ params }: { params: { id: string } }) {
  const replay = allReplays.find(r => r.id === params.id);

  if (!replay) {
    notFound();
  }

  return <ReplayDetailClient replay={replay} />;
}
