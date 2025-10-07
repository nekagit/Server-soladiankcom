"""
Pytest configuration and fixtures
"""
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database import get_db, Base
from models import User, Product, Order, Category, Review, Watchlist
from config import settings

# Test database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

# Create test engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
def db_session() -> Generator:
    """Create a fresh database session for each test."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    session = TestingSessionLocal()
    
    try:
        yield session
    finally:
        session.close()
        # Drop tables after test
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session) -> Generator:
    """Create a test client with database session override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()

@pytest.fixture
def sample_user(db_session):
    """Create a sample user for testing."""
    user = User(
        username="testuser",
        email="test@example.com",
        first_name="Test",
        last_name="User",
        hashed_password="hashed_password"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def sample_category(db_session):
    """Create a sample category for testing."""
    category = Category(
        name="Test Category",
        description="Test category description"
    )
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category

@pytest.fixture
def sample_product(db_session, sample_user, sample_category):
    """Create a sample product for testing."""
    product = Product(
        name="Test Product",
        description="Test product description",
        price=10.0,
        currency="SOL",
        category_id=sample_category.id,
        seller_id=sample_user.id,
        is_nft=True,
        solana_supported=True
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product

@pytest.fixture
def sample_order(db_session, sample_user, sample_product):
    """Create a sample order for testing."""
    order = Order(
        buyer_id=sample_user.id,
        product_id=sample_product.id,
        quantity=1,
        total_price=sample_product.price,
        currency="SOL",
        status="pending"
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order

@pytest.fixture
def auth_headers(sample_user):
    """Create authentication headers for testing."""
    # In a real implementation, you would generate a JWT token here
    return {"Authorization": f"Bearer mock-token-{sample_user.id}"}

