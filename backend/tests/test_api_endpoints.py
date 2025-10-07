"""
Tests for API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock


class TestSolanaEndpoints:
    """Test Solana API endpoints"""
    
    def test_solana_health_check(self, client: TestClient):
        """Test Solana health check endpoint"""
        response = client.get("/api/solana/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert "network" in data
    
    @pytest.mark.asyncio
    async def test_get_wallet_info(self, client: TestClient):
        """Test getting wallet information"""
        with patch('solana.rpc_client.SolanaRPCClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.connect.return_value = True
            mock_instance.get_balance.return_value = 1.0
            mock_client.return_value = mock_instance
            
            response = client.get("/api/solana/wallets/mock-address/info")
            assert response.status_code == 200
            
            data = response.json()
            assert "address" in data
            assert "balance" in data
            assert data["balance"] == 1.0
    
    @pytest.mark.asyncio
    async def test_create_transaction(self, client: TestClient):
        """Test creating a transaction"""
        with patch('solana.rpc_client.SolanaRPCClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.connect.return_value = True
            mock_instance.create_transfer_transaction.return_value = {
                "transaction": "mock-transaction",
                "signature": "mock-signature"
            }
            mock_client.return_value = mock_instance
            
            transaction_data = {
                "from_address": "from-address",
                "to_address": "to-address",
                "amount": 1.0,
                "memo": "Test transaction"
            }
            
            response = client.post("/api/solana/transactions/", json=transaction_data)
            assert response.status_code == 200
            
            data = response.json()
            assert "transaction" in data
            assert "signature" in data
    
    @pytest.mark.asyncio
    async def test_verify_transaction(self, client: TestClient):
        """Test verifying a transaction"""
        with patch('solana.rpc_client.SolanaRPCClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.connect.return_value = True
            mock_instance.verify_transaction.return_value = {
                "confirmed": True,
                "success": True,
                "signature": "mock-signature"
            }
            mock_client.return_value = mock_instance
            
            response = client.get("/api/solana/transactions/mock-signature/verify")
            assert response.status_code == 200
            
            data = response.json()
            assert data["confirmed"] is True
            assert data["success"] is True


class TestUserEndpoints:
    """Test User API endpoints"""
    
    def test_create_user(self, client: TestClient):
        """Test creating a new user"""
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "password": "testpassword"
        }
        
        response = client.post("/api/users/", json=user_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
        assert "id" in data
    
    def test_get_user(self, client: TestClient, sample_user):
        """Test getting a user by ID"""
        response = client.get(f"/api/users/{sample_user.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == sample_user.id
        assert data["username"] == sample_user.username
    
    def test_get_users(self, client: TestClient, sample_user):
        """Test getting all users"""
        response = client.get("/api/users/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    def test_update_user(self, client: TestClient, sample_user):
        """Test updating a user"""
        update_data = {
            "first_name": "Updated",
            "last_name": "Name"
        }
        
        response = client.put(f"/api/users/{sample_user.id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["first_name"] == "Updated"
        assert data["last_name"] == "Name"
    
    def test_delete_user(self, client: TestClient, sample_user):
        """Test deleting a user"""
        response = client.delete(f"/api/users/{sample_user.id}")
        assert response.status_code == 200
        
        # Verify user is deleted
        response = client.get(f"/api/users/{sample_user.id}")
        assert response.status_code == 404


class TestProductEndpoints:
    """Test Product API endpoints"""
    
    def test_create_product(self, client: TestClient, sample_user, sample_category):
        """Test creating a new product"""
        product_data = {
            "name": "Test Product",
            "description": "Test product description",
            "price": 10.0,
            "currency": "SOL",
            "category_id": sample_category.id,
            "seller_id": sample_user.id,
            "is_nft": True,
            "solana_supported": True
        }
        
        response = client.post("/api/products/", json=product_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Test Product"
        assert data["price"] == 10.0
        assert data["is_nft"] is True
    
    def test_get_product(self, client: TestClient, sample_product):
        """Test getting a product by ID"""
        response = client.get(f"/api/products/{sample_product.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == sample_product.id
        assert data["name"] == sample_product.name
    
    def test_get_products(self, client: TestClient, sample_product):
        """Test getting all products"""
        response = client.get("/api/products/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    def test_get_featured_products(self, client: TestClient):
        """Test getting featured products"""
        response = client.get("/api/products/featured/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_trending_products(self, client: TestClient):
        """Test getting trending products"""
        response = client.get("/api/products/trending/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_product(self, client: TestClient, sample_product):
        """Test updating a product"""
        update_data = {
            "name": "Updated Product",
            "price": 15.0
        }
        
        response = client.put(f"/api/products/{sample_product.id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Updated Product"
        assert data["price"] == 15.0
    
    def test_delete_product(self, client: TestClient, sample_product):
        """Test deleting a product"""
        response = client.delete(f"/api/products/{sample_product.id}")
        assert response.status_code == 200
        
        # Verify product is deleted
        response = client.get(f"/api/products/{sample_product.id}")
        assert response.status_code == 404


class TestOrderEndpoints:
    """Test Order API endpoints"""
    
    def test_create_order(self, client: TestClient, sample_user, sample_product):
        """Test creating a new order"""
        order_data = {
            "buyer_id": sample_user.id,
            "product_id": sample_product.id,
            "quantity": 1,
            "total_price": sample_product.price,
            "currency": "SOL"
        }
        
        response = client.post("/api/orders/", json=order_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["buyer_id"] == sample_user.id
        assert data["product_id"] == sample_product.id
        assert data["status"] == "pending"
    
    def test_get_order(self, client: TestClient, sample_order):
        """Test getting an order by ID"""
        response = client.get(f"/api/orders/{sample_order.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == sample_order.id
        assert data["status"] == sample_order.status
    
    def test_get_orders(self, client: TestClient, sample_order):
        """Test getting all orders"""
        response = client.get("/api/orders/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    def test_update_order_status(self, client: TestClient, sample_order):
        """Test updating order status"""
        status_data = {"status": "completed"}
        
        response = client.put(f"/api/orders/{sample_order.id}/status", json=status_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "completed"


class TestCategoryEndpoints:
    """Test Category API endpoints"""
    
    def test_create_category(self, client: TestClient):
        """Test creating a new category"""
        category_data = {
            "name": "Test Category",
            "description": "Test category description"
        }
        
        response = client.post("/api/categories/", json=category_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Test Category"
        assert "id" in data
    
    def test_get_category(self, client: TestClient, sample_category):
        """Test getting a category by ID"""
        response = client.get(f"/api/categories/{sample_category.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == sample_category.id
        assert data["name"] == sample_category.name
    
    def test_get_categories(self, client: TestClient, sample_category):
        """Test getting all categories"""
        response = client.get("/api/categories/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

