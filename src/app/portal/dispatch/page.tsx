'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Plane, FileText, RefreshCw, Check, Wind, Navigation, CloudSun, Clock, Fuel, ExternalLink, ArrowRight, Users, Package, AlertCircle, XCircle, Timer } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

function FlightPreviewContent() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [ofp, setOfp] = useState<any>(null);
    const [error, setError] = useState('');
    const [username, setUsername] = useState('');
    const [activeBid, setActiveBid] = useState<any>(null);

    const [bookingLoading, setBookingLoading] = useState(false);
    const [availableAircraft, setAvailableAircraft] = useState<any[]>([]);
    const [selectedAircraft, setSelectedAircraft] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState('');
    const [activityId, setActivityId] = useState(searchParams?.get('activityId') || '');
    const [weightUnit, setWeightUnit] = useState<'lbs' | 'kgs'>('lbs');
    const [countdown, setCountdown] = useState('');
    const autoBookedRef = useRef(false);

    // ── Fetch user data + check for existing bid on mount ──
    useEffect(() => {
        initDispatch();
    }, []);

    const initDispatch = async () => {
        setLoading(true);
        try {
            // Fetch user data and active bid in parallel
            const [userRes, bidRes] = await Promise.all([
                fetch('/api/auth/me'),
                fetch('/api/dispatch/bid'),
            ]);
            const userData = await userRes.json();
            const bidData = await bidRes.json();

            let sbId = '';
            if (userData.user) {
                sbId = userData.user.simbriefId || userData.user.pilotId?.replace(/\D/g, '') || '';
                setUsername(sbId);
                if (userData.user.weightUnit) setWeightUnit(userData.user.weightUnit);
            }

            // If there's an active bid, restore the dispatch view
            if (bidData.bid) {
                setActiveBid(bidData.bid);
                setBookingSuccess(`Flight ${bidData.bid.callsign} booked`);

                // Re-fetch SimBrief OFP if we have a username (to show full details)
                if (sbId) {
                    try {
                        const sbRes = await fetch(`/api/dispatch/simbrief/${sbId}`);
                        const sbData = await sbRes.json();
                        if (sbData.fetch?.status === 'Success') {
                            setOfp(sbData);
                        }
                    } catch { /* SimBrief fetch failed — show bid details only */ }
                }
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    // ── Countdown timer for active bid ──
    const bidExpiresAt = activeBid?.expiresAt;
    useEffect(() => {
        if (!bidExpiresAt) { setCountdown(''); return; }
        const tick = () => {
            const diff = new Date(bidExpiresAt).getTime() - Date.now();
            if (diff <= 0) { setCountdown('EXPIRED'); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        };
        tick();
        const iv = setInterval(tick, 1000);
        return () => clearInterval(iv);
    }, [bidExpiresAt]);

    // ── Import SimBrief + auto-book ──
    const fetchOfpAndBook = async (user: string) => {
        if (!user) return;
        setLoading(true);
        setError('');
        autoBookedRef.current = false;
        try {
            const res = await fetch(`/api/dispatch/simbrief/${user}`);
            const data = await res.json();
            if (data.fetch && data.fetch.status === 'Success') {
                setOfp(data);
                // Auto-book immediately
                await autoBookFlight(data);
            } else {
                setError('No active SimBrief OFP found for this pilot ID.');
            }
        } catch {
            setError('Failed to load flight plan from SimBrief.');
        } finally {
            setLoading(false);
        }
    };

    const VFR_AIRCRAFT = ['C172', 'C152', 'C150', 'C182', 'P28A', 'PA28', 'DR40', 'C206', 'PA18', 'C208'];

    const autoBookFlight = async (ofpData: any) => {
        if (autoBookedRef.current) return;
        autoBookedRef.current = true;

        const acType = (ofpData.aircraft?.icao_code || '').toUpperCase();
        if (VFR_AIRCRAFT.includes(acType)) {
            setError(`VFR aircraft (${acType}) are not permitted for airline operations.`);
            return;
        }

        setBookingLoading(true);
        try {
            const res = await fetch('/api/flights/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    callsign: ofpData.atc.callsign,
                    departure_icao: ofpData.origin.icao_code,
                    arrival_icao: ofpData.destination.icao_code,
                    aircraft_type: ofpData.aircraft.icao_code,
                    route: ofpData.general.route,
                    estimated_flight_time: Math.round(Number(ofpData.times.est_time_enroute) / 60),
                    pax: Number(ofpData.weights.pax_count),
                    cargo: Number(ofpData.weights.cargo) / 1000,
                    simbrief_ofp_id: ofpData.params.request_id,
                    planned_fuel: Math.round(Number(ofpData.fuel.plan_ramp)),
                    planned_route: ofpData.general.route,
                    rotation_speed: Math.round(Number(ofpData.takeoff?.v_r || ofpData.v_speeds?.v_r || 0)),
                    activity_id: activityId || undefined
                })
            });
            const data = await res.json();
            if (res.ok) {
                const bid = data.bid;
                setActiveBid({
                    id: bid?._id || bid?.id,
                    callsign: ofpData.atc.callsign,
                    departure: ofpData.origin.icao_code,
                    arrival: ofpData.destination.icao_code,
                    aircraft: ofpData.aircraft.icao_code,
                    route: ofpData.general.route,
                    expiresAt: bid?.expires_at,
                });
                setBookingSuccess(`Flight ${ofpData.atc.callsign} booked successfully!`);
            } else {
                setError(data.error || 'Failed to book flight');
            }
        } catch {
            setError('Booking request failed.');
        } finally {
            setBookingLoading(false);
        }
    };

    // ── Cancel bid ──
    const handleCancelBid = useCallback(async () => {
        try {
            await fetch('/api/dispatch/bid', { method: 'DELETE' });
            setActiveBid(null);
            setOfp(null);
            setBookingSuccess('');
            setError('');
            setSelectedAircraft('');
            setAvailableAircraft([]);
            setCountdown('');
        } catch {
            setError('Failed to cancel bid.');
        }
    }, []);

    // ── New Flight Plan (cancel existing + reset) ──
    const handleNewFlightPlan = useCallback(async () => {
        if (activeBid) {
            await fetch('/api/dispatch/bid', { method: 'DELETE' });
        }
        setActiveBid(null);
        setOfp(null);
        setBookingSuccess('');
        setError('');
        setSelectedAircraft('');
        setAvailableAircraft([]);
        setCountdown('');
        autoBookedRef.current = false;
    }, [activeBid]);

    // ── Fetch available fleet when OFP loads ──
    useEffect(() => {
        if (ofp) {
            const acType = ofp.aircraft?.icao_code || ofp.general?.aircraft_icao;
            const depIcao = ofp.origin?.icao_code;
            if (acType && depIcao) {
                fetchAvailableFleet(depIcao, acType);
            }
        }
    }, [ofp]);

    const fetchAvailableFleet = async (location: string, type: string) => {
        try {
            const res = await fetch(`/api/fleet/available?location=${location}&type=${type}`);
            const data = await res.json();
            if (data.success) setAvailableAircraft(data.aircraft);
        } catch { /* silent */ }
    };

    if (loading && !ofp && !activeBid) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="relative">
                    <div className="w-20 h-20 border-2 border-amber-500/20 rounded-full animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Plane className="w-8 h-8 text-amber-500 animate-bounce" />
                    </div>
                </div>
                <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.3em]">Initializing Dispatch...</p>
            </div>
        );
    }

    const hasFlightPlan = ofp || activeBid;

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Navigation className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Dispatch Center</h1>
                            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">Levant VA Flight Operations</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Bid countdown */}
                    {activeBid && countdown && (
                        <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold font-mono border ${
                            countdown === 'EXPIRED' ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-white/5 border-white/10 text-gray-400'
                        }`}>
                            <Timer className="w-3 h-3" />
                            {countdown}
                        </div>
                    )}
                    {hasFlightPlan && (
                        <button onClick={handleNewFlightPlan} className="text-xs text-gray-500 hover:text-white border border-white/[0.08] hover:border-white/20 px-4 py-2 rounded-lg transition-all flex items-center gap-2">
                            <RefreshCw className="w-3 h-3" /> New Flight Plan
                        </button>
                    )}
                </div>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                    >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                        <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-300 text-xs font-bold">Dismiss</button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {hasFlightPlan ? (
                    <motion.div key="ofp-loaded" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">

                        {/* Active Bid Status Banner */}
                        {activeBid && (
                            <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-sm font-bold text-emerald-400">Bid Active</span>
                                    <span className="text-xs text-gray-500 font-mono">{activeBid.callsign}</span>
                                </div>
                                <button
                                    onClick={handleCancelBid}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                                >
                                    <XCircle className="w-3 h-3" />
                                    Cancel Bid
                                </button>
                            </div>
                        )}
                        
                        {/* Route Hero Card */}
                        <div className="relative bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent" />
                            <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.02]">
                                <Plane className="w-full h-full" strokeWidth={0.5} />
                            </div>
                            <div className="relative p-8">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                    {/* Departure */}
                                    <div className="text-center md:text-left flex-1">
                                        <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-1">Departure</div>
                                        <div className="text-5xl font-black text-white tracking-tight">{ofp?.origin?.icao_code || activeBid?.departure}</div>
                                        <div className="text-sm text-gray-400 mt-1">{ofp?.origin?.name || ''}</div>
                                    </div>

                                    {/* Flight Path Visual */}
                                    <div className="flex flex-col items-center gap-3 px-8">
                                        <div className="text-center">
                                            <div className="text-xs font-mono text-amber-500 font-bold">{ofp?.atc?.callsign || activeBid?.callsign}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-emerald-500/20" />
                                            <div className="relative w-32 md:w-48">
                                                <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500" />
                                                <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 rotate-90" />
                                            </div>
                                            <div className="w-3 h-3 rounded-full border-2 border-red-500 bg-red-500/20" />
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
                                            {ofp?.general?.route_distance && <span>{ofp.general.route_distance} NM</span>}
                                            <span className="w-1 h-1 bg-gray-700 rounded-full" />
                                            <span>{ofp?.aircraft?.icao_code || activeBid?.aircraft}</span>
                                            {ofp?.general?.costindex && (
                                                <>
                                                    <span className="w-1 h-1 bg-gray-700 rounded-full" />
                                                    <span>CI {ofp.general.costindex}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Arrival */}
                                    <div className="text-center md:text-right flex-1">
                                        <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-1">Arrival</div>
                                        <div className="text-5xl font-black text-white tracking-tight">{ofp?.destination?.icao_code || activeBid?.arrival}</div>
                                        <div className="text-sm text-gray-400 mt-1">{ofp?.destination?.name || ''}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* KPI Strip — only shown when full SimBrief OFP is available */}
                        {ofp && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {[
                                    { label: 'Est. Time', value: (() => { const p = (ofp.times.est_time_enroute || '00:00').split(':'); return `${p[0]}h ${p[1]}m`; })(), icon: Clock, color: 'text-blue-400' },
                                    { label: 'Block Fuel', value: `${weightUnit === 'kgs' ? Math.round(Number(ofp.fuel.plan_ramp) * 0.453592).toLocaleString() : Number(ofp.fuel.plan_ramp).toLocaleString()} ${weightUnit}`, icon: Fuel, color: 'text-amber-400' },
                                    { label: 'Avg Wind', value: `${ofp.general.avg_wind_dir}° / ${ofp.general.avg_wind_spd} kt`, icon: Wind, color: 'text-cyan-400' },
                                    { label: 'Passengers', value: ofp.weights.pax_count, icon: Users, color: 'text-purple-400' },
                                    { label: 'Cargo', value: `${(Number(ofp.weights.cargo) / 1000).toFixed(1)}t`, icon: Package, color: 'text-emerald-400' },
                                ].map((kpi) => (
                                    <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4 group hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                            <kpi.icon className={`w-3.5 h-3.5 ${kpi.color} opacity-60`} />
                                            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">{kpi.label}</span>
                                        </div>
                                        <p className="text-lg font-bold text-white font-mono">{kpi.value}</p>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Main Content — only when full OFP available */}
                        {ofp && (
                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* Route */}
                                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
                                    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                                        <Navigation className="w-4 h-4 text-amber-500" />
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Flight Route</h3>
                                    </div>
                                    <div className="p-6">
                                        <div className="bg-black/50 p-4 rounded-xl border-l-[3px] border-amber-500 font-mono text-xs leading-relaxed text-gray-300 overflow-x-auto whitespace-nowrap">
                                            {ofp.general.route}
                                        </div>
                                    </div>
                                </div>

                                {/* Weather */}
                                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
                                    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                                        <CloudSun className="w-4 h-4 text-amber-500" />
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Weather Briefing</h3>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {[
                                            { label: 'Origin METAR', data: ofp.weather.orig_metar, color: 'border-emerald-500', icon: '🟢' },
                                            { label: 'Dest METAR', data: ofp.weather.dest_metar, color: 'border-red-500', icon: '🔴' },
                                            { label: 'Alternate', data: ofp.weather.altn_metar, color: 'border-purple-500', icon: '🟣' },
                                            { label: 'Avg Wind', data: `${ofp.general.avg_wind_dir}° / ${ofp.general.avg_wind_spd} KT`, color: 'border-amber-500', icon: '🌬️' },
                                        ].map(wx => (
                                            <div key={wx.label} className={`bg-black/40 p-4 rounded-xl border-l-[3px] ${wx.color}`}>
                                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                    <span>{wx.icon}</span> {wx.label}
                                                </div>
                                                <p className="text-[11px] font-mono text-gray-300 leading-relaxed max-h-20 overflow-y-auto">{wx.data}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bid-only route summary (no full OFP) */}
                        {!ofp && activeBid?.route && (
                            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                                    <Navigation className="w-4 h-4 text-amber-500" />
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Flight Route</h3>
                                </div>
                                <div className="p-6">
                                    <div className="bg-black/50 p-4 rounded-xl border-l-[3px] border-amber-500 font-mono text-xs leading-relaxed text-gray-300 overflow-x-auto whitespace-nowrap">
                                        {activeBid.route}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Booking status bar */}
                        {bookingSuccess && (
                            <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                <Check className="w-5 h-5 text-emerald-500" />
                                <span className="text-sm font-bold text-emerald-400">{bookingSuccess}</span>
                                <span className="text-xs text-gray-500 ml-auto">Open ACARS client to start your flight</span>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="no-ofp" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div className="max-w-xl mx-auto mt-8">
                            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-8 text-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] to-transparent" />
                                <div className="relative">
                                    <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                                        <FileText className="w-10 h-10 text-amber-500" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Flight Planning</h3>
                                    <p className="text-gray-500 text-sm mb-8">Import your SimBrief OFP to automatically file your bid</p>

                                    <div className="space-y-3">
                                        <button 
                                            onClick={() => fetchOfpAndBook(username)}
                                            disabled={loading || !username}
                                            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-3"
                                        >
                                            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plane className="w-5 h-5" />}
                                            {bookingLoading ? 'Filing Bid...' : 'Import & File Flight'}
                                        </button>

                                        <button 
                                            onClick={() => window.open('https://www.simbrief.com/system/dispatch.php?new=1', '_blank')}
                                            className="w-full py-3.5 bg-white/5 border border-white/[0.08] hover:bg-white/10 text-gray-300 hover:text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                                        >
                                            <ExternalLink className="w-4 h-4" /> Create on SimBrief
                                        </button>
                                    </div>

                                    <div className="mt-6 flex items-center justify-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${username ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <span className="text-xs text-gray-500">
                                            {username ? `SimBrief: ${username}` : 'SimBrief not linked'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function DispatchPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-2 h-[calc(100vh-90px)] overflow-y-auto">
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center h-full space-y-6">
                    <div className="w-16 h-16 border-2 border-amber-500/20 rounded-full animate-pulse" />
                    <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.3em]">Loading...</p>
                </div>
            }>
                <FlightPreviewContent />
            </Suspense>
        </div>
    );
}
