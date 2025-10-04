#!/usr/bin/env python3
"""
Test the complete Solana migration system
"""

import requests
import json
import time
import subprocess
import sys
import os

def test_api_endpoint(url, expected_status=200):
    """Test an API endpoint"""
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == expected_status:
            print(f"✅ {url} - Status: {response.status_code}")
            return True, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        else:
            print(f"❌ {url} - Status: {response.status_code}")
            return False, None
    except Exception as e:
        print(f"❌ {url} - Error: {str(e)}")
        return False, None

def test_solana_endpoints():
    """Test all Solana endpoints"""
    print("🔗 Testing Solana API Endpoints...")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    solana_url = f"{base_url}/api/solana"
    
    endpoints = [
        ("/", "API Root"),
        (f"{solana_url}/", "Solana API Root"),
        (f"{solana_url}/health", "Solana Health Check"),
        (f"{solana_url}/wallets/11111111111111111111111111111111111111111111/info", "Wallet Info"),
        (f"{solana_url}/wallets/11111111111111111111111111111111111111111111/balance", "Wallet Balance"),
        (f"{solana_url}/transactions/mock_signature_123/status", "Transaction Status"),
        (f"{solana_url}/nfts/mock_mint_123/metadata", "NFT Metadata"),
        (f"{solana_url}/tokens/mock_token_123/info", "Token Info"),
    ]
    
    results = []
    for endpoint, description in endpoints:
        print(f"\n📡 Testing {description}")
        success, data = test_api_endpoint(endpoint)
        results.append((endpoint, success))
        
        if success and data:
            if isinstance(data, dict):
                print(f"   Response: {json.dumps(data, indent=2)[:200]}...")
            else:
                print(f"   Response: {str(data)[:200]}...")
    
    return results

def test_frontend():
    """Test if frontend is accessible"""
    print("\n🌐 Testing Frontend...")
    print("=" * 50)
    
    try:
        response = requests.get("http://localhost:4321/", timeout=5)
        if response.status_code == 200:
            print("✅ Frontend is accessible at http://localhost:4321/")
            return True
        else:
            print(f"❌ Frontend returned status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend not accessible: {str(e)}")
        return False

def check_servers():
    """Check if servers are running"""
    print("🔍 Checking Server Status...")
    print("=" * 50)
    
    # Check backend
    try:
        response = requests.get("http://localhost:8000/", timeout=3)
        if response.status_code == 200:
            print("✅ Backend server is running on port 8000")
            backend_running = True
        else:
            print(f"❌ Backend server returned status: {response.status_code}")
            backend_running = False
    except Exception as e:
        print(f"❌ Backend server not accessible: {str(e)}")
        backend_running = False
    
    # Check frontend
    try:
        response = requests.get("http://localhost:4321/", timeout=3)
        if response.status_code == 200:
            print("✅ Frontend server is running on port 4321")
            frontend_running = True
        else:
            print(f"❌ Frontend server returned status: {response.status_code}")
            frontend_running = False
    except Exception as e:
        print(f"❌ Frontend server not accessible: {str(e)}")
        frontend_running = False
    
    return backend_running, frontend_running

def main():
    """Main test function"""
    print("🚀 Solana Migration System Test")
    print("=" * 60)
    print()
    
    # Check if servers are running
    backend_running, frontend_running = check_servers()
    
    if not backend_running:
        print("\n⚠️  Backend server is not running. Please start it with:")
        print("   cd backend && python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000")
        return 1
    
    if not frontend_running:
        print("\n⚠️  Frontend server is not running. Please start it with:")
        print("   npm run dev")
        return 1
    
    # Test Solana endpoints
    results = test_solana_endpoints()
    
    # Test frontend
    frontend_ok = test_frontend()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    successful_tests = sum(1 for _, success in results if success)
    total_tests = len(results)
    
    print(f"Backend API Tests: {successful_tests}/{total_tests} passed")
    print(f"Frontend Tests: {'✅ Passed' if frontend_ok else '❌ Failed'}")
    
    if successful_tests == total_tests and frontend_ok:
        print("\n🎉 All tests passed! Solana migration system is working correctly!")
        print("\n📋 Available Services:")
        print("   • Backend API: http://localhost:8000/")
        print("   • API Documentation: http://localhost:8000/docs")
        print("   • Solana API: http://localhost:8000/api/solana/")
        print("   • Frontend: http://localhost:4321/")
        return 0
    else:
        print(f"\n⚠️  {total_tests - successful_tests} tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    exit(main())
