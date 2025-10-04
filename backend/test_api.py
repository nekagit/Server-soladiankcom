#!/usr/bin/env python3
"""
Simple test script to verify the FastAPI backend is working
"""
import requests
import json

def test_api():
    base_url = "http://localhost:8000"
    
    print("Testing Soladia Marketplace API...")
    
    # Test root endpoint
    try:
        response = requests.get(f"{base_url}/")
        print(f"✓ Root endpoint: {response.status_code}")
        print(f"  Response: {response.json()}")
    except Exception as e:
        print(f"✗ Root endpoint failed: {e}")
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/docs")
        print(f"✓ API docs: {response.status_code}")
    except Exception as e:
        print(f"✗ API docs failed: {e}")
    
    # Test categories endpoint
    try:
        response = requests.get(f"{base_url}/api/categories/")
        print(f"✓ Categories endpoint: {response.status_code}")
        if response.status_code == 200:
            categories = response.json()
            print(f"  Found {len(categories)} categories")
    except Exception as e:
        print(f"✗ Categories endpoint failed: {e}")
    
    # Test products endpoint
    try:
        response = requests.get(f"{base_url}/api/products/")
        print(f"✓ Products endpoint: {response.status_code}")
        if response.status_code == 200:
            products = response.json()
            print(f"  Found {len(products)} products")
    except Exception as e:
        print(f"✗ Products endpoint failed: {e}")
    
    print("\nAPI test completed!")

if __name__ == "__main__":
    test_api()
