'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, Map, ArrowRight, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function ToursPage() {
    const [tours, setTours] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTours = async () => {
            try {
                const res = await axios.get('/api/portal/tours');
                setTours(res.data.tours || []);
            } catch (error) {
                console.error("Failed to fetch tours", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTours();
    }, []);

    if (loading) return <div className="flex h-96 items-center justify-center text-accent-gold"><Loader2 className="animate-spin" size={48} /></div>;

    return (
        <div className="space-y-6">
             <div>
                 <h1 className="text-2xl font-bold text-white">Career Tours</h1>
                 <p className="text-gray-500 text-xs mt-0.5">Complete multi-leg journeys to earn badges and credits</p>
             </div>

             {tours.length === 0 ? (
                 <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl text-gray-500">
                     No active tours at the moment. Check back later!
                 </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {tours.map((tour) => (
                        <div key={tour._id} className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl group overflow-hidden flex flex-col h-full hover:border-accent-gold/20 transition-colors">
                            <div className="h-48 relative overflow-hidden">
                                <img src={tour.image} alt={tour.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute top-0 right-0 p-3 flex gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md ${
                                        tour.difficulty === 'Easy' ? 'bg-green-500/80 text-white' : 
                                        tour.difficulty === 'Medium' ? 'bg-yellow-500/80 text-black' :
                                        'bg-red-500/80 text-white'
                                    }`}>
                                        {tour.difficulty}
                                    </span>
                                    {tour.user_status !== 'Not Started' && (
                                        <span className="bg-accent-gold text-black px-3 py-1 rounded-full text-xs font-bold uppercase backdrop-blur-md">
                                            {tour.user_status}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="p-6 flex-1 flex flex-col">
                                <h2 className="text-2xl font-bold text-white mb-2">{tour.name}</h2>
                                <p className="text-gray-400 text-sm mb-6 flex-1 line-clamp-2">{tour.description}</p>
                                
                                <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/[0.06]">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">CASH REWARD</span>
                                            <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
                                                <span>{tour.reward_credits?.toLocaleString()}</span>
                                                <span className="text-[10px]">CR</span>
                                            </div>
                                        </div>
                                        
                                        {tour.reward_badge_id && (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">LEGACY BADGE</span>
                                                <div className="w-8 h-8 rounded bg-[#111]/50 p-1 border border-white/[0.06] flex items-center justify-center">
                                                    <img 
                                                        src={`/img/badge/${tour.reward_badge_id}.png`} 
                                                        alt="Badge" 
                                                        className="w-full h-full object-contain"
                                                        onError={(e: any) => e.target.style.display = 'none'}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">DISTANCE</span>
                                            <div className="flex items-center gap-1 text-gray-400 font-mono text-xs">
                                                <span>{tour.legs?.length || 0} LEGS</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <Link 
                                        href={`/portal/tours/${tour._id}`}
                                        className="w-10 h-10 bg-accent-gold text-black rounded-lg hover:bg-yellow-400 transition-all flex items-center justify-center shadow-lg hover:shadow-accent-gold/20 group-hover:scale-110"
                                    >
                                        <ArrowRight size={20} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             )}
        </div>
    );
}
