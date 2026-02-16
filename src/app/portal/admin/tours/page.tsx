'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Map, Users, X, Award } from 'lucide-react';

interface TourLeg {
    departure_icao: string;
    arrival_icao: string;
    distance_nm: number;
}

interface Tour {
    _id: string;
    name: string;
    description: string;
    legs: TourLeg[];
    total_distance: number;
    reward_credits: number;
    reward_badge?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    active: boolean;
    participants?: number;
    completed?: number;
}

export default function AdminToursPage() {
    const [tours, setTours] = useState<Tour[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Tour | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState('');
    const [banner, setBanner] = useState('');
    const [awardImage, setAwardImage] = useState('');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [rewardCredits, setRewardCredits] = useState('');
    const [rewardBadge, setRewardBadge] = useState('');
    const [legs, setLegs] = useState<TourLeg[]>([{ departure_icao: '', arrival_icao: '', distance_nm: 0 }]);

    const fetchTours = () => {
        setLoading(true);
        fetch('/api/admin/tours')
            .then(res => res.json())
            .then(data => setTours(data.tours || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTours(); }, []);

    const resetForm = () => {
        setName('');
        setDescription('');
        setImage('');
        setBanner('');
        setAwardImage('');
        setDifficulty('medium');
        setRewardCredits('');
        setRewardBadge('');
        setLegs([{ departure_icao: '', arrival_icao: '', distance_nm: 0 }]);
        setEditing(null);
    };

    const openNew = () => {
        resetForm();
        setShowModal(true);
    };

    const openEdit = (tour: Tour) => {
        setEditing(tour);
        setName(tour.name);
        setDescription(tour.description);
        setImage((tour as any).image || '');
        setBanner((tour as any).banner || '');
        setAwardImage((tour as any).award_image || '');
        setDifficulty(tour.difficulty);
        setRewardCredits(tour.reward_credits.toString());
        setRewardBadge(tour.reward_badge || '');
        setLegs(tour.legs.map(l => ({
            departure_icao: l.departure_icao,
            arrival_icao: l.arrival_icao,
            distance_nm: l.distance_nm || 0,
        })));
        setShowModal(true);
    };

    const addLeg = () => {
        const lastLeg = legs[legs.length - 1];
        setLegs([...legs, { 
            departure_icao: lastLeg?.arrival_icao || '', 
            arrival_icao: '', 
            distance_nm: 0 
        }]);
    };

    const removeLeg = (index: number) => {
        if (legs.length > 1) {
            setLegs(legs.filter((_, i) => i !== index));
        }
    };

    const updateLeg = (index: number, field: keyof TourLeg, value: string | number) => {
        const updated = [...legs];
        updated[index] = { ...updated[index], [field]: value };
        setLegs(updated);
    };

    const handleSave = async () => {
        if (!name.trim() || !description.trim() || legs.some(l => !l.departure_icao || !l.arrival_icao)) {
            alert('Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            const body = {
                ...(editing && { id: editing._id }),
                name,
                description,
                image: image || undefined,
                banner: banner || undefined,
                awardImage: awardImage || undefined,
                difficulty,
                rewardCredits: parseInt(rewardCredits) || 0,
                rewardBadge: rewardBadge || undefined,
                legs,
            };

            const res = await fetch('/api/admin/tours', {
                method: editing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setShowModal(false);
                resetForm();
                fetchTours();
            }
        } catch (error) {
            console.error('Save error:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this tour? All progress will be lost.')) return;
        
        await fetch(`/api/admin/tours?id=${id}`, { method: 'DELETE' });
        fetchTours();
    };

    const toggleActive = async (tour: Tour) => {
        await fetch('/api/admin/tours', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tour._id, active: !tour.active }),
        });
        fetchTours();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Map className="w-8 h-8 text-accent-gold" />
                    <h1 className="text-2xl font-bold text-white">Manage Tours</h1>
                </div>
                <button onClick={openNew} className="btn-primary flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    New Tour
                </button>
            </div>

            {loading ? (
                <div className="glass-card p-12 text-center text-gray-400">Loading...</div>
            ) : tours.length === 0 ? (
                <div className="glass-card p-12 text-center text-gray-400">
                    <Map className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No tours created yet</p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-[#111]">
                            <tr>
                                <th className="text-left p-4 text-gray-400 font-medium">Tour</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Legs</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Difficulty</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Reward</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Participants</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                                <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tours.map((tour) => (
                                <tr key={tour._id} className="border-t border-white/[0.06] hover:bg-white/5">
                                    <td className="p-4">
                                        <p className="text-white font-medium">{tour.name}</p>
                                        <p className="text-gray-500 text-sm">{tour.total_distance} nm</p>
                                    </td>
                                    <td className="p-4 text-white">{tour.legs.length}</td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded uppercase ${
                                            tour.difficulty === 'easy' ? 'bg-green-500/30 text-green-300' :
                                            tour.difficulty === 'hard' ? 'bg-red-500/30 text-red-300' :
                                            'bg-yellow-500/30 text-yellow-300'
                                        }`}>
                                            {tour.difficulty}
                                        </span>
                                    </td>
                                    <td className="p-4 text-accent-gold">{tour.reward_credits} credits</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1 text-gray-400">
                                            <Users className="w-4 h-4" />
                                            {tour.participants || 0} ({tour.completed || 0} completed)
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => toggleActive(tour)}
                                            className={`text-xs px-2 py-1 rounded ${
                                                tour.active ? 'bg-green-500/30 text-green-300' : 'bg-gray-500/30 text-gray-400'
                                            }`}
                                        >
                                            {tour.active ? 'Active' : 'Hidden'}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => openEdit(tour)} className="text-blue-400 hover:text-blue-300 p-2">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(tour._id)} className="text-red-400 hover:text-red-300 p-2">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0a0a0a] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">{editing ? 'Edit Tour' : 'New Tour'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Tour Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Description</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Tour Image URL</label>
                                    <input
                                        type="text"
                                        value={image}
                                        onChange={e => setImage(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Banner Image URL</label>
                                    <input
                                        type="text"
                                        value={banner}
                                        onChange={e => setBanner(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Award Image URL</label>
                                    <input
                                        type="text"
                                        value={awardImage}
                                        onChange={e => setAwardImage(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white text-sm"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Difficulty</label>
                                    <select
                                        value={difficulty}
                                        onChange={e => setDifficulty(e.target.value as any)}
                                        className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Reward Credits</label>
                                    <input
                                        type="number"
                                        value={rewardCredits}
                                        onChange={e => setRewardCredits(e.target.value)}
                                        className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Badge (emoji)</label>
                                    <input
                                        type="text"
                                        value={rewardBadge}
                                        onChange={e => setRewardBadge(e.target.value)}
                                        placeholder="🏆"
                                        className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white"
                                    />
                                </div>
                            </div>

                            {/* Legs */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Tour Legs</label>
                                <div className="space-y-2">
                                    {legs.map((leg, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <span className="text-gray-500 w-6">{index + 1}.</span>
                                            <input
                                                type="text"
                                                value={leg.departure_icao}
                                                onChange={e => updateLeg(index, 'departure_icao', e.target.value.toUpperCase())}
                                                placeholder="DEP"
                                                maxLength={4}
                                                className="w-24 bg-[#111] border border-white/[0.08] rounded px-3 py-2 text-white font-mono uppercase"
                                            />
                                            <span className="text-gray-500">→</span>
                                            <input
                                                type="text"
                                                value={leg.arrival_icao}
                                                onChange={e => updateLeg(index, 'arrival_icao', e.target.value.toUpperCase())}
                                                placeholder="ARR"
                                                maxLength={4}
                                                className="w-24 bg-[#111] border border-white/[0.08] rounded px-3 py-2 text-white font-mono uppercase"
                                            />
                                            <input
                                                type="number"
                                                value={leg.distance_nm || ''}
                                                onChange={e => updateLeg(index, 'distance_nm', parseInt(e.target.value) || 0)}
                                                placeholder="NM"
                                                className="w-20 bg-[#111] border border-white/[0.08] rounded px-3 py-2 text-white"
                                            />
                                            <button
                                                onClick={() => removeLeg(index)}
                                                disabled={legs.length === 1}
                                                className="text-red-400 hover:text-red-300 disabled:opacity-30"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={addLeg}
                                    className="mt-2 text-accent-gold hover:text-accent-gold/80 text-sm"
                                >
                                    + Add Leg
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-400 hover:text-white">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary px-6 py-2 disabled:opacity-50">
                                {saving ? 'Saving...' : 'Save Tour'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
