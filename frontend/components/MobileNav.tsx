import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Role, View } from '../types';
import DarkModeToggle from './DarkModeToggle';
import NotificationBell from './NotificationBell';

interface MobileNavProps {
    currentView: View;
    navigateTo: (view: View) => void;
    onOpenNotifications: () => void;
    onInviteClick: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ 
    currentView, 
    navigateTo, 
    onOpenNotifications,
    onInviteClick 
}) => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const NavItem: React.FC<{ 
        view: View; 
        label: string; 
        icon: React.ReactElement; 
        onClick?: () => void;
    }> = ({ view, label, icon, onClick }) => {
        const isActive = currentView === view;
        const action = onClick || (() => {
            navigateTo(view);
            setIsOpen(false);
        });
        
        return (
            <button
                onClick={action}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl w-full text-left font-semibold transition-all duration-200 ${
                    isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                        : 'text-slate-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-cyan-50 dark:hover:from-indigo-900/20 dark:hover:to-cyan-900/20 hover:text-indigo-900 dark:hover:text-indigo-300'
                }`}
            >
                {icon}
                <span>{label}</span>
            </button>
        );
    };

    if (!user) return null;

    return (
        <>
            {/* Mobile Menu Button - Positioned to avoid chatbot */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden fixed bottom-20 left-4 z-40 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" 
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Menu Panel */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                        </div>
                        
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Menu</h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="px-6 py-4">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Quick Actions</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <NavItem 
                                    view="FEED" 
                                    label="Feed" 
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>} 
                                />
                                <NavItem 
                                    view="RESOURCES" 
                                    label="Resources" 
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h9" /></svg>} 
                                />
                                <NavItem 
                                    view="BLOGS" 
                                    label="Blogs" 
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} 
                                />
                                <NavItem 
                                    view="INVITATIONS" 
                                    label="Invitations" 
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} 
                                />
                            </div>
                        </div>

                        {/* Additional Actions */}
                        <div className="px-6 py-2 space-y-1">
                            <NavItem 
                                label="Invite a Colleague" 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>} 
                                onClick={() => {
                                    onInviteClick();
                                    setIsOpen(false);
                                }}
                            />
                            {user.role === Role.ADMIN && (
                                <NavItem 
                                    view="ADMIN" 
                                    label="Admin Panel" 
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} 
                                />
                            )}
                        </div>
                        
                        {/* Footer with controls */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                            {/* Notifications */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Notifications</span>
                                <NotificationBell onOpenNotifications={onOpenNotifications} />
                            </div>
                            
                            {/* Dark Mode Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Theme</span>
                                <DarkModeToggle />
                            </div>
                            
                            {/* Profile Link */}
                            <button
                                onClick={() => {
                                    navigateTo('PROFILE');
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left font-semibold text-slate-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-cyan-50 dark:hover:from-indigo-900/20 dark:hover:to-cyan-900/20 hover:text-indigo-900 dark:hover:text-indigo-300 transition-all duration-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>My Profile</span>
                            </button>
                            
                            {/* Logout Button */}
                            <button
                                onClick={() => {
                                    logout();
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left font-semibold text-red-600 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-50 dark:hover:from-red-900/20 dark:hover:to-red-900/20 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MobileNav;
