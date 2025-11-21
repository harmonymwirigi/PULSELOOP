import React, { useState, useEffect, useCallback } from 'react';
import AuthModal from './AuthModal';
import PrivacyPolicy from './PrivacyPolicy';
import Logo from './Logo';
import { getPublicBlogs, getPublicResources, getPublicFeedbacks, getActiveBroadcastMessage, getAbsoluteUrl } from '../services/mockApi';
import { Blog, Resource, Feedback, BroadcastMessage } from '../types';

// Fallback testimonials in case no feedback is available
const fallbackTestimonials = [
    { 
        quote: "PulseLoopCare has become an indispensable tool for my practice. The ability to quickly get a second opinion on a complex case from a trusted network is invaluable.",
        name: "Dr. Emily Carter",
        role: "Cardiologist",
        avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2670&auto=format&fit=crop"
    },
    { 
        quote: "The AI-assisted diagnostics have genuinely surprised me with their accuracy. It's like having a brilliant research assistant available 24/7.",
        name: "Dr. Ben Harrison",
        role: "Neurologist",
        avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=2564&auto=format&fit=crop"
    },
    { 
        quote: "As a recent graduate, the resource hub and the mentorship I've found on this platform have been instrumental in building my confidence and skills.",
        name: "Dr. Maria Garcia",
        role: "General Practitioner",
        avatarUrl: "https://images.unsplash.com/photo-1537368910025-7003507965b6?q=80&w=2570&auto=format&fit=crop"
    }
];

const heroMessages = [
    {
        title: "Connecting Healthcare Professionals Together",
        subtitle: ""
    },
    {
        title: "AI-Powered Medical Collaboration",
        subtitle: ""
    },
    {
        title: "Secure Peer Network",
        subtitle: ""
    },
    {
        title: "Shared Resource Hub",
        subtitle: ""
    }
];

const LandingPage: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'login' | 'signup'>('login');
    const [invitationToken, setInvitationToken] = useState<string | null>(null);
    const [currentTestimonial, setCurrentTestimonial] = useState(0);
    const [currentHeroMessage, setCurrentHeroMessage] = useState(0);
    const [showPolicy, setShowPolicy] = useState(false);
    const [showBlogs, setShowBlogs] = useState(false);
    const [showResources, setShowResources] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
    const [blogsLoading, setBlogsLoading] = useState(false);
    const [resources, setResources] = useState<Resource[]>([]);
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
    const [resourcesLoading, setResourcesLoading] = useState(false);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [feedbacksLoading, setFeedbacksLoading] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState<BroadcastMessage | null>(null);
    const [broadcastLoading, setBroadcastLoading] = useState(false);

    const openModal = (mode: 'login' | 'signup', token: string | null = null) => {
        setModalMode(mode);
        setInvitationToken(token);
        setIsModalOpen(true);
    };
    
    const viewPolicy = () => {
        setIsModalOpen(false);
        setShowPolicy(true);
    };

    const fetchBlogs = useCallback(async () => {
        try {
            setBlogsLoading(true);
            const fetchedBlogs = await getPublicBlogs();
            setBlogs(fetchedBlogs);
        } catch (err) {
            console.error('Failed to fetch blogs:', err);
        } finally {
            setBlogsLoading(false);
        }
    }, []);

    const fetchResources = useCallback(async () => {
        try {
            setResourcesLoading(true);
            const fetchedResources = await getPublicResources();
            setResources(fetchedResources);
        } catch (err) {
            console.error('Failed to fetch resources:', err);
        } finally {
            setResourcesLoading(false);
        }
    }, []);

    const fetchFeedbacks = useCallback(async () => {
        try {
            setFeedbacksLoading(true);
            const fetchedFeedbacks = await getPublicFeedbacks();
            setFeedbacks(fetchedFeedbacks);
        } catch (err) {
            console.error('Failed to fetch feedbacks:', err);
        } finally {
            setFeedbacksLoading(false);
        }
    }, []);

    const fetchBroadcastMessage = useCallback(async () => {
        try {
            setBroadcastLoading(true);
            const response = await getActiveBroadcastMessage();
            setBroadcastMessage(response.message);
        } catch (err) {
            console.error('Failed to fetch broadcast message:', err);
        } finally {
            setBroadcastLoading(false);
        }
    }, []);

    const handleShowResources = () => {
        setShowAbout(false);
        setShowBlogs(false);
        setShowResources(true);
        fetchResources();
    };

    const handleShowBlogs = () => {
        setShowAbout(false);
        setShowResources(false);
        setShowBlogs(true);
        fetchBlogs();
    };

    const handleShowAbout = () => {
        setShowBlogs(false);
        setShowResources(false);
        setSelectedBlog(null);
        setSelectedResource(null);
        setShowAbout(true);
    };

    const handleResourceClick = (resource: Resource) => {
        setSelectedResource(resource);
    };

    const handleBlogClick = (blog: Blog) => {
        setSelectedBlog(blog);
    };

    const handleBackToResources = () => {
        setSelectedResource(null);
    };

    const handleBackToBlogs = () => {
        setSelectedBlog(null);
    };

    const handleBackToLanding = () => {
        setShowBlogs(false);
        setShowResources(false);
        setSelectedBlog(null);
        setSelectedResource(null);
        setShowAbout(false);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        if (token) {
            // Remove token from URL to keep it clean, but keep it in state
            window.history.replaceState({}, document.title, window.location.pathname);
            openModal('signup', token);
        }
    }, []);
    
    const nextTestimonial = useCallback(() => {
        const testimonialsData = feedbacks.length > 0 ? feedbacks : fallbackTestimonials;
        setCurrentTestimonial(prev => (prev + 1) % testimonialsData.length);
    }, [feedbacks]);

    const prevTestimonial = () => {
        const testimonialsData = feedbacks.length > 0 ? feedbacks : fallbackTestimonials;
        setCurrentTestimonial(prev => (prev - 1 + testimonialsData.length) % testimonialsData.length);
    };

    const nextHeroMessage = useCallback(() => {
        setCurrentHeroMessage(prev => (prev + 1) % heroMessages.length);
    }, []);

    const prevHeroMessage = () => {
        setCurrentHeroMessage(prev => (prev - 1 + heroMessages.length) % heroMessages.length);
    };

    useEffect(() => {
        const testimonialTimer = setInterval(() => {
            nextTestimonial();
        }, 5000);
        return () => clearInterval(testimonialTimer);
    }, [nextTestimonial]);

    useEffect(() => {
        const heroTimer = setInterval(() => {
            nextHeroMessage();
        }, 4000);
        return () => clearInterval(heroTimer);
    }, [nextHeroMessage]);

    useEffect(() => {
        fetchFeedbacks();
        fetchBroadcastMessage();
    }, [fetchFeedbacks, fetchBroadcastMessage]);

    if (showPolicy) {
        return <PrivacyPolicy onClose={() => setShowPolicy(false)} />;
    }

    if (showAbout) {
        return (
            <AboutSection
                onBack={handleBackToLanding}
                onOpenSignup={() => openModal('signup')}
                onViewPolicy={viewPolicy}
            />
        );
    }

    if (showResources) {
        if (selectedResource) {
            return <PublicSingleResourceView resource={selectedResource} onBack={handleBackToResources} onOpenModal={openModal} onShowResources={handleShowResources} />;
        }
        return <PublicResourcesView resources={resources} loading={resourcesLoading} onResourceClick={handleResourceClick} onBack={handleBackToLanding} onOpenModal={openModal} onShowResources={handleShowResources} />;
    }

    if (showBlogs) {
        if (selectedBlog) {
            return <PublicSingleBlogView blog={selectedBlog} onBack={handleBackToBlogs} onOpenModal={openModal} onShowBlogs={handleShowBlogs} />;
        }
        return <PublicBlogsView blogs={blogs} loading={blogsLoading} onBlogClick={handleBlogClick} onBack={handleBackToLanding} onOpenModal={openModal} onShowBlogs={handleShowBlogs} />;
    }

    return (
        <div className="bg-white font-sans">
            {isModalOpen && <AuthModal initialMode={modalMode} onClose={() => setIsModalOpen(false)} invitationToken={invitationToken} onViewPolicy={viewPolicy} />}
            
            {/* Header */}
            <header className="absolute top-0 left-0 w-full z-10 py-3 sm:py-6 px-4 sm:px-8">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl px-4 sm:px-6 py-3 sm:py-4 shadow-xl border border-white/20">
                        <Logo textColorClassName="text-teal-600" />
                    </div>
                    <button
                        onClick={handleShowAbout}
                        className="px-4 py-2 rounded-full bg-white/80 backdrop-blur-md text-teal-600 font-semibold shadow hover:bg-white transition-colors duration-300"
                    >
                        About
                    </button>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                <section className="relative h-screen flex items-center justify-center text-center bg-cover bg-center pt-48 sm:pt-32 md:pt-40 lg:pt-48" style={{ backgroundImage: "url('/firstlanding.jpg')" }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60"></div>
                    <div className="relative z-10 px-4 max-w-6xl mx-auto">
                        
                        {/* Hero Message Carousel */}
                        <div className="relative max-w-6xl mx-auto mb-8">
                            <div className="overflow-hidden relative" style={{ height: '18rem' }}>
                                {heroMessages.map((message, index) => (
                                    <div 
                                        key={index}
                                        className="absolute w-full h-full transition-transform duration-500 ease-in-out flex flex-col justify-center items-center"
                                        style={{ transform: `translateX(${(index - currentHeroMessage) * 100}%)` }}
                                    >
                                        {/* H1 Title with proper mobile spacing */}
                                        <div className="w-full max-w-5xl mx-auto px-4">
                                            <h1 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-4 drop-shadow-2xl text-center">
                                                {message.title}
                                            </h1>
                                            {message.subtitle && (
                                                <p className="text-base sm:text-lg md:text-xl text-gray-100 max-w-3xl mx-auto drop-shadow-lg leading-relaxed text-center">
                                                    {message.subtitle}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Navigation Controls */}
                            <button 
                                onClick={prevHeroMessage} 
                                className="absolute top-1/2 -left-4 md:-left-16 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white/30 transition-all duration-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button 
                                onClick={nextHeroMessage} 
                                className="absolute top-1/2 -right-4 md:-right-16 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white/30 transition-all duration-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                            
                            {/* Dots Indicator */}
                            <div className="flex justify-center mt-6 space-x-2">
                                {heroMessages.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentHeroMessage(index)}
                                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                            index === currentHeroMessage 
                                                ? 'bg-white shadow-lg' 
                                                : 'bg-white/40 hover:bg-white/60'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                        
                        {/* Key Benefits */}
                        <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm text-gray-200">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-teal-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                AI-Powered Insights
                            </div>
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-teal-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Real-time Collaboration
                            </div>
                        </div>

                        {/* Call to Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12 px-4">
                            <button onClick={handleShowResources} className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold rounded-full hover:from-blue-600 hover:to-cyan-700 transition-all duration-300 hover:scale-105 text-base sm:text-lg shadow-2xl hover:shadow-3xl flex items-center justify-center">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                Resources
                            </button>
                            <button onClick={handleShowBlogs} className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-full hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 text-base sm:text-lg shadow-2xl hover:shadow-3xl flex items-center justify-center">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                </svg>
                                Blogs
                            </button>
                            <button onClick={() => openModal('login')} className="group w-full sm:w-auto px-8 py-4 border-2 border-white/80 text-white font-bold rounded-full hover:bg-white/20 transition-all duration-300 hover:scale-105 text-base sm:text-lg shadow-2xl hover:shadow-3xl flex items-center justify-center">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                                Login
                            </button>
                            <button onClick={() => openModal('signup')} className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold rounded-full hover:from-teal-600 hover:to-teal-700 transition-all duration-300 hover:scale-105 text-base sm:text-lg shadow-2xl hover:shadow-3xl flex items-center justify-center">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Join the Community
                            </button>
                            <button onClick={handleShowAbout} className="group w-full sm:w-auto px-8 py-4 border border-white/60 text-white font-bold rounded-full hover:bg-white/10 transition-all duration-300 text-base sm:text-lg shadow-2xl hover:shadow-3xl flex items-center justify-center">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 18a6 6 0 110-12 6 6 0 010 12z" />
                                </svg>
                                About PulseLoop
                            </button>
                        </div>
                        
                        {/* Trust Badge - Moved below sign in button */}
                        <div className="mt-8 mb-6">
                            <div className="inline-flex items-center bg-white/10 backdrop-blur-md text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full text-xs sm:text-sm font-semibold border border-white/20 shadow-lg">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-teal-300" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="hidden sm:inline">Trusted by 10,000+ Healthcare Professionals</span>
                                <span className="sm:hidden">10,000+ Healthcare Professionals</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Broadcast Message Section */}
                {broadcastMessage && (
                    <section className="py-12 bg-gradient-to-r from-teal-50 to-blue-50 border-b border-gray-200">
                        <div className="container mx-auto px-4">
                            <div className="max-w-4xl mx-auto">
                                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                                    <div className="p-8">
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                            {broadcastMessage.imageUrl && (
                                                <div className="flex-shrink-0">
                                                    <img 
                                                        src={broadcastMessage.imageUrl.startsWith('http') ? broadcastMessage.imageUrl : getAbsoluteUrl(broadcastMessage.imageUrl) || broadcastMessage.imageUrl} 
                                                        alt="Announcement" 
                                                        className="h-20 w-20 md:h-24 md:w-24 object-cover rounded-lg shadow-md"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                                                    {broadcastMessage.title}
                                                </h3>
                                                <p className="text-gray-600 text-lg leading-relaxed mb-4">
                                                    {broadcastMessage.message}
                                                </p>
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                    </svg>
                                                    <span>Posted {new Date(broadcastMessage.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* How it Works Section */}
                 <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
                    <div className="container mx-auto px-4 text-center">
                        <div className="mb-16">
                            <h3 className="text-4xl font-bold text-gray-800 mb-6">Get Started in 3 Simple Steps</h3>
                            <p className="text-gray-600 max-w-2xl mx-auto text-lg">Join our network and start collaborating in minutes.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                           <HowItWorksStep 
                                step="1" 
                                title="Create Your Profile" 
                                description="Sign up and join a verified network of healthcare professionals."
                                imageUrl="/landingpage1.jpg"
                            />
                           <HowItWorksStep 
                                step="2" 
                                title="Collaborate & Discuss" 
                                description="Share cases, ask questions, and contribute your expertise in a secure environment."
                                imageUrl="/landingpage2.jpg"
                            />
                           <HowItWorksStep 
                                step="3" 
                                title="Innovate & Learn" 
                                description="Access shared resources, discover AI-driven insights, and grow professionally."
                                imageUrl="/landingpage3.jpg"
                            />
                        </div>
                    </div>
                </section>

                {/* Desktop Features Section */}
                <section className="hidden sm:block py-24 bg-white">
                    <div className="container mx-auto px-4 text-center">
                        <div className="mb-16">
                            <h3 className="text-4xl font-bold text-gray-800 mb-6">The Future of Medical Teamwork</h3>
                            <p className="text-gray-600 max-w-2xl mx-auto text-lg">Pulseloopcare provides a social platform to connect with peers, access vital resources, and stay at the forefront of medical innovation.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <FeatureCard 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l4 4m0 0l4 4m-4-4v12m-4-4l-4 4m0 0l-4 4m4-4V3" /></svg>}
                                title="AI-Powered Insights"
                                description="Leverage cutting-edge AI to analyze case data, identify patterns, and receive suggestions for differential diagnoses and treatment plans."
                            />
                            <FeatureCard 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                                title="Secure Peer Network"
                                description="Connect and collaborate with a verified network of healthcare professionals. Discuss complex cases in a secure, compliant environment."
                            />
                            <FeatureCard 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h9M7 16h6M7 12h6M7 8h6" /></svg>}
                                title="Shared Resource Hub"
                                description="Access and contribute to a growing library of articles, research papers, and best-practice guidelines shared by the community."
                            />
                        </div>
                    </div>
                </section>
                

                {/* Testimonials Section */}
                <section className="py-24 bg-gray-50">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h3 className="text-4xl font-bold text-gray-800 mb-6">Hear From Our Innovators</h3>
                            <p className="text-gray-600 text-lg max-w-2xl mx-auto">Discover how medical professionals are transforming patient care with PulseLoopCare</p>
                        </div>
                         <div className="relative max-w-2xl mx-auto">
                            <div className="overflow-hidden relative" style={{ height: '16rem' }}>
                                {feedbacksLoading ? (
                                    <div className="flex justify-center items-center h-full">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                                    </div>
                                ) : (feedbacks.length > 0 ? feedbacks : fallbackTestimonials).map((testimonial, index) => (
                                     <div 
                                        key={index}
                                        className="absolute w-full h-full transition-transform duration-500 ease-in-out"
                                        style={{ transform: `translateX(${(index - currentTestimonial) * 100}%)` }}
                                     >
                                        <TestimonialCard 
                                            quote={testimonial.quote || testimonial.content}
                                            name={testimonial.name || testimonial.author?.name || 'Anonymous'}
                                            role={testimonial.role || testimonial.author?.title || 'Healthcare Professional'}
                                            avatarUrl={testimonial.avatarUrl || testimonial.author?.avatarUrl || '/avatar.jpg'}
                                        />
                                    </div>
                                ))}
                            </div>
                            <button onClick={prevTestimonial} className="absolute top-1/2 -left-4 md:-left-16 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                             <button onClick={nextTestimonial} className="absolute top-1/2 -right-4 md:-right-16 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                            
                            {/* Dots Indicator */}
                            <div className="flex justify-center mt-6 space-x-2">
                                {(feedbacks.length > 0 ? feedbacks : fallbackTestimonials).map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentTestimonial(index)}
                                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                            index === currentTestimonial 
                                                ? 'bg-teal-500 shadow-lg' 
                                                : 'bg-gray-300 hover:bg-gray-400'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Blog Section */}
                <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
                    <div className="container mx-auto px-4 text-center">
                        <div className="mb-16">
                            <h3 className="text-4xl font-bold text-gray-800 mb-6">Latest Insights from Our Community</h3>
                            <p className="text-gray-600 max-w-2xl mx-auto text-lg">Discover thought-provoking articles, case studies, and insights shared by healthcare professionals worldwide.</p>
                        </div>
                        <div className="max-w-4xl mx-auto">
                            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                                <div className="flex items-center justify-center mb-6">
                                    <svg className="w-12 h-12 text-teal-500 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h9M7 16h6M7 12h6M7 8h6" />
                                    </svg>
                                    <h4 className="text-2xl font-bold text-gray-800">Community Blog</h4>
                                </div>
                                <p className="text-gray-600 mb-8 text-lg">Explore articles written by healthcare professionals covering the latest trends, research findings, and best practices in medicine.</p>
                                <button 
                                    onClick={handleShowBlogs} 
                                    className="group px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold rounded-full hover:from-teal-600 hover:to-teal-700 transition-all duration-300 hover:scale-105 text-lg shadow-lg hover:shadow-xl flex items-center mx-auto"
                                >
                                    <svg className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h9M7 16h6M7 12h6M7 8h6" />
                                    </svg>
                                    Explore All Articles
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="bg-gradient-to-br from-teal-600 to-teal-700 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/10"></div>
                     <div className="container mx-auto px-4 py-24 text-center relative z-10">
                        <h3 className="text-5xl font-bold mb-6">Ready to Transform Patient Care?</h3>
                        <p className="text-teal-100 text-xl max-w-3xl mx-auto mb-10 leading-relaxed">Join a growing community of forward-thinking medical professionals today and be part of the future of healthcare collaboration.</p>
                        <div className="flex justify-center items-center">
                            <button onClick={() => openModal('signup')} className="px-10 py-4 bg-white text-teal-600 font-bold rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-105 text-lg shadow-lg hover:shadow-xl">Sign Up For Free</button>
                        </div>
                    </div>
                </section>

                {/* Mobile Features Section - Moved to bottom */}
                <section className="block sm:hidden py-16 bg-white">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-12">
                            <h3 className="text-3xl font-bold text-gray-800 mb-4">Key Features</h3>
                            <p className="text-gray-600 text-base">Essential tools for healthcare professionals</p>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                                <div className="flex items-center mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l4 4m0 0l4 4m-4-4v12m-4-4l-4 4m0 0l-4 4m4-4V3" />
                                        </svg>
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-800">AI-Powered Insights</h4>
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed">Leverage cutting-edge AI to analyze case data and receive diagnostic suggestions.</p>
                            </div>
                            
                            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-100">
                                <div className="flex items-center mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center mr-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-800">Secure Network</h4>
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed">Connect with verified healthcare professionals in a secure environment.</p>
                            </div>
                            
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                                <div className="flex items-center mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h9M7 16h6M7 12h6M7 8h6" />
                                        </svg>
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-800">Resource Hub</h4>
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed">Access articles, research papers, and best-practice guidelines.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-gray-800 text-white py-8">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                        {/* Contact Information */}
                        <div className="text-center md:text-left">
                            <h3 className="text-lg font-semibold text-white mb-4">Contact Us</h3>
                            <div className="space-y-2 text-gray-300">
                                <div className="flex items-center justify-center md:justify-start">
                                    <svg className="w-5 h-5 mr-2 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span>admin@pulseloopcare.com</span>
                                </div>
                            </div>
                        </div>

                        {/* Company Info */}
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-white mb-4">PulseLoopCare</h3>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                Connecting healthcare professionals through innovative collaboration tools and AI-powered insights.
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div className="text-center md:text-right">
                            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
                            <div className="space-y-2">
                                <button onClick={() => setShowPolicy(true)} className="block text-gray-300 hover:text-white transition-colors text-sm">
                                    Privacy Policy & Terms
                                </button>
                                <a href="#features" className="block text-gray-300 hover:text-white transition-colors text-sm">
                                    Features
                                </a>
                                <a href="#testimonials" className="block text-gray-300 hover:text-white transition-colors text-sm">
                                    Testimonials
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    {/* Bottom Bar */}
                    <div className="border-t border-gray-700 pt-6 text-center text-gray-400">
                        <p>&copy; {new Date().getFullYear()} PulseLoopCare. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};


const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
    <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
        <div className="text-teal-500 mb-6 inline-block group-hover:scale-110 transition-transform duration-300">{icon}</div>
        <h4 className="text-2xl font-bold text-gray-800 mb-4">{title}</h4>
        <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
);

const HowItWorksStep: React.FC<{imageUrl: string, title: string, description: string, step: string}> = ({ imageUrl, title, description, step }) => (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-3 transition-all duration-300 hover:shadow-2xl group">
        <div className="relative overflow-hidden">
            <img src={imageUrl} alt={title} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute top-6 left-6 w-14 h-14 flex items-center justify-center bg-gradient-to-br from-teal-500 to-teal-600 text-white text-2xl font-bold rounded-full shadow-lg">{step}</div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
        <div className="p-8 text-left">
            <h4 className="text-2xl font-bold text-gray-800 mb-3">{title}</h4>
            <p className="text-gray-600 leading-relaxed">{description}</p>
        </div>
    </div>
);


const TestimonialCard: React.FC<{quote: string, name: string, role: string, avatarUrl: string}> = ({ quote, name, role, avatarUrl }) => (
    <div className="bg-white h-full p-8 rounded-xl shadow-lg flex flex-col justify-center">
        <div className="text-teal-500 text-4xl mb-4">"</div>
        <p className="text-gray-600 italic mb-6 flex-grow text-lg leading-relaxed">{quote}</p>
        <div className="flex items-center">
            <img src={avatarUrl || "/avatar.jpg"} alt={name} className="w-14 h-14 rounded-full object-cover mr-4 border-2 border-teal-100"/>
            <div>
                <p className="font-bold text-gray-800 text-lg">{name}</p>
                <p className="text-sm text-teal-600 font-medium">{role}</p>
            </div>
        </div>
    </div>
);

// Public Blog Views
const PublicBlogsView: React.FC<{ blogs: Blog[], loading: boolean, onBlogClick: (blog: Blog) => void, onBack: () => void, onOpenModal: (mode: 'login' | 'signup', token?: string | null) => void, onShowBlogs: () => void }> = ({ blogs, loading, onBlogClick, onBack, onOpenModal, onShowBlogs }) => {
    const stripHtml = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    const formatDate = (dateString: string | undefined | null): string => {
        if (!dateString) return 'Date not available';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (error) {
            return 'Date not available';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-cyan-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center">
                            <button 
                                onClick={onBack}
                                className="mr-4 p-2 text-gray-600 hover:text-teal-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <button onClick={onBack} className="hover:opacity-80 transition-opacity">
                                <Logo textColorClassName="text-teal-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">Community Blog</h1>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">Insights, research, and stories from healthcare professionals around the world</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                    </div>
                ) : blogs.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">No blog posts available at the moment.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {blogs.map(blog => {
                            const plainTextContent = stripHtml(blog.content);
                            const previewContent = plainTextContent.substring(0, 150);
                            
                            return (
                                <div 
                                    key={blog.id}
                                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer group"
                                    onClick={() => onBlogClick(blog)}
                                >
                                    <div className="relative">
                                        <img 
                                            className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300" 
                                            src={blog.coverImageUrl || "/blog.jpg"} 
                                            alt={blog.title} 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-teal-600 transition-colors line-clamp-2">{blog.title}</h3>
                                        <div className="flex items-center text-sm text-gray-500 mb-4">
                                            <img 
                                                src={blog.author.avatarUrl || "/avatar.jpg"} 
                                                alt={blog.author.name} 
                                                className="w-8 h-8 rounded-full object-cover mr-3 border-2 border-white" 
                                            />
                                            <span>By <span className="font-semibold">{blog.author.name}</span></span>
                                            <span className="mx-2">&middot;</span>
                                            <span>{formatDate(blog.created_at)}</span>
                                        </div>
                                        <p className="text-gray-700 leading-relaxed text-sm">
                                            {previewContent}{plainTextContent.length > 150 ? '...' : ''}
                                        </p>
                                        <div className="mt-4 text-teal-500 font-medium group-hover:text-teal-600 transition-colors">
                                            Read Full Article &rarr;
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

const PublicSingleBlogView: React.FC<{ blog: Blog, onBack: () => void, onOpenModal: (mode: 'login' | 'signup', token?: string | null) => void, onShowBlogs: () => void }> = ({ blog, onBack, onOpenModal, onShowBlogs }) => {
    const formatDate = (dateString: string | undefined | null): string => {
        if (!dateString) return 'Date not available';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (error) {
            return 'Date not available';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-cyan-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center">
                            <button 
                                onClick={onBack}
                                className="mr-4 p-2 text-gray-600 hover:text-teal-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <button onClick={onBack} className="hover:opacity-80 transition-opacity">
                                <Logo textColorClassName="text-teal-600" />
                            </button>
                        </div>
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                            <button 
                                onClick={onShowBlogs}
                                className="px-4 sm:px-6 py-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors font-medium text-sm sm:text-base"
                            >
                                Blogs
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    <article className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="relative">
                            <img 
                                src={blog.coverImageUrl || "/blog.jpg"} 
                                alt={blog.title} 
                                className="w-full h-64 sm:h-80 object-cover"
                            />
                        </div>
                        
                        <div className="p-8">
                            <header className="mb-8">
                                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">{blog.title}</h1>
                                <div className="flex items-center text-gray-600">
                                    <img 
                                        src={blog.author.avatarUrl || "/avatar.jpg"} 
                                        alt={blog.author.name} 
                                        className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-teal-100"
                                    />
                                    <div>
                                        <p className="font-semibold text-gray-800">{blog.author.name}</p>
                                        <p className="text-sm">{formatDate(blog.created_at)}</p>
                                    </div>
                                </div>
                            </header>

                            <div 
                                className="text-lg leading-relaxed space-y-6 text-gray-800 blog-content"
                                dangerouslySetInnerHTML={{ __html: blog.content }}
                            />
                        </div>
                    </article>
                </div>
            </main>

            <style>{`
                .blog-content p {
                    margin-bottom: 1.25rem;
                }
                .blog-content ul {
                    list-style-type: disc;
                    padding-left: 2rem;
                    margin-bottom: 1.25rem;
                }
                .blog-content strong {
                    font-weight: 700;
                }
                .blog-content em {
                    font-style: italic;
                }
            `}</style>
        </div>
    );
};

const AboutSection: React.FC<{ onBack: () => void; onOpenSignup: () => void; onViewPolicy: () => void }> = ({ onBack, onOpenSignup, onViewPolicy }) => {
    const missionPoints = [
        "Foster peer support and reduce burnout through open, guided conversations.",
        "Protect privacy and uphold ethical storytelling across all roles.",
        "Turn shared experiences into insights for better workplace wellbeing.",
        "Unite healthcare professionals across disciplines to celebrate the human side of care."
    ];

    const coreValues = [
        { title: "Empathy", description: "We listen with compassion. Every story helps someone feel seen and understood." },
        { title: "Privacy", description: "Confidentiality is at our core. We protect both users and patients with care." },
        { title: "Connection", description: "Real conversations build stronger teams and healthier professionals." },
        { title: "Integrity", description: "We are transparent, ethical, and committed to earning your trust." },
        { title: "Innovation", description: "We use technology to promote emotional wellbeing and workplace resilience." },
        { title: "Collaboration", description: "Every healthcare role matters — we grow stronger together." },
        { title: "Purpose", description: "Behind every post is a mission to care, connect, and uplift." }
    ];

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-teal-50 via-white to-blue-50 text-gray-900">
            <header className="w-full py-4 sm:py-6 px-4 sm:px-8 bg-white/70 backdrop-blur border-b border-teal-100 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <button onClick={onBack} className="px-4 py-2 rounded-full border border-teal-500 text-teal-600 font-semibold hover:bg-teal-50 transition-colors">
                        Back
                    </button>
                    <Logo textColorClassName="text-teal-600" />
                    <button onClick={onOpenSignup} className="px-4 py-2 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold shadow-lg hover:from-teal-600 hover:to-teal-700 transition-colors">
                        Join
                    </button>
                </div>
            </header>

            <main className="flex-1">
                <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
                    <div className="max-w-6xl mx-auto space-y-16">
                        <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-10 lg:gap-14 items-center">
                            <div className="space-y-6">
                                <span className="inline-flex items-center text-sm font-semibold uppercase tracking-[0.3em] text-teal-600">
                                    About Pulseloop!
                                </span>
                                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
                                    Because Every Voice in Healthcare Deserves to Be Heard
                                </h1>
                                <p className="text-lg sm:text-xl leading-relaxed text-gray-600">
                                    PulseLoop is a digital community built for healthcare professionals to share stories, reflect on real experiences, and support one another in a safe, private space. We believe connection heals — and that shared stories can strengthen both individuals and the entire healthcare system.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <span className="px-4 py-2 bg-white shadow-sm rounded-full text-sm font-semibold text-teal-600 border border-teal-100">Confidential Storytelling</span>
                                    <span className="px-4 py-2 bg-white shadow-sm rounded-full text-sm font-semibold text-teal-600 border border-teal-100">Peer Support</span>
                                    <span className="px-4 py-2 bg-white shadow-sm rounded-full text-sm font-semibold text-teal-600 border border-teal-100">Resilience Building</span>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-teal-400 to-blue-400 rounded-3xl blur opacity-40"></div>
                                <div className="relative bg-white rounded-3xl border border-teal-100 shadow-xl p-8 sm:p-10 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white text-2xl">
                                            🌍
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">Our Vision</h2>
                                            <p className="text-sm text-gray-500">Trusted spaces for healthcare voices</p>
                                        </div>
                                    </div>
                                    <p className="text-base sm:text-lg leading-relaxed text-gray-600">
                                        To create a trusted space where healthcare professionals can share experiences, support one another, and build emotional resilience — transforming stories into strength, and connection into care.
                                    </p>
                                    <hr className="border-dashed border-teal-100" />
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white text-2xl">
                                            🎯
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">Our Mission</h2>
                                            <p className="text-sm text-gray-500">Express · Reflect · Connect</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3 text-left">
                                        {missionPoints.map(point => (
                                            <div key={point} className="flex items-start gap-3 text-sm sm:text-base text-gray-600">
                                                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-50 text-teal-600 text-xs font-semibold">•</span>
                                                <p className="leading-relaxed">{point}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur shadow-lg p-8">
                                <p className="text-4xl">💡</p>
                                <h3 className="text-2xl font-semibold text-gray-900 mt-4">The PulseLoop Promise</h3>
                                <p className="mt-4 text-base sm:text-lg leading-relaxed text-gray-600">
                                    We’re not just creating another platform — we’re building a community where healthcare professionals can breathe, share, and belong. Together, we nurture the wellbeing of those who care for everyone else.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-white to-teal-50 shadow-lg p-8">
                                <p className="text-4xl">🩺</p>
                                <h3 className="text-2xl font-semibold text-gray-900 mt-4">Join the Loop</h3>
                                <p className="mt-4 text-base sm:text-lg leading-relaxed text-gray-600">
                                    Start sharing. Start connecting. Start healing — together.
                                </p>
                                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={onOpenSignup}
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-full shadow-md hover:from-teal-600 hover:to-teal-700 transition-colors"
                                    >
                                        👉 [Sign Up Now]
                                    </button>
                                    <button
                                        onClick={onViewPolicy}
                                        className="flex-1 px-6 py-3 border border-teal-500 text-teal-600 font-semibold rounded-full hover:bg-teal-50 transition-colors"
                                    >
                                        [Learn More]
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-2xl font-semibold text-gray-900">💡 Core Values</h3>
                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {coreValues.map(value => (
                                    <div key={value.title} className="h-full rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow p-6">
                                        <h4 className="text-lg font-semibold text-teal-600">{value.title}</h4>
                                        <p className="mt-3 text-sm sm:text-base leading-relaxed text-gray-600">{value.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="py-8 text-center text-sm text-gray-500 border-t border-teal-100 bg-white/60 backdrop-blur">
                <p>&copy; {new Date().getFullYear()} PulseLoopCare. All rights reserved.</p>
            </footer>
        </div>
    );
};

const PublicResourcesView: React.FC<{ resources: Resource[], loading: boolean, onResourceClick: (resource: Resource) => void, onBack: () => void, onOpenModal: (mode: 'login' | 'signup', token?: string | null) => void, onShowResources: () => void }> = ({ resources, loading, onResourceClick, onBack, onOpenModal, onShowResources }) => {
    const stripHtml = (html: string | undefined): string => {
        if (!html) return '';
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    const formatDate = (dateString: string | undefined | null): string => {
        if (!dateString) return 'Date not available';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (error) {
            return 'Date not available';
        }
    };

    const ResourceIcon: React.FC<{ type: string }> = ({ type }) => {
        const iconWrapperClasses = "w-12 h-12 rounded-lg flex items-center justify-center mb-4";
        const iconClasses = "w-6 h-6 text-white";

        if (type === 'LINK' || type === 'Link') {
            return (
                <div className={`${iconWrapperClasses} bg-blue-500`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </div>
            );
        }
        
        return (
            <div className={`${iconWrapperClasses} bg-green-500`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center">
                            <button 
                                onClick={onBack}
                                className="mr-4 p-2 text-gray-600 hover:text-teal-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <button onClick={onBack} className="hover:opacity-80 transition-opacity">
                                <Logo textColorClassName="text-teal-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">Knowledge Library</h1>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">Shared resources, files, and links from healthcare professionals around the world</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                    </div>
                ) : resources.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">No resources available at the moment.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {resources.map(resource => {
                            const plainTextDescription = stripHtml(resource.description);
                            const previewDescription = plainTextDescription.substring(0, 150);
                            
                            return (
                                <div 
                                    key={resource.id}
                                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer group p-6"
                                    onClick={() => onResourceClick(resource)}
                                >
                                    <div className="flex justify-center mb-4">
                                        <ResourceIcon type={resource.type} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-teal-600 transition-colors line-clamp-2">{resource.title}</h3>
                                    <div className="flex items-center text-sm text-gray-500 mb-4">
                                        <img 
                                            src={resource.author.avatarUrl || "/avatar.jpg"} 
                                            alt={resource.author.name} 
                                            className="w-8 h-8 rounded-full object-cover mr-3 border-2 border-white" 
                                        />
                                        <span>By <span className="font-semibold">{resource.author.name}</span></span>
                                        <span className="mx-2">&middot;</span>
                                        <span>{formatDate(resource.created_at)}</span>
                                    </div>
                                    {resource.description && (
                                        <p className="text-gray-700 leading-relaxed text-sm mb-4">
                                            {previewDescription}{plainTextDescription.length > 150 ? '...' : ''}
                                        </p>
                                    )}
                                    <div className="mt-4 text-teal-500 font-medium group-hover:text-teal-600 transition-colors">
                                        View Resource &rarr;
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

const PublicSingleResourceView: React.FC<{ resource: Resource, onBack: () => void, onOpenModal: (mode: 'login' | 'signup', token?: string | null) => void, onShowResources: () => void }> = ({ resource, onBack, onOpenModal, onShowResources }) => {
    const formatDate = (dateString: string | undefined | null): string => {
        if (!dateString) return 'Date not available';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (error) {
            return 'Date not available';
        }
    };

    const ResourceIcon: React.FC<{ type: string }> = ({ type }) => {
        const iconWrapperClasses = "w-20 h-20 rounded-xl flex items-center justify-center mb-6 shadow-lg";
        const iconClasses = "w-10 h-10 text-white";

        if (type === 'LINK' || type === 'Link') {
            return (
                <div className={`${iconWrapperClasses} bg-blue-500`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </div>
            );
        }
        
        return (
            <div className={`${iconWrapperClasses} bg-green-500`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center">
                            <button 
                                onClick={onBack}
                                className="mr-4 p-2 text-gray-600 hover:text-teal-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <button onClick={onBack} className="hover:opacity-80 transition-opacity">
                                <Logo textColorClassName="text-teal-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-12">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-xl shadow-xl p-8 sm:p-12">
                        <div className="flex justify-center">
                            <ResourceIcon type={resource.type} />
                        </div>
                        
                        <h1 className="text-4xl text-center font-bold text-gray-800 mb-2">{resource.title}</h1>
                        
                        <div className="text-sm text-center text-gray-500 mb-8 border-b pb-6">
                            <span>Shared by <span className="font-semibold">{resource.author.name}</span></span>
                            <span className="mx-2">&middot;</span>
                            <span>{formatDate(resource.created_at)}</span>
                        </div>
                        
                        {resource.description && (
                             <div 
                                className="text-gray-800 mb-8 max-w-2xl mx-auto resource-content"
                                dangerouslySetInnerHTML={{ __html: resource.description }}
                            />
                        )}
                        
                        <div className="text-center">
                            {(resource.type === 'LINK' || resource.type === 'Link') && resource.content && (
                                <a href={resource.content} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg text-lg font-semibold">
                                    Open Link
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                            )}
                            {(resource.type === 'FILE' || resource.type === 'File') && resource.file_url && (
                                <a href={resource.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-md hover:shadow-lg text-lg font-semibold">
                                    Download File
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <style>{`
                .resource-content {
                    line-height: 1.8;
                }
                .resource-content p {
                    margin-bottom: 1.5rem;
                }
                .resource-content h1, .resource-content h2, .resource-content h3, .resource-content h4, .resource-content h5, .resource-content h6 {
                    font-weight: 700;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    color: #1f2937;
                }
                .resource-content ul, .resource-content ol {
                    margin-left: 1.5rem;
                    margin-bottom: 1.5rem;
                }
                .resource-content li {
                    margin-bottom: 0.5rem;
                }
                .resource-content a {
                    color: #0d9488;
                    text-decoration: underline;
                }
                .resource-content a:hover {
                    color: #0f766e;
                }
            `}</style>
        </div>
    );
};

export default LandingPage;