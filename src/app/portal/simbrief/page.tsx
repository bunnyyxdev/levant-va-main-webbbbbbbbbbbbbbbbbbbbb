'use client';

import { useState, useEffect } from 'react';
import { Plane, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Msg = { type: 'success' | 'error'; text: string } | null;

export default function SimBriefPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<Msg>(null);
    const [bid, setBid] = useState<any>(null);
    const [simbriefId, setSimbriefId] = useState<string | null>(null);
    const [fetchingId, setFetchingId] = useState(true);

    useEffect(() => {
        // Fetch SimBrief ID from settings
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user?.simbriefId) {
                    setSimbriefId(data.user.simbriefId);
                }
            })
            .catch(() => {})
            .finally(() => setFetchingId(false));
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
            
            if (res.ok) {
                setBid(data.bid);
                setMessage({ 
                    type: 'success', 
                    text: `Flight plan loaded: ${data.bid.departureIcao} → ${data.bid.arrivalIcao}. Open ACARS and click "Fetch Bid" to load it.` 
                });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to fetch SimBrief' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Plane className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">SimBrief Integration</h1>
                    <p className="text-gray-500 text-xs">Fetch your flight plan from SimBrief</p>
                </div>
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
                    
                    {!fetchingId && !simbriefId && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                            <p className="text-xs text-amber-400">
                                <strong className="text-amber-400">Warning:</strong> SimBrief ID not configured. Please add your SimBrief ID in <a href="/portal/settings" className="underline hover:text-amber-300">Settings</a> first.
                            </p>
                        </div>
                    )}
                    
                    <button
                        onClick={handleFetchSimBrief}
                        disabled={loading || !simbriefId || fetchingId}
                        className="w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer border-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                    >
                        {fetchingId ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading...
                            </>
                        ) : loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Fetching...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                Fetch SimBrief
                            </>
                        )}
                    </button>
                </div>

                {bid && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4 space-y-2"
                    >
                        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Current Flight Plan</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-500 text-xs">Flight Number</p>
                                <p className="text-white font-mono font-bold">{bid.flightNumber}</p>
                            </div>
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
                        </div>
                    </motion.div>
                )}
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
