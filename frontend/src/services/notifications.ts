// frontend/src/services/notifications.ts
interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: Date;
    read: boolean;
    actionUrl?: string;
    actionText?: string;
}

interface NotificationOptions {
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    duration?: number; // Auto-dismiss duration in ms (0 = no auto-dismiss)
    actionUrl?: string;
    actionText?: string;
    persistent?: boolean; // Don't auto-dismiss
}

class NotificationService {
    private notifications: Notification[] = [];
    private subscribers: ((notifications: Notification[]) => void)[] = [];
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    constructor() {
        if (typeof window !== 'undefined') {
            this.loadNotificationsFromStorage();
            this.connectWebSocket();
            this.setupVisibilityChangeHandler();
        }
    }

    private loadNotificationsFromStorage() {
        try {
            const stored = localStorage.getItem('notifications');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.notifications = parsed.map((n: any) => ({
                    ...n,
                    timestamp: new Date(n.timestamp),
                }));
                this.dispatchUpdate();
            }
        } catch (error) {
            console.error('Failed to load notifications from storage:', error);
        }
    }

    private saveNotificationsToStorage() {
        try {
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('Failed to save notifications to storage:', error);
        }
    }

    private connectWebSocket() {
        const wsUrl = import.meta.env.PUBLIC_WS_URL || 'ws://localhost:8000/ws';

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.showNotification({
                    title: 'Connected',
                    message: 'Real-time notifications enabled',
                    type: 'success',
                    duration: 3000,
                });
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.attemptReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.attemptReconnect();
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.attemptReconnect();
        }
    }

    private attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

            setTimeout(() => {
                this.connectWebSocket();
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
            this.showNotification({
                title: 'Connection Lost',
                message: 'Real-time notifications unavailable',
                type: 'error',
                persistent: true,
            });
        }
    }

    private handleWebSocketMessage(data: any) {
        switch (data.type) {
            case 'notification':
                this.showNotification({
                    title: data.title,
                    message: data.message,
                    type: data.notificationType || 'info',
                    actionUrl: data.actionUrl,
                    actionText: data.actionText,
                });
                break;
            case 'order_update':
                this.showNotification({
                    title: 'Order Update',
                    message: data.message,
                    type: 'info',
                    actionUrl: `/orders/${data.orderId}`,
                    actionText: 'View Order',
                });
                break;
            case 'new_message':
                this.showNotification({
                    title: 'New Message',
                    message: data.message,
                    type: 'info',
                    actionUrl: `/messages/${data.conversationId}`,
                    actionText: 'View Message',
                });
                break;
            case 'system_alert':
                this.showNotification({
                    title: 'System Alert',
                    message: data.message,
                    type: data.severity || 'warning',
                    persistent: data.persistent || false,
                });
                break;
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }

    private setupVisibilityChangeHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Mark all notifications as read when user returns to tab
                this.markAllAsRead();
            }
        });
    }

    public showNotification(options: NotificationOptions): string {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const notification: Notification = {
            id,
            title: options.title,
            message: options.message,
            type: options.type || 'info',
            timestamp: new Date(),
            read: false,
            actionUrl: options.actionUrl,
            actionText: options.actionText,
        };

        this.notifications.unshift(notification);

        // Keep only last 100 notifications
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(0, 100);
        }

        this.saveNotificationsToStorage();
        this.dispatchUpdate();

        // Show browser notification if permission granted
        this.showBrowserNotification(notification);

        // Auto-dismiss if not persistent
        if (!options.persistent && options.duration !== 0) {
            const duration = options.duration || 5000;
            setTimeout(() => {
                this.dismissNotification(id);
            }, duration);
        }

        return id;
    }

    private async showBrowserNotification(notification: Notification) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const browserNotification = new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                tag: notification.id,
            });

            browserNotification.onclick = () => {
                window.focus();
                if (notification.actionUrl) {
                    window.location.href = notification.actionUrl;
                }
                browserNotification.close();
            };

            // Auto-close after 5 seconds
            setTimeout(() => {
                browserNotification.close();
            }, 5000);
        }
    }

    public async requestNotificationPermission(): Promise<boolean> {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    public dismissNotification(id: string) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.saveNotificationsToStorage();
        this.dispatchUpdate();
    }

    public markAsRead(id: string) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            this.saveNotificationsToStorage();
            this.dispatchUpdate();
        }
    }

    public markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveNotificationsToStorage();
        this.dispatchUpdate();
    }

    public getNotifications(): Notification[] {
        return [...this.notifications];
    }

    public getUnreadCount(): number {
        return this.notifications.filter(n => !n.read).length;
    }

    public subscribe(callback: (notifications: Notification[]) => void): () => void {
        this.subscribers.push(callback);
        // Immediately call with current notifications
        callback([...this.notifications]);

        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }

    private dispatchUpdate() {
        this.subscribers.forEach(callback => callback([...this.notifications]));
    }

    public clearAll() {
        this.notifications = [];
        this.saveNotificationsToStorage();
        this.dispatchUpdate();
    }

    public clearRead() {
        this.notifications = this.notifications.filter(n => !n.read);
        this.saveNotificationsToStorage();
        this.dispatchUpdate();
    }

    // Send notification to other users (admin function)
    public async sendNotificationToUser(userId: string, options: NotificationOptions): Promise<boolean> {
        try {
            const response = await fetch('/api/admin/notifications/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`,
                },
                body: JSON.stringify({
                    userId,
                    ...options,
                }),
            });

            return response.ok;
        } catch (error) {
            console.error('Failed to send notification to user:', error);
            return false;
        }
    }

    private getAuthToken(): string | null {
        const authManager = (window as any).authManager;
        return authManager ? authManager.getToken() : null;
    }

    public disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Make notification service globally available
if (typeof window !== 'undefined') {
    (window as any).notificationService = notificationService;
}