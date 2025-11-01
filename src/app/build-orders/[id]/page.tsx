import { notFound } from 'next/navigation';
import buildOrdersData from '@/data/build-orders.json';
import { BuildOrder } from '@/types/build-order';
import { BuildOrderDetailClient } from './build-order-detail-client';

const allBuildOrders = buildOrdersData as BuildOrder[];

export default function BuildOrderDetailPage({ params }: { params: { id: string } }) {
  const buildOrder = allBuildOrders.find(bo => bo.id === params.id);

  if (!buildOrder) {
    notFound();
  }

  return <BuildOrderDetailClient buildOrder={buildOrder} />;
}
