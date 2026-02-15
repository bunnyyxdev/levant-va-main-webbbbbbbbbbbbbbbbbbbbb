'use client';

import { useState, useEffect } from 'react';
import { Plane, Plus, Trash2, Edit3, X, Check, Search, MapPin, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Aircraft {
    _id: string;
    registration: string;
    aircraft_type: string;
    name?: string;
    livery?: string;
    current_location: string;
    status: string;
    condition: number;
    total_hours: number;
    flight_count: number;
    is_active: boolean;
    created_at: string;
}

const EMPTY_FORM = { registration: '', aircraft_type: '', name: '', livery: '', current_location: 'OJAI' };

export default function FleetManagementPage() {
    const [fleet, setFleet] = useState<Aircraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchFleet(); }, []);

    const fetchFleet = async () => {
        try {
            const res = await fetch('/api/admin/fleet');
            const data = await res.json();
            if (data.fleet) setFleet(data.fleet);
        } catch {
            toast.error('Failed to load fleet');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!form.registration || !form.aircraft_type) {
            toast.error('Registration and aircraft type are required');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/admin/fleet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Aircraft ${data.aircraft.registration} added`);
                setShowAdd(false);
                setForm(EMPTY_FORM);
                fetchFleet();
            } else {
                toast.error(data.error || 'Failed to add aircraft');
            }
        } catch {
            toast.error('Failed to add aircraft');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async () => {
        if (!editingId) return;
        setSaving(true);
        try {
            const res = await fetch('/api/admin/fleet', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingId, ...form }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Aircraft updated');
                setEditingId(null);
                setForm(EMPTY_FORM);
                fetchFleet();
            } else {
                toast.error(data.error || 'Failed to update');
            }
        } catch {
            toast.error('Failed to update aircraft');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, reg: string) => {
        if (!confirm(`Delete aircraft ${reg}? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/admin/fleet?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success(`${reg} deleted`);
                fetchFleet();
            } else {
                toast.error('Failed to delete');
            }
        } catch {
            toast.error('Delete failed');
        }
    };

    const startEdit = (ac: Aircraft) => {
        setEditingId(ac._id);
        setForm({
            registration: ac.registration,
            aircraft_type: ac.aircraft_type,
            name: ac.name || '',
            livery: ac.livery || '',
            current_location: ac.current_location,
        });
        setShowAdd(false);
    };

    const filtered = fleet.filter(ac =>
        `${ac.registration} ${ac.aircraft_type} ${ac.name || ''}`.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        total: fleet.length,
        active: fleet.filter(a => a.is_active).length,
        available: fleet.filter(a => a.status === 'Available').length,
        types: [...new Set(fleet.map(a => a.aircraft_type))].length,
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-accent-gold animate-spin" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Plane className="w-8 h-8 text-accent-gold" />
                        Fleet Management
                    </h1>
                    <p className="text-gray-400 mt-1">Add, edit, and manage airline aircraft</p>
                </div>
                <button
                    onClick={() => { setShowAdd(!showAdd); setEditingId(null); setForm(EMPTY_FORM); }}
                    className="flex items-center gap-2 bg-accent-gold hover:bg-accent-gold/80 text-dark-900 font-bold px-5 py-2.5 rounded-xl transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Aircraft
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Aircraft', value: stats.total, color: 'text-blue-400' },
                    { label: 'Active', value: stats.active, color: 'text-emerald-400' },
                    { label: 'Available', value: stats.available, color: 'text-accent-gold' },
                    { label: 'Aircraft Types', value: stats.types, color: 'text-purple-400' },
                ].map(s => (
                    <div key={s.label} className="bg-[#111] border border-white/[0.06] rounded-xl p-4">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Add/Edit Form */}
            <AnimatePresence>
                {(showAdd || editingId) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-[#111] border border-accent-gold/20 rounded-xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white">
                                    {editingId ? 'Edit Aircraft' : 'Add New Aircraft'}
                                </h2>
                                <button onClick={() => { setShowAdd(false); setEditingId(null); setForm(EMPTY_FORM); }} className="text-gray-500 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Registration *</label>
                                    <input
                                        value={form.registration}
                                        onChange={e => setForm({ ...form, registration: e.target.value })}
                                        placeholder="TC-LVA"
                                        className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-accent-gold/50 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Aircraft Type *</label>
                                    <input
                                        value={form.aircraft_type}
                                        onChange={e => setForm({ ...form, aircraft_type: e.target.value })}
                                        placeholder="B738"
                                        className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-accent-gold/50 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Name</label>
                                    <input
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="Cedar of Lebanon"
                                        className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm focus:border-accent-gold/50 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Location</label>
                                    <input
                                        value={form.current_location}
                                        onChange={e => setForm({ ...form, current_location: e.target.value })}
                                        placeholder="OJAI"
                                        className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-accent-gold/50 focus:outline-none"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={editingId ? handleEdit : handleAdd}
                                        disabled={saving}
                                        className="w-full bg-accent-gold hover:bg-accent-gold/80 text-dark-900 font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        {editingId ? 'Save' : 'Add'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search fleet..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-[#111] border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-accent-gold/50"
                />
            </div>

            {/* Fleet Table */}
            <div className="bg-[#111] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] uppercase tracking-widest text-gray-500 bg-[#080808]/50 border-b border-white/[0.06]">
                                <th className="p-4 font-bold">Registration</th>
                                <th className="p-4 font-bold">Type</th>
                                <th className="p-4 font-bold">Name</th>
                                <th className="p-4 font-bold">Location</th>
                                <th className="p-4 font-bold">Status</th>
                                <th className="p-4 font-bold">Condition</th>
                                <th className="p-4 font-bold">Hours</th>
                                <th className="p-4 font-bold">Flights</th>
                                <th className="p-4 font-bold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(ac => (
                                <tr key={ac._id} className="border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                                    <td className="p-4">
                                        <span className="font-mono font-bold text-accent-gold">{ac.registration}</span>
                                    </td>
                                    <td className="p-4 font-mono text-white">{ac.aircraft_type}</td>
                                    <td className="p-4 text-gray-400">{ac.name || '—'}</td>
                                    <td className="p-4">
                                        <span className="flex items-center gap-1.5 text-gray-300">
                                            <MapPin className="w-3 h-3 text-gray-500" />
                                            {ac.current_location}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
                                            ac.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                            ac.status === 'Maintenance' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                            ac.status === 'Grounded' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        }`}>
                                            {ac.status === 'Available' && <CheckCircle2 className="w-3 h-3" />}
                                            {ac.status === 'Grounded' && <AlertTriangle className="w-3 h-3" />}
                                            {ac.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${ac.condition >= 85 ? 'bg-emerald-500' : ac.condition >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                    style={{ width: `${ac.condition}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-mono text-gray-400">{ac.condition}%</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-gray-300">{Math.round(ac.total_hours)}</td>
                                    <td className="p-4 font-mono text-gray-300">{ac.flight_count}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => startEdit(ac)}
                                                className="p-2 text-gray-500 hover:text-accent-gold hover:bg-accent-gold/10 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ac._id, ac.registration)}
                                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-12 text-center text-gray-500">
                                        <Plane className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No aircraft found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
