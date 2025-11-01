import { auth } from '@/lib/auth';
import { isOwner } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { CheckupClient } from './checkup-client';

export const metadata = {
  title: 'System Checkup | Admin',
  description: 'Check for and clean up stale assets',
};

export default async function AdminCheckupPage() {
  const session = await auth();

  // Only owners can access this page
  if (!isOwner(session)) {
    redirect('/');
  }

  return <CheckupClient />;
}
