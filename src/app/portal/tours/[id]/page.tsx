'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Check, Lock, Plane, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'sonner';

export default function TourDetailPage() {
    const params = useParams();
    const tourId = params?.id as string;
    const [loading, setLoading] = useState(true);
    const [tour, setTour] = useState<any>(null);
    const [progress, setProgress] = useState<any>(null);
    const [joined, setJoined] = useState(false);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        const fetchTour = async () => {
            try {
                const res = await axios.get(`/api/portal/tours/${tourId}`);
                setTour(res.data.tour);
                if (res.data.progress) {
                    setProgress(res.data.progress);
                    setJoined(true);
                }
            } catch (error) {
                console.error("Failed to fetch tour", error);
            } finally {
                setLoading(false);
            }
        }
        
        if (tourId) fetchTour();
    }, [tourId]);

    const handleJoin = async () => {
        if (!confirm("Are you ready to sign the contract for this tour?")) return;
        
        setJoining(true);
        try {
            const res = await axios.post(`/api/portal/tours/${tourId}`);
            if (res.data.success) {
                toast.success('You have joined the tour!');
                setJoined(true);
                // If it was already joined (idempotent), use existing progress, else use new
                const p = res.data.progress;
                setProgress({
                    currentLeg: p.current_leg_index,
                    completedLegs: p.completed_legs,
                    status: p.status
                });
            }
        } catch (error) {
            toast.error('Failed to join tour.');
            console.error(error);
        } finally {
            setJoining(false);
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center text-accent-gold"><Loader2 className="animate-spin" size={48} /></div>;
    if (!tour) return <div className="p-12 text-center text-red-500">Tour data corrupted or missing.</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="relative h-64 rounded-2xl overflow-hidden glass-card border-none">
                <img src={tour.image} alt={tour.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-end p-8">
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md ${
                                    tour.difficulty === 'Easy' ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'
                                }`}>
                            {tour.difficulty}
                        </span>
                        {joined && <span className="bg-accent-gold text-black px-3 py-1 rounded-full text-xs font-bold uppercase">Active Mission</span>}
                    </div>
                    <h1 className="text-4xl font-display font-bold text-white">{tour.name}</h1>
                    <p className="text-gray-300 max-w-2xl mt-2 text-lg">{tour.description}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats / Actions */}
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Mission Status</h3>
                        
                        {!joined ? (
                            <button 
                                onClick={handleJoin}
                                className="w-full py-4 bg-accent-gold hover:bg-yellow-400 text-black font-bold rounded-lg text-lg shadow-lg hover:shadow-accent-gold/20 transition-all"
                            >
                                JOIN TOUR
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                                        <span>Progress</span>
                                        <span className="text-white">{Math.round((progress.currentLeg / tour.legs.length) * 100)}%</span>
                                    </div>
                                    <div className="h-2 bg-[#080808] rounded-full overflow-hidden">
                                        <div className="h-full bg-accent-gold rounded-full transition-all duration-1000" style={{ width: `${(progress.currentLeg / tour.legs.length) * 100}%` }}></div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-lg border border-white/[0.06]">
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Financial reward</p>
                                        <p className="text-2xl font-mono text-emerald-400 font-bold">{tour.reward_credits?.toLocaleString()} <span className="text-xs">CR</span></p>
                                    </div>
                                    {tour.reward_badge_id && (
                                        <div className="bg-white/5 p-4 rounded-lg border border-white/[0.06] flex flex-col items-center justify-center">
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Mission Badge</p>
                                            <div className="w-12 h-12 rounded bg-[#111]/50 p-2 border border-white/[0.08] flex items-center justify-center shadow-inner">
                                                <img 
                                                    src={`/img/badge/${tour.reward_badge_id}.png`} 
                                                    alt="Badge" 
                                                    className="w-full h-full object-contain"
                                                    onError={(e: any) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/814/814513.png'}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Leg List */}
                <div className="lg:col-span-2 glass-card p-6">
                     <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <MapPin size={20} className="text-accent-gold"/> Flight Itinerary
                     </h3>

                     <div className="relative border-l-2 border-white/10 ml-4 space-y-8 pl-8 pb-4">
                        {tour.legs.map((leg: any, idx: number) => {
                            const isCompleted = joined && idx < progress.currentLeg;
                            const isCurrent = joined && idx === progress.currentLeg;
                            const isLocked = joined && idx > progress.currentLeg;

                            return (
                                <div key={idx} className={`relative p-4 rounded-lg border transition-all ${
                                    isCurrent ? 'bg-white/5 border-accent-gold/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 
                                    isCompleted ? 'bg-emerald-500/5 border-emerald-500/20' : 'border-white/[0.06] opacity-50'
                                }`}>
                                    {/* Timeline Node */}
                                    <div className={`absolute -left-[45px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-4 border-dark-900 flex items-center justify-center transition-all ${
                                        isCompleted ? 'bg-emerald-500 text-black' :
                                        isCurrent ? 'bg-accent-gold text-black animate-pulse' :
                                        'bg-[#111] text-gray-500'
                                    }`}>
                                        {isCompleted ? <Check size={14} strokeWidth={4} /> : 
                                         isCurrent ? <Plane size={14} fill="currentColor" /> :
                                         <span className="text-xs font-bold">{idx + 1}</span>}
                                    </div>
                                    
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 font-mono text-xl font-bold text-white">
                                                <span>{leg.departure_icao}</span>
                                                <span className="text-gray-500 text-sm">➔</span>
                                                <span>{leg.arrival_icao}</span>
                                            </div>
                                            {isCurrent && <span className="text-[10px] bg-accent-gold text-black px-2 py-0.5 rounded font-bold uppercase">Fly Now</span>}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-gray-400 text-sm font-mono">{leg.distance_nm} nm</div>
                                        </div>
                                    </div>
                                    
                                    <p className="text-sm text-gray-500 mt-2 italic">"{leg.notes}"</p>
                                    
                                    {isCurrent && (
                                        <div className="mt-4 pt-4 border-t border-white/[0.06] flex gap-3">
                                            <Link href="/portal/dispatch" className="px-3 py-1.5 bg-accent-gold text-black text-xs font-bold rounded hover:bg-yellow-400 transition-colors">
                                                GO TO DISPATCH
                                            </Link>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <AlertCircle size={12}/>
                                                <span>Fly this route in ACARS to advance.</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                     </div>
                </div>
            </div>
        </div>
    );
}
