'use client';

import { TrendingUp, DollarSign, Eye, MousePointerClick, Users, Activity, Gauge, Copy, ExternalLink } from 'lucide-react';
import { useFetch } from '@/hooks/use-fetch';
import { useApp } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RevenueEstimator } from './revenue-estimator';
import { EarningsDashboard } from '@/components/views/earnings-dashboard';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import type { RevenueDTO } from '@/lib/types';
import { formatMoney } from '@/lib/seo';

const PIE_COLORS = ['#10b981', '#f59e0b', '#8b5cf6'];

export function RevenueDashboard() {
  const refreshTick = useApp((s) => s.refreshTick);
  const { data, loading } = useFetch<RevenueDTO>('/api/revenue', [refreshTick]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Revenue', value: formatMoney(data.totalRevenueCents), icon: DollarSign, accent: 'text-emerald-500' },
    { label: 'Today', value: formatMoney(data.todayRevenueCents), icon: TrendingUp, accent: 'text-brand' },
    { label: 'This Month', value: formatMoney(data.monthRevenueCents), icon: DollarSign, accent: 'text-amber-500' },
    { label: 'RPM (per 1k views)', value: formatMoney(data.rpmCents), icon: Gauge, accent: 'text-violet-500' },
    { label: 'Active Subscribers', value: data.activeSubscribers, icon: Users, accent: 'text-cyan-500' },
    { label: 'Ad Revenue', value: formatMoney(data.adRevenueCents), icon: DollarSign, accent: 'text-emerald-500' },
    { label: 'Sub Revenue', value: formatMoney(data.subscriptionRevenueCents), icon: DollarSign, accent: 'text-amber-500' },
    { label: 'Impressions', value: data.totalImpressions.toLocaleString(), icon: Eye, accent: 'text-brand' },
    { label: 'Clicks', value: data.totalClicks.toLocaleString(), icon: MousePointerClick, accent: 'text-orange-500' },
    { label: 'CTR', value: `${data.overallCtr}%`, icon: Activity, accent: 'text-rose-500' },
  ];

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <c.icon className={`h-5 w-5 ${c.accent}`} />
              <p className="mt-2 text-xl font-extrabold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* My Earnings + Withdraw section */}
      <EarningsDashboard />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Revenue timeseries */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Revenue — Last 14 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeseries} margin={{ left: -10, right: 10, top: 5 }}>
                  <defs>
                    <linearGradient id="adGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => formatMoney(v)}
                  />
                  <Area type="monotone" dataKey="adRevenue" name="Ad Rev" stroke="#10b981" fill="url(#adGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="subRevenue" name="Sub Rev" stroke="#f59e0b" fill="url(#subGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by source pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.revenueBySource}
                      dataKey="amount"
                      nameKey="source"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {data.revenueBySource.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 text-sm">
                {data.revenueBySource.map((s, i) => (
                  <div key={s.source} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded" style={{ background: PIE_COLORS[i] }} />
                    <span className="flex-1">{s.source}</span>
                    <span className="font-semibold">{formatMoney(s.amount)}</span>
                    <span className="text-xs text-muted-foreground">{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top performing ad slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> Top Performing Ad Slots
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topAdSlots.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No ad slots configured yet.</p>
          ) : (
            <div className="space-y-2">
              {data.topAdSlots.map((slot, i) => (
                <div key={slot.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{slot.headline || slot.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {slot.placement} · CPM {formatMoney(slot.cpmCents)} · CPC {formatMoney(slot.cpcCents)}
                    </p>
                  </div>
                  <div className="hidden gap-4 text-right text-xs sm:flex">
                    <div>
                      <p className="font-semibold">{slot.impressions.toLocaleString()}</p>
                      <p className="text-muted-foreground">impr</p>
                    </div>
                    <div>
                      <p className="font-semibold">{slot.clicks.toLocaleString()}</p>
                      <p className="text-muted-foreground">clicks</p>
                    </div>
                    <div>
                      <p className="font-semibold">{slot.ctr}%</p>
                      <p className="text-muted-foreground">CTR</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-emerald-500">{formatMoney(slot.revenueCents)}</p>
                    <p className="text-[10px] text-muted-foreground">earned</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue estimator */}
      <RevenueEstimator />
    </div>
  );
}
