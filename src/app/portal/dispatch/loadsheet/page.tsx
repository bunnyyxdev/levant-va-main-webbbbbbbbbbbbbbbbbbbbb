'use client';

import { useState, useEffect } from 'react';
import { Scale, Users, Package, Fuel, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';

export default function LoadsheetPage() {
    // 737-800 Constants (approximate)
    const OEW = 91300; // Operating Empty Weight (lbs)
    const MAX_ZFW = 136000;
    const MAX_TOW = 174200;
    const MAX_LW = 144000;
    
    // Limits
    const MAX_PAX = 189;
    const MAX_CARGO = 10000; // lbs (fwd + aft)
    const MAX_FUEL = 46000; // lbs

    // State
    const [pax, setPax] = useState(150);
    const [cargo, setCargo] = useState(3000); // lbs
    const [fuel, setFuel] = useState(12000); // lbs

    const [zfw, setZfw] = useState(0);
    const [tow, setTow] = useState(0);
    const [cg, setCg] = useState(24); // %MAC

    useEffect(() => {
        // Calculate Weights
        const paxWeight = pax * 190; // lbs per pax (inc bags)
        const currentZfw = OEW + paxWeight + cargo;
        const currentTow = currentZfw + fuel;

        setZfw(currentZfw);
        setTow(currentTow);

        // Simple CG Simulation (Not aero-accurate, just visual feedback)
        // 0% Cargo = 22% MAC
        // Max Cargo = 28% MAC
        // Max Pax = shifts Aft
        const baseCg = 22;
        const paxFactor = (pax / MAX_PAX) * 4; // Shift aft by up to 4%
        const cargoFactor = (cargo / MAX_CARGO) * 3; // Shift aft by up to 3%
        // Fuel usually shifts CG fwd slightly then aft on 737, simplifying:
        const fuelFactor = (fuel / MAX_FUEL) * -2; 
        
        setCg(Number((baseCg + paxFactor + cargoFactor + fuelFactor).toFixed(1)));

    }, [pax, cargo, fuel]);

    // Envelope Data (Safe Zone)
    const envelopeData = [
        { weight: 90000, minCg: 10, maxCg: 32 },
        { weight: 130000, minCg: 12, maxCg: 30 },
        { weight: 175000, minCg: 14, maxCg: 28 },
    ];

    return (
        <div className="space-y-6">
             <div className="glass-card p-6">
                <div className="flex items-center gap-3">
                    <Scale className="w-8 h-8 text-accent-gold" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Interactive Loadsheet</h1>
                        <p className="text-gray-400">Weight & Balance Calculation</p>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Inputs */}
                <div className="glass-card p-6 space-y-8">
                    {/* PAX */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="flex items-center gap-2 text-white font-semibold">
                                <Users className="w-5 h-5 text-blue-400" /> Passengers
                            </label>
                            <span className="text-2xl font-mono text-white">{pax}</span>
                        </div>
                        <input 
                            type="range" min="0" max={MAX_PAX} 
                            value={pax} onChange={(e) => setPax(Number(e.target.value))}
                            className="w-full h-2 bg-[#111] rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>0</span>
                            <span>{MAX_PAX}</span>
                        </div>
                    </div>

                    {/* Cargo */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="flex items-center gap-2 text-white font-semibold">
                                <Package className="w-5 h-5 text-emerald-400" /> Cargo (lbs)
                            </label>
                            <span className="text-2xl font-mono text-white">{cargo}</span>
                        </div>
                        <input 
                            type="range" min="0" max={MAX_CARGO} step="100"
                            value={cargo} onChange={(e) => setCargo(Number(e.target.value))}
                            className="w-full h-2 bg-[#111] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                         <div className="flex justify-between text-xs text-gray-500">
                            <span>0</span>
                            <span>{MAX_CARGO}</span>
                        </div>
                    </div>

                    {/* Fuel */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="flex items-center gap-2 text-white font-semibold">
                                <Fuel className="w-5 h-5 text-amber-500" /> Fuel (lbs)
                            </label>
                            <span className="text-2xl font-mono text-white">{fuel}</span>
                        </div>
                        <input 
                            type="range" min="1000" max={MAX_FUEL} step="100"
                            value={fuel} onChange={(e) => setFuel(Number(e.target.value))}
                            className="w-full h-2 bg-[#111] rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                         <div className="flex justify-between text-xs text-gray-500">
                            <span>1000</span>
                            <span>{MAX_FUEL}</span>
                        </div>
                    </div>
                </div>

                {/* Results & Graph */}
                <div className="space-y-6">
                    {/* Totals */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl border ${zfw > MAX_ZFW ? 'bg-red-500/10 border-red-500' : 'bg-[#0a0a0a] border-white/[0.06]'}`}>
                            <div className="text-xs text-gray-400 mb-1">Zero Fuel Weight (ZFW)</div>
                            <div className="text-2xl font-mono font-bold text-white">{(zfw/1000).toFixed(1)}k <span className="text-sm font-normal text-gray-500">/ 136.0k</span></div>
                        </div>
                         <div className={`p-4 rounded-xl border ${tow > MAX_TOW ? 'bg-red-500/10 border-red-500' : 'bg-[#0a0a0a] border-white/[0.06]'}`}>
                            <div className="text-xs text-gray-400 mb-1">Takeoff Weight (TOW)</div>
                            <div className="text-2xl font-mono font-bold text-white">{(tow/1000).toFixed(1)}k <span className="text-sm font-normal text-gray-500">/ 174.2k</span></div>
                        </div>
                    </div>

                    {/* Envelope Visualization */}
                    <div className="glass-card p-4 h-64 flex flex-col items-center justify-center relative">
                        <h3 className="text-sm font-bold text-gray-400 absolute top-4 left-4">CG Envelope</h3>
                        
                        {/* Placeholder for complex chart - simplified CSS representation for now */}
                        <div className="w-full h-full border-l border-b border-gray-600 relative mt-6 ml-6">
                             {/* Safe Box */}
                             <div className="absolute top-[10%] left-[20%] w-[60%] h-[80%] border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 rounded-lg"></div>
                             
                             {/* CG Dot */}
                             <div 
                                className="absolute w-4 h-4 bg-accent-gold rounded-full shadow-lg shadow-amber-500/50 transition-all duration-500 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
                                style={{
                                    left: `${((cg - 10) / 25) * 100}%`, // Rough mapping 10-35% MAC
                                    bottom: `${((tow - 90000) / (MAX_TOW - 90000)) * 100}%`
                                }}
                             >
                                <div className="w-1 h-1 bg-black rounded-full"></div>
                             </div>
                             
                             {/* Labels */}
                             <div className="absolute -bottom-6 w-full text-center text-xs text-gray-500">% MAC</div>
                             <div className="absolute -left-8 top-1/2 -rotate-90 text-xs text-gray-500">Weight</div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/20">
                            Finalize Loadsheet <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
