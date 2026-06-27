'use client';

import { useState } from 'react';
import { Heart, Coffee, Loader2, Gift } from 'lucide-react';
import { apiAction } from '@/hooks/use-fetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PRESETS = [
  { cents: 200, label: '$2', icon: Coffee },
  { cents: 500, label: '$5', icon: Heart },
  { cents: 1000, label: '$10', icon: Gift },
  { cents: 2500, label: '$25', icon: Heart },
];

export function DonationWidget() {
  const [amount, setAmount] = useState(500);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function donate() {
    const finalAmount = custom ? Number(custom) * 100 : amount;
    if (!finalAmount || finalAmount < 100) {
      toast.error('Minimum donation is $1');
      return;
    }
    setBusy(true);
    const res = await apiAction('POST', '/api/donations', {
      amountCents: finalAmount,
      message: message || undefined,
      method: 'manual',
    });
    setBusy(false);
    if (res.ok) {
      toast.success(`Thank you! Your $${(finalAmount / 100).toFixed(2)} donation was received 🎉`);
      setCustom(''); setMessage('');
    } else {
      toast.error(res.error || 'Donation failed');
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand/40 bg-gradient-to-br from-brand/10 via-card to-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg brand-bg">
          <Heart className="h-4 w-4 fill-current" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold">Support PlayBeat Arena</h3>
          <p className="text-[11px] text-muted-foreground">100% free, ad-supported — tip us if you can!</p>
        </div>
      </div>

      {/* preset amounts */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.cents}
            onClick={() => { setAmount(p.cents); setCustom(''); }}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border p-2 transition-all',
              amount === p.cents && !custom ? 'border-brand brand-bg' : 'border-border hover:border-brand/50',
            )}
          >
            <p.icon className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">{p.label}</span>
          </button>
        ))}
      </div>

      {/* custom amount */}
      <div className="mb-2 flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <Input
            type="number"
            min={1}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom"
            className="pl-7"
          />
        </div>
      </div>

      {/* message */}
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Optional message (shown to team)"
        className="mb-3"
      />

      <Button onClick={donate} disabled={busy} className="w-full gap-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
        Donate {custom ? `$${custom}` : `$${(amount / 100).toFixed(0)}`}
      </Button>

      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        All donations keep the streams running & ad-free for everyone 💚
      </p>
    </div>
  );
}
