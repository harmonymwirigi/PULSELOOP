// frontend/App.tsx
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Header from './components/Header';
import Feed from './components/Feed';
import AdminDashboard from './components/AdminDashboard';
import Profile from './components/Profile';
import Resources from './components/Resources';
import Blogs from './components/Blogs';
import LandingPage from './components/LandingPage';
// FIX: Import shared View type to resolve conflict with Header component.
import { Post, Role, Resource, View, Blog } from './types';
import Spinner from './components/Spinner';
import SinglePostView from './components/SinglePostView';
import Chatbot from './components/Chatbot';
import SingleResourceView from './components/SingleResourceView';
import SingleBlogView from './components/SingleBlogView';
import ResetPasswordPage from './components/ResetPasswordPage';
import ProfileCompletionBanner from './components/ProfileCompletionBanner';
import InviteModal from './components/InviteModal';
import Invitations from './components/Invitations';
import TrendingTopics from './components/TrendingTopics';
import NotificationBell from './components/NotificationBell';
import NotificationCenter from './components/NotificationCenter';
import DarkModeToggle from './components/DarkModeToggle';
import MobileNav from './components/MobileNav';
import SearchBar from './components/SearchBar';
import BroadcastMessageComponent from './components/BroadcastMessage';

// FIX: Removed local View type definition. The shared type is now imported from types.ts.

const AppContent: React.FC = () => {
    const { user, loading } = useAuth();
    const [currentView, setCurrentView] = useState<View>('FEED');
    
    // Check for reset password token in URL
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const resetToken = urlParams.get('reset_token');
        const invitationToken = urlParams.get('token');
        const pathname = window.location.pathname;
        
        // Check if this is a reset password URL
        if (resetToken && pathname === '/reset-password') {
            console.log('Reset password token detected:', resetToken);
            setCurrentView('RESET_PASSWORD');
        }
        // Check if this is an invitation URL (only if no reset_token)
        else if (invitationToken && pathname === '/' && !resetToken) {
            console.log('Invitation token detected:', invitationToken);
            // Handle invitation logic here if needed
        }
    }, []);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
    const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [feedTagFilter, setFeedTagFilter] = useState<string | null>(null);
    const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

    const navigateTo = (view: View) => {
        console.log('Navigating to:', view);
        setCurrentView(view);
    };

    const navigateToPost = (post: Post) => {
        setSelectedPost(post);
        setCurrentView('SINGLE_POST');
    };

    const navigateToResource = (resource: Resource) => {
        setSelectedResource(resource);
        setCurrentView('SINGLE_RESOURCE');
    };

    const navigateToBlog = (blog: Blog) => {
        setSelectedBlog(blog);
        setCurrentView('SINGLE_BLOG');
    };

    const handleOpenNotifications = () => {
        setIsNotificationCenterOpen(true);
    };

    const handleCloseNotifications = () => {
        setIsNotificationCenterOpen(false);
    };

    const handleNavigateToPost = (postId: string) => {
        // Find the post and navigate to it
        // This would need to be implemented based on your post fetching logic
        console.log('Navigate to post:', postId);
        setCurrentView('FEED');
    };
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-cyan-50">
                <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 p-8">
                    <Spinner size="lg" color="teal"/>
                </div>
            </div>
        );
    }

    if (!user) {
        // Show reset password page if there's a token in the URL
        if (currentView === 'RESET_PASSWORD') {
            return <ResetPasswordPage navigateTo={navigateTo} />;
        }
        return <LandingPage />;
    }

    const MainContent: React.FC = () => {
        switch (currentView) {
            case 'FEED': return <Feed navigateToPost={navigateToPost} initialTagFilter={feedTagFilter} onTagFilterChange={setFeedTagFilter} />;
            case 'PROFILE': return <Profile />;
            case 'RESOURCES': return <Resources navigateToResource={navigateToResource} />;
            case 'BLOGS': return <Blogs navigateToBlog={navigateToBlog} />;
            case 'INVITATIONS': return <Invitations openInviteModal={() => setIsInviteModalOpen(true)} />;
            case 'SINGLE_POST': return selectedPost && <SinglePostView post={selectedPost} navigateTo={navigateTo} />;
            case 'SINGLE_RESOURCE': return selectedResource && <SingleResourceView resource={selectedResource} navigateTo={navigateTo} />;
            case 'SINGLE_BLOG': return selectedBlog && <SingleBlogView blog={selectedBlog} navigateTo={navigateTo} />;
            case 'RESET_PASSWORD': return <ResetPasswordPage navigateTo={navigateTo} />;
            case 'ADMIN': 
                return user.role === Role.ADMIN 
                    ? <AdminDashboard /> 
                    : <p className="text-center text-red-500">Access Denied. You are not an admin.</p>;
            default: return <Feed navigateToPost={navigateToPost} initialTagFilter={feedTagFilter} onTagFilterChange={setFeedTagFilter} />;
        }
    };

    const NavLink: React.FC<{ view?: View; label: string; icon: React.ReactElement; onClick?: () => void }> = ({ view, label, icon, onClick }) => {
        const isCurrent = view && currentView === view;
        const action = onClick || (view ? () => navigateTo(view) : () => {});
        
        return (
            <button
                onClick={action}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl w-full text-left font-semibold transition-all duration-200 ${
                    isCurrent
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md transform scale-105'
                        : 'text-slate-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-cyan-50 dark:hover:from-indigo-900/20 dark:hover:to-cyan-900/20 hover:text-indigo-900 dark:hover:text-indigo-300 hover:shadow-sm'
                }`}
            >
                {icon}
                <span>{label}</span>
            </button>
        );
    };


    return (
        <div className="min-h-screen font-sans text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-200">

            <Header 
                navigateTo={navigateTo} 
                currentView={currentView} 
                onOpenNotifications={handleOpenNotifications}
                onSearchResult={(result) => {
                    // Handle search result navigation
                    if (result.type === 'post') {
                        // Find and navigate to the specific post
                        console.log('Navigate to post:', result.id);
                        navigateTo('FEED');
                    } else if (result.type === 'resource') {
                        // Navigate to resources and highlight the specific resource
                        console.log('Navigate to resource:', result.id);
                        navigateTo('RESOURCES');
                    } else if (result.type === 'blog') {
                        // Navigate to blogs and highlight the specific blog
                        console.log('Navigate to blog:', result.id);
                        navigateTo('BLOGS');
                    }
                }}
            />
            <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
            <main className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 lg:py-8 flex-grow relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 25% 25%, #3b82f6 0%, transparent 50%), 
                                         radial-gradient(circle at 75% 75%, #06b6d4 0%, transparent 50%),
                                         radial-gradient(circle at 50% 50%, #8b5cf6 0%, transparent 50%)`,
                        backgroundSize: '400px 400px, 300px 300px, 500px 500px'
                    }}></div>
                </div>
                 {user && (user.profileCompletionPercentage ?? 0) < 100 && currentView !== 'PROFILE' && (
                    <ProfileCompletionBanner user={user} navigateTo={navigateTo} />
                )}
                
                {/* Broadcast Message for logged-in users */}
                <BroadcastMessageComponent />
                
                {/* Mobile Search Bar */}
                <div className="lg:hidden mb-3 px-2">
                    <SearchBar 
                        onResultClick={(result) => {
                            if (result.type === 'post') {
                                navigateTo('FEED');
                            } else if (result.type === 'resource') {
                                navigateTo('RESOURCES');
                            } else if (result.type === 'blog') {
                                navigateTo('BLOGS');
                            }
                        }}
                        placeholder="Search posts, resources, blogs..."
                    />
                </div>
                {currentView === 'FEED' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
                        {/* Left Sidebar */}
                        <aside className="hidden lg:block lg:col-span-1">
                            <div className="sticky top-24 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 space-y-4">
                                <NavLink view="FEED" label="Feed" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>} />
                                <NavLink view="RESOURCES" label="Resources" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h9" /></svg>} />
                                <NavLink view="BLOGS" label="Blogs" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} />
                                <NavLink view="INVITATIONS" label="My Invitations" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} />
                                <NavLink label="Invite a Colleague" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>} onClick={() => setIsInviteModalOpen(true)} />
                                {user.role === Role.ADMIN && <NavLink view="ADMIN" label="Admin Panel" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />}
                                
                                {/* Dark Mode Toggle */}
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center justify-between px-4 py-2">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Theme</span>
                                        <DarkModeToggle />
                                    </div>
                                </div>
                                
                                {/* Notification Bell */}
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center justify-between px-4 py-2">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Notifications</span>
                                        <NotificationBell onOpenNotifications={handleOpenNotifications} />
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* Main Content */}
                        <div className="lg:col-span-2 relative">
                           <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
                               <MainContent />
                           </div>
                        </div>
                        
                        {/* Right Sidebar - Trending Topics */}
                        <aside className="hidden lg:block lg:col-span-1">
                            <div className="sticky top-24 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 p-6">
                                <TrendingTopics 
                                    onTagClick={(tag) => {
                                        // Set the tag filter and navigate to feed
                                        setFeedTagFilter(tag);
                                        navigateTo('FEED');
                                    }}
                                />
                            </div>
                        </aside>
                    </div>
                ) : (
                    <div className="relative">
                        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
                            <MainContent />
                        </div>
                        {/* Mobile Trending Topics - Show below main content on mobile */}
                        {currentView === 'FEED' && (
                            <div className="mt-4 lg:hidden">
                                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 p-3 sm:p-4">
                                    <TrendingTopics 
                                        onTagClick={(tag) => {
                                            setFeedTagFilter(tag);
                                            navigateTo('FEED');
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
            <Chatbot />
            <NotificationCenter 
                isOpen={isNotificationCenterOpen}
                onClose={handleCloseNotifications}
                onNavigateToPost={handleNavigateToPost}
            />
            <MobileNav 
                currentView={currentView}
                navigateTo={navigateTo}
                onOpenNotifications={handleOpenNotifications}
                onInviteClick={() => setIsInviteModalOpen(true)}
            />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;