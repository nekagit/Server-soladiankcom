#!/bin/bash

# Soladia Marketplace Monitoring Setup Script
# This script sets up comprehensive monitoring for the development environment

set -e

echo "📊 Setting up Soladia Marketplace Monitoring..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Create monitoring directories
create_directories() {
    print_status "Creating monitoring directories..."
    
    mkdir -p monitoring/prometheus/data
    mkdir -p monitoring/grafana/data
    mkdir -p monitoring/grafana/provisioning/datasources
    mkdir -p monitoring/grafana/provisioning/dashboards
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/alertmanager/data
    mkdir -p monitoring/loki/data
    mkdir -p monitoring/jaeger/data
    
    print_success "Monitoring directories created"
}

# Create Prometheus configuration
setup_prometheus() {
    print_status "Setting up Prometheus configuration..."
    
    cat > monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'soladia-backend'
    static_configs:
      - targets: ['backend:8001']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'soladia-frontend'
    static_configs:
      - targets: ['frontend:4321']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
EOF

    print_success "Prometheus configuration created"
}

# Create Grafana configuration
setup_grafana() {
    print_status "Setting up Grafana configuration..."
    
    # Create datasource configuration
    cat > monitoring/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

    # Create dashboard configuration
    cat > monitoring/grafana/provisioning/dashboards/dashboards.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

    # Create basic dashboard
    cat > monitoring/grafana/dashboards/soladia-overview.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "Soladia Marketplace Overview",
    "tags": ["soladia", "marketplace"],
    "style": "dark",
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec",
            "min": 0
          }
        ]
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ],
        "yAxes": [
          {
            "label": "Seconds",
            "min": 0
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ],
        "yAxes": [
          {
            "label": "Errors/sec",
            "min": 0
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
EOF

    print_success "Grafana configuration created"
}

# Create Alertmanager configuration
setup_alertmanager() {
    print_status "Setting up Alertmanager configuration..."
    
    cat > monitoring/alertmanager/alertmanager.yml << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@soladia.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:5001/'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
EOF

    print_success "Alertmanager configuration created"
}

# Create monitoring Docker Compose
create_monitoring_compose() {
    print_status "Creating monitoring Docker Compose file..."
    
    cat > docker-compose.monitoring.yml << 'EOF'
version: '3.8'

services:
  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: soladia-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/prometheus/data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - soladia-network

  # Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: soladia-grafana
    ports:
      - "3000:3000"
    volumes:
      - ./monitoring/grafana/data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    networks:
      - soladia-network

  # Alertmanager
  alertmanager:
    image: prom/alertmanager:latest
    container_name: soladia-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - ./monitoring/alertmanager/data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - soladia-network

  # Node Exporter
  node-exporter:
    image: prom/node-exporter:latest
    container_name: soladia-node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - soladia-network

  # PostgreSQL Exporter
  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: soladia-postgres-exporter
    ports:
      - "9187:9187"
    environment:
      - DATA_SOURCE_NAME=postgresql://postgres:postgres@postgres:5432/soladia_dev?sslmode=disable
    depends_on:
      - postgres
    networks:
      - soladia-network

  # Redis Exporter
  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: soladia-redis-exporter
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=redis://redis:6379
    depends_on:
      - redis
    networks:
      - soladia-network

  # Loki (Log aggregation)
  loki:
    image: grafana/loki:latest
    container_name: soladia-loki
    ports:
      - "3100:3100"
    volumes:
      - ./monitoring/loki/data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - soladia-network

  # Jaeger (Distributed tracing)
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: soladia-jaeger
    ports:
      - "16686:16686"
      - "14268:14268"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - soladia-network

networks:
  soladia-network:
    external: true
EOF

    print_success "Monitoring Docker Compose file created"
}

# Start monitoring services
start_monitoring() {
    print_status "Starting monitoring services..."
    
    # Create network if it doesn't exist
    docker network create soladia-network 2>/dev/null || true
    
    # Start monitoring services
    docker-compose -f docker-compose.monitoring.yml up -d
    
    print_success "Monitoring services started"
}

# Display monitoring URLs
show_urls() {
    print_success "🎉 Monitoring setup completed!"
    echo ""
    echo "📊 Monitoring URLs:"
    echo "=================="
    echo "Prometheus:     http://localhost:9090"
    echo "Grafana:        http://localhost:3000 (admin/admin)"
    echo "Alertmanager:   http://localhost:9093"
    echo "Jaeger:         http://localhost:16686"
    echo "Loki:           http://localhost:3100"
    echo ""
    echo "🔧 Management Commands:"
    echo "======================"
    echo "Start monitoring:  docker-compose -f docker-compose.monitoring.yml up -d"
    echo "Stop monitoring:   docker-compose -f docker-compose.monitoring.yml down"
    echo "View logs:         docker-compose -f docker-compose.monitoring.yml logs -f"
    echo ""
    echo "📈 Next Steps:"
    echo "============="
    echo "1. Access Grafana at http://localhost:3000"
    echo "2. Login with admin/admin"
    echo "3. Import the Soladia dashboard"
    echo "4. Configure alerts as needed"
    echo "5. Set up log aggregation with Loki"
    echo ""
}

# Main function
main() {
    echo "📊 Soladia Marketplace Monitoring Setup"
    echo "======================================="
    
    check_docker
    create_directories
    setup_prometheus
    setup_grafana
    setup_alertmanager
    create_monitoring_compose
    start_monitoring
    show_urls
}

# Run main function
main "$@"
