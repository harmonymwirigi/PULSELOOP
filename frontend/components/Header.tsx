import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
// FIX: Import shared View type to resolve conflict.
import { Role, View } from '../types';
import Logo from './Logo';
import NotificationBell from './NotificationBell';

// Avatar component for consistent avatar display
const getInitials = (name: string) => {
    const names = name.split(' ');
    const initials = names.map(n => n[0]).join('');
    return initials.slice(0, 2).toUpperCase();
};

const Avatar: React.FC<{ name: string, avatarUrl?: string | null, size: string }> = ({ name, avatarUrl, size }) => {
    const colors = [
        'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
        'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
        'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
        'bg-pink-500', 'bg-rose-500'
    ];
    const colorIndex = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % colors.length;
    const color = colors[colorIndex];

    if (avatarUrl) {
        return <img src={avatarUrl} alt={name} className={`${size} rounded-full object-cover shadow-md`} />;
    }

    // Use default avatar.jpg from frontend folder
    return <img src="/avatar.jpg" alt={name} className={`${size} rounded-full object-cover shadow-md`} />;
};

// FIX: Removed local View type definition. The shared type is now imported from types.ts.

interface HeaderProps {
    navigateTo: (view: View) => void;
    currentView: View;
    onOpenNotifications?: () => void;
}

const Header: React.FC<HeaderProps> = ({ navigateTo, currentView, onOpenNotifications }) => {
    const { user, logout } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const NavButton: React.FC<{ view: View; children: React.ReactNode }> = ({ view, children }) => {
        const isActive = currentView === view;
        return (
            <button
                onClick={() => navigateTo(view)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg transform scale-105 border border-white/30'
                        : 'text-indigo-800 hover:bg-gradient-to-r hover:from-indigo-100 hover:to-cyan-100 hover:text-indigo-900 hover:shadow-md hover:scale-102'
                }`}
            >
                {children}
            </button>
        );
    };

    return (
        <header className="bg-gradient-to-r from-indigo-600 via-teal-600 to-cyan-600 shadow-xl border-b border-indigo-500 sticky top-0 z-20">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="bg-white/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-white/30">
                    <Logo onClick={() => navigateTo(user ? 'FEED' : 'LOGIN')} textColorClassName="text-indigo-800" />
                </div>
                <nav className="flex items-center space-x-1">
                    {user ? (
                        <>
                            <div className="hidden md:flex items-center space-x-1 bg-white/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-white/20">
                                <NavButton view="FEED">Feed</NavButton>
                                <NavButton view="RESOURCES">Resources</NavButton>
                                <NavButton view="BLOGS">Blogs</NavButton>
                                {user.role === Role.ADMIN && <NavButton view="ADMIN">Admin Panel</NavButton>}
                            </div>
                            
                            {/* Notification Bell */}
                            {onOpenNotifications && (
                                <NotificationBell onOpenNotifications={onOpenNotifications} />
                            )}
                            
                            <div className="relative ml-3" ref={dropdownRef}>
                                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center space-x-2 bg-white/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-white/30 hover:shadow-xl transition-all duration-300 cursor-pointer">
                                    <div className="w-8 h-8 border-2 border-indigo-500 rounded-full">
                                        <Avatar name={user.name} avatarUrl={user.avatarUrl} size="w-full h-full" />
                                    </div>
                                    <span className="font-bold text-indigo-900 hidden sm:block">{user.name}</span>
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-indigo-200 py-2 z-30">
                                        <a onClick={() => { navigateTo('PROFILE'); setIsDropdownOpen(false); }} className="block px-4 py-3 text-sm text-indigo-800 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-cyan-50 hover:text-indigo-900 cursor-pointer transition-all duration-200 font-medium">My Profile</a>
                                        <a onClick={() => { logout(); setIsDropdownOpen(false); }} className="block px-4 py-3 text-sm text-indigo-800 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-cyan-50 hover:text-indigo-900 cursor-pointer transition-all duration-200 font-medium">Logout</a>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <button onClick={() => navigateTo('LOGIN')} className="text-white hover:text-cyan-200 font-bold px-4 py-2.5 rounded-xl hover:bg-white/20 transition-all duration-300 backdrop-blur-sm">Login</button>
                            <button onClick={() => navigateTo('SIGNUP')} className="px-6 py-2.5 bg-white/95 backdrop-blur-md text-indigo-800 rounded-xl hover:bg-white hover:shadow-xl transition-all duration-300 shadow-lg font-bold border border-white/30">Sign Up</button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Header;