/**
 * Renders the rider login form, validates input, and saves the rider session after a successful login.
 */
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { RiderTheme } from '../constants/riderTheme';
import { getApiErrorMessage, loginRider, saveSession } from '../services/authService';

export default function LoginScreen({ onLoginSuccess }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      setErrorMessage('Enter the rider name exactly as it exists in your backend.');
      return;
    }

    if (trimmedPhone.length < 5) {
      setErrorMessage('Enter a valid phone number with at least 5 characters.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const { rider, token } = await loginRider({ name: trimmedName, phone: trimmedPhone });
      await saveSession({ token, rider });
      onLoginSuccess();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.glowOrbTop} />
      <View pointerEvents="none" style={styles.glowOrbBottom} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Movex Logistics</Text>
          <Text style={styles.title}>Rider Login</Text>
          <Text style={styles.subtitle}>
            Sign in with the rider name and phone number already registered in your backend.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Rider Name</Text>
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isSubmitting}
              onChangeText={setName}
              placeholder="John Rider"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={name}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              keyboardType="phone-pad"
              onChangeText={setPhone}
              placeholder="08012345678"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={phone}
            />
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.button,
              pressed && !isSubmitting ? styles.buttonPressed : null,
              isSubmitting ? styles.buttonDisabled : null,
            ]}>
            {isSubmitting ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.buttonText}>Signing in...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </Pressable>

          <Text style={styles.helperText}>
            Beginner note: this screen is only responsible for collecting input and showing errors. The
            actual network request lives in the auth service so the code stays easier to test later.
          </Text>
        </View>
      </KeyboardAvoidingView>
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
    top: -80,
    right: -20,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: c.orbLoginTop,
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -120,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: c.orbLoginBottom,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: c.cardStrong,
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: c.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.accent,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: c.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: c.textSecondary,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: c.label,
  },
  input: {
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: c.textPrimary,
    backgroundColor: c.input,
  },
  errorText: {
    color: c.errorText,
    backgroundColor: c.errorBackground,
    borderWidth: 1,
    borderColor: c.errorBorderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primaryButton,
    borderWidth: 1,
    borderColor: c.primaryButtonBorder,
    borderRadius: 16,
    minHeight: 56,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: c.primaryButtonText,
    fontSize: 16,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textMuted,
  },
});