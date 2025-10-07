/**
 * Home Screen
 * Main home screen with featured NFTs, collections, and market overview
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

// Components
import { NFTCard } from '../components/NFTCard';
import { CollectionCard } from '../components/CollectionCard';
import { CreatorCard } from '../components/CreatorCard';
import { MarketStats } from '../components/MarketStats';
import { TrendingSection } from '../components/TrendingSection';
import { FeaturedSection } from '../components/FeaturedSection';
import { QuickActions } from '../components/QuickActions';
import { SearchBar } from '../components/SearchBar';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Services
import { nftService } from '../services/nftService';
import { marketplaceService } from '../services/marketplaceService';
import { analyticsService } from '../services/analyticsService';

const { width } = Dimensions.get('window');

export const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  
  const { user } = useAppSelector((state) => state.auth);
  const { connected, balance } = useAppSelector((state) => state.wallet);
  const { nfts, collections, creators } = useAppSelector((state) => state.marketplace);
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marketStats, setMarketStats] = useState(null);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        dispatch(marketplaceService.loadFeaturedNFTs()),
        dispatch(marketplaceService.loadTrendingCollections()),
        dispatch(marketplaceService.loadTopCreators()),
        loadMarketStats(),
      ]);
    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMarketStats = async () => {
    try {
      const stats = await analyticsService.getMarketOverview();
      setMarketStats(stats);
    } catch (error) {
      console.error('Failed to load market stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const handleSearchPress = () => {
    navigation.navigate('Search' as never);
  };

  const handleNFTPress = (nft: any) => {
    navigation.navigate('NFTDetail' as never, { nft });
  };

  const handleCollectionPress = (collection: any) => {
    navigation.navigate('Collection' as never, { collection });
  };

  const handleCreatorPress = (creator: any) => {
    navigation.navigate('Creator' as never, { creator });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={['#E60012', '#FF1744']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notifications' as never)}
          >
            <Icon name="notifications" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.searchContainer} onPress={handleSearchPress}>
          <Icon name="search" size={20} color="#666" />
          <Text style={styles.searchPlaceholder}>Search NFTs, collections, creators...</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Market Stats */}
      {marketStats && <MarketStats stats={marketStats} />}

      {/* Quick Actions */}
      <QuickActions />

      {/* Featured NFTs */}
      <FeaturedSection
        title="Featured NFTs"
        data={nfts.slice(0, 10)}
        onItemPress={handleNFTPress}
        onViewAllPress={() => navigation.navigate('Marketplace' as never)}
      />

      {/* Trending Collections */}
      <TrendingSection
        title="Trending Collections"
        data={collections.slice(0, 5)}
        onItemPress={handleCollectionPress}
        onViewAllPress={() => navigation.navigate('Marketplace' as never)}
      />

      {/* Top Creators */}
      <FeaturedSection
        title="Top Creators"
        data={creators.slice(0, 8)}
        onItemPress={handleCreatorPress}
        onViewAllPress={() => navigation.navigate('Social' as never)}
        horizontal
      />

      {/* Wallet Balance */}
      {connected && (
        <View style={styles.walletSection}>
          <Text style={styles.walletTitle}>Your Wallet</Text>
          <View style={styles.walletBalance}>
            <Text style={styles.balanceLabel}>SOL Balance</Text>
            <Text style={styles.balanceAmount}>{balance.toFixed(4)} SOL</Text>
          </View>
          <TouchableOpacity
            style={styles.walletButton}
            onPress={() => navigation.navigate('Wallet' as never)}
          >
            <Text style={styles.walletButtonText}>View Wallet</Text>
            <Icon name="arrow-forward" size={20} color="#E60012" />
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  notificationButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  searchPlaceholder: {
    marginLeft: 10,
    color: '#666',
    fontSize: 16,
  },
  walletSection: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  walletTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  walletBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E60012',
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E60012',
    borderRadius: 8,
  },
  walletButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E60012',
    marginRight: 8,
  },
  bottomSpacing: {
    height: 20,
  },
});
