'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Upload, Link2, Send, ArrowLeft, Plane, Clock, Gauge, Loader2, ImageIcon } from 'lucide-react';

const TRACKER_REGEX = /^https?:\/\/(tracker\.ivao\.aero)\/.+/i;

function isA380(aircraft: string): boolean {
    const normalized = aircraft.replace(/[\s\-_]/g, '').toUpperCase();
    return normalized.includes('A380') || normalized.includes('A388') || normalized.includes('380');
}

export default function ManualPirepPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        flight_number: '',
        callsign: '',
        departure_icao: '',
        arrival_icao: '',
        aircraft_type: '',
        flight_time: '',
        landing_rate: '',
        tracker_link: '',
        proof_image: '',
        comments: '',
    });
    const [proofMode, setProofMode] = useState<'link' | 'image'>('link');
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError('File too large. Maximum size is 5 MB.');
            return;
        }
        if (!file.type.startsWith('image/')) {
            setError('Only image files are allowed.');
            return;
        }
        setUploading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/portal/manual-pirep/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (res.ok && data.url) {
                setForm(prev => ({ ...prev, proof_image: data.url }));
                setUploadedFileName(file.name);
            } else {
                setError(data.error || 'Upload failed.');
            }
        } catch {
            setError('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const a380Warning = isA380(form.aircraft_type);
    const linkValid = !form.tracker_link || TRACKER_REGEX.test(form.tracker_link);
    const hasProof = proofMode === 'link' ? !!form.tracker_link : !!form.proof_image;
    const canSubmit = form.departure_icao.length >= 3 && form.arrival_icao.length >= 3 && form.aircraft_type && form.flight_time && hasProof && !a380Warning && linkValid;

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const handleSubmit = async () => {
        if (!canSubmit || submitting) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/portal/manual-pirep', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    tracker_link: proofMode === 'link' ? form.tracker_link : undefined,
                    proof_image: proofMode === 'image' ? form.proof_image : undefined,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSuccess(data.message);
                setTimeout(() => router.push('/portal/reports'), 3000);
            } else {
                setError(data.error || 'Submission failed.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <AlertTriangle className="text-red-400 w-7 h-7" />
                        Manual PIREP Submission
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Use this form only when ACARS failed to log your flight.</p>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-red-300">
                    <p className="font-bold">Manual submissions require admin approval.</p>
                    <p className="text-red-400/70 mt-1">You must provide proof from IVAO or VATSIM. Fraudulent submissions will result in disciplinary action.</p>
                </div>
            </div>

            {success ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                    <p className="text-emerald-400 font-bold text-lg">{success}</p>
                    <p className="text-gray-500 text-sm mt-2">Redirecting to your reports...</p>
                </div>
            ) : (
                <div className="glass-card border border-white/[0.06] rounded-xl overflow-hidden">
                    {/* Flight Details */}
                    <div className="p-6 space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Plane size={12} /> Flight Details
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Flight Number" placeholder="LVT123" value={form.flight_number} onChange={v => handleChange('flight_number', v)} />
                            <Field label="Callsign" placeholder="LVT123" value={form.callsign} onChange={v => handleChange('callsign', v)} />
                            <Field label="Departure ICAO *" placeholder="OLBA" value={form.departure_icao} onChange={v => handleChange('departure_icao', v.toUpperCase())} />
                            <Field label="Arrival ICAO *" placeholder="OJAI" value={form.arrival_icao} onChange={v => handleChange('arrival_icao', v.toUpperCase())} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Field label="Aircraft Type *" placeholder="B738" value={form.aircraft_type} onChange={v => handleChange('aircraft_type', v)} />
                                {a380Warning && (
                                    <p className="text-red-400 text-[10px] font-bold mt-1 flex items-center gap-1">
                                        <AlertTriangle size={10} /> A380 is restricted
                                    </p>
                                )}
                            </div>
                            <Field label="Flight Time (min) *" placeholder="120" value={form.flight_time} onChange={v => handleChange('flight_time', v)} type="number" icon={<Clock size={12} />} />
                            <Field label="Landing Rate (fpm)" placeholder="-180" value={form.landing_rate} onChange={v => handleChange('landing_rate', v)} type="number" icon={<Gauge size={12} />} />
                        </div>
                    </div>

                    {/* Proof Section */}
                    <div className="border-t border-white/[0.06] p-6 space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Link2 size={12} /> Proof of Flight *
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setProofMode('link')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${proofMode === 'link' ? 'bg-accent-gold text-dark-900' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                            >
                                <Link2 size={12} className="inline mr-1.5" />
                                Tracker Link
                            </button>
                            <button
                                type="button"
                                onClick={() => setProofMode('image')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${proofMode === 'image' ? 'bg-accent-gold text-dark-900' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                            >
                                <Upload size={12} className="inline mr-1.5" />
                                Upload Images
                            </button>
                        </div>

                        {proofMode === 'link' ? (
                            <div>
                                <input
                                    type="url"
                                    placeholder="https://tracker.ivao.aero/flight/..."
                                    value={form.tracker_link}
                                    onChange={e => handleChange('tracker_link', e.target.value)}
                                    className={`w-full bg-black/40 border rounded-lg px-4 py-3 text-sm text-white font-mono outline-none transition-colors placeholder:text-gray-600 ${
                                        form.tracker_link && !linkValid ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-accent-gold/50'
                                    }`}
                                />
                                {form.tracker_link && !linkValid && (
                                    <p className="text-red-400 text-[10px] mt-1">Must be a valid IVAO tracker URL (tracker.ivao.aero).</p>
                                )}
                            </div>
                        ) : (
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                {form.proof_image ? (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                        <ImageIcon size={16} className="text-emerald-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-emerald-400 font-bold truncate">{uploadedFileName || 'Image uploaded'}</p>
                                            <p className="text-[10px] text-gray-500 font-mono truncate">{form.proof_image}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setForm(prev => ({ ...prev, proof_image: '' })); setUploadedFileName(''); }}
                                            className="text-[10px] text-red-400 font-bold hover:text-red-300"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="w-full flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed border-white/10 hover:border-accent-gold/30 bg-black/20 transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        {uploading ? (
                                            <><Loader2 size={20} className="text-accent-gold animate-spin" /><span className="text-sm text-gray-400">Uploading...</span></>
                                        ) : (
                                            <><Upload size={20} className="text-gray-500" /><span className="text-sm text-gray-400">Click to upload images</span><span className="text-[10px] text-gray-600">PNG, JPG, WEBP — max 5 MB</span></>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Comments */}
                    <div className="border-t border-white/[0.06] p-6 space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Comments (optional)</label>
                        <textarea
                            placeholder="Explain why you're submitting manually (e.g. ACARS crashed mid-flight)..."
                            value={form.comments}
                            onChange={e => handleChange('comments', e.target.value)}
                            className="w-full h-20 bg-black/40 border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-accent-gold/50 transition-colors placeholder:text-gray-600"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mx-6 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400 font-medium">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <div className="border-t border-white/[0.06] p-6 flex justify-end gap-3">
                        <button onClick={() => router.back()} className="px-5 py-2.5 text-sm text-gray-400 hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit || submitting}
                            className="px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ background: canSubmit ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : undefined, color: canSubmit ? '#fff' : undefined }}
                        >
                            <Send size={14} />
                            {submitting ? 'Submitting...' : 'Submit Manual PIREP'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, placeholder, value, onChange, type = 'text', icon }: {
    label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string; icon?: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                {icon} {label}
            </label>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-accent-gold/50 transition-colors placeholder:text-gray-600"
            />
        </div>
    );
}
