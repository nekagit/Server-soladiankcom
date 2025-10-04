# Soladia Marketplace Backend

FastAPI backend for the Soladia decentralized marketplace powered by Solana blockchain.

## Features

- **User Management**: User registration, authentication, and profile management
- **Product Management**: Product listing, search, filtering, and categorization
- **Order Processing**: Order creation, tracking, and status management
- **Review System**: Product and seller reviews with ratings
- **Watchlist**: User watchlist functionality
- **Analytics**: Sales and product analytics for sellers
- **Search**: Advanced product search with filters

## API Endpoints

### Users
- `POST /api/users/` - Create user
- `GET /api/users/{user_id}` - Get user by ID
- `GET /api/users/` - List users
- `PUT /api/users/{user_id}` - Update user
- `DELETE /api/users/{user_id}` - Delete user

### Products
- `POST /api/products/` - Create product
- `GET /api/products/{product_id}` - Get product by ID
- `GET /api/products/` - List products with filters
- `GET /api/products/featured/` - Get featured products
- `GET /api/products/trending/` - Get trending products
- `PUT /api/products/{product_id}` - Update product
- `DELETE /api/products/{product_id}` - Delete product

### Orders
- `POST /api/orders/` - Create order
- `GET /api/orders/{order_id}` - Get order by ID
- `GET /api/orders/` - List orders with filters
- `PUT /api/orders/{order_id}/status` - Update order status

### Categories
- `GET /api/categories/` - List categories
- `GET /api/categories/{category_id}` - Get category by ID

### Reviews
- `POST /api/reviews/` - Create review
- `GET /api/reviews/product/{product_id}` - Get product reviews
- `GET /api/reviews/user/{user_id}` - Get user reviews

### Watchlist
- `POST /api/watchlist/` - Add to watchlist
- `GET /api/watchlist/user/{user_id}` - Get user watchlist
- `DELETE /api/watchlist/{watchlist_id}` - Remove from watchlist

### Search
- `GET /api/search/` - Search products

### Analytics
- `GET /api/analytics/sales/{user_id}` - Get sales analytics
- `GET /api/analytics/products/{user_id}` - Get product analytics

## Database Models

- **User**: User accounts with wallet addresses
- **Product**: Product listings with metadata
- **Order**: Order transactions and status
- **Category**: Product categories
- **Review**: Product and seller reviews
- **Watchlist**: User watchlist items

## Development

### Prerequisites
- Python 3.11+
- PostgreSQL (for production)
- SQLite (for development)

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export DATABASE_URL="sqlite:///./soladia.db"
```

3. Initialize database (first time only):
```bash
python init_db.py
```

**Note:** This creates sample data (categories, users, products). Only run once or when you need to reset the database with sample data.

4. Run the application:
```bash
uvicorn main:app --reload
```

### Database Management

**Initialize database with sample data:**
```bash
cd /var/www/karaweiss/solanankcom/backend
python init_db.py
```

**Backup database:**
```bash
cp soladia.db soladia.db.backup
```

**Reset database:**
```bash
rm soladia.db
python init_db.py
```

### Docker

Build and run with Docker:
```bash
docker build -t soladia-backend .
docker run -p 8000:8000 soladia-backend
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

Run the test script:
```bash
python test_api.py
```

## Environment Variables

- `DATABASE_URL`: Database connection string
- `PYTHONPATH`: Python path for imports

## License

MIT License - see LICENSE file for details
