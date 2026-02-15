'use client';

import { useState, useEffect } from 'react';
import { Wrench, Plane, AlertTriangle, CheckCircle, RefreshCw, DollarSign, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface FleetItem {
    registration: string;
    aircraft_type: string;
    name?: string;
    condition: number;
    status: string;
    current_location: string;
    total_hours: number;
    flight_count: number;
    last_service?: string;
    grounded_reason?: string;
    repairCost: number;
    isGrounded: boolean;
}

export default function MaintenancePage() {
    const [fleet, setFleet] = useState<FleetItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [repairing, setRepairing] = useState<string | null>(null);
    const [airlineFunds, setAirlineFunds] = useState(0);
    const [repairRate, setRepairRate] = useState(100);
    const [groundedThreshold, setGroundedThreshold] = useState(20);

    const fetchFleet = async () => {
        try {
            const res = await fetch('/api/maintenance/repair');
            const data = await res.json();
            if (res.ok) {
                setFleet(data.fleet || []);
                setAirlineFunds(data.airlineFunds || 0);
                setRepairRate(data.repairRatePerPercent || 100);
                setGroundedThreshold(data.groundedThreshold || 20);
            }
        } catch (error) {
            console.error('Failed to fetch fleet:', error);
            toast.error('Failed to load fleet data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFleet(); }, []);

    const performRepair = async (registration: string, type: 'FULL' | 'MINIMUM') => {
        setRepairing(registration);
        try {
            const res = await fetch('/api/maintenance/repair', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registration, repairType: type }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message);
                await fetchFleet();
            } else {
                toast.error(data.error || 'Repair failed');
            }
        } catch (error) {
            toast.error('Network error during repair');
        } finally {
            setRepairing(null);
        }
    };

    const groundedCount = fleet.filter(f => f.isGrounded).length;
    const avgCondition = fleet.length > 0 ? Math.round(fleet.reduce((s, f) => s + f.condition, 0) / fleet.length) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Wrench className="w-8 h-8 text-accent-gold" />
                        <div>
                            <h1 className="text-2xl font-bold text-white">Fleet Maintenance</h1>
                            <p className="text-gray-400">Manage aircraft condition, repairs and grounding.</p>
                        </div>
                    </div>
                    <button onClick={() => { setLoading(true); fetchFleet(); }} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                        <RefreshCw size={16} className={loading ? 'animate-spin text-accent-gold' : 'text-gray-400'} />
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl border border-white/[0.06] text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Airline Vault</div>
                    <div className="text-xl font-bold text-accent-gold font-mono">{airlineFunds.toLocaleString()} <span className="text-xs text-gray-500">Cr</span></div>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/[0.06] text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fleet Size</div>
                    <div className="text-xl font-bold text-white font-mono">{fleet.length}</div>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/[0.06] text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Condition</div>
                    <div className={`text-xl font-bold font-mono ${avgCondition > 70 ? 'text-emerald-400' : avgCondition > 40 ? 'text-amber-400' : 'text-rose-400'}`}>{avgCondition}%</div>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/[0.06] text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Grounded</div>
                    <div className={`text-xl font-bold font-mono ${groundedCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{groundedCount}</div>
                </div>
            </div>

            {/* Fleet List */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading fleet data...</div>
            ) : (
                <div className="grid gap-3">
                    {fleet.map((aircraft) => (
                        <div key={aircraft.registration} className={`glass-panel p-5 rounded-xl border ${aircraft.isGrounded ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/[0.06]'} flex items-center justify-between`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${
                                    aircraft.isGrounded ? 'bg-rose-500/20 text-rose-400' :
                                    aircraft.condition < 40 ? 'bg-amber-500/20 text-amber-400' : 
                                    'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                    {aircraft.isGrounded ? <AlertTriangle size={22} /> : <Plane size={22} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-white">{aircraft.registration}</h3>
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                            aircraft.status === 'Grounded' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                            aircraft.status === 'Maintenance' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                            'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        }`}>{aircraft.status}</span>
                                    </div>
                                    <div className="text-sm text-gray-400">{aircraft.aircraft_type} {aircraft.name ? `"${aircraft.name}"` : ''}</div>
                                    <div className="text-xs text-gray-600 font-mono mt-0.5">
                                        {aircraft.current_location} | {aircraft.total_hours.toFixed(1)}h | {aircraft.flight_count} flights
                                        {aircraft.last_service && ` | Last service: ${new Date(aircraft.last_service).toLocaleDateString()}`}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                {/* Condition Bar */}
                                <div className="w-32">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-gray-500">Condition</span>
                                        <span className={`text-sm font-mono font-bold ${
                                            aircraft.condition > 70 ? 'text-emerald-400' : 
                                            aircraft.condition > 40 ? 'text-amber-400' : 'text-rose-400'
                                        }`}>{aircraft.condition.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${
                                            aircraft.condition > 70 ? 'bg-emerald-500' : 
                                            aircraft.condition > 40 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`} style={{ width: `${aircraft.condition}%` }} />
                                    </div>
                                    <div className="text-[9px] text-gray-600 font-mono mt-0.5 text-right">
                                        Repair: {aircraft.repairCost.toLocaleString()} Cr
                                    </div>
                                </div>

                                {/* Repair Buttons */}
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => performRepair(aircraft.registration, 'MINIMUM')}
                                        disabled={aircraft.condition >= groundedThreshold + 5 || repairing === aircraft.registration}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5
                                            ${aircraft.condition >= groundedThreshold + 5
                                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                                                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30'
                                            }`}
                                    >
                                        <Shield size={14} /> Min
                                    </button>
                                    <button 
                                        onClick={() => performRepair(aircraft.registration, 'FULL')}
                                        disabled={aircraft.condition >= 99 || repairing === aircraft.registration}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5
                                            ${aircraft.condition >= 99
                                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                                                : 'bg-accent-gold hover:bg-amber-400 text-black'
                                            }`}
                                    >
                                        {repairing === aircraft.registration ? <RefreshCw size={14} className="animate-spin" /> : <Wrench size={14} />} Full
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
