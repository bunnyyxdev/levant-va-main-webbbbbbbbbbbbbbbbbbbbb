'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BarChart3, Users, Plane, Clock, AlertCircle, TrendingUp } from 'lucide-react';

const DashboardCharts = dynamic(() => import('@/components/DashboardCharts'), { ssr: false });

interface Analytics {
    totalPilots: number;
    activePilots30d: number;
    totalFlights: number;
    flightsThisWeek: number;
    pendingPireps: number;
    topRoutes: { route: string; count: number }[];
    flightsPerDay: { date: string; flights: number }[];
}

export default function AdminAnalyticsPage() {
    const [data, setData] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/analytics')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const stats = data ? [
        { label: 'Total Pilots', value: data.totalPilots, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Active (30d)', value: data.activePilots30d, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Total Flights', value: data.totalFlights, icon: Plane, color: 'text-accent-gold', bg: 'bg-accent-gold/10' },
        { label: 'Flights This Week', value: data.flightsThisWeek, icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { label: 'Pending PIREPs', value: data.pendingPireps, icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ] : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Airline Analytics</h1>
                <p className="text-gray-500 text-xs">Airline-wide performance and statistics</p>
            </div>

            {/* Summary Stat Cards */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-24 bg-[#0a0a0a] border border-white/[0.06] rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : data && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {stats.map(s => (
                        <div key={s.label} className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                                <s.icon className={`w-5 h-5 ${s.color}`} />
                            </div>
                            <div>
                                <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">{s.label}</div>
                                <div className="text-xl font-bold text-white font-mono">{s.value.toLocaleString()}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Top Routes */}
            {data?.topRoutes && data.topRoutes.length > 0 && (
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5">
                    <h2 className="text-sm font-bold text-white mb-4">Top 5 Routes</h2>
                    <div className="space-y-2">
                        {data.topRoutes.map((r, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-gray-600 w-5">{i + 1}</span>
                                    <span className="text-sm font-bold text-white font-mono">{r.route}</span>
                                </div>
                                <span className="text-xs font-mono text-accent-gold">{r.count} flights</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts */}
            <DashboardCharts />
        </div>
    );
}
