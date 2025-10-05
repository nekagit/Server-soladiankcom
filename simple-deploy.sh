#!/bin/bash

# Simple deployment script for Soladia
echo "🚀 Starting Soladia deployment..."

# Change to project directory
cd /var/www/karaweiss/current/soladiankcom

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin master

# Rebuild and restart Docker containers
echo "🐳 Rebuilding Docker containers..."
docker compose down
docker compose build
docker compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "✅ Checking service status..."
docker compose ps

echo "🎉 Deployment completed successfully!"