import { notFound } from 'next/navigation';
import masterclassesData from '@/data/masterclasses.json';
import { Masterclass } from '@/types/masterclass';
import { MasterclassDetailClient } from './masterclass-detail-client';

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

  return <MasterclassDetailClient masterclass={masterclass} />;
}
