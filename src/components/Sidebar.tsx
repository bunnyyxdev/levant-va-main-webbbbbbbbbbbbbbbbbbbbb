'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    User,
    PlaneTakeoff,
    FileText,
    Edit,
    UserCheck,
    MessageSquare,
    Settings,
    LogOut,
    Trophy,
    Map,
    ShoppingBag,
    Download,
    Award,
    LucideIcon,
    Wrench,
    Plane,
    Landmark,
    SlidersHorizontal,
    ShieldAlert,
    Paintbrush,
    ChevronDown,
    BarChart3,
} from 'lucide-react';

interface MenuItem {
    name: string;
    path: string;
    icon: LucideIcon;
    external?: boolean;
}

interface AdminSubGroup {
    label: string;
    items: MenuItem[];
}

export default function Sidebar() {
    const pathname = usePathname();
    const { isAdmin, user } = useAuth();
    const [vaultBalance, setVaultBalance] = useState<number | null>(null);
    const [manualPirepCount, setManualPirepCount] = useState(0);
    const [openAdminGroups, setOpenAdminGroups] = useState<Record<string, boolean>>({});

    const toggleAdminGroup = useCallback((label: string) => {
        setOpenAdminGroups(prev => ({ ...prev, [label]: !prev[label] }));
    }, []);

    const isActive = useCallback((path: string) => {
        if (!pathname) return false;
        if (pathname === path) return true;
        // Only match as active if pathname starts with path + '/' (child route)
        // but NOT if there's a more specific menu item that matches
        return pathname.startsWith(path + '/');
    }, [pathname]);

    useEffect(() => {
        if (isAdmin) {
            fetch('/api/maintenance/repair')
                .then(res => res.json())
                .then(data => { if (data.airlineFunds != null) setVaultBalance(data.airlineFunds); })
                .catch(() => {});
            // Fetch pending manual PIREP count for notification badge
            fetch('/api/admin/pireps/manual-count')
                .then(res => res.json())
                .then(data => { if (data.count != null) setManualPirepCount(data.count); })
                .catch(() => {});
        }
    }, [isAdmin]);

    const menuItems = useMemo<{ category: string; items: MenuItem[] }[]>(() => [
        {                              
            category: 'PILOT',
            items: [
                { name: 'Dashboard', path: '/portal/dashboard', icon: LayoutDashboard },
                { name: 'Profile', path: '/portal/profile', icon: User },
            ],
        },
        {
            category: 'OPERATIONS',
            items: [
                { name: 'My Reports', path: '/portal/reports', icon: FileText },
                { name: 'Manual PIREP', path: '/portal/reports/manual', icon: Edit },
                { name: 'Tours & Events', path: '/portal/activities', icon: Map },
                { name: 'Leaderboard', path: '/portal/leaderboard', icon: Trophy },
                { name: 'Downloads', path: '/portal/downloads', icon: Download },
            ],
        },
        {
            category: 'COMMUNITY',
            items: [
                { name: 'Discord', path: 'https://discord.levant-va.com/', icon: MessageSquare, external: true },
                { name: 'Pilot Store', path: '/portal/store', icon: ShoppingBag },
                { name: 'Liveries Download', path: '/portal/liveries', icon: Paintbrush },
                { name: 'Settings', path: '/portal/settings', icon: Settings },
            ],
        },
        {
            category: 'ADMIN',
            items: [
                { name: 'User Management', path: '/portal/admin/users', icon: User },
                { name: 'PIREP Management', path: '/portal/admin/pireps', icon: FileText },
            ],
        },
    ], []);

    const adminSubGroups = useMemo<AdminSubGroup[]>(() => [
        {
            label: 'Fleet',
            items: [
                { name: 'Fleet Management', path: '/portal/admin/fleet', icon: Plane },
                { name: 'Fleet Maintenance', path: '/portal/admin/fleet/maintenance', icon: Wrench },
            ],
        },
        {
            label: 'Content',
            items: [
                { name: 'Tour Management', path: '/portal/admin/tours', icon: Map },
                { name: 'Award Management', path: '/portal/admin/badges', icon: Award },
                { name: 'Store Management', path: '/portal/admin/store', icon: ShoppingBag },
                { name: 'Livery Management', path: '/portal/admin/liveries', icon: Paintbrush },
                { name: 'DOTM Management', path: '/portal/admin/dotm', icon: Award },
            ],
        },
        {
            label: 'System',
            items: [
                { name: 'Airline Settings', path: '/portal/admin/settings', icon: SlidersHorizontal },
                { name: 'Staff Management', path: '/portal/admin/staff', icon: UserCheck },
                { name: 'Blacklist', path: '/portal/admin/blacklist', icon: ShieldAlert },
            ],
        },
    ], []);

    const handleLogout = useCallback(async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout failed', error);
            window.location.href = '/login';
        }
    }, []);

    return (
        <aside className="w-64 bg-[#0a0e17] border-r border-white/[0.06] flex-shrink-0 flex flex-col h-screen fixed top-0 left-0 overflow-y-auto overflow-x-hidden z-50">
            {/* Logo */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
                <Link href="/portal/dashboard" className="block">
                    <img src="/img/logo.png" alt="Levant" className="h-16 w-auto" />
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-2 py-4 space-y-6">
                {menuItems.map((category) => {
                    const isAdminCategory = category.category === 'ADMIN';
                    if (isAdminCategory && !isAdmin) return null;
                    return (
                        <div key={category.category}>
                            {/* Admin section gets a glowing divider + badge header */}
                            {isAdminCategory ? (
                                <>
                                    <div className="mx-3 mb-4 mt-1">
                                        <div className="h-px bg-gradient-to-r from-transparent via-accent-gold/30 to-transparent" />
                                    </div>
                                    <div className="flex items-center gap-2 px-3 mb-2">
                                        <span className="text-[9px] font-black tracking-[0.3em] uppercase bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                                            {category.category}
                                        </span>
                                        <span className="h-px flex-1 bg-gradient-to-r from-accent-gold/20 to-transparent" />
                                    </div>
                                </>
                            ) : (
                                <h3 className="text-[9px] font-bold text-gray-600 tracking-[0.25em] mb-2 px-3 uppercase">
                                    {category.category}
                                </h3>
                            )}
                            <div className="space-y-0.5">
                                {category.items.map((item) => {
                                    const active = isActive(item.path);
                                    const linkClasses = `flex items-center px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 group relative ${
                                        active
                                            ? 'bg-accent-gold/[0.08] text-accent-gold'
                                            : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                                    }`;
                                    const iconClasses = `w-[18px] h-[18px] mr-3 transition-colors duration-200 flex-shrink-0 ${
                                        active ? 'text-accent-gold' : 'text-gray-500 group-hover:text-accent-gold'
                                    }`;
                                    const activeBar = active ? (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-accent-gold rounded-r-full" />
                                    ) : null;

                                    if (item.external) {
                                        return (
                                            <a key={item.name} href={item.path} target="_blank" rel="noopener noreferrer" className={linkClasses}>
                                                {activeBar}
                                                <item.icon className={iconClasses} />
                                                {item.name}
                                            </a>
                                        );
                                    }
                                    return (
                                        <Link key={item.name} href={item.path} className={linkClasses}>
                                            {activeBar}
                                            <item.icon className={iconClasses} />
                                            {item.name}
                                            {item.name === 'PIREP Management' && manualPirepCount > 0 && (
                                                <span className="ml-auto flex items-center gap-1">
                                                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                                    <span className="text-[9px] font-bold text-red-400">{manualPirepCount}</span>
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}

                                {/* Admin sub-group dropdowns */}
                                {isAdminCategory && adminSubGroups.map((group) => {
                                    const isOpen = openAdminGroups[group.label] || group.items.some(i => isActive(i.path));
                                    const hasActiveChild = group.items.some(i => isActive(i.path));
                                    return (
                                        <div key={group.label}>
                                            <button
                                                onClick={() => toggleAdminGroup(group.label)}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                                                    hasActiveChild
                                                        ? 'text-accent-gold bg-accent-gold/[0.04]'
                                                        : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'
                                                }`}
                                            >
                                                <span className="text-[9px] font-bold uppercase tracking-[0.15em]">{group.label}</span>
                                                <ChevronDown size={14} className={`transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            <div
                                                className={`overflow-hidden transition-all duration-300 ease-out ${
                                                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                                }`}
                                            >
                                                <div className="ml-2 border-l border-accent-gold/10 space-y-0.5 pl-1 py-0.5">
                                                    {group.items.map((item) => {
                                                        const active = isActive(item.path);
                                                        return (
                                                            <Link
                                                                key={item.name}
                                                                href={item.path}
                                                                className={`flex items-center px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-200 group relative ${
                                                                    active
                                                                        ? 'bg-accent-gold/[0.08] text-accent-gold'
                                                                        : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                                                                }`}
                                                            >
                                                                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3 bg-accent-gold rounded-r-full" />}
                                                                <item.icon className={`w-[15px] h-[15px] mr-2.5 flex-shrink-0 transition-colors duration-200 ${active ? 'text-accent-gold' : 'text-gray-600 group-hover:text-accent-gold/70'}`} />
                                                                {item.name}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Section: Vault Widget + Pilot Info + Logout */}
            <div className="border-t border-white/[0.04] p-2 space-y-1">
                {/* Airline Vault Widget */}
                {isAdmin && vaultBalance !== null && (
                    <Link href="/portal/admin/fleet/maintenance" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-gold/[0.05] border border-accent-gold/10 hover:border-accent-gold/20 transition-all group">
                        <Landmark size={16} className="text-accent-gold flex-shrink-0" />
                        <div className="min-w-0">
                            <div className="text-[8px] font-bold text-gray-600 uppercase tracking-wider">Airline Vault</div>
                            <div className="text-xs font-mono font-bold text-accent-gold truncate">{vaultBalance.toLocaleString()} Cr</div>
                        </div>
                    </Link>
                )}

                {/* Pilot callsign badge */}
                {user && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold text-[9px] font-bold flex-shrink-0">
                            {(user.pilotId || 'P').charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold text-white truncate">{user.customCallsign || user.pilotId || 'Pilot'}</div>
                            <div className="text-[8px] text-gray-600 font-mono truncate">{user.email || ''}</div>
                        </div>
                    </div>
                )}

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-3 py-2 text-[13px] font-medium text-gray-500 hover:text-rose-400 hover:bg-rose-500/[0.06] rounded-lg transition-all group relative"
                    title="Sign Out"
                >
                    <LogOut className="w-[18px] h-[18px] mr-3 flex-shrink-0" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
