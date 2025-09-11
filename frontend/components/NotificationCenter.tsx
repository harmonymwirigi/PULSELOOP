import React, { useState, useEffect } from 'react';
import { Notification } from '../types';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount } from '../services/mockApi';
import { websocketService } from '../services/websocket';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigateToPost?: (postId: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
    isOpen, 
    onClose, 
    onNavigateToPost 
}) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        if (isOpen && user) {
            fetchNotifications();
            fetchUnreadCount();
            
            // Listen for new notifications via WebSocket
            const handleNotification = (notification: any) => {
                console.log('New notification received in center:', notification);
                // Add new notification to the top of the list
                setNotifications(prev => [notification, ...prev]);
                // Increment unread count
                setUnreadCount(prev => prev + 1);
            };
            
            websocketService.onNotification(handleNotification);
            
            // Fallback polling every 30 seconds (less frequent since we have WebSocket)
            const pollInterval = setInterval(() => {
                if (!websocketService.isConnected()) {
                    // Don't show loading spinner on background refresh
                    fetchNotifications(false);
                    fetchUnreadCount();
                }
            }, 30000);
            
            return () => {
                clearInterval(pollInterval);
                websocketService.offNotification(handleNotification);
            };
        }
    }, [isOpen, user]);

    const fetchNotifications = async (showLoading: boolean = true) => {
        if (!user) return;
        
        if (showLoading) setLoading(true);
        try {
            const response = await getNotifications(page, 20, false);
            
            if (page === 1) {
                setNotifications(response.notifications || []);
            } else {
                setNotifications(prev => [...prev, ...(response.notifications || [])]);
            }
            setHasMore(response.current_page < response.pages);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            setNotifications([]); // Set empty array on error
        } finally {
            if (showLoading) setLoading(false);
        }
    };

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

    const handleMarkAsRead = async (notification: Notification) => {
        if (notification.isRead) return;
        
        try {
            await markNotificationRead(notification.id);
            setNotifications(prev => 
                prev.map(n => 
                    n.id === notification.id ? { ...n, isRead: true } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => 
                prev.map(n => ({ ...n, isRead: true }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        handleMarkAsRead(notification);
        
        // Navigate to relevant post if available
        if (notification.data.post_id && onNavigateToPost) {
            onNavigateToPost(notification.data.post_id);
            onClose();
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'COMMENT_REPLY':
                return '💬';
            case 'POST_REACTION':
                return '👍';
            case 'MENTION':
                return '@';
            case 'EXPERT_RESPONSE':
                return '⭐';
            default:
                return '🔔';
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />
            
            <div className="absolute right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <svg className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12.828 7H4.828zM4.828 17h8l-2.586-2.586a2 2 0 00-2.828 0L4.828 17zM12 3a1 1 0 011 1v1h3a1 1 0 110 2h-1v9a2 2 0 01-2 2H7a2 2 0 01-2-2V7H4a1 1 0 110-2h3V4a1 1 0 011-1z" />
                        </svg>
                        Notifications
                        {unreadCount > 0 && (
                            <span className="ml-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                                {unreadCount}
                            </span>
                        )}
                    </h2>
                    <div className="flex items-center space-x-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors duration-200"
                            >
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div className="overflow-y-auto h-full pb-20">
                    {loading && notifications.length === 0 ? (
                        <div className="flex justify-center items-center h-32">
                            <Spinner />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                            <div className="text-4xl mb-2">🔔</div>
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {notifications.map((notification, index) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                        !notification.isRead 
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 shadow-sm' 
                                            : 'hover:shadow-sm'
                                    }`}
                                    onClick={() => handleNotificationClick(notification)}
                                    style={{
                                        animationDelay: `${index * 50}ms`,
                                        animation: 'slideInRight 0.3s ease-out'
                                    }}
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className={`text-2xl transition-transform duration-200 hover:scale-110 ${
                                            !notification.isRead ? 'animate-pulse' : ''
                                        }`}>
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-sm font-medium transition-colors duration-200 ${
                                                    !notification.isRead 
                                                        ? 'text-gray-900 dark:text-white' 
                                                        : 'text-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {notification.title}
                                                </p>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                    {formatTimeAgo(notification.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                                                {notification.message}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex-shrink-0 mt-2 animate-pulse shadow-sm" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {hasMore && (
                        <div className="p-4 text-center">
                            <button
                                onClick={() => {
                                    setPage(prev => prev + 1);
                                    fetchNotifications();
                                }}
                                disabled={loading}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                            >
                                {loading ? <Spinner size="sm" /> : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationCenter;
