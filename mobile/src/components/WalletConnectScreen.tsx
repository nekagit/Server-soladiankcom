/**
 * Wallet Connect Screen Component
 * Handles wallet connection flow for mobile app
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { RNCamera } from 'react-native-camera';
import { solanaWalletService, WalletConnectionResult } from '../services/SolanaWalletService';

const { width, height } = Dimensions.get('window');

interface WalletConnectScreenProps {
  onWalletConnected: (wallet: any) => void;
  onClose: () => void;
}

export const WalletConnectScreen: React.FC<WalletConnectScreenProps> = ({
  onWalletConnected,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'privateKey' | 'qrCode'>('privateKey');
  const [privateKey, setPrivateKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize wallet service
    solanaWalletService.initialize().catch(console.error);
  }, []);

  const handlePrivateKeyConnect = async () => {
    if (!privateKey.trim()) {
      setError('Please enter a private key');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const result: WalletConnectionResult = await solanaWalletService.connectWithPrivateKey(privateKey.trim());
      
      if (result.success && result.wallet) {
        onWalletConnected(result.wallet);
      } else {
        setError(result.error || 'Connection failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleQRCodeConnect = (e: any) => {
    setShowQRScanner(false);
    
    if (e.data) {
      setIsConnecting(true);
      setError('');

      solanaWalletService.connectWithQRCode(e.data)
        .then((result: WalletConnectionResult) => {
          if (result.success && result.wallet) {
            onWalletConnected(result.wallet);
          } else {
            setError(result.error || 'QR Code connection failed');
          }
        })
        .catch((error) => {
          setError(error instanceof Error ? error.message : 'QR Code connection failed');
        })
        .finally(() => {
          setIsConnecting(false);
        });
    }
  };

  const generateQRCode = () => {
    try {
      const qrData = solanaWalletService.generateQRCode();
      Alert.alert('QR Code Generated', `Share this QR code: ${qrData}`);
    } catch (error) {
      Alert.alert('Error', 'Please connect a wallet first');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E60012', '#0066CC']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Connect Wallet</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'privateKey' && styles.activeTab]}
            onPress={() => setActiveTab('privateKey')}
          >
            <Icon 
              name="vpn-key" 
              size={20} 
              color={activeTab === 'privateKey' ? '#E60012' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'privateKey' && styles.activeTabText]}>
              Private Key
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'qrCode' && styles.activeTab]}
            onPress={() => setActiveTab('qrCode')}
          >
            <Icon 
              name="qr-code-scanner" 
              size={20} 
              color={activeTab === 'qrCode' ? '#E60012' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'qrCode' && styles.activeTabText]}>
              QR Code
            </Text>
          </TouchableOpacity>
        </View>

        {/* Private Key Tab */}
        {activeTab === 'privateKey' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Enter Private Key</Text>
            <Text style={styles.sectionDescription}>
              Enter your 64-character private key to connect your wallet
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.privateKeyInput}
                value={privateKey}
                onChangeText={setPrivateKey}
                placeholder="Enter your private key..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Icon name="error" size={20} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
              onPress={handlePrivateKeyConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Icon name="account-balance-wallet" size={20} color="white" />
                  <Text style={styles.connectButtonText}>Connect Wallet</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.generateQRButton}
              onPress={generateQRCode}
            >
              <Icon name="qr-code" size={20} color="#0066CC" />
              <Text style={styles.generateQRButtonText}>Generate QR Code</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* QR Code Tab */}
        {activeTab === 'qrCode' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Scan QR Code</Text>
            <Text style={styles.sectionDescription}>
              Scan a QR code to connect your wallet
            </Text>

            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setShowQRScanner(true)}
            >
              <Icon name="qr-code-scanner" size={40} color="#0066CC" />
              <Text style={styles.scanButtonText}>Tap to Scan QR Code</Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorContainer}>
                <Icon name="error" size={20} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Icon name="security" size={20} color="#FF8C00" />
          <Text style={styles.securityText}>
            Your private key is stored securely on your device and never shared with our servers.
          </Text>
        </View>
      </ScrollView>

      {/* QR Code Scanner Modal */}
      {showQRScanner && (
        <View style={styles.qrScannerContainer}>
          <QRCodeScanner
            onRead={handleQRCodeConnect}
            flashMode={RNCamera.Constants.FlashMode.auto}
            topContent={
              <View style={styles.qrScannerHeader}>
                <TouchableOpacity
                  style={styles.qrCloseButton}
                  onPress={() => setShowQRScanner(false)}
                >
                  <Icon name="close" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.qrScannerTitle}>Scan QR Code</Text>
              </View>
            }
            bottomContent={
              <View style={styles.qrScannerFooter}>
                <Text style={styles.qrScannerDescription}>
                  Position the QR code within the frame
                </Text>
              </View>
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#E60012',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  tabContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  privateKeyInput: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    padding: 16,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#f8f9fa',
    textAlignVertical: 'top',
    fontFamily: 'monospace',
  },
  connectButton: {
    backgroundColor: '#E60012',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  generateQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#0066CC',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  generateQRButtonText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  scanButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderWidth: 2,
    borderColor: '#0066CC',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  scanButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF7ED',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C00',
  },
  securityText: {
    color: '#9A3412',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  qrScannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
  },
  qrScannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  qrCloseButton: {
    padding: 8,
  },
  qrScannerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  qrScannerFooter: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  qrScannerDescription: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
});




