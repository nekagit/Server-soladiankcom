#!/bin/bash

# Soladia Monitoring Setup Script
# This script sets up comprehensive monitoring for the Soladia marketplace

set -e  # Exit on any error

# Configuration
NAMESPACE="monitoring"
PROMETHEUS_VERSION="v2.45.0"
GRAFANA_VERSION="10.0.0"
ALERTMANAGER_VERSION="v0.25.0"
LOKI_VERSION="2.8.0"
PROMTAIL_VERSION="2.8.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if required tools are installed
    local tools=("kubectl" "helm" "git" "curl" "jq")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check if kubectl is configured
    if ! kubectl cluster-info &> /dev/null; then
        log_error "kubectl is not configured or cluster is not accessible"
        exit 1
    fi
    
    # Check if helm is initialized
    if ! helm list &> /dev/null; then
        log_warning "Helm is not initialized, initializing..."
        helm init --wait
    fi
    
    log_success "Prerequisites check passed"
}

# Create monitoring namespace
create_namespace() {
    log_info "Creating monitoring namespace..."
    
    kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Monitoring namespace created"
}

# Install Prometheus
install_prometheus() {
    log_info "Installing Prometheus..."
    
    # Add Prometheus Helm repository
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    # Create Prometheus values file
    cat > prometheus-values.yaml << EOF
server:
  persistentVolume:
    enabled: true
    size: 50Gi
  resources:
    requests:
      memory: 2Gi
      cpu: 500m
    limits:
      memory: 4Gi
      cpu: 1000m

alertmanager:
  enabled: true
  persistentVolume:
    enabled: true
    size: 10Gi
  resources:
    requests:
      memory: 512Mi
      cpu: 100m
    limits:
      memory: 1Gi
      cpu: 200m

pushgateway:
  enabled: true
  resources:
    requests:
      memory: 256Mi
      cpu: 50m
    limits:
      memory: 512Mi
      cpu: 100m

nodeExporter:
  enabled: true

kubeStateMetrics:
  enabled: true

serverFiles:
  prometheus.yml:
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    rule_files:
      - "/etc/config/alerting-rules.yml"
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
          - targets: ['soladia-backend:8000']
        metrics_path: '/metrics'
        scrape_interval: 15s
      
      - job_name: 'soladia-frontend'
        static_configs:
          - targets: ['soladia-frontend:3000']
        metrics_path: '/metrics'
        scrape_interval: 15s
      
      - job_name: 'postgres'
        static_configs:
          - targets: ['postgres:5432']
        metrics_path: '/metrics'
        scrape_interval: 30s
      
      - job_name: 'redis'
        static_configs:
          - targets: ['redis:6379']
        metrics_path: '/metrics'
        scrape_interval: 30s
      
      - job_name: 'nginx'
        static_configs:
          - targets: ['nginx:80']
        metrics_path: '/nginx_status'
        scrape_interval: 30s

extraConfigmapMounts:
  - name: alerting-rules
    mountPath: /etc/config
    configMap: alerting-rules
    readOnly: true
EOF

    # Install Prometheus
    helm upgrade --install prometheus prometheus-community/prometheus \
        --namespace "${NAMESPACE}" \
        --values prometheus-values.yaml \
        --wait --timeout=10m
    
    log_success "Prometheus installed successfully"
}

# Install Grafana
install_grafana() {
    log_info "Installing Grafana..."
    
    # Add Grafana Helm repository
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Create Grafana values file
    cat > grafana-values.yaml << EOF
adminPassword: "admin123"
persistence:
  enabled: true
  size: 10Gi

resources:
  requests:
    memory: 512Mi
    cpu: 100m
  limits:
    memory: 1Gi
    cpu: 200m

service:
  type: LoadBalancer
  port: 80

datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        url: http://prometheus-server:80
        access: proxy
        isDefault: true
        editable: true
      
      - name: Loki
        type: loki
        url: http://loki:3100
        access: proxy
        editable: true

dashboardProviders:
  dashboardproviders.yaml:
    apiVersion: 1
    providers:
      - name: 'default'
        orgId: 1
        folder: ''
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards

dashboards:
  default:
    soladia-dashboard:
      gnetId: 0
      revision: 1
      datasource: Prometheus

extraConfigmapMounts:
  - name: grafana-dashboards
    mountPath: /var/lib/grafana/dashboards
    configMap: grafana-dashboards
    readOnly: true
EOF

    # Install Grafana
    helm upgrade --install grafana grafana/grafana \
        --namespace "${NAMESPACE}" \
        --values grafana-values.yaml \
        --wait --timeout=10m
    
    log_success "Grafana installed successfully"
}

# Install Loki
install_loki() {
    log_info "Installing Loki..."
    
    # Add Grafana Helm repository (Loki is in the same repo)
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Create Loki values file
    cat > loki-values.yaml << EOF
loki:
  persistence:
    enabled: true
    size: 50Gi
  resources:
    requests:
      memory: 1Gi
      cpu: 200m
    limits:
      memory: 2Gi
      cpu: 500m

promtail:
  enabled: true
  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 512Mi
      cpu: 200m
EOF

    # Install Loki
    helm upgrade --install loki grafana/loki-stack \
        --namespace "${NAMESPACE}" \
        --values loki-values.yaml \
        --wait --timeout=10m
    
    log_success "Loki installed successfully"
}

# Create monitoring configurations
create_configurations() {
    log_info "Creating monitoring configurations..."
    
    # Create alerting rules ConfigMap
    kubectl create configmap alerting-rules \
        --from-file=alerting-rules.yml=monitoring/alerting-rules.yml \
        --namespace "${NAMESPACE}" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create Grafana dashboards ConfigMap
    kubectl create configmap grafana-dashboards \
        --from-file=soladia-dashboard.json=monitoring/grafana-dashboards.json \
        --namespace "${NAMESPACE}" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create Prometheus service monitor
    cat > prometheus-servicemonitor.yaml << EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: soladia-backend
  namespace: ${NAMESPACE}
spec:
  selector:
    matchLabels:
      app: soladia-backend
  endpoints:
  - port: metrics
    path: /metrics
    interval: 15s
EOF

    kubectl apply -f prometheus-servicemonitor.yaml
    
    # Create Prometheus service monitor for frontend
    cat > prometheus-servicemonitor-frontend.yaml << EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: soladia-frontend
  namespace: ${NAMESPACE}
spec:
  selector:
    matchLabels:
      app: soladia-frontend
  endpoints:
  - port: metrics
    path: /metrics
    interval: 15s
EOF

    kubectl apply -f prometheus-servicemonitor-frontend.yaml
    
    log_success "Monitoring configurations created"
}

# Setup monitoring for Soladia services
setup_soladia_monitoring() {
    log_info "Setting up Soladia service monitoring..."
    
    # Create monitoring annotations for services
    kubectl annotate service soladia-backend \
        prometheus.io/scrape=true \
        prometheus.io/port=8000 \
        prometheus.io/path=/metrics \
        --namespace="${NAMESPACE}" || true
    
    kubectl annotate service soladia-frontend \
        prometheus.io/scrape=true \
        prometheus.io/port=3000 \
        prometheus.io/path=/metrics \
        --namespace="${NAMESPACE}" || true
    
    # Create monitoring labels
    kubectl label service soladia-backend \
        app=soladia-backend \
        --namespace="${NAMESPACE}" || true
    
    kubectl label service soladia-frontend \
        app=soladia-frontend \
        --namespace="${NAMESPACE}" || true
    
    log_success "Soladia service monitoring configured"
}

# Create monitoring dashboards
create_dashboards() {
    log_info "Creating monitoring dashboards..."
    
    # Wait for Grafana to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=grafana -n "${NAMESPACE}" --timeout=300s
    
    # Get Grafana service URL
    local grafana_url
    grafana_url=$(kubectl get service grafana -n "${NAMESPACE}" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    if [ -z "$grafana_url" ]; then
        grafana_url="localhost:$(kubectl get service grafana -n "${NAMESPACE}" -o jsonpath='{.spec.ports[0].nodePort}')"
    fi
    
    # Import dashboards
    log_info "Importing Grafana dashboards..."
    
    # Wait for Grafana to be accessible
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "http://${grafana_url}/api/health" &> /dev/null; then
            log_success "Grafana is accessible"
            break
        else
            log_info "Waiting for Grafana to be accessible (attempt $attempt/$max_attempts)..."
            sleep 10
            ((attempt++))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Grafana is not accessible after $max_attempts attempts"
        return 1
    fi
    
    # Import dashboard
    curl -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n 'admin:admin123' | base64)" \
        -d @monitoring/grafana-dashboards.json \
        "http://${grafana_url}/api/dashboards/db" || log_warning "Failed to import dashboard"
    
    log_success "Monitoring dashboards created"
}

# Setup alerting
setup_alerting() {
    log_info "Setting up alerting..."
    
    # Create alerting configuration
    cat > alertmanager-config.yaml << EOF
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
      - url: 'http://webhook:5001/'
        send_resolved: true

  - name: 'email'
    email_configs:
      - to: 'admin@soladia.com'
        subject: 'Soladia Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
EOF

    # Create Alertmanager ConfigMap
    kubectl create configmap alertmanager-config \
        --from-file=alertmanager.yml=alertmanager-config.yaml \
        --namespace "${NAMESPACE}" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Alerting configured"
}

# Create monitoring documentation
create_documentation() {
    log_info "Creating monitoring documentation..."
    
    cat > monitoring/README.md << EOF
# Soladia Monitoring Setup

This directory contains the monitoring configuration for the Soladia marketplace.

## Components

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation
- **AlertManager**: Alert management
- **Promtail**: Log collection

## Access URLs

- Grafana: http://localhost:3000 (admin/admin123)
- Prometheus: http://localhost:9090
- AlertManager: http://localhost:9093

## Dashboards

- **System Overview**: High-level system health
- **Application Metrics**: Detailed application performance
- **Database Metrics**: Database performance and health
- **Security Metrics**: Security events and alerts
- **Business Metrics**: Business KPIs and trends

## Alerts

The monitoring system includes comprehensive alerting for:

- Service availability
- Performance degradation
- Security incidents
- Business metrics
- Infrastructure health

## Configuration

All monitoring configurations are stored in Kubernetes ConfigMaps and can be updated without restarting the services.

## Troubleshooting

1. Check pod status: \`kubectl get pods -n monitoring\`
2. Check service status: \`kubectl get svc -n monitoring\`
3. Check logs: \`kubectl logs -n monitoring -l app=prometheus\`
4. Check Grafana logs: \`kubectl logs -n monitoring -l app.kubernetes.io/name=grafana\`

## Maintenance

- Regular backup of Grafana dashboards
- Monitor disk usage for Prometheus and Loki
- Update alerting rules as needed
- Review and tune alert thresholds
EOF

    log_success "Monitoring documentation created"
}

# Main setup function
main() {
    log_info "Starting Soladia monitoring setup..."
    
    # Run setup steps
    check_prerequisites
    create_namespace
    install_prometheus
    install_grafana
    install_loki
    create_configurations
    setup_soladia_monitoring
    create_dashboards
    setup_alerting
    create_documentation
    
    log_success "Soladia monitoring setup completed successfully!"
    
    # Display access information
    log_info "Access URLs:"
    log_info "  Grafana: http://localhost:3000 (admin/admin123)"
    log_info "  Prometheus: http://localhost:9090"
    log_info "  AlertManager: http://localhost:9093"
    
    # Display next steps
    log_info "Next steps:"
    log_info "  1. Access Grafana and import additional dashboards"
    log_info "  2. Configure alerting channels (Slack, email, etc.)"
    log_info "  3. Set up log aggregation for application logs"
    log_info "  4. Configure custom metrics for business KPIs"
    log_info "  5. Set up log rotation and retention policies"
}

# Parse command line arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "cleanup")
        log_info "Cleaning up monitoring..."
        helm uninstall prometheus -n "${NAMESPACE}" || true
        helm uninstall grafana -n "${NAMESPACE}" || true
        helm uninstall loki -n "${NAMESPACE}" || true
        kubectl delete namespace "${NAMESPACE}" || true
        log_success "Monitoring cleanup completed"
        ;;
    "status")
        log_info "Checking monitoring status..."
        kubectl get pods -n "${NAMESPACE}"
        kubectl get svc -n "${NAMESPACE}"
        ;;
    *)
        echo "Usage: $0 {setup|cleanup|status}"
        echo "  setup   - Set up monitoring (default)"
        echo "  cleanup - Remove monitoring"
        echo "  status  - Check monitoring status"
        exit 1
        ;;
esac