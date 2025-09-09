import { io, Socket } from 'socket.io-client';

class WebSocketService {
    private socket: Socket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private notificationCallbacks: ((notification: any) => void)[] = [];

    connect(userId: string) {
        if (this.socket?.connected) {
            console.log('WebSocket already connected');
            return;
        }

        try {
            this.socket = io('http://localhost:5000', {
                transports: ['websocket', 'polling'],
                timeout: 20000,
                forceNew: true
            });

            this.socket.on('connect', () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.socket?.emit('join_user_room', { userId });
            });

            this.socket.on('disconnect', () => {
                console.log('WebSocket disconnected');
                this.handleReconnect(userId);
            });

            this.socket.on('connect_error', (error) => {
                console.error('WebSocket connection error:', error);
                this.handleReconnect(userId);
            });

            this.socket.on('new_notification', (notification) => {
                console.log('Received notification:', notification);
                this.notificationCallbacks.forEach(callback => callback(notification));
            });

        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            this.handleReconnect(userId);
        }
    }

    private handleReconnect(userId: string) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        setTimeout(() => {
            this.connect(userId);
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    onNotification(callback: (notification: any) => void) {
        this.notificationCallbacks.push(callback);
    }

    offNotification(callback: (notification: any) => void) {
        this.notificationCallbacks = this.notificationCallbacks.filter(cb => cb !== callback);
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export const websocketService = new WebSocketService();
