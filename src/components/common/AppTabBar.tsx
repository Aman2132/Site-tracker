import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamily, radius, shadow, spacing } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface AppTabBarProps extends BottomTabBarProps {
  /** Solid icon name per route, e.g. { Map: 'map' }. The outline variant is derived automatically. */
  icons: Record<string, IconName>;
  /** Gradient stops for the active tab's icon chip — lets owner/worker modes read as visually distinct. */
  accentGradient: readonly [string, string];
  accent: string;
}

/** Floating icon + label bottom tab bar, replacing React Navigation's default plain-text bar. */
export default function AppTabBar({
  state,
  descriptors,
  navigation,
  icons,
  accentGradient,
  accent,
}: AppTabBarProps) {
  const insets = useSafeAreaInsets();

  const focusedOptions = descriptors[state.routes[state.index].key].options;
  if (focusedOptions.tabBarStyle && (focusedOptions.tabBarStyle as { display?: string }).display === 'none') {
    return null;
  }

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={[styles.bar, shadow.lg]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const focused = state.index === index;
          const iconName = icons[route.name] ?? 'ellipse';
          const displayIcon = focused ? iconName : ((iconName + '-outline') as IconName);

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tab}
            >
              {focused ? (
                <LinearGradient
                  colors={accentGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconWrapActive}
                >
                  <Ionicons name={displayIcon} size={20} color={colors.white} />
                </LinearGradient>
              ) : (
                <View style={styles.iconWrap}>
                  <Ionicons name={displayIcon} size={20} color={colors.textFaint} />
                </View>
              )}
              <Text style={[styles.label, { color: focused ? accent : colors.textFaint }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    width: 40,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 0.2 },
});
