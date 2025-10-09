"""
AI-Powered Search System for Soladia Marketplace
Natural language processing and semantic search capabilities
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
from sklearn.cluster import KMeans
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from nltk.sentiment import SentimentIntensityAnalyzer
import re
import asyncio
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from fastapi import HTTPException, Depends
from pydantic import BaseModel, Field
import redis
import logging

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet')

try:
    nltk.data.find('vader_lexicon')
except LookupError:
    nltk.download('vader_lexicon')

Base = declarative_base()

class SearchQuery(Base):
    __tablename__ = "search_queries"
    
    id = Column(Integer, primary_key=True, index=True)
    query_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Query details
    original_query = Column(Text, nullable=False)
    processed_query = Column(Text, nullable=False)
    query_type = Column(String(50), nullable=False)  # product, user, content, etc.
    intent = Column(String(50), nullable=True)  # search, filter, compare, etc.
    
    # Search results
    results_count = Column(Integer, default=0)
    search_time_ms = Column(Integer, nullable=True)
    
    # Context
    filters = Column(JSON, default=dict)
    sort_by = Column(String(50), nullable=True)
    page = Column(Integer, default=1)
    limit = Column(Integer, default=20)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

class SearchResult(Base):
    __tablename__ = "search_results"
    
    id = Column(Integer, primary_key=True, index=True)
    query_id = Column(String(36), ForeignKey("search_queries.query_id"), nullable=False)
    result_id = Column(String(100), nullable=False)  # ID of the result item
    result_type = Column(String(50), nullable=False)  # product, user, content, etc.
    
    # Ranking
    relevance_score = Column(Float, nullable=False)
    rank_position = Column(Integer, nullable=False)
    
    # Result data
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    url = Column(String(1000), nullable=True)
    metadata = Column(JSON, default=dict)
    
    # User interaction
    is_clicked = Column(Boolean, default=False)
    click_time = Column(DateTime, nullable=True)
    dwell_time = Column(Integer, nullable=True)  # seconds
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)

class SearchIndex(Base):
    __tablename__ = "search_index"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(String(100), nullable=False)
    item_type = Column(String(50), nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Indexed content
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    keywords = Column(JSON, default=list)
    categories = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    
    # Vector representation
    title_vector = Column(JSON, default=list)
    content_vector = Column(JSON, default=list)
    combined_vector = Column(JSON, default=list)
    
    # Metadata
    last_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class SearchSuggestion(Base):
    __tablename__ = "search_suggestions"
    
    id = Column(Integer, primary_key=True, index=True)
    suggestion_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Suggestion details
    query_text = Column(String(500), nullable=False)
    suggestion_type = Column(String(50), nullable=False)  # autocomplete, related, popular
    frequency = Column(Integer, default=1)
    
    # Context
    context = Column(JSON, default=dict)
    metadata = Column(JSON, default=dict)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, nullable=True)

# Pydantic models
class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    query_type: str = Field(default="product", max_length=50)
    filters: Dict[str, Any] = Field(default_factory=dict)
    sort_by: Optional[str] = Field(None, max_length=50)
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    user_id: Optional[int] = Field(None, ge=1)

class SearchResponse(BaseModel):
    query_id: str
    results: List[Dict[str, Any]]
    total_count: int
    page: int
    limit: int
    search_time_ms: int
    suggestions: List[str]
    facets: Dict[str, List[Dict[str, Any]]]

class SearchSuggestionRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    limit: int = Field(default=10, ge=1, le=50)

class AISearch:
    def __init__(self, db_session, redis_client):
        self.db = db_session
        self.redis = redis_client
        self.vectorizer = None
        self.svd = None
        self.lemmatizer = WordNetLemmatizer()
        self.sentiment_analyzer = SentimentIntensityAnalyzer()
        self.stop_words = set(stopwords.words('english'))
        self.logger = logging.getLogger(__name__)
        
        # Initialize search components
        self._initialize_search_components()
    
    def _initialize_search_components(self):
        """Initialize search components"""
        # TF-IDF vectorizer for text processing
        self.vectorizer = TfidfVectorizer(
            max_features=5000,
            stop_words='english',
            ngram_range=(1, 3),
            min_df=2,
            max_df=0.95
        )
        
        # SVD for dimensionality reduction
        self.svd = TruncatedSVD(n_components=100, random_state=42)
    
    async def search(self, request: SearchRequest, tenant_id: Optional[str] = None,
                    ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> SearchResponse:
        """Perform AI-powered search"""
        start_time = datetime.utcnow()
        
        # Process query
        processed_query = await self._process_query(request.query)
        intent = await self._detect_intent(processed_query)
        
        # Create search query record
        query_id = f"query_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        search_query = SearchQuery(
            query_id=query_id,
            tenant_id=tenant_id,
            user_id=request.user_id,
            original_query=request.query,
            processed_query=processed_query,
            query_type=request.query_type,
            intent=intent,
            filters=request.filters,
            sort_by=request.sort_by,
            page=request.page,
            limit=request.limit,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(search_query)
        self.db.commit()
        
        # Perform search
        results = await self._perform_search(
            processed_query, request.query_type, request.filters,
            request.sort_by, request.page, request.limit, tenant_id
        )
        
        # Get suggestions
        suggestions = await self._get_suggestions(processed_query, tenant_id)
        
        # Get facets
        facets = await self._get_facets(request.query_type, tenant_id)
        
        # Calculate search time
        search_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # Store results
        await self._store_search_results(query_id, results, tenant_id)
        
        # Update search query
        search_query.results_count = len(results)
        search_query.search_time_ms = search_time_ms
        self.db.commit()
        
        return SearchResponse(
            query_id=query_id,
            results=results,
            total_count=len(results),
            page=request.page,
            limit=request.limit,
            search_time_ms=search_time_ms,
            suggestions=suggestions,
            facets=facets
        )
    
    async def get_suggestions(self, request: SearchSuggestionRequest, 
                            tenant_id: Optional[str] = None) -> List[str]:
        """Get search suggestions"""
        # Process query
        processed_query = await self._process_query(request.query)
        
        # Get suggestions from database
        suggestions = self.db.query(SearchSuggestion).filter(
            SearchSuggestion.tenant_id == tenant_id,
            SearchSuggestion.is_active == True,
            SearchSuggestion.query_text.ilike(f"%{processed_query}%")
        ).order_by(SearchSuggestion.frequency.desc()).limit(request.limit).all()
        
        # Extract suggestion texts
        suggestion_texts = [s.query_text for s in suggestions]
        
        # Generate additional suggestions using ML
        ml_suggestions = await self._generate_ml_suggestions(processed_query, tenant_id)
        suggestion_texts.extend(ml_suggestions)
        
        # Remove duplicates and return
        return list(dict.fromkeys(suggestion_texts))[:request.limit]
    
    async def _process_query(self, query: str) -> str:
        """Process search query for better matching"""
        # Convert to lowercase
        query = query.lower()
        
        # Remove special characters except spaces
        query = re.sub(r'[^\w\s]', ' ', query)
        
        # Tokenize
        tokens = word_tokenize(query)
        
        # Remove stop words
        tokens = [token for token in tokens if token not in self.stop_words]
        
        # Lemmatize
        tokens = [self.lemmatizer.lemmatize(token) for token in tokens]
        
        # Join back to string
        processed_query = ' '.join(tokens)
        
        return processed_query
    
    async def _detect_intent(self, query: str) -> str:
        """Detect user intent from query"""
        # Simple intent detection based on keywords
        query_lower = query.lower()
        
        # Question words
        if any(word in query_lower for word in ['what', 'how', 'when', 'where', 'why', 'which']):
            return 'question'
        
        # Comparison words
        if any(word in query_lower for word in ['compare', 'vs', 'versus', 'difference', 'better']):
            return 'compare'
        
        # Filter words
        if any(word in query_lower for word in ['filter', 'show', 'find', 'search']):
            return 'filter'
        
        # Purchase intent
        if any(word in query_lower for word in ['buy', 'purchase', 'order', 'price', 'cost']):
            return 'purchase'
        
        # Default to search
        return 'search'
    
    async def _perform_search(self, query: str, query_type: str, filters: Dict[str, Any],
                            sort_by: Optional[str], page: int, limit: int, 
                            tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Perform the actual search"""
        # Get search index items
        index_query = self.db.query(SearchIndex).filter(
            SearchIndex.item_type == query_type,
            SearchIndex.tenant_id == tenant_id
        )
        
        # Apply filters
        if filters:
            for key, value in filters.items():
                if key == 'categories' and isinstance(value, list):
                    index_query = index_query.filter(
                        SearchIndex.categories.op('&&')(value)
                    )
                elif key == 'tags' and isinstance(value, list):
                    index_query = index_query.filter(
                        SearchIndex.tags.op('&&')(value)
                    )
        
        index_items = index_query.all()
        
        if not index_items:
            return []
        
        # Calculate relevance scores
        results = []
        for item in index_items:
            score = await self._calculate_relevance_score(query, item)
            
            if score > 0.1:  # Threshold for relevance
                results.append({
                    'id': item.item_id,
                    'title': item.title,
                    'content': item.content,
                    'relevance_score': score,
                    'categories': item.categories,
                    'tags': item.tags,
                    'metadata': {}
                })
        
        # Sort results
        if sort_by == 'relevance':
            results.sort(key=lambda x: x['relevance_score'], reverse=True)
        elif sort_by == 'title':
            results.sort(key=lambda x: x['title'])
        elif sort_by == 'date':
            results.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        else:
            # Default: sort by relevance
            results.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        # Apply pagination
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        results = results[start_idx:end_idx]
        
        return results
    
    async def _calculate_relevance_score(self, query: str, item: SearchIndex) -> float:
        """Calculate relevance score between query and item"""
        score = 0.0
        
        # Title matching (higher weight)
        title_score = await self._calculate_text_similarity(query, item.title)
        score += title_score * 0.6
        
        # Content matching
        content_score = await self._calculate_text_similarity(query, item.content)
        score += content_score * 0.3
        
        # Keyword matching
        keyword_score = await self._calculate_keyword_similarity(query, item.keywords)
        score += keyword_score * 0.1
        
        return min(score, 1.0)
    
    async def _calculate_text_similarity(self, query: str, text: str) -> float:
        """Calculate text similarity using TF-IDF"""
        if not text:
            return 0.0
        
        try:
            # Create TF-IDF vectors
            vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
            vectors = vectorizer.fit_transform([query, text])
            
            # Calculate cosine similarity
            similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
            return float(similarity)
        except:
            return 0.0
    
    async def _calculate_keyword_similarity(self, query: str, keywords: List[str]) -> float:
        """Calculate keyword similarity"""
        if not keywords:
            return 0.0
        
        query_words = set(query.lower().split())
        keyword_words = set([kw.lower() for kw in keywords])
        
        if not query_words or not keyword_words:
            return 0.0
        
        # Calculate Jaccard similarity
        intersection = len(query_words.intersection(keyword_words))
        union = len(query_words.union(keyword_words))
        
        return intersection / union if union > 0 else 0.0
    
    async def _get_suggestions(self, query: str, tenant_id: Optional[str] = None) -> List[str]:
        """Get search suggestions"""
        # Get popular queries
        popular_queries = self.db.query(SearchQuery).filter(
            SearchQuery.tenant_id == tenant_id,
            SearchQuery.processed_query.ilike(f"%{query}%")
        ).order_by(SearchQuery.created_at.desc()).limit(5).all()
        
        suggestions = [q.processed_query for q in popular_queries]
        
        # Get suggestions from database
        db_suggestions = self.db.query(SearchSuggestion).filter(
            SearchSuggestion.tenant_id == tenant_id,
            SearchSuggestion.is_active == True,
            SearchSuggestion.query_text.ilike(f"%{query}%")
        ).order_by(SearchSuggestion.frequency.desc()).limit(5).all()
        
        suggestions.extend([s.query_text for s in db_suggestions])
        
        # Remove duplicates
        return list(dict.fromkeys(suggestions))[:10]
    
    async def _get_facets(self, query_type: str, tenant_id: Optional[str] = None) -> Dict[str, List[Dict[str, Any]]]:
        """Get search facets for filtering"""
        facets = {}
        
        # Get categories
        categories = self.db.query(SearchIndex.categories).filter(
            SearchIndex.item_type == query_type,
            SearchIndex.tenant_id == tenant_id,
            SearchIndex.categories.isnot(None)
        ).all()
        
        category_counts = {}
        for cat_list in categories:
            if cat_list[0]:
                for cat in cat_list[0]:
                    category_counts[cat] = category_counts.get(cat, 0) + 1
        
        facets['categories'] = [
            {'value': cat, 'count': count}
            for cat, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
        ]
        
        # Get tags
        tags = self.db.query(SearchIndex.tags).filter(
            SearchIndex.item_type == query_type,
            SearchIndex.tenant_id == tenant_id,
            SearchIndex.tags.isnot(None)
        ).all()
        
        tag_counts = {}
        for tag_list in tags:
            if tag_list[0]:
                for tag in tag_list[0]:
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        facets['tags'] = [
            {'value': tag, 'count': count}
            for tag, count in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
        ]
        
        return facets
    
    async def _store_search_results(self, query_id: str, results: List[Dict[str, Any]], 
                                  tenant_id: Optional[str] = None):
        """Store search results in database"""
        for i, result in enumerate(results):
            search_result = SearchResult(
                query_id=query_id,
                result_id=result['id'],
                result_type='product',  # Default type
                relevance_score=result['relevance_score'],
                rank_position=i + 1,
                title=result['title'],
                description=result['content'],
                metadata=result.get('metadata', {})
            )
            self.db.add(search_result)
        
        self.db.commit()
    
    async def _generate_ml_suggestions(self, query: str, tenant_id: Optional[str] = None) -> List[str]:
        """Generate ML-based suggestions"""
        # Simple ML-based suggestion generation
        suggestions = []
        
        # Get similar queries from history
        similar_queries = self.db.query(SearchQuery).filter(
            SearchQuery.tenant_id == tenant_id,
            SearchQuery.processed_query != query
        ).order_by(SearchQuery.created_at.desc()).limit(100).all()
        
        if similar_queries:
            # Calculate similarity with historical queries
            query_similarities = []
            for hist_query in similar_queries:
                similarity = await self._calculate_text_similarity(query, hist_query.processed_query)
                if similarity > 0.3:
                    query_similarities.append((hist_query.processed_query, similarity))
            
            # Sort by similarity and take top suggestions
            query_similarities.sort(key=lambda x: x[1], reverse=True)
            suggestions = [q[0] for q in query_similarities[:5]]
        
        return suggestions
    
    async def index_item(self, item_id: str, item_type: str, title: str, content: str,
                        keywords: List[str] = None, categories: List[str] = None,
                        tags: List[str] = None, tenant_id: Optional[str] = None):
        """Index an item for search"""
        # Check if item already exists
        existing_item = self.db.query(SearchIndex).filter(
            SearchIndex.item_id == item_id,
            SearchIndex.tenant_id == tenant_id
        ).first()
        
        if existing_item:
            # Update existing item
            existing_item.title = title
            existing_item.content = content
            existing_item.keywords = keywords or []
            existing_item.categories = categories or []
            existing_item.tags = tags or []
            existing_item.last_updated = datetime.utcnow()
        else:
            # Create new item
            search_item = SearchIndex(
                item_id=item_id,
                item_type=item_type,
                tenant_id=tenant_id,
                title=title,
                content=content,
                keywords=keywords or [],
                categories=categories or [],
                tags=tags or []
            )
            self.db.add(search_item)
        
        self.db.commit()
    
    async def update_suggestion(self, query_text: str, suggestion_type: str = "autocomplete",
                              tenant_id: Optional[str] = None):
        """Update search suggestion frequency"""
        suggestion = self.db.query(SearchSuggestion).filter(
            SearchSuggestion.query_text == query_text,
            SearchSuggestion.tenant_id == tenant_id,
            SearchSuggestion.suggestion_type == suggestion_type
        ).first()
        
        if suggestion:
            suggestion.frequency += 1
            suggestion.last_used = datetime.utcnow()
        else:
            suggestion = SearchSuggestion(
                suggestion_id=f"suggestion_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                tenant_id=tenant_id,
                query_text=query_text,
                suggestion_type=suggestion_type,
                frequency=1,
                last_used=datetime.utcnow()
            )
            self.db.add(suggestion)
        
        self.db.commit()

# Dependency injection
def get_ai_search(db_session = Depends(get_db), redis_client = Depends(get_redis)) -> AISearch:
    """Get AI search service"""
    return AISearch(db_session, redis_client)


