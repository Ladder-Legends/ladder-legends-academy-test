'use server';

import { signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function handleSignOut() {
  console.log('=== handleSignOut called ===');
  try {
    await signOut({ redirect: false });
    console.log('=== signOut completed ===');
  } catch (error) {
    console.error('=== signOut error ===', error);
  }
  console.log('=== redirecting to / ===');
  redirect('/');
}
