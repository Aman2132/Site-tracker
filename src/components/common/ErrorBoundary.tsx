import { Ionicons } from '@expo/vector-icons';
import React, { Component, ErrorInfo, PropsWithChildren } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, radius, shadow, spacing, typography } from '@/constants/theme';

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time errors anywhere below it so one bad screen shows a
 * recoverable fallback instead of a blank/crashed app. Wraps RootNavigator
 * in App.tsx. Hook a crash reporter (e.g. Sentry) into componentDidCatch
 * before shipping — right now it only logs to the console.
 */
export default class ErrorBoundary extends Component<PropsWithChildren<object>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Ionicons name="warning" size={28} color={colors.danger} />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.text}>
          The app hit an unexpected error. Try again — if it keeps happening, let your admin know.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.reset} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  text: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    ...shadow.sm,
  },
  buttonText: { fontFamily: fontFamily.bold, color: colors.white },
});
