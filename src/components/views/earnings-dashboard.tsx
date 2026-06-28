'use client';

import { useState } from 'react';
import { Wallet, TrendingUp, DollarSign, Loader2, ArrowDownToLine, Clock, Check, X } from 'lucide-react';
import { useFetch, apiAction } from '@/hooks/use-fetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EarningsData {
  totalEarningsCents: number;
  availableCents: number;
  withdrawnCents: number;
  pendingCents: number;
  canWithdraw: boolean;
  minWithdrawalCents: number;
  stats: { views: number; favorites: number; subscriptions: number };
  breakdown: { signupBonusCents: number; viewsCents: number; favoritesCents: number; subsCents: number; revenueShareCents: number };
  withdrawals: { id: string; amountCents: number; status: string; method: string; createdAt: string; processedAt: string | null; note: string | null }[];
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function EarningsDashboard() {
  const { data, loading, refetch } = useFetch<EarningsData>('/api/earnings');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('paypal');
  const [payoutDetail, setPayoutDetail] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading || !data) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted" />;
  }

  async function requestWithdrawal() {
    const amountCents = Math.round(Number(amount) * 100);
    if (!amountCents || amountCents < data!.minWithdrawalCents) {
      toast.error(`Minimum withdrawal is ${formatMoney(data!.minWithdrawalCents)}`);
      return;
    }
    if (!payoutDetail) {
      toast.error('Please enter your payout details');
      return;
    }
    setBusy(true);
    const res = await apiAction('POST', '/api/withdrawals', { amountCents, method, payoutDetail });
    setBusy(false);
    if (res.ok) {
      toast.success('Withdrawal request submitted! We will process it within 3-5 business days.');
      setWithdrawOpen(false);
      setAmount(''); setPayoutDetail('');
      refetch();
    } else {
      toast.error(res.error || 'Withdrawal failed');
    }
  }

  return (
    <div className="space-y-4">
      {/* Earnings summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <p className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatMoney(data.availableCents)}</p>
            <p className="text-xs text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <TrendingUp className="h-5 w-5 text-brand" />
            <p className="mt-2 text-2xl font-extrabold">{formatMoney(data.totalEarningsCents)}</p>
            <p className="text-xs text-muted-foreground">Total Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Check className="h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-2xl font-extrabold">{formatMoney(data.withdrawnCents)}</p>
            <p className="text-xs text-muted-foreground">Withdrawn</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Clock className="h-5 w-5 text-amber-500" />
            <p className="mt-2 text-2xl font-extrabold text-amber-500">{formatMoney(data.pendingCents)}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdraw button */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-bold">Withdraw Your Earnings</p>
          <p className="text-xs text-muted-foreground">
            Available: <span className="font-semibold text-emerald-500">{formatMoney(data.availableCents)}</span>
            {' · '}Min: {formatMoney(data.minWithdrawalCents)}
          </p>
        </div>
        <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
          <DialogTrigger asChild>
            <Button disabled={!data.canWithdraw} className="gap-2">
              <ArrowDownToLine className="h-4 w-4" /> Withdraw
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Withdraw Earnings</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                <p className="text-xs text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-extrabold text-emerald-500">{formatMoney(data.availableCents)}</p>
              </div>
              <div className="space-y-2">
                <Label>Amount (USD)</Label>
                <Input type="number" min={data.minWithdrawalCents / 100} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Min $${data.minWithdrawalCents / 100}`} />
              </div>
              <div className="space-y-2">
                <Label>Payout Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="crypto">Crypto (USDT/BTC)</SelectItem>
                    <SelectItem value="gift_card">Gift Card (Amazon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{method === 'paypal' ? 'PayPal Email' : method === 'bank_transfer' ? 'Bank Account Number' : method === 'crypto' ? 'Crypto Wallet Address' : 'Gift Card Email'}</Label>
                <Input value={payoutDetail} onChange={(e) => setPayoutDetail(e.target.value)} placeholder={method === 'paypal' ? 'you@email.com' : method === 'crypto' ? 'Wallet address' : 'Account/email'} />
              </div>
              <p className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
                Withdrawals are processed within 3-5 business days. You will receive a confirmation email once your payout is sent.
              </p>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={requestWithdrawal} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
                Request Withdrawal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Earnings breakdown */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" /> How You Earn</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <p className="font-bold text-emerald-500">{formatMoney(data.breakdown.signupBonusCents)}</p>
              <p className="text-xs text-muted-foreground">Signup Bonus</p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="font-bold text-brand">{formatMoney(data.breakdown.viewsCents)}</p>
              <p className="text-xs text-muted-foreground">Views ({data.stats.views})</p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="font-bold text-red-500">{formatMoney(data.breakdown.favoritesCents)}</p>
              <p className="text-xs text-muted-foreground">Favorites ({data.stats.favorites})</p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="font-bold text-amber-500">{formatMoney(data.breakdown.subsCents)}</p>
              <p className="text-xs text-muted-foreground">Subs ({data.stats.subscriptions})</p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="font-bold text-violet-500">{formatMoney(data.breakdown.revenueShareCents)}</p>
              <p className="text-xs text-muted-foreground">Revenue Share</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal history */}
      <Card>
        <CardHeader><CardTitle className="text-base">Withdrawal History</CardTitle></CardHeader>
        <CardContent>
          {data.withdrawals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No withdrawals yet. Start earning by watching channels!</p>
          ) : (
            <div className="space-y-2">
              {data.withdrawals.map((w) => (
                <div key={w.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold">{formatMoney(w.amountCents)}</p>
                    <p className="text-xs text-muted-foreground">{w.method} · {new Date(w.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={w.status === 'paid' ? 'default' : w.status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">
                    {w.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
