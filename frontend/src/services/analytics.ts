// frontend/src/services/analytics.ts
interface AnalyticsData {
    revenue: {
        total: number;
        monthly: number;
        daily: number;
        growth: number;
    };
    sales: {
        total: number;
        completed: number;
        pending: number;
        cancelled: number;
        growth: number;
    };
    users: {
        total: number;
        active: number;
        new: number;
        growth: number;
    };
    listings: {
        total: number;
        active: number;
        sold: number;
        growth: number;
    };
    conversion: {
        rate: number;
        visitors: number;
        buyers: number;
        growth: number;
    };
}

interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string;
        borderColor?: string;
        fill?: boolean;
    }[];
}

interface TimeSeriesData {
    date: string;
    value: number;
    label?: string;
}

interface TopProduct {
    id: string;
    name: string;
    sales: number;
    revenue: number;
    growth: number;
}

interface TopSeller {
    id: string;
    name: string;
    sales: number;
    revenue: number;
    rating: number;
}

interface GeographicData {
    country: string;
    sales: number;
    revenue: number;
    users: number;
}

interface DeviceData {
    device: string;
    users: number;
    sessions: number;
    conversion: number;
}

class AnalyticsService {
    private cache: Map<string, any> = new Map();
    private isInitialized = false;

    constructor() {
        if (typeof window !== 'undefined') {
            this.initializeAnalytics();
        }
    }

    private async initializeAnalytics() {
        try {
            // Initialize analytics tracking
            this.setupEventTracking();
            this.isInitialized = true;
            console.log('Analytics Service initialized');
        } catch (error) {
            console.error('Failed to initialize Analytics Service:', error);
        }
    }

    private setupEventTracking() {
        // Track page views
        this.trackPageView();

        // Track user interactions
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.matches('button, a, [data-track]')) {
                this.trackEvent('click', {
                    element: target.tagName,
                    text: target.textContent?.trim(),
                    href: target.getAttribute('href'),
                });
            }
        });

        // Track form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target as HTMLFormElement;
            this.trackEvent('form_submit', {
                form_id: form.id,
                form_class: form.className,
            });
        });

        // Track scroll depth
        let maxScroll = 0;
        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                this.trackEvent('scroll_depth', { percent: scrollPercent });
            }
        });
    }

    public async getDashboardData(): Promise<AnalyticsData> {
        if (!this.isInitialized) {
            await this.initializeAnalytics();
        }

        const cacheKey = 'dashboard_data';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Mock analytics data - in production, this would fetch from API
            const data: AnalyticsData = {
                revenue: {
                    total: 125000.50,
                    monthly: 15000.75,
                    daily: 500.25,
                    growth: 12.5,
                },
                sales: {
                    total: 1250,
                    completed: 1180,
                    pending: 45,
                    cancelled: 25,
                    growth: 8.3,
                },
                users: {
                    total: 5600,
                    active: 1200,
                    new: 150,
                    growth: 15.2,
                },
                listings: {
                    total: 890,
                    active: 750,
                    sold: 140,
                    growth: 6.7,
                },
                conversion: {
                    rate: 3.2,
                    visitors: 45000,
                    buyers: 1440,
                    growth: 2.1,
                },
            };

            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Failed to get dashboard data:', error);
            throw error;
        }
    }

    public async getRevenueChart(days: number = 30): Promise<ChartData> {
        const cacheKey = `revenue_chart_${days}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Mock revenue chart data
            const labels = this.generateDateLabels(days);
            const revenueData = this.generateMockData(days, 1000, 5000);
            const salesData = this.generateMockData(days, 10, 50);

            const chartData: ChartData = {
                labels,
                datasets: [
                    {
                        label: 'Revenue ($)',
                        data: revenueData,
                        backgroundColor: 'rgba(230, 0, 18, 0.1)',
                        borderColor: '#E60012',
                        fill: true,
                    },
                    {
                        label: 'Sales Count',
                        data: salesData,
                        backgroundColor: 'rgba(0, 102, 204, 0.1)',
                        borderColor: '#0066CC',
                        fill: false,
                    },
                ],
            };

            this.cache.set(cacheKey, chartData);
            return chartData;
        } catch (error) {
            console.error('Failed to get revenue chart:', error);
            throw error;
        }
    }

    public async getUserGrowthChart(days: number = 30): Promise<ChartData> {
        const cacheKey = `user_growth_chart_${days}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const labels = this.generateDateLabels(days);
            const newUsers = this.generateMockData(days, 5, 25);
            const activeUsers = this.generateMockData(days, 50, 200);

            const chartData: ChartData = {
                labels,
                datasets: [
                    {
                        label: 'New Users',
                        data: newUsers,
                        backgroundColor: 'rgba(0, 166, 80, 0.1)',
                        borderColor: '#00A650',
                        fill: true,
                    },
                    {
                        label: 'Active Users',
                        data: activeUsers,
                        backgroundColor: 'rgba(255, 140, 0, 0.1)',
                        borderColor: '#FF8C00',
                        fill: false,
                    },
                ],
            };

            this.cache.set(cacheKey, chartData);
            return chartData;
        } catch (error) {
            console.error('Failed to get user growth chart:', error);
            throw error;
        }
    }

    public async getTopProducts(limit: number = 10): Promise<TopProduct[]> {
        const cacheKey = `top_products_${limit}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Mock top products data
            const products: TopProduct[] = [
                {
                    id: '1',
                    name: 'Vintage Camera Collection',
                    sales: 45,
                    revenue: 11250.00,
                    growth: 15.2,
                },
                {
                    id: '2',
                    name: 'Digital Art NFT #001',
                    sales: 38,
                    revenue: 9500.00,
                    growth: 22.1,
                },
                {
                    id: '3',
                    name: 'Professional Lens Kit',
                    sales: 32,
                    revenue: 8000.00,
                    growth: 8.7,
                },
                {
                    id: '4',
                    name: 'Smartphone Accessories',
                    sales: 28,
                    revenue: 4200.00,
                    growth: 12.3,
                },
                {
                    id: '5',
                    name: 'Vintage Collectibles',
                    sales: 25,
                    revenue: 3750.00,
                    growth: 5.9,
                },
            ];

            this.cache.set(cacheKey, products);
            return products;
        } catch (error) {
            console.error('Failed to get top products:', error);
            throw error;
        }
    }

    public async getTopSellers(limit: number = 10): Promise<TopSeller[]> {
        const cacheKey = `top_sellers_${limit}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Mock top sellers data
            const sellers: TopSeller[] = [
                {
                    id: '1',
                    name: 'PhotoGear Pro',
                    sales: 125,
                    revenue: 31250.00,
                    rating: 4.9,
                },
                {
                    id: '2',
                    name: 'Digital Art Studio',
                    sales: 98,
                    revenue: 24500.00,
                    rating: 4.8,
                },
                {
                    id: '3',
                    name: 'Vintage Finds',
                    sales: 87,
                    revenue: 21750.00,
                    rating: 4.7,
                },
                {
                    id: '4',
                    name: 'Tech Accessories',
                    sales: 76,
                    revenue: 11400.00,
                    rating: 4.6,
                },
                {
                    id: '5',
                    name: 'Artisan Crafts',
                    sales: 65,
                    revenue: 9750.00,
                    rating: 4.8,
                },
            ];

            this.cache.set(cacheKey, sellers);
            return sellers;
        } catch (error) {
            console.error('Failed to get top sellers:', error);
            throw error;
        }
    }

    public async getGeographicData(): Promise<GeographicData[]> {
        const cacheKey = 'geographic_data';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Mock geographic data
            const data: GeographicData[] = [
                { country: 'United States', sales: 450, revenue: 67500.00, users: 1200 },
                { country: 'Canada', sales: 180, revenue: 27000.00, users: 480 },
                { country: 'United Kingdom', sales: 150, revenue: 22500.00, users: 400 },
                { country: 'Germany', sales: 120, revenue: 18000.00, users: 320 },
                { country: 'Australia', sales: 95, revenue: 14250.00, users: 250 },
                { country: 'France', sales: 80, revenue: 12000.00, users: 210 },
                { country: 'Japan', sales: 70, revenue: 10500.00, users: 180 },
                { country: 'Netherlands', sales: 60, revenue: 9000.00, users: 150 },
            ];

            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Failed to get geographic data:', error);
            throw error;
        }
    }

    public async getDeviceData(): Promise<DeviceData[]> {
        const cacheKey = 'device_data';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Mock device data
            const data: DeviceData[] = [
                { device: 'Desktop', users: 2500, sessions: 4500, conversion: 4.2 },
                { device: 'Mobile', users: 1800, sessions: 3200, conversion: 2.8 },
                { device: 'Tablet', users: 300, sessions: 500, conversion: 3.5 },
            ];

            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Failed to get device data:', error);
            throw error;
        }
    }

    public async getTimeSeriesData(metric: string, days: number = 30): Promise<TimeSeriesData[]> {
        const cacheKey = `timeseries_${metric}_${days}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const data: TimeSeriesData[] = [];
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            for (let i = 0; i < days; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);

                data.push({
                    date: date.toISOString().split('T')[0],
                    value: Math.floor(Math.random() * 1000) + 100,
                    label: metric,
                });
            }

            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Failed to get time series data:', error);
            throw error;
        }
    }

    public trackEvent(eventName: string, properties: Record<string, any> = {}) {
        if (!this.isInitialized) return;

        try {
            const event = {
                name: eventName,
                properties,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,
            };

            // In production, this would send to analytics service
            console.log('Analytics Event:', event);

            // Store in localStorage for debugging
            const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
            events.push(event);
            if (events.length > 1000) {
                events.splice(0, events.length - 1000);
            }
            localStorage.setItem('analytics_events', JSON.stringify(events));
        } catch (error) {
            console.error('Failed to track event:', error);
        }
    }

    public trackPageView() {
        this.trackEvent('page_view', {
            page: window.location.pathname,
            title: document.title,
        });
    }

    public trackConversion(value: number, currency: string = 'USD') {
        this.trackEvent('conversion', {
            value,
            currency,
        });
    }

    public trackPurchase(productId: string, value: number, currency: string = 'USD') {
        this.trackEvent('purchase', {
            product_id: productId,
            value,
            currency,
        });
    }

    public trackSearch(query: string, results: number) {
        this.trackEvent('search', {
            query,
            results,
        });
    }

    public trackUserRegistration(method: string) {
        this.trackEvent('user_registration', {
            method,
        });
    }

    public trackUserLogin(method: string) {
        this.trackEvent('user_login', {
            method,
        });
    }

    private generateDateLabels(days: number): string[] {
        const labels: string[] = [];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }

        return labels;
    }

    private generateMockData(days: number, min: number, max: number): number[] {
        const data: number[] = [];
        for (let i = 0; i < days; i++) {
            data.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        return data;
    }

    public clearCache() {
        this.cache.clear();
    }

    public getCachedEvents(): any[] {
        try {
            return JSON.parse(localStorage.getItem('analytics_events') || '[]');
        } catch (error) {
            console.error('Failed to get cached events:', error);
            return [];
        }
    }

    public clearEvents() {
        localStorage.removeItem('analytics_events');
    }
}

// Create singleton instance
export const analyticsService = new AnalyticsService();

// Make analytics service globally available
if (typeof window !== 'undefined') {
    (window as any).analyticsService = analyticsService;
}
