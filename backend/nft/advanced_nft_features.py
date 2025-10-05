"""
Advanced NFT Features for Soladia
Enhanced NFT marketplace with advanced features like minting, IPFS integration, and metadata validation
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import json
import uuid
import hashlib
import aiohttp
import ipfshttpclient
from PIL import Image
import requests
from solana.rpc.async_api import AsyncClient
from solana.publickey import PublicKey
from solana.keypair import Keypair
from solana.transaction import Transaction
from solana.system_program import create_account, CreateAccountParams
from solana.sysvar import SYSVAR_RENT_PUBKEY

logger = logging.getLogger(__name__)

class NFTStatus(Enum):
    DRAFT = "draft"
    MINTING = "minting"
    MINTED = "minted"
    LISTED = "listed"
    SOLD = "sold"
    BURNED = "burned"

class CollectionType(Enum):
    GENERATIVE = "generative"
    CURATED = "curated"
    COMMUNITY = "community"
    ARTIST = "artist"

@dataclass
class NFTMetadata:
    """NFT metadata structure"""
    name: str
    description: str
    image: str
    external_url: Optional[str]
    attributes: List[Dict[str, Any]]
    properties: Dict[str, Any]
    animation_url: Optional[str]
    background_color: Optional[str]
    youtube_url: Optional[str]

@dataclass
class NFTCollection:
    """NFT collection data structure"""
    collection_id: str
    name: str
    description: str
    image: str
    external_url: Optional[str]
    collection_type: CollectionType
    creator: str
    total_supply: int
    minted_count: int
    floor_price: float
    volume_24h: float
    volume_7d: float
    holders_count: int
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any]

@dataclass
class NFT:
    """NFT data structure"""
    nft_id: str
    collection_id: str
    token_id: str
    name: str
    description: str
    image: str
    metadata: NFTMetadata
    owner: str
    creator: str
    status: NFTStatus
    price: Optional[float]
    last_sale_price: Optional[float]
    rarity_score: float
    popularity_score: float
    created_at: datetime
    updated_at: datetime
    attributes: List[Dict[str, Any]]

class AdvancedNFTManager:
    """Advanced NFT management system"""
    
    def __init__(
        self,
        rpc_client: AsyncClient,
        ipfs_client: ipfshttpclient.Client,
        program_id: str
    ):
        self.rpc_client = rpc_client
        self.ipfs_client = ipfs_client
        self.program_id = PublicKey(program_id)
        self.nft_collections: Dict[str, NFTCollection] = {}
        self.nfts: Dict[str, NFT] = {}
        self.metadata_cache: Dict[str, Dict[str, Any]] = {}
        
    async def create_collection(
        self,
        name: str,
        description: str,
        image_url: str,
        creator: str,
        collection_type: CollectionType,
        total_supply: int,
        metadata: Dict[str, Any]
    ) -> str:
        """Create a new NFT collection"""
        try:
            collection_id = str(uuid.uuid4())
            
            # Upload collection metadata to IPFS
            collection_metadata = {
                "name": name,
                "description": description,
                "image": image_url,
                "external_url": metadata.get("external_url"),
                "attributes": metadata.get("attributes", []),
                "properties": metadata.get("properties", {}),
                "collection_type": collection_type.value,
                "total_supply": total_supply,
                "creator": creator,
                "created_at": datetime.now().isoformat()
            }
            
            # Upload to IPFS
            ipfs_hash = await self._upload_to_ipfs(collection_metadata)
            
            # Create collection object
            collection = NFTCollection(
                collection_id=collection_id,
                name=name,
                description=description,
                image=image_url,
                external_url=metadata.get("external_url"),
                collection_type=collection_type,
                creator=creator,
                total_supply=total_supply,
                minted_count=0,
                floor_price=0.0,
                volume_24h=0.0,
                volume_7d=0.0,
                holders_count=0,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                metadata={
                    "ipfs_hash": ipfs_hash,
                    **metadata
                }
            )
            
            # Store collection
            self.nft_collections[collection_id] = collection
            
            logger.info(f"Created NFT collection {collection_id}")
            return collection_id
            
        except Exception as e:
            logger.error(f"Failed to create collection: {e}")
            raise
    
    async def mint_nft(
        self,
        collection_id: str,
        name: str,
        description: str,
        image_url: str,
        attributes: List[Dict[str, Any]],
        creator: str,
        owner: str
    ) -> Tuple[str, str]:
        """Mint a new NFT"""
        try:
            if collection_id not in self.nft_collections:
                raise ValueError(f"Collection {collection_id} not found")
            
            collection = self.nft_collections[collection_id]
            
            # Check if collection is full
            if collection.minted_count >= collection.total_supply:
                raise ValueError("Collection is full")
            
            # Generate token ID
            token_id = f"{collection_id}_{collection.minted_count + 1}"
            nft_id = str(uuid.uuid4())
            
            # Create NFT metadata
            nft_metadata = NFTMetadata(
                name=name,
                description=description,
                image=image_url,
                external_url=None,
                attributes=attributes,
                properties={},
                animation_url=None,
                background_color=None,
                youtube_url=None
            )
            
            # Upload metadata to IPFS
            metadata_dict = asdict(nft_metadata)
            ipfs_hash = await self._upload_to_ipfs(metadata_dict)
            
            # Create NFT object
            nft = NFT(
                nft_id=nft_id,
                collection_id=collection_id,
                token_id=token_id,
                name=name,
                description=description,
                image=image_url,
                metadata=nft_metadata,
                owner=owner,
                creator=creator,
                status=NFTStatus.MINTING,
                price=None,
                last_sale_price=None,
                rarity_score=0.0,
                popularity_score=0.0,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                attributes=attributes
            )
            
            # Store NFT
            self.nfts[nft_id] = nft
            
            # Update collection
            collection.minted_count += 1
            collection.updated_at = datetime.now()
            
            # Calculate rarity score
            rarity_score = await self._calculate_rarity_score(collection_id, attributes)
            nft.rarity_score = rarity_score
            
            # Update NFT status
            nft.status = NFTStatus.MINTED
            
            logger.info(f"Minted NFT {nft_id} in collection {collection_id}")
            return nft_id, token_id
            
        except Exception as e:
            logger.error(f"Failed to mint NFT: {e}")
            raise
    
    async def list_nft(
        self,
        nft_id: str,
        price: float,
        seller: str
    ) -> bool:
        """List an NFT for sale"""
        try:
            if nft_id not in self.nfts:
                raise ValueError(f"NFT {nft_id} not found")
            
            nft = self.nfts[nft_id]
            
            # Check ownership
            if nft.owner != seller:
                raise ValueError("Only the owner can list the NFT")
            
            # Update NFT
            nft.price = price
            nft.status = NFTStatus.LISTED
            nft.updated_at = datetime.now()
            
            # Update collection floor price
            collection = self.nft_collections[nft.collection_id]
            if collection.floor_price == 0.0 or price < collection.floor_price:
                collection.floor_price = price
            
            logger.info(f"Listed NFT {nft_id} for {price} SOL")
            return True
            
        except Exception as e:
            logger.error(f"Failed to list NFT: {e}")
            return False
    
    async def buy_nft(
        self,
        nft_id: str,
        buyer: str,
        price: float
    ) -> bool:
        """Buy an NFT"""
        try:
            if nft_id not in self.nfts:
                raise ValueError(f"NFT {nft_id} not found")
            
            nft = self.nfts[nft_id]
            
            # Check if NFT is listed
            if nft.status != NFTStatus.LISTED:
                raise ValueError("NFT is not listed for sale")
            
            # Check price
            if nft.price != price:
                raise ValueError("Price mismatch")
            
            # Update NFT
            nft.owner = buyer
            nft.last_sale_price = price
            nft.price = None
            nft.status = NFTStatus.SOLD
            nft.updated_at = datetime.now()
            
            # Update collection stats
            collection = self.nft_collections[nft.collection_id]
            collection.volume_24h += price
            collection.volume_7d += price
            
            logger.info(f"Sold NFT {nft_id} to {buyer} for {price} SOL")
            return True
            
        except Exception as e:
            logger.error(f"Failed to buy NFT: {e}")
            return False
    
    async def get_nft_details(self, nft_id: str) -> Optional[NFT]:
        """Get detailed NFT information"""
        try:
            if nft_id not in self.nfts:
                return None
            
            nft = self.nfts[nft_id]
            
            # Update popularity score
            nft.popularity_score = await self._calculate_popularity_score(nft_id)
            
            return nft
            
        except Exception as e:
            logger.error(f"Failed to get NFT details: {e}")
            return None
    
    async def get_collection_details(self, collection_id: str) -> Optional[NFTCollection]:
        """Get detailed collection information"""
        try:
            if collection_id not in self.nft_collections:
                return None
            
            collection = self.nft_collections[collection_id]
            
            # Update collection stats
            await self._update_collection_stats(collection_id)
            
            return collection
            
        except Exception as e:
            logger.error(f"Failed to get collection details: {e}")
            return None
    
    async def search_nfts(
        self,
        query: str,
        collection_id: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        attributes: Optional[Dict[str, Any]] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 20,
        offset: int = 0
    ) -> List[NFT]:
        """Search NFTs with filters"""
        try:
            results = []
            
            for nft in self.nfts.values():
                # Apply filters
                if collection_id and nft.collection_id != collection_id:
                    continue
                
                if min_price and (nft.price is None or nft.price < min_price):
                    continue
                
                if max_price and (nft.price is None or nft.price > max_price):
                    continue
                
                if attributes:
                    nft_attributes = {attr["trait_type"]: attr["value"] for attr in nft.attributes}
                    if not all(nft_attributes.get(k) == v for k, v in attributes.items()):
                        continue
                
                # Text search
                if query:
                    query_lower = query.lower()
                    if not any(query_lower in str(value).lower() for value in [
                        nft.name, nft.description, nft.creator, nft.owner
                    ]):
                        continue
                
                results.append(nft)
            
            # Sort results
            if sort_by == "price":
                results.sort(key=lambda x: x.price or 0, reverse=(sort_order == "desc"))
            elif sort_by == "rarity":
                results.sort(key=lambda x: x.rarity_score, reverse=(sort_order == "desc"))
            elif sort_by == "popularity":
                results.sort(key=lambda x: x.popularity_score, reverse=(sort_order == "desc"))
            else:  # created_at
                results.sort(key=lambda x: x.created_at, reverse=(sort_order == "desc"))
            
            # Apply pagination
            return results[offset:offset + limit]
            
        except Exception as e:
            logger.error(f"Failed to search NFTs: {e}")
            return []
    
    async def get_trending_nfts(self, limit: int = 10) -> List[NFT]:
        """Get trending NFTs"""
        try:
            # Calculate trending score based on recent activity
            trending_nfts = []
            
            for nft in self.nfts.values():
                # Calculate trending score
                trending_score = await self._calculate_trending_score(nft)
                
                trending_nfts.append((nft, trending_score))
            
            # Sort by trending score
            trending_nfts.sort(key=lambda x: x[1], reverse=True)
            
            # Return top trending NFTs
            return [nft for nft, score in trending_nfts[:limit]]
            
        except Exception as e:
            logger.error(f"Failed to get trending NFTs: {e}")
            return []
    
    async def get_rarity_ranking(self, collection_id: str) -> List[NFT]:
        """Get rarity ranking for a collection"""
        try:
            if collection_id not in self.nft_collections:
                return []
            
            # Get all NFTs in collection
            collection_nfts = [
                nft for nft in self.nfts.values()
                if nft.collection_id == collection_id
            ]
            
            # Sort by rarity score
            collection_nfts.sort(key=lambda x: x.rarity_score, reverse=True)
            
            return collection_nfts
            
        except Exception as e:
            logger.error(f"Failed to get rarity ranking: {e}")
            return []
    
    async def _upload_to_ipfs(self, data: Dict[str, Any]) -> str:
        """Upload data to IPFS"""
        try:
            # Convert data to JSON
            json_data = json.dumps(data, indent=2)
            
            # Upload to IPFS
            result = self.ipfs_client.add_str(json_data)
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to upload to IPFS: {e}")
            raise
    
    async def _calculate_rarity_score(
        self,
        collection_id: str,
        attributes: List[Dict[str, Any]]
    ) -> float:
        """Calculate rarity score for NFT attributes"""
        try:
            if collection_id not in self.nft_collections:
                return 0.0
            
            collection = self.nft_collections[collection_id]
            
            # Get all NFTs in collection
            collection_nfts = [
                nft for nft in self.nfts.values()
                if nft.collection_id == collection_id
            ]
            
            # Count attribute frequencies
            attribute_counts = {}
            for nft in collection_nfts:
                for attr in nft.attributes:
                    key = f"{attr['trait_type']}:{attr['value']}"
                    attribute_counts[key] = attribute_counts.get(key, 0) + 1
            
            # Calculate rarity score
            total_nfts = len(collection_nfts)
            rarity_score = 0.0
            
            for attr in attributes:
                key = f"{attr['trait_type']}:{attr['value']}"
                frequency = attribute_counts.get(key, 0)
                if frequency > 0:
                    rarity = 1.0 / (frequency / total_nfts)
                    rarity_score += rarity
            
            # Normalize score
            return min(rarity_score / len(attributes), 100.0) if attributes else 0.0
            
        except Exception as e:
            logger.error(f"Failed to calculate rarity score: {e}")
            return 0.0
    
    async def _calculate_popularity_score(self, nft_id: str) -> float:
        """Calculate popularity score for NFT"""
        try:
            # This would calculate based on views, likes, sales, etc.
            # For now, return a mock score
            return 0.5
            
        except Exception as e:
            logger.error(f"Failed to calculate popularity score: {e}")
            return 0.0
    
    async def _calculate_trending_score(self, nft: NFT) -> float:
        """Calculate trending score for NFT"""
        try:
            # Calculate based on recent activity, sales, views, etc.
            score = 0.0
            
            # Recent sales boost
            if nft.last_sale_price:
                days_since_sale = (datetime.now() - nft.updated_at).days
                if days_since_sale < 7:
                    score += 1.0 / (days_since_sale + 1)
            
            # Rarity boost
            score += nft.rarity_score * 0.1
            
            # Popularity boost
            score += nft.popularity_score * 0.2
            
            return score
            
        except Exception as e:
            logger.error(f"Failed to calculate trending score: {e}")
            return 0.0
    
    async def _update_collection_stats(self, collection_id: str):
        """Update collection statistics"""
        try:
            if collection_id not in self.nft_collections:
                return
            
            collection = self.nft_collections[collection_id]
            
            # Get all NFTs in collection
            collection_nfts = [
                nft for nft in self.nfts.values()
                if nft.collection_id == collection_id
            ]
            
            # Update stats
            collection.minted_count = len(collection_nfts)
            collection.holders_count = len(set(nft.owner for nft in collection_nfts))
            
            # Update floor price
            listed_nfts = [nft for nft in collection_nfts if nft.price is not None]
            if listed_nfts:
                collection.floor_price = min(nft.price for nft in listed_nfts)
            else:
                collection.floor_price = 0.0
            
            collection.updated_at = datetime.now()
            
        except Exception as e:
            logger.error(f"Failed to update collection stats: {e}")
    
    async def validate_metadata(self, metadata: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate NFT metadata"""
        try:
            errors = []
            
            # Required fields
            required_fields = ["name", "description", "image"]
            for field in required_fields:
                if field not in metadata or not metadata[field]:
                    errors.append(f"Missing required field: {field}")
            
            # Validate image URL
            if "image" in metadata:
                try:
                    response = requests.head(metadata["image"], timeout=10)
                    if response.status_code != 200:
                        errors.append("Invalid image URL")
                except:
                    errors.append("Invalid image URL")
            
            # Validate attributes
            if "attributes" in metadata:
                if not isinstance(metadata["attributes"], list):
                    errors.append("Attributes must be a list")
                else:
                    for attr in metadata["attributes"]:
                        if not isinstance(attr, dict):
                            errors.append("Each attribute must be a dictionary")
                        elif "trait_type" not in attr or "value" not in attr:
                            errors.append("Each attribute must have trait_type and value")
            
            return len(errors) == 0, errors
            
        except Exception as e:
            logger.error(f"Failed to validate metadata: {e}")
            return False, [str(e)]
    
    async def generate_metadata(
        self,
        name: str,
        description: str,
        image_url: str,
        attributes: List[Dict[str, Any]],
        external_url: Optional[str] = None
    ) -> NFTMetadata:
        """Generate standardized NFT metadata"""
        try:
            metadata = NFTMetadata(
                name=name,
                description=description,
                image=image_url,
                external_url=external_url,
                attributes=attributes,
                properties={},
                animation_url=None,
                background_color=None,
                youtube_url=None
            )
            
            return metadata
            
        except Exception as e:
            logger.error(f"Failed to generate metadata: {e}")
            raise
