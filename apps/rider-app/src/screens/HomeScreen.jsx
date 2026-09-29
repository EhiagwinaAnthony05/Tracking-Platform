/**
 * Rider home: one switch to go online (background location sharing) and the rider's current deliveries.
 */
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BEFORE_PICKUP_STATUSES, formatTimeAgo } from '@movex/shared';
import { RiderTheme } from '../constants/riderTheme';
import {
  clearStoredSession,
  getApiErrorMessage,
  getCurrentRider,
  getMyActiveOrders,
  getStoredSession,
  markOrderPickedUp,
  saveSession,
  sendRiderLocationUpdate,
  setSharingState,
} from '../services/authService';
import {
  isBackgroundLocationTrackingActive,
  requestBackgroundLocationPermission,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from '../services/locationTracker';

const REFRESH_INTERVAL_MS = 30000;

function openDirections(address) {
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`);
}

function callPhone(phone) {
  Linking.openURL(`tel:${phone}`);
}

export default function HomeScreen() {
  const router = useRouter();
  const [rider, setRider] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [pickingUpId, setPickingUpId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const signOutLocally = useCallback(async () => {
    await stopBackgroundLocationTracking();
    await clearStoredSession();
    router.replace('/');
  }, [router]);

  // Reads what dispatch sees: the rider's last received location and assigned orders.
  const refreshFromServer = useCallback(async () => {
    const session = await getStoredSession();

    if (!session?.token) {
      router.replace('/');
      return;
    }

    try {
      const [latestRider, activeOrders] = await Promise.all([
        getCurrentRider(session.token),
        getMyActiveOrders(session.token),
      ]);

      setRider(latestRider);
      setOrders(activeOrders);
      await saveSession({ token: session.token, rider: latestRider });
    } catch (error) {
      if (error?.response?.status === 401) {
        await signOutLocally();
        return;
      }

      setErrorMessage(getApiErrorMessage(error));
    }
  }, [router, signOutLocally]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const session = await getStoredSession();

      if (!session?.token) {
        router.replace('/');
        return;
      }

      setRider(session.rider);
      const tracking = await isBackgroundLocationTrackingActive();

      if (isMounted) {
        setIsOnline(tracking);
      }

      await refreshFromServer();

      if (isMounted) {
        setIsLoading(false);
      }
    }

    bootstrap();
    const intervalId = setInterval(refreshFromServer, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [refreshFromServer, router]);

  async function handleRefresh() {
    setIsRefreshing(true);
    setErrorMessage('');
    await refreshFromServer();
    setIsRefreshing(false);
  }

  async function goOnline() {
    const servicesEnabled = await Location.hasServicesEnabledAsync();

    if (!servicesEnabled) {
      throw new Error('Location is turned off on this phone. Turn on GPS and try again.');
    }

    const foreground = await Location.requestForegroundPermissionsAsync();

    if (foreground.status !== 'granted') {
      throw new Error('Allow location access so dispatch can see where you are.');
    }

    const background = await requestBackgroundLocationPermission();

    if (!background) {
      throw new Error('Choose "Allow all the time" for location so sharing continues when the app is closed.');
    }

    const started = await startBackgroundLocationTracking();

    if (!started) {
      throw new Error('Could not start location sharing. Check your location settings and try again.');
    }

    // Send one location right away so dispatch sees the rider immediately.
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const session = await getStoredSession();

    await sendRiderLocationUpdate({
      token: session.token,
      location: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        capturedAt: new Date(position.timestamp).toISOString(),
      },
    });
  }

  async function goOffline() {
    await stopBackgroundLocationTracking();

    try {
      const session = await getStoredSession();

      if (session?.token) {
        await setSharingState({ token: session.token, isSharing: false });
      }
    } catch {
      // The server also treats riders with stale locations as offline.
    }
  }

  async function handleToggleOnline() {
    setIsSwitching(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      if (isOnline) {
        await goOffline();
        setIsOnline(false);
        setStatusMessage('You are offline. Dispatch can no longer see your location.');
      } else {
        await goOnline();
        setIsOnline(true);
        setStatusMessage('You are online. Dispatch can see your location.');
      }

      await refreshFromServer();
    } catch (error) {
      setIsOnline(await isBackgroundLocationTrackingActive());
      setErrorMessage(error?.response ? getApiErrorMessage(error) : error?.message || 'Something went wrong.');
    } finally {
      setIsSwitching(false);
    }
  }

  async function handlePickedUp(trackingId) {
    setPickingUpId(trackingId);
    setErrorMessage('');

    try {
      const session = await getStoredSession();
      await markOrderPickedUp({ token: session.token, trackingId });
      setStatusMessage(`${trackingId} marked as picked up. The customer can now see you are on the way.`);
      await refreshFromServer();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setPickingUpId('');
    }
  }

  async function handleLogout() {
    await goOffline();
    await clearStoredSession();
    router.replace('/');
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={c.accent} />
          <Text style={styles.loadingText}>Loading your deliveries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const lastLocation = rider?.lastLocation;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.glowOrbTop} />
      <View pointerEvents="none" style={styles.glowOrbBottom} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={c.accent} />}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Hi, {rider?.name}</Text>
            <Text style={styles.subtitle}>{rider?.phone}</Text>
          </View>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.buttonPressed]}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>

        <View style={[styles.card, isOnline && styles.cardOnline]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isOnline ? styles.statusDotOnline : styles.statusDotOffline]} />
            <Text style={styles.statusTitle}>{isOnline ? 'You are online' : 'You are offline'}</Text>
          </View>
          <Text style={styles.cardText}>
            {isOnline
              ? 'Your location is shared with dispatch, even when the app is closed.'
              : 'Go online so dispatch can see you and assign deliveries.'}
          </Text>
          <Text style={styles.metaText}>
            Dispatch last received your location {formatTimeAgo(lastLocation?.updatedAt)}
            {lastLocation?.placeName ? ` · ${lastLocation.placeName}` : ''}
          </Text>
          <Pressable
            disabled={isSwitching}
            onPress={handleToggleOnline}
            style={({ pressed }) => [
              styles.bigButton,
              isOnline ? styles.offlineButton : styles.onlineButton,
              pressed && styles.buttonPressed,
              isSwitching && styles.buttonDisabled,
            ]}>
            {isSwitching ? (
              <ActivityIndicator color={isOnline ? c.secondaryButtonText : c.primaryButtonText} />
            ) : (
              <Text style={isOnline ? styles.offlineButtonText : styles.onlineButtonText}>
                {isOnline ? 'Go offline' : 'Go online'}
              </Text>
            )}
          </Pressable>
        </View>

        {statusMessage ? <Text style={styles.successText}>{statusMessage}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Text style={styles.sectionLabel}>
          {orders.length > 1 ? `Current deliveries (${orders.length})` : 'Current delivery'}
        </Text>

        {orders.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardText}>
              No delivery assigned yet. Stay online and pull down to refresh.
            </Text>
          </View>
        ) : (
          orders.map((order) => {
            const isBeforePickup = BEFORE_PICKUP_STATUSES.includes(order.status);

            return (
              <View key={order.trackingId} style={styles.card}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>{order.trackingId}</Text>
                  <Text style={styles.orderStatus}>{order.status}</Text>
                </View>
                <Text style={styles.cardText}>{order.package?.description}</Text>
                {order.estimatedDelivery ? (
                  <Text style={styles.metaText}>Estimated time to drop-off: {order.estimatedDelivery}</Text>
                ) : null}

                <View style={[styles.stop, isBeforePickup && styles.stopActive]}>
                  <Text style={styles.stopLabel}>Pickup</Text>
                  <Text style={styles.stopName}>{order.sender?.name}</Text>
                  <Text style={styles.stopAddress}>{order.sender?.address}</Text>
                  <View style={styles.stopActions}>
                    <Pressable style={styles.smallButton} onPress={() => callPhone(order.sender?.phone)}>
                      <Text style={styles.smallButtonText}>Call</Text>
                    </Pressable>
                    <Pressable style={styles.smallButton} onPress={() => openDirections(order.sender?.address)}>
                      <Text style={styles.smallButtonText}>Navigate</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.stop, !isBeforePickup && styles.stopActive]}>
                  <Text style={styles.stopLabel}>Drop-off</Text>
                  <Text style={styles.stopName}>{order.receiver?.name}</Text>
                  <Text style={styles.stopAddress}>{order.receiver?.address}</Text>
                  <View style={styles.stopActions}>
                    <Pressable style={styles.smallButton} onPress={() => callPhone(order.receiver?.phone)}>
                      <Text style={styles.smallButtonText}>Call</Text>
                    </Pressable>
                    <Pressable style={styles.smallButton} onPress={() => openDirections(order.receiver?.address)}>
                      <Text style={styles.smallButtonText}>Navigate</Text>
                    </Pressable>
                  </View>
                </View>

                {isBeforePickup ? (
                  <Pressable
                    disabled={pickingUpId === order.trackingId}
                    onPress={() => handlePickedUp(order.trackingId)}
                    style={({ pressed }) => [
                      styles.bigButton,
                      styles.onlineButton,
                      pressed && styles.buttonPressed,
                      pickingUpId === order.trackingId && styles.buttonDisabled,
                    ]}>
                    <Text style={styles.onlineButtonText}>
                      {pickingUpId === order.trackingId ? 'Saving...' : "I've picked up the package"}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.metaText}>Dispatch will end the trip once the package is delivered.</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const c = RiderTheme.colors;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  glowOrbTop: {
    position: 'absolute',
    top: -90,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: c.orbHomeTop,
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -120,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: c.orbHomeBottom,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: c.textSecondary,
  },
  container: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: c.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: c.textSecondary,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: c.secondaryButton,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.secondaryButtonBorder,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.secondaryButtonText,
  },
  card: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  cardOnline: {
    borderColor: c.accentBorder,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  statusDotOnline: {
    backgroundColor: c.accent,
  },
  statusDotOffline: {
    backgroundColor: c.textMuted,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: c.textPrimary,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: c.lineText,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textMuted,
  },
  bigButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    minHeight: 56,
    borderWidth: 1,
    marginTop: 4,
  },
  onlineButton: {
    backgroundColor: c.primaryButton,
    borderColor: c.primaryButtonBorder,
  },
  offlineButton: {
    backgroundColor: c.secondaryButton,
    borderColor: c.secondaryButtonBorder,
  },
  onlineButtonText: {
    color: c.primaryButtonText,
    fontSize: 17,
    fontWeight: '800',
  },
  offlineButtonText: {
    color: c.secondaryButtonText,
    fontSize: 17,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successText: {
    fontSize: 14,
    lineHeight: 21,
    color: c.successText,
    backgroundColor: c.successBackground,
    borderWidth: 1,
    borderColor: c.successBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: c.errorText,
    backgroundColor: c.errorBackground,
    borderWidth: 1,
    borderColor: c.errorBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: c.label,
    letterSpacing: 0.5,
    marginTop: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
  },
  orderStatus: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    color: c.successText,
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  stop: {
    backgroundColor: c.subtleSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 14,
    gap: 4,
  },
  stopActive: {
    borderColor: c.accentBorder,
  },
  stopLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: c.label,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '700',
    color: c.lineTitle,
  },
  stopAddress: {
    fontSize: 14,
    lineHeight: 20,
    color: c.lineText,
  },
  stopActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  smallButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: c.secondaryButton,
    borderWidth: 1,
    borderColor: c.secondaryButtonBorder,
  },
  smallButtonText: {
    color: c.secondaryButtonText,
    fontSize: 14,
    fontWeight: '600',
  },
});
