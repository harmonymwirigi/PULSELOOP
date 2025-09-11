import React, { useState, useEffect } from 'react';
import { getUnreadCount } from '../services/mockApi';
import { websocketService } from '../services/websocket';
import { useAuth } from '../contexts/AuthContext';

interface NotificationBellProps {
    onOpenNotifications: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onOpenNotifications }) => {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (user) {
            // Fetch initial unread count
            fetchUnreadCount();
            
            // Connect to WebSocket for real-time notifications
            websocketService.connect(user.id);
            setIsConnected(websocketService.isConnected());
            
            // Listen for new notifications via WebSocket
            const handleNotification = (notification: any) => {
                console.log('New notification received:', notification);
                // Increment unread count when new notification arrives
                setUnreadCount(prev => prev + 1);
            };
            
            websocketService.onNotification(handleNotification);
            
            // Fallback polling every 30 seconds (less frequent since we have WebSocket)
            const pollInterval = setInterval(() => {
                if (!websocketService.isConnected()) {
                    fetchUnreadCount();
                }
            }, 30000);
            
            return () => {
                clearInterval(pollInterval);
                websocketService.offNotification(handleNotification);
            };
        }
    }, [user]);

    const fetchUnreadCount = async () => {
        if (!user) return;
        
        try {
            const response = await getUnreadCount();
            setUnreadCount(response.unread_count || 0);
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
            setUnreadCount(0); // Set to 0 on error
        }
    };

    if (!user) return null;

    return (
        <div className="relative">
            <button
                onClick={onOpenNotifications}
                className="relative p-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded-full transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 group"
                title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                {/* Connection status indicator */}
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full transition-all duration-300 ${
                    isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`} title={isConnected ? 'Connected' : 'Disconnected'} />
                
                {/* Bell icon with animation */}
                <svg 
                    className={`w-6 h-6 transition-all duration-200 ${
                        unreadCount > 0 ? 'animate-bounce text-red-500' : 'group-hover:scale-110'
                    }`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12.828 7H4.828zM4.828 17h8l-2.586-2.586a2 2 0 00-2.828 0L4.828 17zM12 3a1 1 0 011 1v1h3a1 1 0 110 2h-1v9a2 2 0 01-2 2H7a2 2 0 01-2-2V7H4a1 1 0 110-2h3V4a1 1 0 011-1z" 
                    />
                </svg>
                
                {/* Unread count badge with enhanced styling */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold shadow-lg animate-pulse border-2 border-white dark:border-gray-800">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
                
                {/* Ripple effect on click */}
                <div className="absolute inset-0 rounded-full bg-teal-500 opacity-0 group-active:opacity-20 transition-opacity duration-150" />
            </button>
        </div>
    );
};

export default NotificationBell;
