import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
// FIX: Import shared View type to resolve conflict.
import { Role, View } from '../types';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import SearchBar from './SearchBar';

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
        return <img src={avatarUrl} alt={name} className={`${size} rounded-lg object-cover shadow-md`} />;
    }

    // Use default avatar.jpg from frontend folder
    return <img src="/avatar.jpg" alt={name} className={`${size} rounded-lg object-cover shadow-md`} />;
};

// FIX: Removed local View type definition. The shared type is now imported from types.ts.

interface SearchResult {
    id: string;
    type: 'post' | 'resource' | 'blog' | 'user';
    title: string;
    content: string;
    author?: string;
    createdAt: string;
    url: string;
}

interface HeaderProps {
    navigateTo: (view: View) => void;
    currentView: View;
    onOpenNotifications?: () => void;
    onSearchResult?: (result: SearchResult) => void;
}

const Header: React.FC<HeaderProps> = ({ navigateTo, currentView, onOpenNotifications, onSearchResult }) => {
    const { user } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const isButtonClicking = useRef(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Skip if a button is being clicked
            if (isButtonClicking.current) {
                console.log('Button click in progress, ignoring click outside');
                return;
            }
            
            // Check if the click is outside both the dropdown and the menu button
            const target = event.target as Node;
            const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);
            const isInsideMenuButton = menuButtonRef.current && menuButtonRef.current.contains(target);
            
            console.log('Click detected:', {
                isInsideDropdown,
                isInsideMenuButton,
                target: target.nodeName,
                dropdownRef: !!dropdownRef.current,
                menuButtonRef: !!menuButtonRef.current
            });
            
            if (!isInsideDropdown && !isInsideMenuButton) {
                console.log('Click outside detected, closing dropdown');
                setIsDropdownOpen(false);
            } else {
                console.log('Click inside dropdown or menu button, keeping it open');
            }
        };
        
        if (isDropdownOpen) {
            // Add a longer delay to prevent immediate closing but allow button clicks
            const timeoutId = setTimeout(() => {
                document.addEventListener("click", handleClickOutside);
            }, 300);
            
            return () => {
                clearTimeout(timeoutId);
                document.removeEventListener("click", handleClickOutside);
            };
        }
    }, [isDropdownOpen]);

    const NavButton: React.FC<{ view: View; children: React.ReactNode }> = ({ view, children }) => {
        const isActive = currentView === view;
        return (
            <button
                onClick={() => navigateTo(view)}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                    isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg transform scale-105 border border-white/30'
                        : 'text-white hover:bg-gradient-to-r hover:from-indigo-100/20 hover:to-cyan-100/20 hover:text-white hover:shadow-md hover:scale-102'
                }`}
            >
                {children}
            </button>
        );
    };

    return (
        <header className="bg-gradient-to-r from-indigo-600 via-teal-600 to-cyan-600 shadow-xl border-b border-indigo-500 sticky top-0 z-20">
            <div className="container mx-auto px-2 sm:px-4 py-1 sm:py-2 lg:py-4">
            {/* Mobile Layout - Compact Design */}
            <div className="lg:hidden">
                {/* Top Row: Logo and Menu Button */}
                <div className="flex justify-between items-center mb-2">
                    {/* Compact Logo with text */}
                    <Logo onClick={() => navigateTo(user ? 'FEED' : 'LOGIN')} textColorClassName="text-white" />
                    
                    {user && (
                        <div className="flex items-center space-x-1 sm:space-x-2">
                            {/* Notification Bell */}
                            {onOpenNotifications && (
                                <NotificationBell onOpenNotifications={onOpenNotifications} />
                            )}
                            
                            {/* Mobile Menu Button - Compact */}
                            <button 
                                ref={menuButtonRef}
                                data-menu-button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Mobile menu toggle clicked');
                                    setIsDropdownOpen(!isDropdownOpen);
                                }} 
                                className="flex items-center space-x-1 bg-gradient-to-r from-indigo-800/90 to-purple-800/90 backdrop-blur-md rounded-lg px-2 py-2 shadow-lg border border-indigo-300/30 hover:shadow-xl transition-all duration-300"
                            >
                                <div className="w-6 h-6 border border-white rounded-full">
                                    <Avatar name={user.name} avatarUrl={user.avatarUrl} size="w-full h-full" />
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Mobile Search Bar removed; page-level search is now rendered inside each view */}
                
                {/* Mobile Menu Dropdown */}
                {isDropdownOpen && user && (
                    <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 mx-4">
                        <div className="py-2">
                            {/* User Info */}
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 border-2 border-indigo-500 rounded-full">
                                        <Avatar name={user.name} avatarUrl={user.avatarUrl} size="w-full h-full" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.role}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Navigation Items */}
                            <div className="py-2">
                                <button 
                                    onClick={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('Mobile Feed button clicked');
                                        navigateTo('FEED'); 
                                        setIsDropdownOpen(false); 
                                    }} 
                                    className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-3"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                                    </svg>
                                    <span>Feed</span>
                                </button>
                                
                                <button 
                                    onClick={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('Mobile Stories button clicked');
                                        navigateTo('CREATE_STORY'); 
                                        setIsDropdownOpen(false); 
                                    }} 
                                    className="w-full text-left px-4 py-3 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-3"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>Stories</span>
                                </button>
                                
                                <button 
                                    onClick={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('Mobile Resources button clicked');
                                        navigateTo('RESOURCES'); 
                                        setIsDropdownOpen(false); 
                                    }} 
                                    className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-3"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                    <span>Resources</span>
                                </button>
                                
                                <button 
                                    onClick={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('Mobile Blogs button clicked');
                                        navigateTo('BLOGS'); 
                                        setIsDropdownOpen(false); 
                                    }} 
                                    className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-3"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h9M7 16h6M7 8h6v4H7V8z" />
                                    </svg>
                                    <span>Blogs</span>
                                </button>
                                
                                <button 
                                    onClick={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('Mobile NCLEX button clicked');
                                        navigateTo('NCLEX'); 
                                        setIsDropdownOpen(false); 
                                    }} 
                                    className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-3"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z" />
                                    </svg>
                                    <span>NCLEX</span>
                                </button>
                                
                                <button 
                                    onClick={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('Mobile Professionals button clicked');
                                        navigateTo('PROFESSIONALS'); 
                                        setIsDropdownOpen(false); 
                                    }} 
                                    className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-3"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M7 20h10M7 20v-2a3 3 0 00-5.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>MedForce</span>
                                </button>
                                
                                <button 
                                    onClick={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('Mobile Profile button clicked');
                                        navigateTo('PROFILE'); 
                                        setIsDropdownOpen(false); 
                                    }} 
                                    className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-3"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span>My Profile</span>
                                </button>
                                
                                {/* Add Story (mobile) */}
                                <button 
                                    onClick={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('Mobile Add Story button clicked');
                                        navigateTo('CREATE_STORY'); 
                                        setIsDropdownOpen(false); 
                                    }} 
                                    className="w-full text-left px-4 py-3 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-3"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>Add Story</span>
                                </button>
                                
                                {user.role === Role.ADMIN && (
                                    <button 
                                        onClick={(e) => { 
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('Mobile Admin button clicked');
                                            navigateTo('ADMIN'); 
                                            setIsDropdownOpen(false); 
                                        }} 
                                        className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-3"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>Admin Panel</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

                {/* Desktop Layout */}
                <div className="hidden lg:flex justify-between items-center">
                    <div className="bg-gradient-to-r from-indigo-800/90 to-purple-800/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-indigo-300/30">
                        <Logo onClick={() => navigateTo(user ? 'FEED' : 'LOGIN')} textColorClassName="text-white" />
                    </div>
                    <nav className="flex items-center space-x-2">
                        {user ? (
                            <>
                                <div className="hidden md:flex items-center space-x-1 bg-gradient-to-r from-indigo-800/90 to-purple-800/90 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-indigo-300/30">
                                    <NavButton view="FEED">Feed</NavButton>
                                    <NavButton view="CREATE_STORY">Stories</NavButton>
                                    <NavButton view="RESOURCES">Resources</NavButton>
                                    <NavButton view="BLOGS">Blogs</NavButton>
                                    <NavButton view="NCLEX">NCLEX</NavButton>
                                    <NavButton view="PROFESSIONALS">MedForce</NavButton>
                                    {user.role === Role.ADMIN && <NavButton view="ADMIN">Admin Panel</NavButton>}
                                </div>
                                
                                {/* Notification Bell */}
                                {onOpenNotifications && (
                                    <NotificationBell onOpenNotifications={onOpenNotifications} />
                                )}
                                
                                {/* User Avatar Dropdown - Profile Only */}
                                <div className="relative ml-3" ref={dropdownRef}>
                                    <button 
                                        ref={menuButtonRef}
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                                        className="flex items-center space-x-2 bg-gradient-to-r from-indigo-800/90 to-purple-800/90 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-indigo-300/30 hover:shadow-xl transition-all duration-300 cursor-pointer"
                                    >
                                        <div className="w-8 h-8 border-2 border-white rounded-full">
                                            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="w-full h-full" />
                                        </div>
                                        <span className="font-bold text-white hidden sm:block">{user.name}</span>
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    {isDropdownOpen && (
                                        <div 
                                            className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-indigo-200 py-2 z-50"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button 
                                                onClick={(e) => { 
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    
                                                    isButtonClicking.current = true;
                                                    navigateTo('CREATE_STORY'); 
                                                    setIsDropdownOpen(false);
                                                    
                                                    setTimeout(() => {
                                                        isButtonClicking.current = false;
                                                    }, 100);
                                                }} 
                                                className="w-full text-left px-4 py-3 text-sm text-indigo-800 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-cyan-50 hover:text-indigo-900 transition-all duration-200 font-medium cursor-pointer border-b border-indigo-100"
                                            >
                                                Add Story
                                            </button>
                                            <button 
                                                onClick={(e) => { 
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('Desktop Profile button clicked');
                                                    
                                                    // Set flag to prevent click outside handler
                                                    isButtonClicking.current = true;
                                                    
                                                    // Navigate immediately
                                                    navigateTo('PROFILE'); 
                                                    setIsDropdownOpen(false);
                                                    
                                                    // Reset flag after a short delay
                                                    setTimeout(() => {
                                                        isButtonClicking.current = false;
                                                    }, 100);
                                                }} 
                                                className="w-full text-left px-4 py-3 text-sm text-indigo-800 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-cyan-50 hover:text-indigo-900 transition-all duration-200 font-medium cursor-pointer"
                                            >
                                                My Profile
                                            </button>
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
            </div>
        </header>
    );
};

export default Header;