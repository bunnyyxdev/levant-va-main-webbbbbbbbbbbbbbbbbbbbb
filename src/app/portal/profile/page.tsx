'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
    Clock, TrendingDown, Target, Zap, Plane, Calendar, Check, User, Shield,
    ChevronRight, Trophy, Medal, Camera, Loader2, Trash2, X, Sparkles, Award, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { HyperText } from '@/components/ui/hyper-text';

interface Pilot {
    pilot_id: string;
    first_name: string;
    last_name: string;
    email: string;
    rank: string;
    country: string;
    timezone: string;
    vatsim_id?: string;
    ivao_id?: string;
    simbrief_id?: string;
    avatar_url?: string;
    total_hours: number;
    transfer_hours: number;
    total_flights: number;
    total_credits: number;
    routes_flown?: string[];
    current_location: string;
    average_landing: number;
    status: string;
    created_at: string;
    email_opt_in: boolean;
    balance: number;
    hoppie_code?: string;
    sim_mode?: string;
}

interface Country {
    code: string;
    name: string;
    flag: string;
    timezones: string[];
}

interface PilotBadge {
    _id: string;
    award_id: {
        _id: string;
        name: string;
        description?: string;
        imageUrl?: string;
        category?: string;
    };
    earned_at: string;
}

const RANKS = [
    { name: 'Cadet', hours: 0 },
    { name: 'Second Officer', hours: 25 },
    { name: 'First Officer', hours: 50 },
    { name: 'Senior First Officer', hours: 100 },
    { name: 'Captain', hours: 250 },
    { name: 'Senior Captain', hours: 500 },
    { name: 'Check Airman', hours: 1000 },
];

function getRankProgress(hours: number) {
    let currentRank = RANKS[0];
    let nextRank = RANKS[1];
    
    for (let i = 0; i < RANKS.length; i++) {
        if (hours >= RANKS[i].hours) {
            currentRank = RANKS[i];
            nextRank = RANKS[i + 1] || RANKS[i];
        }
    }
    
    if (currentRank === nextRank) return { currentRank, nextRank, progress: 100 };
    
    const progressInRank = hours - currentRank.hours;
    const hoursNeeded = nextRank.hours - currentRank.hours;
    const progress = Math.min((progressInRank / hoursNeeded) * 100, 100);
    
    return { currentRank, nextRank, progress };
}

export default function ProfilePage() {
    const [pilot, setPilot] = useState<Pilot | null>(null);
    const [loading, setLoading] = useState(true);
    const [flightHistory, setFlightHistory] = useState<any[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);
    const [pilotBadges, setPilotBadges] = useState<PilotBadge[]>([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());
    const router = useRouter();

    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,flag,timezones');
                const data = await res.json();
                const formattedCountries = data
                    .map((c: any) => ({
                        code: c.cca2,
                        name: c.name.common,
                        flag: c.flag,
                        timezones: c.timezones || []
                    }))
                    .sort((a: Country, b: Country) => a.name.localeCompare(b.name));
                setCountries(formattedCountries);
            } catch (error) {
                console.error('Failed to fetch countries:', error);
            }
        };
        fetchCountries();
    }, []);

    useEffect(() => {
        fetchPilotData();
    }, []);

    const fetchPilotData = useCallback(async () => {
        try {
            const sessionRes = await fetch('/api/auth/me');
            const sessionData = await sessionRes.json();
            
            if (!sessionData.user?.pilotId) {
                setLoading(false);
                return;
            }

            const [pilotRes, flightsRes, badgesRes] = await Promise.all([
                fetch(`/api/pilots?id=${sessionData.user.pilotId}`),
                fetch(`/api/portal/reports/recent?pilotId=${sessionData.user.id}`),
                fetch('/api/awards/my'),
            ]);

            const [data, flightsData, badgesData] = await Promise.all([
                pilotRes.json(),
                flightsRes.json(),
                badgesRes.json(),
            ]);

            if (data.pilot) {
                const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
                const pilotWithAvatar = {
                    ...data.pilot,
                    avatar_url: `https://res.cloudinary.com/${cloudName}/image/upload/avatars/pilot_${data.pilot.pilot_id}`
                };
                setPilot(pilotWithAvatar);
                
                const isDeleted = localStorage.getItem(`avatar_deleted_${data.pilot.pilot_id}`);
                if (isDeleted === 'true') {
                    setAvatarError(true);
                } else {
                    const cachedVersion = localStorage.getItem(`avatar_version_${data.pilot.pilot_id}`);
                    if (cachedVersion) {
                        setAvatarTimestamp(parseInt(cachedVersion, 10));
                    }
                }
            }

            if (flightsData.flights) setFlightHistory(flightsData.flights);
            if (Array.isArray(badgesData)) setPilotBadges(badgesData);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file.');
            return;
        }

        setUploadingImage(true);
        const toastId = toast.loading('Uploading profile picture...');

        try {
            await fetch('/api/cloudinary/delete', { method: 'DELETE' });
            
            const signRes = await fetch('/api/cloudinary/sign', { method: 'POST' });
            const signData = await signRes.json();
            if (!signRes.ok) throw new Error(signData.error || 'Failed to get upload signature');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', signData.apiKey);
            formData.append('timestamp', signData.timestamp.toString());
            formData.append('signature', signData.signature);
            formData.append('folder', signData.folder);
            formData.append('public_id', signData.publicId);
            formData.append('overwrite', 'true');
            formData.append('invalidate', 'true');

            const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });

            const cloudData = await cloudRes.json();
            if (!cloudRes.ok) throw new Error(cloudData.error?.message || 'Cloudinary upload failed');

            const newVersion = cloudData.version || Date.now();
            localStorage.setItem(`avatar_version_${pilot?.pilot_id}`, newVersion.toString());
            localStorage.removeItem(`avatar_deleted_${pilot?.pilot_id}`);
            setAvatarTimestamp(newVersion);
            setAvatarError(false);
            toast.success('Profile picture updated!', { id: toastId });
        } catch (error: any) {
            console.error('Image upload failed:', error);
            toast.error(error.message || 'Failed to update profile picture', { id: toastId });
        } finally {
            setUploadingImage(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleRemoveAvatar = async () => {
        const toastId = toast.loading('Removing profile picture...');

        try {
            const res = await fetch('/api/cloudinary/delete', {
                method: 'DELETE'
            });

            if (res.ok) {
                if (pilot?.pilot_id) {
                    localStorage.setItem(`avatar_deleted_${pilot.pilot_id}`, 'true');
                    localStorage.removeItem(`avatar_version_${pilot.pilot_id}`);
                }
                setAvatarError(true);
                setAvatarTimestamp(Date.now());
                toast.success('Profile picture removed!', { id: toastId });
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete from Cloudinary');
            }
        } catch (error: any) {
            console.error('Avatar removal failed:', error);
            toast.error(error.message || 'Failed to remove profile picture', { id: toastId });
        }
    };

    const getFlagUrl = (code: string) => `https://flagcdn.com/32x24/${code.toLowerCase()}.png`;
    const getCountryName = (code: string) => countries.find(c => c.code === code)?.name || code;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center relative">
                <BackgroundBeams />
                <div className="text-center z-10">
                    <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading profile...</p>
                </div>
            </div>
        );
    }
    
    if (!pilot) {
        return (
            <div className="min-h-screen flex items-center justify-center relative">
                <BackgroundBeams />
                <div className="text-center z-10">
                    <User className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                    <p className="text-red-400">Pilot not found</p>
                </div>
            </div>
        );
    }

    const totalHours = pilot.total_hours + (pilot.transfer_hours || 0);
    const { currentRank, nextRank, progress } = getRankProgress(totalHours);
    const landingQuality = pilot.average_landing === 0 ? 'neutral' : 
                          Math.abs(pilot.average_landing) < 100 ? 'butter' : 
                          Math.abs(pilot.average_landing) < 200 ? 'good' : 'hard';

    const avatarUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ""}/image/upload/c_fill,w_200,h_200,f_auto,q_auto/v${avatarTimestamp}/avatars/pilot_${pilot.pilot_id}`;

    return (
        <div className="min-h-screen relative pb-20">
            <BackgroundBeams className="opacity-40" />
            
            {/* Hero Section with Avatar */}
            <div className="relative z-10 pt-8 pb-12">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-7xl mx-auto px-4"
                >
                    <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-1 relative">
                                <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                                    {!avatarError ? (
                                        <img 
                                            key={avatarTimestamp}
                                            src={avatarUrl} 
                                            alt="Avatar" 
                                            className="w-full h-full object-cover" 
                                            onError={() => setAvatarError(true)}
                                        />
                                    ) : (
                                        <span className="text-4xl font-bold text-amber-500">
                                            {pilot.first_name[0]}{pilot.last_name[0]}
                                        </span>
                                    )}
                                </div>
                                
                                {/* Upload Overlay */}
                                <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {uploadingImage ? (
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <label className="cursor-pointer hover:scale-110 transition-transform">
                                                <Camera className="w-8 h-8 text-white" />
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/*" 
                                                    onChange={handleImageUpload} 
                                                    disabled={uploadingImage}
                                                />
                                            </label>
                                            {pilot.avatar_url && (
                                                <button 
                                                    onClick={handleRemoveAvatar}
                                                    className="hover:scale-110 transition-transform text-red-400"
                                                >
                                                    <Trash2 className="w-6 h-6" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Status Badge */}
                            <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-[#0a0a0a] ${
                                pilot.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-600'
                            }`} />
                        </div>

                        {/* Name & Info */}
                        <div className="flex-1 text-center md:text-left">
                            <HyperText 
                                className="text-4xl md:text-5xl font-bold text-white mb-2"
                            >
                                {`${pilot.first_name} ${pilot.last_name}`}
                            </HyperText>
                            
                            <HoverBorderGradient
                                containerClassName="mb-4"
                                className="text-amber-500 font-mono font-bold"
                            >
                                {pilot.pilot_id}
                            </HoverBorderGradient>

                            <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm">
                                <div className="flex items-center gap-2 text-gray-400">
                                    <Calendar className="w-4 h-4" />
                                    <span>Joined {new Date(pilot.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${pilot.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                                    <span className={pilot.status === 'Active' ? 'text-emerald-400' : 'text-gray-500'}>
                                        {pilot.status}
                                    </span>
                                </div>
                                {pilot.country && (
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <MapPin className="w-4 h-4" />
                                        <img src={getFlagUrl(pilot.country)} alt="" className="w-5 h-4 rounded" />
                                        <span>{getCountryName(pilot.country)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Rank Progress Bar */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-white/5"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-amber-500" />
                                <span className="text-sm font-semibold text-white">Rank Progression</span>
                            </div>
                            <span className="text-xs text-amber-500 font-mono">
                                Next: {nextRank.name}
                            </span>
                        </div>
                        
                        <div className="relative h-4 bg-black/50 rounded-full overflow-hidden mb-2">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 rounded-full"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </div>
                        
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-400 font-medium">{currentRank.name}</span>
                            <span className="text-amber-500 font-mono">{totalHours.toFixed(1)}h / {nextRank.hours}h</span>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Bento Grid Stats */}
            <div className="relative z-10 max-w-7xl mx-auto px-4">
                <BentoGrid className="mb-8">
                    <BentoGridItem
                        title={`${Math.floor(totalHours)}h`}
                        description={pilot.transfer_hours ? `+${pilot.transfer_hours}h transfer` : 'Total Flight Time'}
                        header={
                            <div className="flex items-center justify-center h-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-lg">
                                <Clock className="w-12 h-12 text-amber-500" />
                            </div>
                        }
                        icon={<Sparkles className="w-4 h-4 text-amber-500" />}
                        className="md:col-span-1"
                    />
                    
                    <BentoGridItem
                        title={`${Math.abs(pilot.average_landing)} fpm`}
                        description={landingQuality === 'butter' ? '🧈 Butter Landing!' : landingQuality === 'good' ? 'Smooth Landing' : 'Average Landing'}
                        header={
                            <div className="flex items-center justify-center h-full bg-gradient-to-br from-emerald-500/20 to-green-500/10 rounded-lg">
                                <TrendingDown className="w-12 h-12 text-emerald-500" />
                            </div>
                        }
                        icon={<Award className="w-4 h-4 text-emerald-500" />}
                        className="md:col-span-1"
                    />
                    
                    <BentoGridItem
                        title={pilot.balance >= 1000 ? `${(pilot.balance / 1000).toFixed(1)}K` : pilot.balance.toString()}
                        description="Credits Balance"
                        header={
                            <div className="flex items-center justify-center h-full bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-lg">
                                <Zap className="w-12 h-12 text-green-500" />
                            </div>
                        }
                        icon={<Sparkles className="w-4 h-4 text-green-500" />}
                        className="md:col-span-1"
                    />
                    
                    <BentoGridItem
                        title={pilot.total_flights.toString()}
                        description="Total PIREPs"
                        header={
                            <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-lg">
                                <Target className="w-12 h-12 text-blue-500" />
                            </div>
                        }
                        icon={<Check className="w-4 h-4 text-blue-500" />}
                        className="md:col-span-1"
                    />
                    
                    <BentoGridItem
                        title={(pilot.routes_flown?.length || 0).toString()}
                        description="Unique Routes"
                        header={
                            <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-lg">
                                <Plane className="w-12 h-12 text-purple-500" />
                            </div>
                        }
                        icon={<MapPin className="w-4 h-4 text-purple-500" />}
                        className="md:col-span-1"
                    />
                    
                    <BentoGridItem
                        title="Pilot Details"
                        description={
                            <div className="space-y-2 mt-2">
                                {pilot.country && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500">Origin</span>
                                        <span className="flex items-center gap-2 text-white">
                                            <img src={getFlagUrl(pilot.country)} alt="" className="w-4 h-3 rounded" />
                                            {getCountryName(pilot.country)}
                                        </span>
                                    </div>
                                )}
                                {pilot.vatsim_id && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500">VATSIM</span>
                                        <a href={`https://stats.vatsim.net/search_id.php?id=${pilot.vatsim_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                                            {pilot.vatsim_id}
                                        </a>
                                    </div>
                                )}
                                {pilot.ivao_id && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500">IVAO</span>
                                        <a href={`https://www.ivao.aero/Member.aspx?Id=${pilot.ivao_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                                            {pilot.ivao_id}
                                        </a>
                                    </div>
                                )}
                            </div>
                        }
                        header={
                            <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-500/20 to-slate-500/10 rounded-lg">
                                <User className="w-12 h-12 text-gray-400" />
                            </div>
                        }
                        className="md:col-span-1"
                    />
                </BentoGrid>

                {/* Recent Flights & Badges Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Recent Flights */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-2 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl border border-white/5 overflow-hidden"
                    >
                        <div className="p-6 border-b border-white/5 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-amber-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-white">Recent Flights</h2>
                            <span className="ml-auto text-xs text-gray-500">{flightHistory.length} flights</span>
                        </div>
                        
                        <div className="p-6 space-y-3">
                            {flightHistory.length > 0 ? (
                                flightHistory.slice(0, 5).map((flight, i) => (
                                    <motion.div
                                        key={flight._id || i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + i * 0.1 }}
                                        className="bg-black/30 rounded-xl p-4 border border-white/5 hover:border-amber-500/30 transition-all group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Plane className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
                                                <div>
                                                    <div className="flex items-center gap-2 text-amber-500 font-mono font-semibold">
                                                        <span>{flight.departure_icao}</span>
                                                        <ChevronRight className="w-3 h-3 text-gray-600" />
                                                        <span>{flight.arrival_icao}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        {flight.aircraft_type || '-'} • {flight.flight_time ? `${Math.floor(flight.flight_time / 60)}:${String(flight.flight_time % 60).padStart(2, '0')}` : '-'}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                                                flight.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                flight.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                                {flight.status === 'Accepted' && <Check className="w-3 h-3 inline mr-1" />}
                                                {flight.status === 'Rejected' && <X className="w-3 h-3 inline mr-1" />}
                                                {flight.status}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <Plane className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">No flights recorded yet</p>
                                    <p className="text-gray-600 text-xs mt-1">Complete your first flight to see it here</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Badges */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl border border-white/5 overflow-hidden"
                    >
                        <div className="p-6 border-b border-white/5 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <Trophy className="w-5 h-5 text-amber-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-white">Badges</h2>
                        </div>
                        
                        <div className="p-6">
                            {pilotBadges.length > 0 ? (
                                <div className="grid grid-cols-3 gap-3">
                                    {pilotBadges.map((badge, i) => (
                                        <motion.div 
                                            key={badge._id}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.6 + i * 0.1 }}
                                            className="bg-black/30 rounded-xl p-3 flex flex-col items-center border border-white/5 hover:border-amber-500/30 hover:scale-105 transition-all cursor-pointer group"
                                        >
                                            {badge.award_id?.imageUrl ? (
                                                <img 
                                                    src={`/img/badge/${badge.award_id.imageUrl}`}
                                                    alt={badge.award_id?.name || 'Badge'}
                                                    className="w-12 h-12 object-contain mb-2 group-hover:scale-110 transition-transform"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-2 group-hover:bg-amber-500/20 transition-colors">
                                                    <Medal className="w-6 h-6 text-amber-500" />
                                                </div>
                                            )}
                                            <span className="text-[9px] text-gray-400 text-center font-medium truncate w-full">
                                                {badge.award_id?.name || 'Badge'}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">No badges yet</p>
                                    <p className="text-gray-600 text-xs mt-1">Complete tours to earn badges!</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
