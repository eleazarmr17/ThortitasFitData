import { redirect } from 'next/navigation';
import { currentUser } from '../lib/supabase';
import FitnessApp from './fitness-app';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return <FitnessApp userId={user.userId} displayName={user.displayName} email={user.email}/>;
}
