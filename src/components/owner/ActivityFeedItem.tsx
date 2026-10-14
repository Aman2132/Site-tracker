import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { AppEvent } from '@/types/domain';
import { EventCategory, eventCategory } from '@/utils/activityFeed';
import { formatClockTime } from '@/utils/formatters';

type IconName = keyof typeof Ionicons.glyphMap;

const CATEGORY_STYLE: Record<EventCategory, { icon: IconName; color: string; bg: string }> = {
  checkin: { icon: 'log-in-outline', color: colors.success, bg: colors.successBg },
  checkout: { icon: 'log-out-outline', color: colors.textMuted, bg: colors.background },
  pause: { icon: 'pause', color: colors.warning, bg: colors.warningBg },
  resume: { icon: 'play', color: colors.success, bg: colors.successBg },
  upload: { icon: 'camera', color: colors.primary, bg: colors.primarySoft },
  battery: { icon: 'battery-dead', color: colors.danger, bg: colors.dangerBg },
  crew: { icon: 'people', color: colors.primary, bg: colors.primarySoft },
  site: { icon: 'business', color: colors.primary, bg: colors.primarySoft },
  other: { icon: 'ellipse', color: colors.textFaint, bg: colors.background },
};

/**
 * One compact timeline row: type icon, text (with "×2" for merged repeats),
 * time of day (the section header carries the date). Tappable when it leads somewhere.
 */
export default function ActivityFeedItem({
  event,
  count,
  last,
  onPress,
}: {
  event: AppEvent;
  count: number;
  /** Last row of its day: no connector line below the icon. */
  last: boolean;
  onPress?: () => void;
}) {
  const style = CATEGORY_STYLE[eventCategory(event)];
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={styles.rail}>
        <View style={[styles.icon, { backgroundColor: style.bg }]}>
          <Ionicons name={style.icon} size={13} color={style.color} />
        </View>
        {!last && <View style={styles.line} />}
      </View>
      <View style={styles.body}>
        <Text style={styles.text} numberOfLines={2}>
          {event.text}
          {count > 1 && <Text style={styles.count}> ×{count}</Text>}
        </Text>
        <Text style={styles.time}>{formatClockTime(event.at)}</Text>
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={15} color={colors.textFaint} style={styles.chevron} />
      )}
    </TouchableOpacity>
  );
}

const ICON = 24;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: ICON },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  body: { flex: 1, paddingBottom: spacing.md, paddingTop: 3 },
  text: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.text, lineHeight: 17 },
  count: { fontFamily: fontFamily.bold, color: colors.textMuted },
  time: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.textFaint, marginTop: 1 },
  chevron: { marginTop: 4 },
});
