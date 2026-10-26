import { redirect } from 'next/navigation';
import { currentUser } from '../../lib/supabase';
import LoginForm from './login-form';
export const dynamic='force-dynamic';
export default async function Login() {
  if (await currentUser()) redirect('/');
  return <LoginForm/>;
}
