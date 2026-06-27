'use client';

import { useState } from 'react';
import { TrendingUp, Calculator, DollarSign, Eye, MousePointerClick, Gift, Megaphone } from 'lucide-react';
import { useFetch, apiAction } from '@/hooks/use-fetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { formatMoney } from '@/lib/seo';

interface EstimateData {
  estimate: {
    ad: number; video: number; affiliate: number; donation: number; sponsored: number;
    total: number; monthly: number; rpm: number;
  };
  basedOnActual: boolean;
  actual: {
    monthlyViews: number;
    adRevenueCents: number;
    affiliateRevenueCents: number;
    donationRevenueCents: number;
    subscriptionRevenueCents: number;
    totalCents: number;
  };
}

const BAR_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export function RevenueEstimator() {
  const [customViews, setCustomViews] = useState('');
  const url = customViews ? `/api/revenue/estimate?views=${Number(customViews) * 1000}` : '/api/revenue/estimate';
  const { data, loading } = useFetch<EstimateData>(url);

  const est = data?.estimate;
  const actual = data?.actual;

  const chartData = est ? [
    { name: 'Display Ads', value: est.ad, color: BAR_COLORS[0] },
    { name: 'Video Ads', value: est.video, color: BAR_COLORS[1] },
    { name: 'Affiliate', value: est.affiliate, color: BAR_COLORS[2] },
    { name: 'Donations', value: est.donation, color: BAR_COLORS[3] },
    { name: 'Sponsored', value: est.sponsored, color: BAR_COLORS[4] },
  ] : [];

  const monthlyViewsK = est ? Math.round(est.monthly / 1000) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4" /> Revenue Estimator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* input */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label className="text-xs">Project monthly traffic (thousands of page views)</Label>
            <Input
              type="number"
              value={customViews}
              onChange={(e) => setCustomViews(e.target.value)}
              placeholder={data?.basedOnActual ? `Actual: ${monthlyViewsK}K` : 'e.g. 100'}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setCustomViews('')}>
            Use actual
          </Button>
        </div>

        {loading ? (
          <div className="h-48 animate-pulse rounded bg-muted" />
        ) : est ? (
          <>
            {/* headline */}
            <div className="rounded-xl bg-gradient-to-r from-brand/15 to-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Estimated monthly revenue {data?.basedOnActual ? '(based on actual traffic)' : `(${Number(customViews) * 1000} views/mo)`}
              </p>
              <p className="mt-1 text-3xl font-extrabold text-brand">{formatMoney(est.total)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                RPM (per 1K views): <span className="font-semibold text-foreground">{formatMoney(est.rpm)}</span>
              </p>
            </div>

            {/* breakdown chart */}
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* revenue stream cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StreamCard icon={<Megaphone className="h-4 w-4" />} label="Display Ads" value={formatMoney(est.ad)} accent="text-emerald-500" />
              <StreamCard icon={<Eye className="h-4 w-4" />} label="Video Ads" value={formatMoney(est.video)} accent="text-amber-500" />
              <StreamCard icon={<MousePointerClick className="h-4 w-4" />} label="Affiliate" value={formatMoney(est.affiliate)} accent="text-violet-500" />
              <StreamCard icon={<Gift className="h-4 w-4" />} label="Donations" value={formatMoney(est.donation)} accent="text-rose-500" />
              <StreamCard icon={<TrendingUp className="h-4 w-4" />} label="Sponsored" value={formatMoney(est.sponsored)} accent="text-cyan-500" />
              <StreamCard icon={<DollarSign className="h-4 w-4" />} label="Total/mo" value={formatMoney(est.total)} accent="text-brand" />
            </div>

            {/* actual revenue (this month) */}
            {actual && (
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actual revenue this month
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div><span className="text-muted-foreground">Ads:</span> <span className="font-semibold">{formatMoney(actual.adRevenueCents)}</span></div>
                  <div><span className="text-muted-foreground">Affiliate:</span> <span className="font-semibold">{formatMoney(actual.affiliateRevenueCents)}</span></div>
                  <div><span className="text-muted-foreground">Donations:</span> <span className="font-semibold">{formatMoney(actual.donationRevenueCents)}</span></div>
                  <div><span className="text-muted-foreground">Total:</span> <span className="font-bold text-emerald-500">{formatMoney(actual.totalCents)}</span></div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StreamCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-2.5">
      <div className={accent}>{icon}</div>
      <p className="mt-1 text-sm font-extrabold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
