'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
    Clock, TrendingDown, Target, Zap,
    Plane, Calendar, Edit3, X, Check, User, Shield,
    ChevronRight, Trophy, Medal, Camera, Loader2, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface Pilot {
    pilot_id: string;
    first_name: string;
    last_name: string;
    email: string;
    rank: string;
    country: string;
    timezone: string;
    vatsim_id?: string;
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

// Rank progression data
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

// Country Select Component
function CountrySelect({ countries, value, onChange, getFlagUrl }: {
    countries: Country[];
    value: string;
    onChange: (code: string) => void;
    getFlagUrl: (code: string) => string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    
    const selectedCountry = countries.find(c => c.code === value);
    const filteredCountries = countries.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#141414] border border-white/[0.04] rounded-lg px-4 py-3 text-white flex items-center gap-3 text-left hover:border-white/[0.06] transition-colors"
            >
                {selectedCountry ? (
                    <>
                        <img src={getFlagUrl(selectedCountry.code)} alt="" className="w-6 h-4 object-cover rounded" />
                        <span>{selectedCountry.name}</span>
                    </>
                ) : (
                    <span className="text-gray-500">Select a country</span>
                )}
                <ChevronRight className={`ml-auto w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-white/[0.04] rounded-xl shadow-2xl max-h-72 overflow-hidden">
                    <div className="p-3 border-b border-white/[0.04]">
                        <input
                            type="text"
                            placeholder="Search country..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-[#141414] border border-white/[0.04] rounded-lg px-4 py-2 text-white text-sm focus:border-amber-500/50 focus:outline-none"
                            autoFocus
                        />
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                        {filteredCountries.map(c => (
                            <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                    onChange(c.code);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 text-white text-sm text-left transition-colors"
                            >
                                <img src={getFlagUrl(c.code)} alt="" className="w-6 h-4 object-cover rounded" />
                                <span>{c.name}</span>
                                <span className="text-gray-600 text-xs ml-auto">{c.code}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ProfilePage() {
    const [pilot, setPilot] = useState<Pilot | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<Partial<Pilot>>({});
    const [flightHistory, setFlightHistory] = useState<any[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);
    const [availableTimezones, setAvailableTimezones] = useState<string[]>([]);
    const [pilotBadges, setPilotBadges] = useState<PilotBadge[]>([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now()); // For cache-busting
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
                
                const allTimezones = new Set<string>();
                formattedCountries.forEach((c: Country) => {
                    c.timezones.forEach(tz => allTimezones.add(tz));
                });
                setAvailableTimezones(Array.from(allTimezones).sort());
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

            // Parallel fetch: pilot data + flights + badges
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
                setFormData(pilotWithAvatar);
                
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

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pilot) return;

        try {
            const res = await fetch('/api/pilots', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pilotId: pilot.pilot_id,
                    updates: formData
                })
            });

            if (res.ok) {
                setPilot({ ...pilot, ...formData } as Pilot);
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Update failed:', error);
        }
    };

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
            // 1. Delete old image first (to avoid CDN caching issues)
            await fetch('/api/cloudinary/delete', { method: 'DELETE' });
            
            // 2. Get Signature from Backend
            const signRes = await fetch('/api/cloudinary/sign', { method: 'POST' });
            const signData = await signRes.json();
            if (!signRes.ok) throw new Error(signData.error || 'Failed to get upload signature');

            // 3. Upload to Cloudinary (Signed) - Uses predictable public_id
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

            // Use Cloudinary's version number for reliable cache busting
            // This ensures the new image shows immediately without waiting for CDN invalidation
            const newVersion = cloudData.version || Date.now();
            localStorage.setItem(`avatar_version_${pilot?.pilot_id}`, newVersion.toString());
            // Clear deleted flag since we just uploaded a new avatar
            localStorage.removeItem(`avatar_deleted_${pilot?.pilot_id}`);
            setAvatarTimestamp(newVersion);
            setAvatarError(false); // Reset error state since we just uploaded
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
            // Delete from Cloudinary
            const res = await fetch('/api/cloudinary/delete', {
                method: 'DELETE'
            });

            if (res.ok) {
                // Set deleted flag and clear version so it stays deleted after refresh
                if (pilot?.pilot_id) {
                    localStorage.setItem(`avatar_deleted_${pilot.pilot_id}`, 'true');
                    localStorage.removeItem(`avatar_version_${pilot.pilot_id}`);
                }
                setAvatarError(true); // This will show initials instead
                setAvatarTimestamp(Date.now()); // Update timestamp
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
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading profile...</p>
                </div>
            </div>
        );
    }
    
    if (!pilot) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
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

    // Construct avatar URL directly from pilot_id (Cloudinary-only storage)
    // Version is placed after transformations to bust CDN cache
    const avatarUrl = `https://res.cloudinary.com/` + (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "") + `/image/upload/c_fill,w_200,h_200,f_auto,q_auto/v${avatarTimestamp}/avatars/pilot_${pilot.pilot_id}`;

    return (
        <div className="space-y-6 pb-8">
            {/* Hero Header */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-br from-[#1a1a1a] via-[#141414] to-[#0f0f0f] rounded-2xl border border-white/[0.04]/50 overflow-hidden"
            >
                {/* Background Plane */}
                <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.03] pointer-events-none">
                    <Plane className="w-full h-full text-amber-500" strokeWidth={0.5} />
                </div>
                
                <div className="relative p-8">
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center lg:items-start gap-4">
                            <div className="relative group">
                                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 p-1 relative flex items-center justify-center">
                                    <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center overflow-hidden border-2 border-amber-500/30">
                                        {!avatarError ? (
                                            <img 
                                                key={avatarTimestamp}
                                                src={avatarUrl} 
                                                alt="Avatar" 
                                                className="w-full h-full object-cover" 
                                                onError={() => setAvatarError(true)}
                                            />
                                        ) : (
                                            <span className="text-3xl font-bold text-amber-500/60">
                                                {pilot.first_name[0]}{pilot.last_name[0]}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Upload Trigger */}
                                    <div className="absolute inset-x-0 bottom-0 top-0 rounded-full bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100">
                                        {uploadingImage ? (
                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <label className="flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                                                    <Camera className="w-6 h-6 text-white" />
                                                    <span className="text-[8px] font-bold text-white uppercase tracking-tighter mt-1">Change PFP</span>
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
                                                        className="flex flex-col items-center justify-center hover:scale-110 transition-transform text-red-400"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        <span className="text-[8px] font-bold uppercase tracking-tighter mt-1">Remove</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Status Indicator */}
                                <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-[#1a1a1a] z-10 ${
                                    pilot.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-600'
                                }`} />
                            </div>
                            
                            {/* Pilot ID Badge */}
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2 text-center mx-auto">
                                <span className="text-amber-500 font-mono font-bold tracking-wider text-sm">
                                    {pilot.pilot_id}
                                </span>
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 text-center lg:text-left">
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {pilot.first_name} {pilot.last_name}
                            </h1>
                            
                            <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-6">
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                    <Calendar className="w-4 h-4" />
                                    <span>Joined {new Date(pilot.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <div className={`w-2 h-2 rounded-full ${pilot.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                                    <span className={pilot.status === 'Active' ? 'text-emerald-400' : 'text-gray-500'}>
                                        {pilot.status}
                                    </span>
                                </div>
                                {pilot.country && (
                                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                                        <img src={getFlagUrl(pilot.country)} alt="" className="w-5 h-4 rounded" />
                                        <span>{getCountryName(pilot.country)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {[
                                    { 
                                        label: 'Flight Time', 
                                        value: `${Math.floor(totalHours)}h`, 
                                        sub: pilot.transfer_hours ? `+${pilot.transfer_hours}h transfer` : null,
                                        icon: Clock, 
                                        color: 'text-amber-500' 
                                    },
                                    { 
                                        label: 'Avg Landing', 
                                        value: `${Math.abs(pilot.average_landing)} fpm`, 
                                        sub: landingQuality === 'butter' ? '🧈 Butter!' : landingQuality === 'good' ? 'Smooth' : null,
                                        icon: TrendingDown, 
                                        color: landingQuality === 'butter' ? 'text-emerald-400' : landingQuality === 'good' ? 'text-emerald-400' : 'text-amber-400'
                                    },
                                    { 
                                        label: 'Credits', 
                                        value: pilot.balance >= 1000 ? `${(pilot.balance / 1000).toFixed(1)}K` : pilot.balance.toString(), 
                                        sub: 'cr',
                                        icon: Zap, 
                                        color: 'text-emerald-400' 
                                    },
                                    { 
                                        label: 'Total Flights', 
                                        value: pilot.total_flights.toString(), 
                                        sub: 'PIREPs',
                                        icon: Target, 
                                        color: 'text-blue-400' 
                                    },
                                    { 
                                        label: 'Routes Flown', 
                                        value: (pilot.routes_flown?.length || 0).toString(), 
                                        sub: 'unique',
                                        icon: Plane, 
                                        color: 'text-purple-400' 
                                    },
                                ].map((stat, i) => (
                                    <motion.div
                                        key={stat.label}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-[#0a0a0a] rounded-xl p-4 border border-white/[0.04]/50 hover:border-white/[0.06]/50 transition-colors group"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">{stat.label}</span>
                                            <stat.icon className={`w-4 h-4 ${stat.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-bold text-white">{stat.value}</span>
                                            {stat.sub && <span className="text-xs text-gray-500">{stat.sub}</span>}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Rank Progression */}
                            <div className="mt-6 bg-[#0a0a0a] rounded-xl p-5 border border-white/[0.04]/50">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-amber-500" />
                                        <span className="text-xs uppercase tracking-widest text-gray-400 font-medium">Rank Progression</span>
                                    </div>
                                    <span className="text-xs font-mono text-amber-500">
                                        Next: {nextRank.name}
                                    </span>
                                </div>
                                
                                <div className="relative h-3 bg-[#1a1a1a] rounded-full overflow-hidden mb-2">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber-500 rounded-full"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                                </div>
                                
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-medium">{currentRank.name}</span>
                                    <span className="text-amber-500 font-mono">{totalHours.toFixed(1)}h / {nextRank.hours}h</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column: Flight History */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2"
                >
                    <div className="bg-[#141414] rounded-2xl border border-white/[0.04]/50 overflow-hidden">
                        <div className="p-5 border-b border-white/[0.04]/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-amber-500" />
                                </div>
                                <h2 className="text-lg font-semibold text-white">Recent Flights</h2>
                            </div>
                            <span className="text-xs text-gray-500">{flightHistory.length} flights</span>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-[10px] uppercase tracking-widest text-gray-500 bg-[#0a0a0a]">
                                        <th className="px-5 py-3 font-medium">Route</th>
                                        <th className="px-5 py-3 font-medium">Aircraft</th>
                                        <th className="px-5 py-3 font-medium">Duration</th>
                                        <th className="px-5 py-3 font-medium">Date</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {flightHistory.slice(0, 5).map((flight, i) => (
                                        <tr key={flight._id || i} className="border-t border-white/[0.04]/30 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-amber-500 font-mono font-medium">{flight.departure_icao}</span>
                                                    <ChevronRight className="w-3 h-3 text-gray-600" />
                                                    <span className="text-amber-500 font-mono font-medium">{flight.arrival_icao}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-gray-300 text-sm">{flight.aircraft_type || '-'}</td>
                                            <td className="px-5 py-4 text-white text-sm font-mono">
                                                {flight.flight_time ? `${Math.floor(flight.flight_time / 60)}:${String(flight.flight_time % 60).padStart(2, '0')}` : '-'}
                                            </td>
                                            <td className="px-5 py-4 text-gray-500 text-sm">
                                                {flight.submitted_at ? new Date(flight.submitted_at).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                                                    flight.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                    flight.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                                                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                }`}>
                                                    {flight.status === 'Accepted' && <Check className="w-3 h-3" />}
                                                    {flight.status === 'Rejected' && <X className="w-3 h-3" />}
                                                    {flight.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {flightHistory.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-12 text-center">
                                                <Plane className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                                                <p className="text-gray-500 text-sm">No flights recorded yet</p>
                                                <p className="text-gray-600 text-xs mt-1">Complete your first flight to see it here</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Pilot Details */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-[#141414] rounded-2xl border border-white/[0.04]/50 overflow-hidden"
                    >
                        <div className="p-5 border-b border-white/[0.04]/50 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Pilot Details</h2>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="text-xs text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1"
                            >
                                {isEditing ? <><X className="w-3 h-3" /> Cancel</> : <><Edit3 className="w-3 h-3" /> Edit</>}
                            </button>
                        </div>

                        <div className="p-5">
                            {isEditing ? (
                                <form onSubmit={handleUpdate} className="space-y-4">
                                    <div>
                                        <label className="block text-gray-500 text-xs mb-2 uppercase tracking-wider">Country</label>
                                        <CountrySelect 
                                            countries={countries}
                                            value={formData.country || ''}
                                            onChange={(code) => setFormData({ ...formData, country: code })}
                                            getFlagUrl={getFlagUrl}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-500 text-xs mb-2 uppercase tracking-wider">Timezone</label>
                                        <select
                                            className="w-full bg-[#141414] border border-white/[0.04] rounded-lg px-4 py-3 text-white focus:border-amber-500/50 focus:outline-none"
                                            value={formData.timezone || ''}
                                            onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                                        >
                                            {availableTimezones.map((tz: string) => (
                                                <option key={tz} value={tz}>{tz}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-gray-500 text-xs mb-2 uppercase tracking-wider">VATSIM</label>
                                            <input
                                                type="text"
                                                className="w-full bg-[#141414] border border-white/[0.04] rounded-lg px-4 py-3 text-white focus:border-amber-500/50 focus:outline-none text-sm"
                                                placeholder="CID"
                                                value={formData.vatsim_id || ''}
                                                onChange={e => setFormData({ ...formData, vatsim_id: e.target.value })}
                                            />
                                        </div>
                                    </div>


                                    <button 
                                        type="submit" 
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium py-3 rounded-lg transition-colors mt-2"
                                    >
                                        Save Changes
                                    </button>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    {[
                                        { label: 'Origin', value: pilot.country ? (
                                            <span className="flex items-center gap-2">
                                                <img src={getFlagUrl(pilot.country)} alt="" className="w-5 h-4 rounded" />
                                                {getCountryName(pilot.country)}
                                            </span>
                                        ) : 'Not set', highlight: false },
                                        { label: 'VATSIM CID', value: pilot.vatsim_id || 'Not Provided', link: pilot.vatsim_id ? `https://stats.vatsim.net/search_id.php?id=${pilot.vatsim_id}` : null, highlight: !!pilot.vatsim_id },
                                        { label: 'Landing Avg', value: `${Math.abs(pilot.average_landing)} fpm`, color: landingQuality === 'butter' ? 'text-emerald-400' : landingQuality === 'good' ? 'text-emerald-400' : 'text-amber-400', highlight: true },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.04]/30 last:border-0">
                                            <span className="text-gray-500 text-sm">{item.label}</span>
                                            {item.link ? (
                                                <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                                                    {item.value}
                                                </a>
                                            ) : (
                                                <span className={`text-sm ${item.color || (item.highlight ? 'text-white' : 'text-gray-600')}`}>
                                                    {item.value}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Badges & Awards */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-[#141414] rounded-2xl border border-white/[0.04]/50 overflow-hidden"
                    >
                        <div className="p-5 border-b border-white/[0.04]/50 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <Trophy className="w-4 h-4 text-amber-500" />
                            </div>
                            <h2 className="text-lg font-semibold text-white">Badges & Awards</h2>
                        </div>
                        
                        <div className="p-5">
                            {pilotBadges.length > 0 ? (
                                <div className="grid grid-cols-3 gap-3">
                                    {pilotBadges.map((badge) => (
                                        <div 
                                            key={badge._id} 
                                            className="group bg-[#0a0a0a] rounded-xl p-3 flex flex-col items-center border border-white/[0.04]/50 hover:border-amber-500/30 transition-all cursor-pointer"
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
                                            <span className="text-[10px] text-gray-400 text-center font-medium truncate w-full">
                                                {badge.award_id?.name || 'Badge'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-[#0a0a0a] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Trophy className="w-8 h-8 text-gray-700" />
                                    </div>
                                    <p className="text-gray-500 text-sm">No badges earned yet</p>
                                    <p className="text-gray-600 text-xs mt-1">Complete tours and events to earn badges!</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
