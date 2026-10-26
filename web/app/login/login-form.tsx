'use client';
import { useState, type FormEvent } from 'react';
import { Dumbbell, ArrowRight, ShieldCheck } from 'lucide-react';
import './login.css';
export default function LoginForm() {
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    const form=new FormData(event.currentTarget);
    try {
      const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.get('email'),password:form.get('password')})});
      const result=await response.json(); if (!response.ok) throw Error(result.error);
      window.location.assign('/');
    } catch(e) { setError(e instanceof Error?e.message:'Could not sign in. Please try again.'); setBusy(false); }
  }
  return <main className="login-shell"><section className="login-card">
    <div className="login-logo"><Dumbbell size={30}/></div><span className="eyebrow">THORTITAS FIT DATA</span>
    <h1>Stronger.<br/><span>Together.</span></h1><p>Your space to train, track and share the journey.</p>
    <form onSubmit={submit}><label>Email<input className="field" type="email" name="email" autoComplete="username" required maxLength={254}/></label>
    <label>Password<input className="field" type="password" name="password" autoComplete="current-password" required maxLength={512}/></label>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <button className="btn primary full" disabled={busy}>{busy?'Signing in…':'Sign in'}<ArrowRight size={18}/></button></form>
    <div className="login-private"><ShieldCheck size={18}/><span>A private space for two. Accounts are created by the owner.</span></div>
    <small>Need to reset your password? Ask the owner to reset it in the account dashboard.</small>
  </section></main>;
}
