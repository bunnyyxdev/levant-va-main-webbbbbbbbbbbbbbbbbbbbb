'use client';

import { useState, useEffect } from 'react';
import { Plane, RefreshCw, CheckCircle, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Msg = { type: 'success' | 'error'; text: string } | null;

export default function SimBriefPage() {
    const [loading, setLoading] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [message, setMessage] = useState<Msg>(null);
    const [bid, setBid] = useState<any>(null);
    const [hasActiveFlight, setHasActiveFlight] = useState(false);
    const [simbriefId, setSimbriefId] = useState<string | null>(null);
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        // Fetch SimBrief ID + existing bid in parallel
        Promise.all([
            fetch('/api/auth/me').then(r => r.json()).catch(() => ({ user: null })),
            fetch('/api/portal/simbrief-to-bid').then(r => r.json()).catch(() => ({ bid: null })),
        ]).then(([meData, bidData]) => {
            if (meData.user?.simbriefId) setSimbriefId(meData.user.simbriefId);
            if (bidData.bid) {
                setBid(bidData.bid);
                setHasActiveFlight(bidData.hasActiveFlight || false);
            }
        }).finally(() => setPageLoading(false));
    }, []);

    const handleFetchSimBrief = async () => {
        setMessage(null);
        setLoading(true);
        
        try {
            const res = await fetch('/api/portal/simbrief-to-bid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await res.json();
            
            if (res.ok && data.bid) {
                setBid(data.bid);
                setHasActiveFlight(false);
                setMessage({ 
                    type: 'success', 
                    text: `Flight plan loaded: ${data.bid.departureIcao} → ${data.bid.arrivalIcao}. Open ACARS and click "Fetch Bid" to load it.` 
                });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to fetch SimBrief' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelFlight = async () => {
        if (!confirm(hasActiveFlight 
            ? 'This will cancel your bid AND stop any active flight in ACARS. Are you sure?' 
            : 'Cancel this flight plan?'
        )) return;

        setCancelling(true);
        setMessage(null);

        try {
            const res = await fetch('/api/portal/simbrief-to-bid', { method: 'DELETE' });
            const data = await res.json();

            if (res.ok) {
                setBid(null);
                setHasActiveFlight(false);
                setMessage({ type: 'success', text: 'Flight cancelled successfully.' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to cancel flight' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <Plane className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">SimBrief Integration</h1>
                        <p className="text-gray-500 text-xs">Fetch your flight plan from SimBrief</p>
                    </div>
                </div>
                {bid && (
                    <button
                        onClick={handleCancelFlight}
                        disabled={cancelling}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cancelling ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <XCircle className="w-4 h-4" />
                        )}
                        Cancel Flight
                    </button>
                )}
            </div>

            {/* Message */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                            message.type === 'success' 
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                                : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}
                    >
                        {message.type === 'success' ? (
                            <CheckCircle className="w-4 h-4 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 shrink-0" />
                        )}
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active Bid Card */}
            {bid && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-5 space-y-3"
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Active Flight Plan</h3>
                        {hasActiveFlight && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                In Flight
                            </span>
                        )}
                        {!hasActiveFlight && bid.status === 'Active' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                Ready
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-gray-500 text-xs">Callsign</p>
                            <p className="text-white font-mono font-bold">{bid.callsign}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Route</p>
                            <p className="text-white font-mono font-bold">{bid.departureIcao} → {bid.arrivalIcao}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Aircraft</p>
                            <p className="text-white font-mono font-bold">{bid.aircraftType}</p>
                        </div>
                        {bid.route && (
                            <div>
                                <p className="text-gray-500 text-xs">Route String</p>
                                <p className="text-white font-mono text-xs truncate">{bid.route}</p>
                            </div>
                        )}
                    </div>
                    {hasActiveFlight && (
                        <p className="text-xs text-amber-400/80 mt-2">
                            This flight is currently being tracked in ACARS. Cancelling will stop the flight on both web and ACARS.
                        </p>
                    )}
                </motion.div>
            )}

            {/* Main Card */}
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.08] p-6 space-y-6">
                <div>
                    <h2 className="text-lg font-bold text-white mb-2">How It Works</h2>
                    <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                        <li>Create a flight plan on <a href="https://simbrief.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">SimBrief.com</a></li>
                        <li>Click "Fetch SimBrief" below to load your latest flight plan</li>
                        <li>Open ACARS app and click "Fetch Bid" to load the flight plan</li>
                        <li>Click "Start Flight" in ACARS to begin tracking</li>
                    </ol>
                </div>

                <div className="border-t border-white/[0.08] pt-6 space-y-4">
                    {simbriefId && (
                        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
                            <p className="text-xs text-cyan-400/80">
                                <strong className="text-cyan-400">SimBrief ID:</strong> {simbriefId}
                            </p>
                        </div>
                    )}
                    
                    {!pageLoading && !simbriefId && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                            <p className="text-xs text-amber-400">
                                <strong className="text-amber-400">Warning:</strong> SimBrief ID not configured. Please add your SimBrief ID in <a href="/portal/settings" className="underline hover:text-amber-300">Settings</a> first.
                            </p>
                        </div>
                    )}
                    
                    <button
                        onClick={handleFetchSimBrief}
                        disabled={loading || !simbriefId || pageLoading}
                        className="w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer border-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                    >
                        {pageLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading...
                            </>
                        ) : loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Fetching...
                            </>
                        ) : bid ? (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                Re-Fetch SimBrief
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                Fetch SimBrief
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
                <p className="text-xs text-cyan-400/80">
                    <strong className="text-cyan-400">Note:</strong> Make sure you have configured your SimBrief ID in Settings before using this feature.
                </p>
            </div>
        </div>
    );
}
