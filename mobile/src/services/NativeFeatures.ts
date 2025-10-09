/**
 * Native Features Service for Soladia Mobile App
 * Provides access to device-specific features and capabilities
 */

import { Geolocation } from '@react-native-community/geolocation';
import { Alert, Clipboard, Linking, Permission, PermissionsAndroid, Platform, Share } from 'react-native';
import { AudioRecorder } from 'react-native-audio-recorder-player';
import { BarcodeScanner } from 'react-native-barcode-scanner';
import { BatteryManager } from 'react-native-battery-manager';
import { BiometricAuth } from 'react-native-biometrics';
import { BluetoothManager } from 'react-native-bluetooth-manager';
import { Brightness } from 'react-native-brightness';
import { DeviceInfo } from 'react-native-device-info';
import { FileSystem } from 'react-native-fs';
import { HapticFeedback } from 'react-native-haptic-feedback';
import { Camera, ImagePicker, MediaLibrary } from 'react-native-image-picker';
import { NetworkInfo } from 'react-native-network-info';
import { NFCManager } from 'react-native-nfc-manager';
import { PushNotification } from 'react-native-push-notification';
import { QRCodeScanner } from 'react-native-qrcode-scanner';
import { ScreenCapture } from 'react-native-screen-capture';
import { Accelerometer, Gyroscope, Magnetometer } from 'react-native-sensors';
import { VolumeManager } from 'react-native-volume-manager';
import { WifiManager } from 'react-native-wifi-manager';

export interface DeviceInfo {
    deviceId: string;
    deviceName: string;
    systemName: string;
    systemVersion: string;
    appVersion: string;
    buildNumber: string;
    isEmulator: boolean;
    hasNotch: boolean;
    screenWidth: number;
    screenHeight: number;
    screenScale: number;
    totalMemory: number;
    usedMemory: number;
    batteryLevel: number;
    isCharging: boolean;
    networkType: string;
    carrier: string;
    timezone: string;
    locale: string;
    country: string;
}

export interface PermissionStatus {
    granted: boolean;
    denied: boolean;
    neverAskAgain: boolean;
    canAskAgain: boolean;
}

export interface CameraOptions {
    quality: number;
    maxWidth: number;
    maxHeight: number;
    allowsEditing: boolean;
    mediaType: 'photo' | 'video' | 'mixed';
    cameraType: 'front' | 'back';
    flashMode: 'auto' | 'on' | 'off';
}

export interface LocationInfo {
    latitude: number;
    longitude: number;
    altitude: number;
    accuracy: number;
    speed: number;
    heading: number;
    timestamp: number;
}

export interface BiometricResult {
    success: boolean;
    error?: string;
    biometryType?: string;
}

export interface NotificationOptions {
    title: string;
    message: string;
    data?: any;
    sound?: string;
    vibrate?: boolean;
    priority?: 'high' | 'normal' | 'low';
    category?: string;
    actions?: Array<{
        id: string;
        title: string;
        destructive?: boolean;
    }>;
}

export class NativeFeaturesService {
    private static instance: NativeFeaturesService;
    private deviceInfo: DeviceInfo | null = null;
    private permissions: Map<string, PermissionStatus> = new Map();

    private constructor() {
        this.initializeService();
    }

    public static getInstance(): NativeFeaturesService {
        if (!NativeFeaturesService.instance) {
            NativeFeaturesService.instance = new NativeFeaturesService();
        }
        return NativeFeaturesService.instance;
    }

    private async initializeService(): Promise<void> {
        try {
            await this.loadDeviceInfo();
            await this.initializeBiometrics();
            await this.initializePushNotifications();
            await this.initializeSensors();
        } catch (error) {
            console.error('Failed to initialize native features:', error);
        }
    }

    // Device Information
    public async getDeviceInfo(): Promise<DeviceInfo> {
        if (this.deviceInfo) {
            return this.deviceInfo;
        }

        try {
            const deviceId = await DeviceInfo.getUniqueId();
            const deviceName = await DeviceInfo.getDeviceName();
            const systemName = await DeviceInfo.getSystemName();
            const systemVersion = await DeviceInfo.getSystemVersion();
            const appVersion = await DeviceInfo.getVersion();
            const buildNumber = await DeviceInfo.getBuildNumber();
            const isEmulator = await DeviceInfo.isEmulator();
            const hasNotch = await DeviceInfo.hasNotch();
            const screenWidth = await DeviceInfo.getScreenWidth();
            const screenHeight = await DeviceInfo.getScreenHeight();
            const screenScale = await DeviceInfo.getScreenScale();
            const totalMemory = await DeviceInfo.getTotalMemory();
            const usedMemory = await DeviceInfo.getUsedMemory();
            const batteryLevel = await BatteryManager.getBatteryLevel();
            const isCharging = await BatteryManager.isCharging();
            const networkType = await NetworkInfo.getConnectionType();
            const carrier = await DeviceInfo.getCarrier();
            const timezone = await DeviceInfo.getTimezone();
            const locale = await DeviceInfo.getLocale();
            const country = await DeviceInfo.getCountry();

            this.deviceInfo = {
                deviceId,
                deviceName,
                systemName,
                systemVersion,
                appVersion,
                buildNumber,
                isEmulator,
                hasNotch,
                screenWidth,
                screenHeight,
                screenScale,
                totalMemory,
                usedMemory,
                batteryLevel,
                isCharging,
                networkType,
                carrier,
                timezone,
                locale,
                country,
            };

            return this.deviceInfo;
        } catch (error) {
            console.error('Failed to get device info:', error);
            throw error;
        }
    }

    // Permissions Management
    public async requestPermission(permission: Permission): Promise<PermissionStatus> {
        try {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(permission);

                const status: PermissionStatus = {
                    granted: granted === PermissionsAndroid.RESULTS.GRANTED,
                    denied: granted === PermissionsAndroid.RESULTS.DENIED,
                    neverAskAgain: granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
                    canAskAgain: granted !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
                };

                this.permissions.set(permission, status);
                return status;
            } else {
                // iOS permissions are handled differently
                return {
                    granted: true,
                    denied: false,
                    neverAskAgain: false,
                    canAskAgain: true,
                };
            }
        } catch (error) {
            console.error(`Failed to request permission ${permission}:`, error);
            return {
                granted: false,
                denied: true,
                neverAskAgain: false,
                canAskAgain: false,
            };
        }
    }

    public async checkPermission(permission: Permission): Promise<PermissionStatus> {
        try {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.check(permission);

                const status: PermissionStatus = {
                    granted,
                    denied: !granted,
                    neverAskAgain: false,
                    canAskAgain: true,
                };

                this.permissions.set(permission, status);
                return status;
            } else {
                return {
                    granted: true,
                    denied: false,
                    neverAskAgain: false,
                    canAskAgain: true,
                };
            }
        } catch (error) {
            console.error(`Failed to check permission ${permission}:`, error);
            return {
                granted: false,
                denied: true,
                neverAskAgain: false,
                canAskAgain: false,
            };
        }
    }

    // Camera and Media
    public async openCamera(options: Partial<CameraOptions> = {}): Promise<any> {
        try {
            const defaultOptions: CameraOptions = {
                quality: 0.8,
                maxWidth: 1920,
                maxHeight: 1080,
                allowsEditing: true,
                mediaType: 'photo',
                cameraType: 'back',
                flashMode: 'auto',
                ...options,
            };

            const permission = await this.requestPermission(
                PermissionsAndroid.PERMISSIONS.CAMERA
            );

            if (!permission.granted) {
                throw new Error('Camera permission denied');
            }

            return new Promise((resolve, reject) => {
                Camera.launchCamera(defaultOptions, (response) => {
                    if (response.didCancel || response.error) {
                        reject(new Error(response.error || 'Camera cancelled'));
                    } else {
                        resolve(response);
                    }
                });
            });
        } catch (error) {
            console.error('Failed to open camera:', error);
            throw error;
        }
    }

    public async openImagePicker(options: Partial<CameraOptions> = {}): Promise<any> {
        try {
            const defaultOptions: CameraOptions = {
                quality: 0.8,
                maxWidth: 1920,
                maxHeight: 1080,
                allowsEditing: true,
                mediaType: 'photo',
                cameraType: 'back',
                flashMode: 'auto',
                ...options,
            };

            const permission = await this.requestPermission(
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
            );

            if (!permission.granted) {
                throw new Error('Storage permission denied');
            }

            return new Promise((resolve, reject) => {
                ImagePicker.launchImageLibrary(defaultOptions, (response) => {
                    if (response.didCancel || response.error) {
                        reject(new Error(response.error || 'Image picker cancelled'));
                    } else {
                        resolve(response);
                    }
                });
            });
        } catch (error) {
            console.error('Failed to open image picker:', error);
            throw error;
        }
    }

    public async saveToGallery(uri: string): Promise<boolean> {
        try {
            const permission = await this.requestPermission(
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
            );

            if (!permission.granted) {
                throw new Error('Storage permission denied');
            }

            await MediaLibrary.saveToLibrary(uri);
            return true;
        } catch (error) {
            console.error('Failed to save to gallery:', error);
            return false;
        }
    }

    // Location Services
    public async getCurrentLocation(): Promise<LocationInfo> {
        try {
            const permission = await this.requestPermission(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );

            if (!permission.granted) {
                throw new Error('Location permission denied');
            }

            return new Promise((resolve, reject) => {
                Geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            altitude: position.coords.altitude || 0,
                            accuracy: position.coords.accuracy,
                            speed: position.coords.speed || 0,
                            heading: position.coords.heading || 0,
                            timestamp: position.timestamp,
                        });
                    },
                    (error) => {
                        reject(new Error(error.message));
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 15000,
                        maximumAge: 10000,
                    }
                );
            });
        } catch (error) {
            console.error('Failed to get current location:', error);
            throw error;
        }
    }

    public async watchLocation(
        onLocationUpdate: (location: LocationInfo) => void,
        onError: (error: string) => void
    ): Promise<number> {
        try {
            const permission = await this.requestPermission(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );

            if (!permission.granted) {
                throw new Error('Location permission denied');
            }

            return Geolocation.watchPosition(
                (position) => {
                    onLocationUpdate({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        altitude: position.coords.altitude || 0,
                        accuracy: position.coords.accuracy,
                        speed: position.coords.speed || 0,
                        heading: position.coords.heading || 0,
                        timestamp: position.timestamp,
                    });
                },
                (error) => {
                    onError(error.message);
                },
                {
                    enableHighAccuracy: true,
                    distanceFilter: 10,
                }
            );
        } catch (error) {
            console.error('Failed to watch location:', error);
            throw error;
        }
    }

    public clearLocationWatch(watchId: number): void {
        Geolocation.clearWatch(watchId);
    }

    // Biometric Authentication
    private async initializeBiometrics(): Promise<void> {
        try {
            await BiometricAuth.isSensorAvailable();
        } catch (error) {
            console.error('Biometric authentication not available:', error);
        }
    }

    public async authenticateWithBiometrics(
        reason: string = 'Authenticate to access Soladia'
    ): Promise<BiometricResult> {
        try {
            const isAvailable = await BiometricAuth.isSensorAvailable();

            if (!isAvailable) {
                return {
                    success: false,
                    error: 'Biometric authentication not available',
                };
            }

            const result = await BiometricAuth.authenticate(reason);

            return {
                success: result.success,
                error: result.error,
                biometryType: result.biometryType,
            };
        } catch (error) {
            console.error('Biometric authentication failed:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // Push Notifications
    private async initializePushNotifications(): Promise<void> {
        try {
            PushNotification.configure({
                onRegister: (token) => {
                    console.log('Push notification token:', token);
                },
                onNotification: (notification) => {
                    console.log('Push notification received:', notification);
                },
                onAction: (notification) => {
                    console.log('Push notification action:', notification);
                },
                onRegistrationError: (error) => {
                    console.error('Push notification registration error:', error);
                },
                permissions: {
                    alert: true,
                    badge: true,
                    sound: true,
                },
                popInitialNotification: true,
                requestPermissions: true,
            });
        } catch (error) {
            console.error('Failed to initialize push notifications:', error);
        }
    }

    public async sendLocalNotification(options: NotificationOptions): Promise<void> {
        try {
            PushNotification.localNotification({
                title: options.title,
                message: options.message,
                data: options.data,
                sound: options.sound || 'default',
                vibrate: options.vibrate !== false,
                priority: options.priority || 'high',
                category: options.category,
                actions: options.actions,
            });
        } catch (error) {
            console.error('Failed to send local notification:', error);
        }
    }

    public async scheduleNotification(
        options: NotificationOptions,
        date: Date
    ): Promise<void> {
        try {
            PushNotification.localNotificationSchedule({
                title: options.title,
                message: options.message,
                data: options.data,
                sound: options.sound || 'default',
                vibrate: options.vibrate !== false,
                priority: options.priority || 'high',
                category: options.category,
                actions: options.actions,
                date,
            });
        } catch (error) {
            console.error('Failed to schedule notification:', error);
        }
    }

    // Sensors
    private async initializeSensors(): Promise<void> {
        try {
            // Initialize sensor managers
            await Gyroscope.setUpdateInterval(100);
            await Accelerometer.setUpdateInterval(100);
            await Magnetometer.setUpdateInterval(100);
        } catch (error) {
            console.error('Failed to initialize sensors:', error);
        }
    }

    public async startGyroscope(
        onData: (data: { x: number; y: number; z: number }) => void
    ): Promise<void> {
        try {
            Gyroscope.startUpdates();
            Gyroscope.addListener(onData);
        } catch (error) {
            console.error('Failed to start gyroscope:', error);
        }
    }

    public async startAccelerometer(
        onData: (data: { x: number; y: number; z: number }) => void
    ): Promise<void> {
        try {
            Accelerometer.startUpdates();
            Accelerometer.addListener(onData);
        } catch (error) {
            console.error('Failed to start accelerometer:', error);
        }
    }

    public async startMagnetometer(
        onData: (data: { x: number; y: number; z: number }) => void
    ): Promise<void> {
        try {
            Magnetometer.startUpdates();
            Magnetometer.addListener(onData);
        } catch (error) {
            console.error('Failed to start magnetometer:', error);
        }
    }

    public stopGyroscope(): void {
        Gyroscope.stopUpdates();
    }

    public stopAccelerometer(): void {
        Accelerometer.stopUpdates();
    }

    public stopMagnetometer(): void {
        Magnetometer.stopUpdates();
    }

    // Audio Recording
    public async startAudioRecording(): Promise<void> {
        try {
            const permission = await this.requestPermission(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
            );

            if (!permission.granted) {
                throw new Error('Microphone permission denied');
            }

            await AudioRecorder.startRecording();
        } catch (error) {
            console.error('Failed to start audio recording:', error);
            throw error;
        }
    }

    public async stopAudioRecording(): Promise<string> {
        try {
            const result = await AudioRecorder.stopRecording();
            return result;
        } catch (error) {
            console.error('Failed to stop audio recording:', error);
            throw error;
        }
    }

    // File System
    public async saveFile(
        content: string,
        filename: string,
        path: string = FileSystem.DocumentDirectoryPath
    ): Promise<string> {
        try {
            const filePath = `${path}/${filename}`;
            await FileSystem.writeFile(filePath, content, 'utf8');
            return filePath;
        } catch (error) {
            console.error('Failed to save file:', error);
            throw error;
        }
    }

    public async readFile(filePath: string): Promise<string> {
        try {
            const content = await FileSystem.readFile(filePath, 'utf8');
            return content;
        } catch (error) {
            console.error('Failed to read file:', error);
            throw error;
        }
    }

    public async deleteFile(filePath: string): Promise<boolean> {
        try {
            await FileSystem.unlink(filePath);
            return true;
        } catch (error) {
            console.error('Failed to delete file:', error);
            return false;
        }
    }

    // Sharing
    public async shareContent(
        title: string,
        message: string,
        url?: string
    ): Promise<void> {
        try {
            const options = {
                title,
                message: url ? `${message}\n${url}` : message,
                url,
            };

            await Share.share(options);
        } catch (error) {
            console.error('Failed to share content:', error);
            throw error;
        }
    }

    // Clipboard
    public async copyToClipboard(text: string): Promise<void> {
        try {
            await Clipboard.setString(text);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            throw error;
        }
    }

    public async getFromClipboard(): Promise<string> {
        try {
            const text = await Clipboard.getString();
            return text;
        } catch (error) {
            console.error('Failed to get from clipboard:', error);
            return '';
        }
    }

    // Haptic Feedback
    public triggerHapticFeedback(type: 'impact' | 'notification' | 'selection' = 'impact'): void {
        try {
            HapticFeedback.trigger(type);
        } catch (error) {
            console.error('Failed to trigger haptic feedback:', error);
        }
    }

    // Screen Capture
    public async captureScreen(): Promise<string> {
        try {
            const permission = await this.requestPermission(
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
            );

            if (!permission.granted) {
                throw new Error('Storage permission denied');
            }

            const result = await ScreenCapture.captureScreen();
            return result;
        } catch (error) {
            console.error('Failed to capture screen:', error);
            throw error;
        }
    }

    // QR Code Scanner
    public async scanQRCode(): Promise<string> {
        try {
            const permission = await this.requestPermission(
                PermissionsAndroid.PERMISSIONS.CAMERA
            );

            if (!permission.granted) {
                throw new Error('Camera permission denied');
            }

            return new Promise((resolve, reject) => {
                QRCodeScanner.scan(
                    (data) => {
                        resolve(data);
                    },
                    (error) => {
                        reject(new Error(error.message));
                    }
                );
            });
        } catch (error) {
            console.error('Failed to scan QR code:', error);
            throw error;
        }
    }

    // Barcode Scanner
    public async scanBarcode(): Promise<string> {
        try {
            const permission = await this.requestPermission(
                PermissionsAndroid.PERMISSIONS.CAMERA
            );

            if (!permission.granted) {
                throw new Error('Camera permission denied');
            }

            return new Promise((resolve, reject) => {
                BarcodeScanner.scan(
                    (data) => {
                        resolve(data);
                    },
                    (error) => {
                        reject(new Error(error.message));
                    }
                );
            });
        } catch (error) {
            console.error('Failed to scan barcode:', error);
            throw error;
        }
    }

    // NFC
    public async initializeNFC(): Promise<boolean> {
        try {
            const isSupported = await NFCManager.isSupported();
            if (isSupported) {
                await NFCManager.start();
            }
            return isSupported;
        } catch (error) {
            console.error('Failed to initialize NFC:', error);
            return false;
        }
    }

    public async readNFCTag(): Promise<string> {
        try {
            const tag = await NFCManager.getTag();
            return tag;
        } catch (error) {
            console.error('Failed to read NFC tag:', error);
            throw error;
        }
    }

    // Bluetooth
    public async initializeBluetooth(): Promise<boolean> {
        try {
            const isEnabled = await BluetoothManager.isEnabled();
            if (!isEnabled) {
                await BluetoothManager.enable();
            }
            return true;
        } catch (error) {
            console.error('Failed to initialize Bluetooth:', error);
            return false;
        }
    }

    public async scanBluetoothDevices(): Promise<any[]> {
        try {
            const devices = await BluetoothManager.scan();
            return devices;
        } catch (error) {
            console.error('Failed to scan Bluetooth devices:', error);
            return [];
        }
    }

    // WiFi
    public async getWiFiInfo(): Promise<any> {
        try {
            const ssid = await WifiManager.getSSID();
            const bssid = await WifiManager.getBSSID();
            const ipAddress = await WifiManager.getIPAddress();

            return {
                ssid,
                bssid,
                ipAddress,
            };
        } catch (error) {
            console.error('Failed to get WiFi info:', error);
            return {};
        }
    }

    // Device Controls
    public async setBrightness(level: number): Promise<void> {
        try {
            await Brightness.setBrightness(level);
        } catch (error) {
            console.error('Failed to set brightness:', error);
        }
    }

    public async getBrightness(): Promise<number> {
        try {
            const brightness = await Brightness.getBrightness();
            return brightness;
        } catch (error) {
            console.error('Failed to get brightness:', error);
            return 0.5;
        }
    }

    public async setVolume(level: number): Promise<void> {
        try {
            await VolumeManager.setVolume(level);
        } catch (error) {
            console.error('Failed to set volume:', error);
        }
    }

    public async getVolume(): Promise<number> {
        try {
            const volume = await VolumeManager.getVolume();
            return volume;
        } catch (error) {
            console.error('Failed to get volume:', error);
            return 0.5;
        }
    }

    // Utility Methods
    public async openURL(url: string): Promise<boolean> {
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to open URL:', error);
            return false;
        }
    }

    public async openSettings(): Promise<void> {
        try {
            await Linking.openSettings();
        } catch (error) {
            console.error('Failed to open settings:', error);
        }
    }

    public async showAlert(
        title: string,
        message: string,
        buttons?: Array<{ text: string; onPress?: () => void }>
    ): Promise<void> {
        try {
            Alert.alert(title, message, buttons);
        } catch (error) {
            console.error('Failed to show alert:', error);
        }
    }

    // Cleanup
    public cleanup(): void {
        try {
            this.stopGyroscope();
            this.stopAccelerometer();
            this.stopMagnetometer();
            this.permissions.clear();
        } catch (error) {
            console.error('Failed to cleanup native features:', error);
        }
    }
}

export default NativeFeaturesService;
