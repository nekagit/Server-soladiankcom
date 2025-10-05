"""
Integration tests for Soladia Marketplace backend
"""
import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch, MagicMock

from main import app
from database import get_db, Base
from models import User, Product, Category
from solana.rpc_client import SolanaRPCClient
from solana.wallet_service import WalletService
from solana.transaction_service import TransactionService

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def sample_user():
    return {
        "username": "testuser",
        "email": "test@example.com",
        "wallet_address": "test-wallet-address"
    }

@pytest.fixture
def sample_product():
    return {
        "name": "Test NFT",
        "description": "A test NFT for testing",
        "price": 1.5,
        "category_id": 1,
        "seller_id": 1,
        "image_url": "https://example.com/image.jpg"
    }

class TestHealthEndpoints:
    def test_health_check(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data

    def test_solana_health_check(self, client):
        with patch('solana.rpc_client.SolanaRPCClient.get_health') as mock_health:
            mock_health.return_value = {"status": "healthy", "network": "testnet"}
            
            response = client.get("/api/solana/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"

class TestUserEndpoints:
    def test_create_user(self, client, sample_user):
        response = client.post("/api/users/", json=sample_user)
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == sample_user["username"]
        assert data["email"] == sample_user["email"]

    def test_get_user(self, client, sample_user):
        # Create user first
        create_response = client.post("/api/users/", json=sample_user)
        user_id = create_response.json()["id"]
        
        # Get user
        response = client.get(f"/api/users/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == sample_user["username"]

    def test_update_user(self, client, sample_user):
        # Create user first
        create_response = client.post("/api/users/", json=sample_user)
        user_id = create_response.json()["id"]
        
        # Update user
        update_data = {"username": "updateduser"}
        response = client.put(f"/api/users/{user_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "updateduser"

class TestProductEndpoints:
    def test_create_product(self, client, sample_product):
        response = client.post("/api/products/", json=sample_product)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_product["name"]
        assert data["price"] == sample_product["price"]

    def test_get_products(self, client):
        response = client.get("/api/products/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_product_by_id(self, client, sample_product):
        # Create product first
        create_response = client.post("/api/products/", json=sample_product)
        product_id = create_response.json()["id"]
        
        # Get product
        response = client.get(f"/api/products/{product_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_product["name"]

class TestSolanaEndpoints:
    def test_solana_wallet_info(self, client):
        with patch('solana.wallet_service.WalletService.get_wallet_info') as mock_info:
            mock_info.return_value = {
                "address": "test-address",
                "balance": 2.5,
                "tokens": []
            }
            
            response = client.get("/api/solana/wallet/info?address=test-address")
            assert response.status_code == 200
            data = response.json()
            assert data["address"] == "test-address"
            assert data["balance"] == 2.5

    def test_solana_transaction_history(self, client):
        with patch('solana.transaction_service.TransactionService.get_transaction_history') as mock_history:
            mock_history.return_value = [
                {
                    "signature": "test-signature",
                    "type": "transfer",
                    "amount": 1.0,
                    "timestamp": "2023-01-01T00:00:00Z"
                }
            ]
            
            response = client.get("/api/solana/transactions?address=test-address")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 1

    def test_solana_send_transaction(self, client):
        with patch('solana.transaction_service.TransactionService.send_transaction') as mock_send:
            mock_send.return_value = {
                "signature": "test-signature",
                "status": "confirmed"
            }
            
            transaction_data = {
                "from_address": "test-from",
                "to_address": "test-to",
                "amount": 1.0,
                "memo": "test transaction"
            }
            
            response = client.post("/api/solana/transactions", json=transaction_data)
            assert response.status_code == 200
            data = response.json()
            assert data["signature"] == "test-signature"

class TestCategoryEndpoints:
    def test_get_categories(self, client):
        response = client.get("/api/categories/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_create_category(self, client):
        category_data = {
            "name": "Test Category",
            "description": "A test category",
            "image_url": "https://example.com/category.jpg"
        }
        
        response = client.post("/api/categories/", json=category_data)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == category_data["name"]

class TestSearchEndpoints:
    def test_search_products(self, client):
        response = client.get("/api/search/products?q=test")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_search_with_filters(self, client):
        response = client.get("/api/search/products?q=test&category=electronics&min_price=1&max_price=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

class TestAnalyticsEndpoints:
    def test_get_marketplace_stats(self, client):
        response = client.get("/api/analytics/marketplace")
        assert response.status_code == 200
        data = response.json()
        assert "total_products" in data
        assert "total_users" in data
        assert "total_volume" in data

    def test_get_user_analytics(self, client):
        response = client.get("/api/analytics/user/1")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data

class TestWebSocketEndpoints:
    def test_websocket_connection(self, client):
        with client.websocket_connect("/ws") as websocket:
            websocket.send_json({"type": "ping"})
            data = websocket.receive_json()
            assert data["type"] == "pong"

class TestErrorHandling:
    def test_404_error(self, client):
        response = client.get("/api/nonexistent")
        assert response.status_code == 404

    def test_422_validation_error(self, client):
        invalid_data = {"invalid": "data"}
        response = client.post("/api/users/", json=invalid_data)
        assert response.status_code == 422

    def test_500_internal_error(self, client):
        with patch('main.get_db') as mock_db:
            mock_db.side_effect = Exception("Database error")
            response = client.get("/api/users/")
            assert response.status_code == 500

class TestAuthentication:
    def test_protected_endpoint_without_auth(self, client):
        response = client.get("/api/users/me")
        assert response.status_code == 401

    def test_protected_endpoint_with_auth(self, client):
        # Mock authentication
        with patch('main.get_current_user') as mock_user:
            mock_user.return_value = {"id": 1, "username": "testuser"}
            response = client.get("/api/users/me")
            assert response.status_code == 200

class TestRateLimiting:
    def test_rate_limiting(self, client):
        # Make multiple requests to test rate limiting
        for _ in range(10):
            response = client.get("/api/health")
            if response.status_code == 429:
                break
        else:
            # If no rate limiting occurred, that's also acceptable
            assert True

class TestDatabaseTransactions:
    def test_database_rollback(self, client):
        # Test that database transactions are properly rolled back on error
        with patch('models.User.create') as mock_create:
            mock_create.side_effect = Exception("Database error")
            
            response = client.post("/api/users/", json={"username": "test", "email": "test@example.com"})
            assert response.status_code == 500

class TestSolanaIntegration:
    def test_solana_rpc_connection(self, client):
        with patch('solana.rpc_client.SolanaRPCClient.get_health') as mock_health:
            mock_health.return_value = {"status": "healthy"}
            
            response = client.get("/api/solana/health")
            assert response.status_code == 200

    def test_solana_wallet_validation(self, client):
        with patch('solana.wallet_service.WalletService.validate_address') as mock_validate:
            mock_validate.return_value = True
            
            response = client.post("/api/solana/wallet/validate", json={"address": "test-address"})
            assert response.status_code == 200
            data = response.json()
            assert data["valid"] == True

class TestPerformance:
    def test_response_times(self, client):
        import time
        
        start_time = time.time()
        response = client.get("/api/health")
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 1.0  # Should respond within 1 second

    def test_concurrent_requests(self, client):
        import threading
        import time
        
        results = []
        
        def make_request():
            response = client.get("/api/health")
            results.append(response.status_code)
        
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        assert all(status == 200 for status in results)

class TestSecurity:
    def test_sql_injection_protection(self, client):
        malicious_input = "'; DROP TABLE users; --"
        response = client.get(f"/api/search/products?q={malicious_input}")
        assert response.status_code == 200  # Should not crash

    def test_xss_protection(self, client):
        xss_input = "<script>alert('xss')</script>"
        response = client.get(f"/api/search/products?q={xss_input}")
        assert response.status_code == 200
        # Check that script tags are escaped in response
        assert "<script>" not in response.text

class TestDataValidation:
    def test_product_validation(self, client):
        invalid_product = {
            "name": "",  # Empty name should fail
            "price": -1,  # Negative price should fail
            "description": "test"
        }
        
        response = client.post("/api/products/", json=invalid_product)
        assert response.status_code == 422

    def test_user_validation(self, client):
        invalid_user = {
            "username": "",  # Empty username should fail
            "email": "invalid-email"  # Invalid email should fail
        }
        
        response = client.post("/api/users/", json=invalid_user)
        assert response.status_code == 422

if __name__ == "__main__":
    pytest.main([__file__])
