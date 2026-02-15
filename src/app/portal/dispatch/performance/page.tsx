'use client';

import { useState } from 'react';
import { Calculator, Activity, ArrowDown, ArrowUp, Plane } from 'lucide-react';

export default function PerformancePage() {
    // V-Speed State
    const [weight, setWeight] = useState<number>(140); // 1000 lbs
    const [flaps, setFlaps] = useState<string>('5');
    const [vSpeeds, setVSpeeds] = useState<{ v1: number, vr: number, v2: number } | null>(null);

    // TOD State
    const [currentAlt, setCurrentAlt] = useState<number>(35000);
    const [targetAlt, setTargetAlt] = useState<number>(3000);
    const [groundSpeed, setGroundSpeed] = useState<number>(450);
    const [todResult, setTodResult] = useState<{ distance: number, time: number, rate: number } | null>(null);

    const calculateVSpeeds = () => {
        // Simplified Logic for 737-800
        // Base V2 for 140k lbs, Flaps 5 = 144 kts
        const weightFactor = (weight - 100) * 0.5; // Roughly +0.5 kts per 1000lbs over 100k
        let flapFactor = 0;
        if (flaps === '1') flapFactor = 10;
        if (flaps === '5') flapFactor = 0;
        if (flaps === '15') flapFactor = -10;
        if (flaps === '25') flapFactor = -15;

        const baseV2 = 144 + weightFactor + flapFactor;
        const v2 = Math.round(baseV2);
        const vr = Math.round(v2 - 4);
        const v1 = Math.round(vr - 3);

        setVSpeeds({ v1, vr, v2 });
    };

    const calculateTOD = () => {
        // 3-degree glide path rule of thumb
        // Distance = Altitude to lose / 1000 * 3
        const altDiff = currentAlt - targetAlt;
        const distance = Math.round((altDiff / 1000) * 3);
        
        // Time = Distance / (Ground Speed / 60)
        const time = Math.round(distance / (groundSpeed / 60));

        // Required Rate of Descent to meet 3 degree path
        // GS / 2 * 10 = Vertical Speed
        const rate = Math.round((groundSpeed / 2) * 10);

        setTodResult({ distance, time, rate });
    };

    return (
        <div className="space-y-6">
            <div className="glass-card p-6">
                <div className="flex items-center gap-3">
                    <Calculator className="w-8 h-8 text-accent-gold" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Performance Tools</h1>
                        <p className="text-gray-400">Dispatch & In-Flight Calculation Utilities</p>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* V-Speed Calculator */}
                <div className="glass-card p-6 space-y-6">
                    <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                        <ArrowUp className="w-6 h-6 text-blue-400" />
                        <h2 className="text-xl font-bold text-white">Takeoff Performance (737)</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-gray-400">Gross Weight (1000 lbs)</label>
                            <input 
                                type="number" 
                                value={weight}
                                onChange={(e) => setWeight(Number(e.target.value))}
                                className="w-full bg-[#111]/50 border border-white/[0.08] rounded-lg p-2 text-white"
                            />
                            <div className="flex justify-between text-xs text-gray-500 px-1 mt-1">
                                <span>100k</span>
                                <span>175k</span>
                            </div>
                            <input 
                                type="range" min="100" max="175" 
                                value={weight}
                                onChange={(e) => setWeight(Number(e.target.value))}
                                className="w-full h-1 bg-[#161616] rounded-lg appearance-none cursor-pointer mt-2"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-400">Plan Flaps</label>
                            <select 
                                value={flaps}
                                onChange={(e) => setFlaps(e.target.value)}
                                className="w-full bg-[#111]/50 border border-white/[0.08] rounded-lg p-2 text-white"
                            >
                                <option value="1">Flaps 1</option>
                                <option value="5">Flaps 5</option>
                                <option value="10">Flaps 10</option>
                                <option value="15">Flaps 15</option>
                                <option value="25">Flaps 25</option>
                            </select>
                        </div>

                        <button 
                            onClick={calculateVSpeeds}
                            className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50 py-2 rounded-lg font-bold transition-all"
                        >
                            Calculate V-Speeds
                        </button>
                    </div>

                    {vSpeeds && (
                        <div className="grid grid-cols-3 gap-2 mt-4">
                            <div className="bg-[#0a0a0a] p-3 rounded-lg text-center border border-white/[0.06]">
                                <div className="text-xs text-gray-500">V1</div>
                                <div className="text-2xl font-mono font-bold text-white">{vSpeeds.v1}</div>
                            </div>
                            <div className="bg-[#0a0a0a] p-3 rounded-lg text-center border border-white/[0.06]">
                                <div className="text-xs text-gray-500">Vr</div>
                                <div className="text-2xl font-mono font-bold text-white">{vSpeeds.vr}</div>
                            </div>
                            <div className="bg-[#0a0a0a] p-3 rounded-lg text-center border border-white/[0.06]">
                                <div className="text-xs text-gray-500">V2</div>
                                <div className="text-2xl font-mono font-bold text-accent-gold">{vSpeeds.v2}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* TOD Calculator */}
                <div className="glass-card p-6 space-y-6">
                    <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                        <ArrowDown className="w-6 h-6 text-emerald-400" />
                        <h2 className="text-xl font-bold text-white">Top of Descent</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-400">Current Alt</label>
                                <input 
                                    type="number" 
                                    value={currentAlt}
                                    onChange={(e) => setCurrentAlt(Number(e.target.value))}
                                    className="w-full bg-[#111]/50 border border-white/[0.08] rounded-lg p-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Target Alt</label>
                                <input 
                                    type="number" 
                                    value={targetAlt}
                                    onChange={(e) => setTargetAlt(Number(e.target.value))}
                                    className="w-full bg-[#111]/50 border border-white/[0.08] rounded-lg p-2 text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-gray-400">Ground Speed (GS)</label>
                            <input 
                                type="number" 
                                value={groundSpeed}
                                onChange={(e) => setGroundSpeed(Number(e.target.value))}
                                className="w-full bg-[#111]/50 border border-white/[0.08] rounded-lg p-2 text-white"
                            />
                        </div>

                        <button 
                            onClick={calculateTOD}
                            className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 py-2 rounded-lg font-bold transition-all"
                        >
                            Calculate Path
                        </button>
                    </div>

                    {todResult && (
                        <div className="space-y-3 mt-4">
                            <div className="bg-[#0a0a0a] p-4 rounded-lg flex justify-between items-center border border-white/[0.06]">
                                <span className="text-gray-400">Distance to Target</span>
                                <span className="text-2xl font-mono font-bold text-white">{todResult.distance} <span className="text-sm text-gray-500">NM</span></span>
                            </div>
                            <div className="bg-[#0a0a0a] p-4 rounded-lg flex justify-between items-center border border-white/[0.06]">
                                <span className="text-gray-400">Time to Descent</span>
                                <span className="text-2xl font-mono font-bold text-white">{todResult.time} <span className="text-sm text-gray-500">MIN</span></span>
                            </div>
                            <div className="bg-[#0a0a0a] p-4 rounded-lg flex justify-between items-center border border-white/[0.06]">
                                <span className="text-gray-400">Required V/S</span>
                                <span className="text-2xl font-mono font-bold text-emerald-400 text-glow">-{todResult.rate} <span className="text-sm text-gray-500">FPM</span></span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
