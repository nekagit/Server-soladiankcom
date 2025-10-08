import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time');

// Test configuration
export let options = {
    stages: [
        { duration: '2m', target: 10 }, // Ramp up to 10 users
        { duration: '5m', target: 10 }, // Stay at 10 users
        { duration: '2m', target: 20 }, // Ramp up to 20 users
        { duration: '5m', target: 20 }, // Stay at 20 users
        { duration: '2m', target: 0 },  // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
        http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
        errors: ['rate<0.1'],              // Custom error rate must be below 10%
    },
};

// Base URL
const BASE_URL = 'http://localhost:4321';
const API_URL = 'http://localhost:8001';

// Test scenarios
export default function () {
    // Test homepage
    let response = http.get(`${BASE_URL}/`);
    check(response, {
        'homepage status is 200': (r) => r.status === 200,
        'homepage response time < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    sleep(1);

    // Test API health check
    response = http.get(`${API_URL}/health`);
    check(response, {
        'API health status is 200': (r) => r.status === 200,
        'API health response time < 1s': (r) => r.timings.duration < 1000,
    });
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    sleep(1);

    // Test product listing
    response = http.get(`${API_URL}/api/v1/products`);
    check(response, {
        'products API status is 200': (r) => r.status === 200,
        'products API response time < 1s': (r) => r.timings.duration < 1000,
    });
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    sleep(1);

    // Test user registration (simulate)
    const userData = {
        email: `test${Math.random()}@example.com`,
        password: 'testpassword123',
        username: `user${Math.random()}`,
    };

    response = http.post(`${API_URL}/api/v1/auth/register`, JSON.stringify(userData), {
        headers: { 'Content-Type': 'application/json' },
    });
    check(response, {
        'registration status is 201 or 400': (r) => r.status === 201 || r.status === 400,
        'registration response time < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(response.status >= 500);
    responseTime.add(response.timings.duration);
    sleep(2);

    // Test Solana wallet connection (mock)
    response = http.get(`${API_URL}/api/v1/solana/wallet/connect`);
    check(response, {
        'wallet connect status is 200': (r) => r.status === 200,
        'wallet connect response time < 1s': (r) => r.timings.duration < 1000,
    });
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    sleep(1);

    // Test NFT listing
    response = http.get(`${API_URL}/api/v1/nfts`);
    check(response, {
        'NFTs API status is 200': (r) => r.status === 200,
        'NFTs API response time < 1s': (r) => r.timings.duration < 1000,
    });
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    sleep(1);

    // Test search functionality
    response = http.get(`${API_URL}/api/v1/search?q=test`);
    check(response, {
        'search API status is 200': (r) => r.status === 200,
        'search API response time < 1s': (r) => r.timings.duration < 1000,
    });
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    sleep(1);
}

// Setup function (runs once at the beginning)
export function setup() {
    console.log('Starting load test for Soladia Marketplace');
    console.log(`Testing frontend: ${BASE_URL}`);
    console.log(`Testing backend: ${API_URL}`);
}

// Teardown function (runs once at the end)
export function teardown(data) {
    console.log('Load test completed');
    console.log(`Total requests: ${data.total_requests || 'N/A'}`);
    console.log(`Error rate: ${data.error_rate || 'N/A'}`);
}
