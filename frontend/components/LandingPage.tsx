import React, { useState, useEffect, useCallback } from 'react';
import AuthModal from './AuthModal';
import PrivacyPolicy from './PrivacyPolicy';
import Logo from './Logo';

const testimonials = [
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

    const openModal = (mode: 'login' | 'signup', token: string | null = null) => {
        setModalMode(mode);
        setInvitationToken(token);
        setIsModalOpen(true);
    };
    
    const viewPolicy = () => {
        setIsModalOpen(false);
        setShowPolicy(true);
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
        setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
    }, []);

    const prevTestimonial = () => {
        setCurrentTestimonial(prev => (prev - 1 + testimonials.length) % testimonials.length);
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

    if (showPolicy) {
        return <PrivacyPolicy onClose={() => setShowPolicy(false)} />;
    }

    return (
        <div className="bg-white font-sans">
            {isModalOpen && <AuthModal initialMode={modalMode} onClose={() => setIsModalOpen(false)} invitationToken={invitationToken} onViewPolicy={viewPolicy} />}
            
            {/* Header */}
            <header className="absolute top-0 left-0 w-full z-10 py-6 px-4 sm:px-8">
                <div className="container mx-auto flex justify-center items-center">
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl px-6 py-4 shadow-xl border border-white/20">
                        <Logo textColorClassName="text-teal-600" />
                    </div>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                <section className="relative h-screen flex items-center justify-center text-center bg-cover bg-center pt-40 sm:pt-0" style={{ backgroundImage: "url('/firstlanding.jpg')" }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60"></div>
                    <div className="relative z-10 px-4 max-w-6xl mx-auto">
                        {/* Trust Badge - Positioned at top */}
                        <div className="mb-8 sm:mb-10">
                            <div className="inline-flex items-center bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-semibold border border-white/20 shadow-lg">
                                <svg className="w-5 h-5 mr-2 text-teal-300" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Trusted by 10,000+ Healthcare Professionals
                            </div>
                        </div>
                        
                        {/* Hero Message Carousel */}
                        <div className="relative max-w-6xl mx-auto mb-10">
                            <div className="overflow-hidden relative" style={{ height: '16rem' }}>
                                {heroMessages.map((message, index) => (
                                    <div 
                                        key={index}
                                        className="absolute w-full h-full transition-transform duration-500 ease-in-out flex flex-col justify-center"
                                        style={{ transform: `translateX(${(index - currentHeroMessage) * 100}%)` }}
                                    >
                                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4 drop-shadow-lg text-center">
                                            {message.title}
                                        </h1>
                                        <p className="text-base sm:text-lg md:text-xl text-gray-100 max-w-4xl mx-auto drop-shadow-md leading-relaxed text-center">
                                            {message.subtitle}
                                        </p>
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
                                HIPAA Compliant
                            </div>
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
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                            <button onClick={() => openModal('signup')} className="group px-10 py-5 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold rounded-full hover:from-teal-600 hover:to-teal-700 transition-all duration-300 hover:scale-105 text-lg shadow-2xl hover:shadow-3xl flex items-center min-w-[200px] justify-center">
                                <svg className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Join the Community
                            </button>
                            <button onClick={() => openModal('login')} className="px-10 py-5 bg-white/15 backdrop-blur-md text-white font-bold rounded-full hover:bg-white/25 transition-all duration-300 text-lg border-2 border-white/30 hover:border-white/50 flex items-center min-w-[200px] justify-center">
                                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                                Sign In
                            </button>
                        </div>
                        
                        {/* Trust Indicators */}
                        <div className="text-center">
                            <p className="text-sm text-gray-300 mb-6 font-medium">Trusted by professionals from</p>
                            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 opacity-70">
                                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                                    <span className="text-white font-semibold text-sm sm:text-base">Mayo Clinic</span>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                                    <span className="text-white font-semibold text-sm sm:text-base">Johns Hopkins</span>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                                    <span className="text-white font-semibold text-sm sm:text-base">Cleveland Clinic</span>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                                    <span className="text-white font-semibold text-sm sm:text-base">Mass General</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

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
                
                {/* Features Section */}
                <section className="py-24 bg-white">
                    <div className="container mx-auto px-4 text-center">
                        <div className="mb-16">
                            <h3 className="text-4xl font-bold text-gray-800 mb-6">The Future of Medical Teamwork</h3>
                            <p className="text-gray-600 max-w-2xl mx-auto text-lg">PulseLoopCare provides the tools you need to connect with peers, access vital resources, and stay at the forefront of medical innovation.</p>
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
                <section className="py-24 bg-white">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h3 className="text-4xl font-bold text-gray-800 mb-6">Hear From Our Innovators</h3>
                            <p className="text-gray-600 text-lg max-w-2xl mx-auto">Discover how medical professionals are transforming patient care with PulseLoopCare</p>
                        </div>
                         <div className="relative max-w-2xl mx-auto">
                            <div className="overflow-hidden relative" style={{ height: '16rem' }}>
                                {testimonials.map((testimonial, index) => (
                                     <div 
                                        key={index}
                                        className="absolute w-full h-full transition-transform duration-500 ease-in-out"
                                        style={{ transform: `translateX(${(index - currentTestimonial) * 100}%)` }}
                                     >
                                        <TestimonialCard {...testimonial} />
                                    </div>
                                ))}
                            </div>
                            <button onClick={prevTestimonial} className="absolute top-1/2 -left-4 md:-left-16 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                             <button onClick={nextTestimonial} className="absolute top-1/2 -right-4 md:-right-16 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="bg-gradient-to-br from-teal-600 to-teal-700 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/10"></div>
                     <div className="container mx-auto px-4 py-24 text-center relative z-10">
                        <h3 className="text-5xl font-bold mb-6">Ready to Transform Patient Care?</h3>
                        <p className="text-teal-100 text-xl max-w-3xl mx-auto mb-10 leading-relaxed">Join a growing community of forward-thinking medical professionals today and be part of the future of healthcare collaboration.</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button onClick={() => openModal('signup')} className="px-10 py-4 bg-white text-teal-600 font-bold rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-105 text-lg shadow-lg hover:shadow-xl">Sign Up For Free</button>
                            <button onClick={() => openModal('login')} className="px-10 py-4 bg-transparent border-2 border-white text-white font-bold rounded-full hover:bg-white hover:text-teal-600 transition-all duration-300 text-lg">Sign In</button>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-gray-800 text-white py-6">
                <div className="container mx-auto text-center text-gray-400">
                    <p className="mb-2">&copy; {new Date().getFullYear()} PulseLoopCare. All rights reserved.</p>
                    <button onClick={() => setShowPolicy(true)} className="hover:text-white underline transition-colors">Privacy Policy & Terms of Use</button>
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


export default LandingPage;