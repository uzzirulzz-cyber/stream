'use client';

import { useState } from 'react';
import { Crown, Lock, Check, X, Mail, Loader2, CreditCard, Sparkles } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiAction } from '@/hooks/use-fetch';
import { toast } from 'sonner';

/**
 * VIP subscription wall — shown when a non-VIP user clicks the Adult nav item.
 * Offers two paths:
 *   1. Subscribe for $8/month (mock payment that grants VIP status)
 *   2. Log in with an existing VIP account (e.g. private@playbeat.live)
 */
export function VipWall() {
  const pendingVipAccess = useApp((s) => s.pendingVipAccess);
  const cancelVipAccess = useApp((s) => s.cancelVipAccess);
  const setAuthUser = useApp((s) => s.setAuthUser);
  const authUser = useApp((s) => s.authUser);
  const openAuth = useApp((s) => s.openAuth);
  const { login } = useAuth();

  const [mode, setMode] = useState<'plans' | 'login'>('plans');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  if (!pendingVipAccess) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await login(email, password);
    setBusy(false);
    // The useAuth hook updates the store; if the user is VIP, the store's
    // setAuthUser will auto-navigate to the Adult view.
  }

  async function handleSubscribe() {
    // If not logged in, prompt signup first.
    if (!authUser?.email) {
      toast.info('Please sign up or log in to subscribe to VIP');
      openAuth('signup');
      return;
    }
    setSubscribing(true);
    const res = await apiAction('POST', '/api/vip/subscribe', { plan: 'monthly' });
    setSubscribing(false);
    if (res.ok) {
      const user = res.data?.user;
      if (user) setAuthUser(user);
      toast.success('VIP subscription active! Enjoy premium access.');
      cancelVipAccess();
    } else {
      toast.error(res.error || 'Subscription failed');
    }
  }

  async function handleBankAlfalah() {
    // If not logged in, prompt signup first.
    if (!authUser?.email) {
      toast.info('Please sign up or log in to subscribe to VIP');
      openAuth('signup');
      return;
    }
    setSubscribing(true);
    try {
      const res = await fetch('/api/bankalfalah/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'monthly' }),
      });
      const data = await res.json();
      if (data.success && data.returnURL) {
        // Redirect to Bank Alfalah's hosted payment page
        window.location.href = data.returnURL;
      } else {
        toast.error(data.error || 'Failed to start Bank Alfalah payment');
      }
    } catch {
      toast.error('Could not connect to Bank Alfalah');
    }
    setSubscribing(false);
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vip-wall-title"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-amber-500/40 bg-card shadow-2xl">
        {/* Close button */}
        <button
          onClick={cancelVipAccess}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header — gold gradient band */}
        <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 px-6 py-4">
          <Crown className="h-6 w-6 text-amber-500" />
          <h2 id="vip-wall-title" className="text-lg font-extrabold tracking-tight text-amber-500">
            VIP Members Only
          </h2>
        </div>

        {mode === 'plans' ? (
          <div className="p-6">
            {/* Big lock + 18+ badge */}
            <div className="mb-5 flex justify-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-amber-500 bg-amber-950/30">
                <Lock className="h-7 w-7 text-amber-500" />
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-red-500 bg-red-950/30">
                <span className="text-lg font-black text-red-500">18+</span>
              </div>
            </div>

            <h3 className="text-center text-xl font-extrabold tracking-tight">
              Unlock Adult Content with VIP
            </h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              The Adult section is exclusive to <span className="font-semibold text-amber-500">VIP members</span>.
              Subscribe for <span className="font-semibold text-foreground">$8/month</span> to unlock 114+ premium adult channels,
              or log in with an existing VIP account.
            </p>

            {/* VIP benefits */}
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>Full access to 114+ adult channels (Live, Movies, Premium, 18+)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>HD streaming with no ads on premium content</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>Cancel anytime — no long-term commitment</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>Private &amp; discreet — appears as &ldquo;VIP&rdquo; on your account</span>
              </li>
            </ul>

            {/* Price + subscribe button */}
            <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-2xl font-extrabold tracking-tight">
                    $8<span className="text-sm font-normal text-muted-foreground">/month</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Billed monthly · Cancel anytime</p>
                </div>
                <Badge />
              </div>
              <Button
                className="mt-3 w-full gap-2 bg-amber-500 text-black hover:bg-amber-600"
                onClick={handleSubscribe}
                disabled={subscribing}
              >
                {subscribing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                ) : (
                  <><CreditCard className="h-4 w-4" /> Subscribe &amp; Unlock Now — $8</>
                )}
              </Button>
              {/* Bank Alfalah payment option (Pakistan) */}
              <Button
                variant="outline"
                className="mt-2 w-full gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                onClick={handleBankAlfalah}
                disabled={subscribing}
              >
                <CreditCard className="h-4 w-4" /> Pay with Bank Alfalah
              </Button>
            </div>

            {/* Already VIP? Login */}
            <div className="mt-5 text-center">
              <p className="text-sm text-muted-foreground">
                Already a VIP member?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="font-semibold text-amber-500 hover:underline"
                >
                  Log in here
                </button>
              </p>
            </div>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              By subscribing you confirm you are 18+ and that adult content is legal in your jurisdiction.
            </p>
          </div>
        ) : (
          /* LOGIN MODE */
          <div className="p-6">
            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-amber-500 bg-amber-950/30">
                <Crown className="h-7 w-7 text-amber-500" />
              </div>
            </div>

            <h3 className="text-center text-xl font-extrabold tracking-tight">
              VIP Member Login
            </h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Log in with your VIP account to access the Adult section.
            </p>

            <form onSubmit={handleLogin} className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="vip-email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="vip-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vip-pass">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="vip-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full gap-2 bg-amber-500 text-black hover:bg-amber-600" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                {busy ? 'Logging in…' : 'Log In & Unlock'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setMode('plans')}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to subscription plans
              </button>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-amber-500">VIP account holder?</span> Use your VIP email and password to sign in. New to VIP? Subscribe for $8/month from the plans screen.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
      <Sparkles className="h-3 w-3" /> VIP
    </span>
  );
}
