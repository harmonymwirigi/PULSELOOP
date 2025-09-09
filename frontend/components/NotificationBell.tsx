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
                className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded-full"
                title="Notifications"
            >
                {/* Connection status indicator */}
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                
                {/* Bell icon */}
                <svg 
                    className="w-6 h-6" 
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
                
                {/* Unread count badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
};

export default NotificationBell;
