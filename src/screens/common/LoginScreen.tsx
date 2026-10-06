import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KEYBOARD } from '@/constants/config';
import { colors, fontFamily, glow, gradients, radius, shadow, spacing, typography } from '@/constants/theme';
import { useAuthController } from '@/controllers/useAuthController';

type Mode = 'signIn' | 'signUp';

export default function LoginScreen() {
  const { signIn, signUp, signingIn, signInError } = useAuthController();
  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const insets = useSafeAreaInsets();

  const isSignUp = mode === 'signUp';
  const passwordsMatch = !isSignUp || (password.length > 0 && password === confirmPassword);
  const canSubmit =
    email.trim().length > 0 &&
    password.length > 0 &&
    (!isSignUp || name.trim().length > 0) &&
    passwordsMatch &&
    !signingIn;

  const toggleMode = () => {
    setMode(current => (current === 'signIn' ? 'signUp' : 'signIn'));
    setConfirmPassword('');
  };

  const handleSubmit = () => {
    if (isSignUp) {
      signUp(email, password, name);
    } else {
      signIn(email, password);
    }
  };

  return (
    // Scrolls the focused field into view above the keyboard, leaving
    // KEYBOARD.formBottomOffset of room under it so the submit button and the
    // sign-in/create-account link stay visible too. Works the same on
    // Android's edge-to-edge layout (where the window no longer resizes for
    // the keyboard) and on iOS. keyboardShouldPersistTaps makes one tap on
    // the button submit while the keyboard is open, instead of the first tap
    // only closing the keyboard.
    <KeyboardAwareScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xl },
      ]}
      bottomOffset={KEYBOARD.formBottomOffset}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.head}>
        <LinearGradient colors={gradients.primaryRadiant} style={[styles.logo, glow(colors.primary, 0.4)]}>
          <Ionicons name="location" size={30} color={colors.white} />
        </LinearGradient>
        <Text style={styles.title}>Site Tracker</Text>
        <Text style={styles.subtitle}>
          {isSignUp
            ? 'Create your worker account to start sharing your site location.'
            : 'Sign in with the account your site owner set up for you.'}
        </Text>
      </View>

      <View style={styles.form}>
        {isSignUp && (
          <>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              placeholder="Ramesh Kumar"
              placeholderTextColor={colors.textFaint}
            />
          </>
        )}

        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@site.com"
          placeholderTextColor={colors.textFaint}
        />

        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={isSignUp ? 'new-password' : 'password'}
          placeholder="••••••••"
          placeholderTextColor={colors.textFaint}
        />

        {isSignUp && (
          <>
            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholder="••••••••"
              placeholderTextColor={colors.textFaint}
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <Text style={styles.hintText}>Passwords don't match.</Text>
            )}
          </>
        )}

        {signInError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={14} color={colors.dangerText} />
            <Text style={styles.errorText}>{signInError}</Text>
          </View>
        )}

        <TouchableOpacity
          disabled={!canSubmit}
          onPress={handleSubmit}
          activeOpacity={0.85}
          style={styles.submitWrap}
        >
          <LinearGradient
            colors={canSubmit ? gradients.primaryRadiant : ['#c6cede', '#b6c0d4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.submit, canSubmit && shadow.md]}
          >
            {signingIn ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleMode} activeOpacity={0.7} style={styles.toggleWrap}>
          <Text style={styles.toggleText}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={styles.toggleTextStrong}>{isSignUp ? 'Sign in' : 'Create one'}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },
  head: { alignItems: 'center', paddingHorizontal: spacing.xxl, marginBottom: spacing.xxxl },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.title, color: colors.text },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 19,
  },
  form: { paddingHorizontal: spacing.xxl },
  label: {
    ...typography.label,
    color: colors.textFaint,
    marginBottom: spacing.sm - 2,
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.text,
  },
  hintText: {
    fontFamily: fontFamily.medium,
    color: colors.dangerText,
    fontSize: 12,
    marginTop: spacing.xs + 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.sm + 2,
    padding: spacing.md - 2,
    marginTop: spacing.lg,
  },
  errorText: { fontFamily: fontFamily.medium, color: colors.dangerText, fontSize: 12, flex: 1 },
  submitWrap: { marginTop: spacing.xl },
  submit: {
    borderRadius: radius.xl,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontFamily: fontFamily.extrabold, color: colors.white, fontSize: 15 },
  toggleWrap: { marginTop: spacing.lg, alignItems: 'center' },
  toggleText: { fontFamily: fontFamily.regular, color: colors.textMuted, fontSize: 13 },
  toggleTextStrong: { fontFamily: fontFamily.bold, color: colors.primary },
});
