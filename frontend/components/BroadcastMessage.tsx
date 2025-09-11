import React, { useState, useEffect } from 'react';
import { BroadcastMessage } from '../types';
import { getActiveBroadcastMessage } from '../services/mockApi';

const BroadcastMessageComponent: React.FC = () => {
    const [broadcastMessage, setBroadcastMessage] = useState<BroadcastMessage | null>(null);
    const [loading, setLoading] = useState(true);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const fetchBroadcastMessage = async () => {
            try {
                const response = await getActiveBroadcastMessage();
                setBroadcastMessage(response.message);
            } catch (error) {
                console.error('Failed to fetch broadcast message:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBroadcastMessage();
    }, []);

    if (loading) {
        return <div className="bg-blue-50 py-2 px-4 text-center text-sm text-blue-600">Loading announcement...</div>;
    }
    
    if (!broadcastMessage) {
        return null;
    }
    
    if (!isVisible) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 animate-pulse" style={{
                    backgroundImage: `radial-gradient(circle at 20% 20%, #ffffff 0%, transparent 50%), 
                                     radial-gradient(circle at 80% 80%, #ffffff 0%, transparent 50%)`,
                    backgroundSize: '100px 100px, 80px 80px'
                }}></div>
            </div>
            
            {/* Scrolling content */}
            <div className="relative z-10">
                <div className="flex items-center justify-center">
                    <div className="flex items-center space-x-4 animate-scroll">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                </svg>
                            </div>
                        </div>
                        
                        {/* Scrolling Text */}
                        <div className="flex items-center space-x-6 whitespace-nowrap">
                            <span className="text-lg font-bold">📢 {broadcastMessage.title}</span>
                            <span className="text-base">•</span>
                            <span className="text-base">{broadcastMessage.message}</span>
                            <span className="text-base">•</span>
                            <span className="text-sm opacity-80">Important Announcement</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Close Button */}
            <button
                onClick={() => setIsVisible(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all duration-200 z-20"
                title="Close announcement"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

export default BroadcastMessageComponent;
