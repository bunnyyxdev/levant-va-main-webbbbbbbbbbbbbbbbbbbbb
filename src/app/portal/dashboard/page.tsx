'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useFlightSocket } from '@/hooks/useFlightSocket';
import dynamic from 'next/dynamic';
import { MapPin, Clock, CreditCard, Plane, Award, Globe, Wind, Users, ChevronRight, Medal, CalendarDays, CloudSun, PlaneTakeoff } from 'lucide-react';
import Link from 'next/link';
import RankBadge from '@/components/RankBadge';
import AwardCelebration from '@/components/AwardCelebration';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardMap = dynamic<any>(() => import('@/components/DashboardMap'), { 
    loading: () => <div className="h-96 flex items-center justify-center text-gray-600 text-sm">Loading Map...</div>,
    ssr: false 
});


const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.15 }
    }
};

const itemVariants: any = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    }
};

const statusColors: Record<string, string> = {
    'Preflight': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'Taxi': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    'Cruise': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    'Descent': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    'Landing': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    'Taxi to Gate': 'bg-pink-500/15 text-pink-400 border-pink-500/20',
    'Arrived': 'bg-gray-500/15 text-gray-400 border-gray-500/20',
    // IVAO states
    'En Route': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    'Climbing': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'Departing': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
    'Approach': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    'Landed': 'bg-gray-500/15 text-gray-400 border-gray-500/20',
    'Ground': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    'On Ground': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

const statIconMap: Record<string, any> = {
    location: MapPin,
    clock: Clock,
    credits: CreditCard,
    plane: Plane,
};

const statGradients: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/5',
    emerald: 'from-emerald-500/20 to-emerald-600/5',
    gold: 'from-amber-500/20 to-amber-600/5',
    purple: 'from-purple-500/20 to-purple-600/5',
};

const statAccents: Record<string, string> = {
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    gold: 'text-amber-400',
    purple: 'text-purple-400',
};

const ITEMS_PER_PAGE = 5;
const FLIGHT_POLL_MS = 8000;
const DATA_POLL_MS = 60000;

export default function DashboardPage() {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        stats: [] as any[],
        newestPilots: [] as any[],
        recentReports: [] as any[],
        activeFlights: [] as any[],
        dotm: null as any,
    });
    const [showGlobalTraffic, setShowGlobalTraffic] = useState(false);
    const [currentFlightPage, setCurrentFlightPage] = useState(0);
    const [extras, setExtras] = useState<any>(null);
    const [currentReportPage, setCurrentReportPage] = useState(0);
    const [activeBid, setActiveBid] = useState<any>(null);

    const totalFlightPages = useMemo(() => Math.ceil(dashboardData.activeFlights.length / ITEMS_PER_PAGE), [dashboardData.activeFlights.length]);
    const totalReportPages = useMemo(() => Math.ceil(dashboardData.recentReports.length / ITEMS_PER_PAGE), [dashboardData.recentReports.length]);

    const fetchDashboard = useCallback(async () => {
        const safeFetch = async (url: string) => {
            try { const r = await fetch(url); return await r.json(); } catch { return null; }
        };
        const [stats, pilots, reports, dotm, extrasData, bidData] = await Promise.all([
            safeFetch('/api/portal/stats'),
            safeFetch('/api/portal/new-pilots'),
            safeFetch('/api/portal/reports/recent'),
            safeFetch('/api/dotm'),
            safeFetch('/api/portal/dashboard-extras'),
            safeFetch('/api/dispatch/bid'),
        ]);
        if (extrasData) setExtras(extrasData);
        if (bidData) setActiveBid(bidData.bid || null);
        setDashboardData(prev => ({
            ...prev,
            ...(stats?.stats ? { stats: stats.stats } : {}),
            ...(pilots?.pilots ? { newestPilots: pilots.pilots } : {}),
            ...(reports?.reports ? { recentReports: reports.reports } : {}),
            ...(dotm?.dotm ? { dotm: dotm.dotm } : {}),
        }));
        setLoading(false);
    }, []);

    const fetchFlights = useCallback(async () => {
        try {
            let flights: any[] = [];

            // Try ACARS traffic API first
            const trafficRes = await fetch('/api/acars?action=traffic');
            if (trafficRes.ok) {
                const tData = await trafficRes.json();
                if (tData.traffic && Array.isArray(tData.traffic) && tData.traffic.length > 0) {
                    flights = tData.traffic.map((f: any) => ({
                        callsign: f.callsign,
                        pilot: f.pilotName || f.pilot_name || '',
                        departure: f.departureIcao || f.departure_icao || '',
                        arrival: f.arrivalIcao || f.arrival_icao || '',
                        equipment: f.aircraftType || f.aircraft_type || '',
                        latitude: f.latitude,
                        longitude: f.longitude,
                        altitude: f.altitude,
                        heading: f.heading,
                        groundSpeed: f.groundSpeed || f.ground_speed || 0,
                        ias: f.ias || 0,
                        verticalSpeed: f.verticalSpeed || f.vertical_speed || 0,
                        phase: f.phase || f.status || '',
                        fuel: f.fuel || 0,
                        comfort_score: f.comfortScore || f.comfort_score || 100,
                        status: f.phase || f.status || '',
                        isGlobal: false,
                        network: 'LVT',
                    }));
                }
            }

            // Fallback to active-flights endpoint
            if (flights.length === 0) {
                const res = await fetch(`/api/portal/active-flights?global=${showGlobalTraffic}`);
                const data = await res.json();
                if (data.activeFlights) flights = data.activeFlights;
            }

            setDashboardData(prev => ({ ...prev, activeFlights: flights }));
        } catch { /* silent */ }
    }, [showGlobalTraffic]);

    // Real-time Pusher — merge incoming flight updates instantly (add OR update)
    useFlightSocket(useCallback((data: any) => {
        if (!data?.callsign) return;
        setDashboardData(prev => {
            const exists = prev.activeFlights.some(f => f.callsign === data.callsign);
            if (exists) {
                const updated = prev.activeFlights.map(f =>
                    f.callsign === data.callsign
                        ? { ...f, latitude: data.latitude, longitude: data.longitude, altitude: data.altitude, heading: data.heading, groundSpeed: data.groundSpeed ?? data.groundspeed ?? f.groundSpeed, verticalSpeed: data.verticalSpeed ?? data.vs ?? f.verticalSpeed, ias: data.ias ?? f.ias, fuel: data.fuel ?? f.fuel, comfort_score: data.comfort_score ?? f.comfort_score, status: data.status, phase: data.phase ?? f.phase, departure: data.departure ?? f.departure, arrival: data.arrival ?? f.arrival, equipment: data.equipment ?? f.equipment }
                        : f
                );
                return { ...prev, activeFlights: updated };
            }
            // New flight — add it to the array
            const newFlight = {
                callsign: data.callsign,
                pilot: data.pilot || '',
                departure: data.departure || '',
                arrival: data.arrival || '',
                equipment: data.equipment || '',
                latitude: data.latitude,
                longitude: data.longitude,
                altitude: data.altitude || 0,
                heading: data.heading || 0,
                groundSpeed: data.groundSpeed || data.groundspeed || 0,
                ias: data.ias || 0,
                verticalSpeed: data.verticalSpeed || data.vs || 0,
                phase: data.phase || data.status || '',
                fuel: data.fuel || 0,
                comfort_score: data.comfort_score || 100,
                status: data.status || '',
                isGlobal: false,
                network: 'LVT',
            };
            return { ...prev, activeFlights: [...prev.activeFlights, newFlight] };
        });
    }, []));

    // Initial load + polling
    useEffect(() => {
        setMounted(true);
        fetchDashboard();
        const interval = setInterval(fetchDashboard, DATA_POLL_MS);
        return () => clearInterval(interval);
    }, [fetchDashboard]);

    // Flights poll (faster)
    useEffect(() => {
        fetchFlights();
        const interval = setInterval(fetchFlights, FLIGHT_POLL_MS);
        return () => clearInterval(interval);
    }, [fetchFlights]);


    // Auto-rotate pages
    useEffect(() => {
        if (totalFlightPages <= 1) return;
        const interval = setInterval(() => setCurrentFlightPage(p => (p + 1) % totalFlightPages), 30000);
        return () => clearInterval(interval);
    }, [totalFlightPages]);

    useEffect(() => {
        if (totalReportPages <= 1) return;
        const interval = setInterval(() => setCurrentReportPage(p => (p + 1) % totalReportPages), 30000);
        return () => clearInterval(interval);
    }, [totalReportPages]);

    if (!mounted) {
        return (
            <div className="space-y-6 animate-pulse">
                {/* Skeleton stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 bg-[#111] rounded-2xl border border-white/[0.06]" />
                    ))}
                </div>
                {/* Skeleton main grid */}
                <div className="grid lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        <div className="h-96 bg-[#111] rounded-2xl border border-white/[0.06]" />
                        <div className="h-64 bg-[#111] rounded-2xl border border-white/[0.06]" />
                    </div>
                    <div className="lg:col-span-4 space-y-6">
                        <div className="h-48 bg-[#111] rounded-2xl border border-white/[0.06]" />
                        <div className="h-48 bg-[#111] rounded-2xl border border-white/[0.06]" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
        <AwardCelebration />
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* Stats Cards — Modern glassmorphism */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {dashboardData.stats.length > 0 ? (
                    dashboardData.stats.map((stat: any, i: number) => {
                        const Icon = statIconMap[stat.icon] || MapPin;
                        const gradient = statGradients[stat.color] || statGradients.blue;
                        const accent = statAccents[stat.color] || statAccents.blue;

                        return (
                            <motion.div 
                                key={stat.label}
                                variants={itemVariants}
                                className={`relative bg-gradient-to-br ${gradient} rounded-2xl p-5 border border-white/[0.06] hover:border-white/[0.12] transition-all group overflow-hidden`}
                            >
                                <div className="absolute -top-4 -right-4 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity">
                                    <Icon className="w-20 h-20" />
                                </div>
                                <div className="relative">
                                    <div className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.15em] mb-2">{stat.label}</div>
                                    <div className={`text-3xl font-black tracking-tight ${accent}`}>{stat.value}</div>
                                    {stat.subtext && (
                                        <div className="text-[10px] text-gray-500 font-mono mt-1.5">{stat.subtext}</div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white/[0.03] rounded-2xl p-5 border border-white/[0.04] animate-pulse">
                            <div className="h-3 w-16 bg-white/[0.06] rounded mb-3" />
                            <div className="h-8 w-24 bg-white/[0.06] rounded" />
                        </div>
                    ))
                )}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Live Map — always visible */}
                    <motion.div 
                        variants={itemVariants} 
                        className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-[#111]" 
                        style={{ height: '520px' }}
                    >
                        <div className="absolute top-4 right-4 z-[1000]">
                            <button 
                                onClick={() => setShowGlobalTraffic(!showGlobalTraffic)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border backdrop-blur-xl transition-all text-xs font-bold uppercase tracking-wider ${
                                    showGlobalTraffic 
                                        ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(234,179,8,0.3)]' 
                                        : 'bg-black/70 text-gray-300 border-white/10 hover:border-white/20'
                                }`}
                            >
                                <Globe size={14} />
                                {showGlobalTraffic ? 'Global' : 'VA Only'}
                            </button>
                        </div>
                        <DashboardMap flights={dashboardData.activeFlights} />
                    </motion.div>

                    {/* Active Flights */}
                    <motion.div variants={itemVariants} className="bg-[#111] rounded-2xl border border-white/[0.06] overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <Plane className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-sm text-white">Active Flights</h2>
                                    <p className="text-[10px] text-gray-500">
                                        {showGlobalTraffic 
                                            ? `${dashboardData.activeFlights.filter((f: any) => !f.isGlobal).length} VA + ${dashboardData.activeFlights.filter((f: any) => f.isGlobal).length} IVAO`
                                            : `${dashboardData.activeFlights.length} currently airborne`
                                        }
                                    </p>
                                </div>
                            </div>
                            {totalFlightPages > 1 && (
                                <span className="text-[10px] text-gray-500 font-mono bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                                    {currentFlightPage + 1}/{totalFlightPages}
                                </span>
                            )}
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-4 text-[10px] text-gray-500 font-bold uppercase tracking-[0.12em] mb-2 pb-2 border-b border-white/[0.04] px-2">
                                <div>Callsign</div>
                                <div className="text-center">Route</div>
                                <div className="text-center">Phase</div>
                                <div className="text-right">Aircraft</div>
                            </div>
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={currentFlightPage}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-0.5"
                                >
                                    {dashboardData.activeFlights.length > 0 ? (
                                        dashboardData.activeFlights
                                            .slice(currentFlightPage * ITEMS_PER_PAGE, (currentFlightPage + 1) * ITEMS_PER_PAGE)
                                            .map((flight: any) => (
                                                <div key={flight.callsign} className="grid grid-cols-4 text-xs py-3 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`font-mono font-bold ${flight.isGlobal ? 'text-gray-400' : 'text-amber-400'}`}>{flight.callsign}</span>
                                                            {flight.network && flight.network !== 'LVT' && (
                                                                <span className="px-1 py-0.5 bg-indigo-500/15 rounded text-[7px] font-bold text-indigo-400 border border-indigo-500/20 leading-none">{flight.network}</span>
                                                            )}
                                                        </div>
                                                        <div className="text-[9px] text-gray-600 mt-0.5">{flight.pilot}</div>
                                                    </div>
                                                    <div className="text-gray-300 font-mono text-center flex items-center justify-center gap-1.5">
                                                        <span className="text-white font-bold">{flight.departure}</span>
                                                        <ChevronRight size={10} className="text-gray-600" />
                                                        <span className="text-white font-bold">{flight.arrival}</span>
                                                    </div>
                                                    <div className="flex items-center justify-center">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase border ${statusColors[flight.status] || statusColors['Arrived']}`}>
                                                            {flight.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-gray-400 text-right font-mono flex items-center justify-end text-[11px]">
                                                        {flight.equipment || '—'}
                                                    </div>
                                                </div>
                                            ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <Plane className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                                            <p className="text-gray-600 text-xs">No active flights</p>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* Recent Reports */}
                    <motion.div variants={itemVariants} className="bg-[#111] rounded-2xl border border-white/[0.06] overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Wind className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-sm text-white">Recent Reports</h2>
                                    <p className="text-[10px] text-gray-500">Latest PIREP submissions</p>
                                </div>
                            </div>
                            {totalReportPages > 1 && (
                                <span className="text-[10px] text-gray-500 font-mono bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                                    {currentReportPage + 1}/{totalReportPages}
                                </span>
                            )}
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-3 text-[10px] text-gray-500 font-bold uppercase tracking-[0.12em] mb-2 pb-2 border-b border-white/[0.04] px-2">
                                <div>Pilot</div>
                                <div className="text-center">Route</div>
                                <div className="text-right">Score</div>
                            </div>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentReportPage}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-0.5"
                                >
                                    {dashboardData.recentReports.length > 0 ? (
                                        dashboardData.recentReports
                                            .slice(currentReportPage * ITEMS_PER_PAGE, (currentReportPage + 1) * ITEMS_PER_PAGE)
                                            .map((report: any) => (
                                                <div key={report.id} className="grid grid-cols-3 text-xs py-3 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                                                    <div>
                                                        <span className="text-gray-200 font-medium">{report.pilot_name || report.callsign}</span>
                                                        <div className="text-[9px] text-gray-600 font-mono mt-0.5">{report.id}</div>
                                                    </div>
                                                    <div className="text-gray-300 font-mono text-center flex items-center justify-center">
                                                        {report.route}
                                                    </div>
                                                    <div className="text-right flex items-center justify-end">
                                                        {report.log?.landingAnalysis?.butterScore ? (
                                                            <span className={`font-bold font-mono text-sm ${report.log.landingAnalysis.butterScore >= 8 ? 'text-emerald-400' : report.log.landingAnalysis.butterScore >= 5 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                                {report.log.landingAnalysis.butterScore.toFixed(1)}
                                                            </span>
                                                        ) : <span className="text-gray-700">—</span>}
                                                    </div>
                                                </div>
                                            ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <Wind className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                                            <p className="text-gray-600 text-xs">No reports yet</p>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Quick Dispatch */}
                    <motion.div variants={itemVariants} className="bg-[#111] rounded-2xl border border-white/[0.06] overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <PlaneTakeoff className="w-4 h-4 text-emerald-400" />
                            </div>
                            <h2 className="font-semibold text-sm text-white">Quick Dispatch</h2>
                        </div>
                        <div className="p-5">
                            {activeBid ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-center">
                                            <div className="text-2xl font-black text-white">{activeBid.departure}</div>
                                        </div>
                                        <div className="flex-1 mx-3 h-[1px] bg-gradient-to-r from-emerald-500 via-accent-gold to-red-500 relative">
                                            <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-accent-gold rotate-90" />
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-black text-white">{activeBid.arrival}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                                        <span className="font-mono">{activeBid.callsign}</span>
                                        <span className="font-mono">{activeBid.aircraft}</span>
                                    </div>
                                    <Link
                                        href="/portal/dispatch"
                                        className="block w-full text-center py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                                    >
                                        Open in Dispatch
                                    </Link>
                                </div>
                            ) : (
                                <div className="text-center space-y-3">
                                    <p className="text-gray-500 text-xs">No active flight bid</p>
                                    <Link
                                        href="/portal/dispatch"
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-accent-gold/10 text-accent-gold border border-accent-gold/20 hover:bg-accent-gold/20 transition-all"
                                    >
                                        <PlaneTakeoff size={14} />
                                        Go to Dispatch
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Event Countdown */}
                    {extras?.eventCountdown && (
                        <motion.div variants={itemVariants} className="relative bg-gradient-to-br from-blue-500/10 via-[#111] to-[#111] rounded-2xl border border-blue-500/10 p-5 overflow-hidden group hover:border-blue-500/20 transition-all">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <CalendarDays className="w-16 h-16 text-blue-500" />
                            </div>
                            <div className="relative">
                                <div className="text-blue-400/60 text-[9px] uppercase font-bold tracking-[0.25em] mb-3">Next Event</div>
                                <div className="text-white font-bold text-sm mb-3">{extras.eventCountdown.name}</div>
                                <div className="flex gap-3">
                                    {[{ val: extras.eventCountdown.days, label: 'Days' }, { val: extras.eventCountdown.hours, label: 'Hrs' }, { val: extras.eventCountdown.minutes, label: 'Min' }].map(t => (
                                        <div key={t.label} className="bg-black/40 rounded-xl px-3 py-2 text-center border border-white/[0.06] flex-1">
                                            <div className="text-xl font-black text-blue-400 font-mono">{t.val}</div>
                                            <div className="text-[8px] text-gray-500 uppercase tracking-wider font-bold">{t.label}</div>
                                        </div>
                                    ))}
                                </div>
                                {extras.eventCountdown.location && (
                                    <div className="mt-3 text-[10px] text-gray-500 flex items-center gap-1">
                                        <MapPin size={10} /> {extras.eventCountdown.location}
                                        {extras.eventCountdown.reward_points > 0 && (
                                            <span className="ml-auto text-amber-400">+{extras.eventCountdown.reward_points} pts</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Weather Widget */}
                    {extras?.weather && (
                        <motion.div variants={itemVariants} className="bg-[#111] rounded-2xl border border-white/[0.06] overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                    <CloudSun className="w-4 h-4 text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-sm text-white">Active Bid Weather</h2>
                                    <p className="text-[10px] text-gray-500">{extras.weather.departure_icao} / {extras.weather.arrival_icao}</p>
                                </div>
                            </div>
                            <div className="p-4 space-y-2">
                                <div className="bg-black/40 p-3 rounded-xl border-l-[3px] border-emerald-500">
                                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">DEP {extras.weather.departure_icao}</div>
                                    <p className="text-[10px] font-mono text-gray-300 leading-relaxed">{extras.weather.departure_metar}</p>
                                </div>
                                <div className="bg-black/40 p-3 rounded-xl border-l-[3px] border-red-500">
                                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">ARR {extras.weather.arrival_icao}</div>
                                    <p className="text-[10px] font-mono text-gray-300 leading-relaxed">{extras.weather.arrival_metar}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Medal Case */}
                    {extras?.medalCase?.length > 0 && (
                        <motion.div variants={itemVariants} className="bg-[#111] rounded-2xl border border-white/[0.06] overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <Medal className="w-4 h-4 text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-sm text-white">Medal Case</h2>
                                    <p className="text-[10px] text-gray-500">{extras.medalCase.length} award{extras.medalCase.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <div className="p-4 grid grid-cols-3 gap-2">
                                {extras.medalCase.map((award: any, i: number) => (
                                    <div key={i} className="group flex flex-col items-center text-center p-2 rounded-xl hover:bg-white/[0.03] transition-colors" title={award.description}>
                                        {award.image_url ? (
                                            <img src={award.image_url} alt={award.name} className="w-10 h-10 rounded-lg mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-1">
                                                <Award className="w-5 h-5 text-amber-400" />
                                            </div>
                                        )}
                                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider leading-tight">{award.name}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Newest Pilots */}
                    <motion.div variants={itemVariants} className="bg-[#111] rounded-2xl border border-white/[0.06] overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <Users className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-sm text-white">Newest Pilots</h2>
                                <p className="text-[10px] text-gray-500">Recently joined</p>
                            </div>
                        </div>
                        <div className="p-4 space-y-1">
                            {dashboardData.newestPilots.length > 0 ? (
                                dashboardData.newestPilots.map((pilot: any) => (
                                    <div key={pilot.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors group">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.06] flex items-center justify-center text-white font-bold text-[10px] group-hover:border-amber-500/30 transition-colors">
                                            {pilot.name.split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm text-gray-200 truncate">{pilot.name}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-gray-600 font-mono">{pilot.id}</span>
                                                <RankBadge rank={pilot.rank} size="sm" />
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-gray-600 font-medium">{pilot.joined}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <Users className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                                    <p className="text-gray-600 text-xs">No new pilots</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* DOTM */}
                    {dashboardData.dotm && (
                        <motion.div variants={itemVariants} className="relative bg-gradient-to-br from-amber-500/10 via-[#111] to-[#111] rounded-2xl border border-amber-500/10 p-6 overflow-hidden group hover:border-amber-500/20 transition-all">
                            {dashboardData.dotm.banner_image && (
                                <div className="absolute inset-0">
                                    <img src={dashboardData.dotm.banner_image} alt="" className="w-full h-full object-cover opacity-10 group-hover:opacity-15 transition-opacity" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#111] via-[#111]/80 to-transparent" />
                                </div>
                            )}
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <MapPin className="w-20 h-20 text-amber-500 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                            </div>
                            <div className="relative">
                                <div className="text-amber-500/60 text-[9px] uppercase font-bold tracking-[0.25em] mb-4">Destination of the Month</div>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-xl font-mono">
                                        {dashboardData.dotm.airport_icao}
                                    </div>
                                    <div>
                                        <div className="text-sm text-white group-hover:text-amber-400 transition-colors">{dashboardData.dotm.description || 'Fly here for bonus credits!'}</div>
                                        <div className="text-emerald-400 text-xs font-mono font-bold mt-1 flex items-center gap-1">
                                            <Award className="w-3 h-3" /> +{dashboardData.dotm.bonus_points} cr bonus
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
        </>
    );
}
