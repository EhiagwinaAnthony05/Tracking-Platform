import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { RiderTheme } from '../constants/riderTheme';
import LoginScreen from '../screens/LoginScreen';
import {
    clearStoredSession,
    getCurrentRider,
    getStoredSession,
    saveSession,
} from '../services/authService';

export default function IndexRoute() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      const session = await getStoredSession();

      if (!session?.token) {
        if (isMounted) {
          setIsCheckingSession(false);
        }
        return;
      }

      try {
        const rider = await getCurrentRider(session.token);
        await saveSession({ token: session.token, rider });

        if (isMounted) {
          router.replace('/home');
        }
      } catch {
        await clearStoredSession();

        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isCheckingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={c.accent} />
        <Text style={styles.loadingTitle}>Checking saved rider session...</Text>
        <Text style={styles.loadingSubtitle}>
          If a valid token is already on this phone, the app will go straight to Home.
        </Text>
      </View>
    );
  }

  return <LoginScreen onLoginSuccess={() => router.replace('/home')} />;
}

const c = RiderTheme.colors;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: c.canvas,
    gap: 12,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.textPrimary,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
    textAlign: 'center',
  },
});
