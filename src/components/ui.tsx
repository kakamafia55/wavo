import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableStateCallbackType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../core/locale';

export const theme = {
  bg: '#090D16',
  card: '#121B2A',
  border: '#233047',
  aqua: '#71F2CB',
  blue: '#8AB5FF',
  text: '#F3F6FD',
  muted: '#93A2BC',
  danger: '#FFB3A6',
  radius: 22,
  sendBg: '#71F2CB',
  sendText: '#123B30',
  recvBg: '#1B2C45',
  recvBorder: '#304563',
  glow: '#142A2B',
} as const;

export const Fonts = {
  regular: 'Cairo_400Regular',
  semibold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
  extrabold: 'Cairo_800ExtraBold',
} as const;

export function FadeIn({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity]);
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

export function Pulse({ size = 220, color = theme.aqua }: { size?: number; color?: string }) {
  const first = useRef(new Animated.Value(0)).current;
  const second = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = (value: Animated.Value, delay: number) => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: 1, duration: 1600, useNativeDriver: true }),
        ])
      );
      animation.start();
      return animation;
    };
    const a = run(first, 0);
    const b = run(second, 800);
    return () => {
      a.stop();
      b.stop();
    };
  }, [first, second]);
  const ring = (value: Animated.Value) => ({
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.25] }) }],
  });
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          styles.pulseRing,
          { width: size, height: size, borderRadius: size / 2, borderColor: color },
          ring(first),
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          { width: size, height: size, borderRadius: size / 2, borderColor: color },
          ring(second),
        ]}
      />
      <View style={[styles.pulseCore, { width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14, backgroundColor: color }]} />
    </View>
  );
}

export function Header() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Text style={styles.wordmark}>
        {t.appName}
        <Text style={{ color: theme.aqua }}>.</Text>
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.tabs.setup}
        style={styles.iconButton}
        onPress={() => router.push('/setup')}
      >
        <Ionicons name="options-outline" size={22} color={theme.text} />
      </Pressable>
    </View>
  );
}

export function Footer() {
  const { t } = useTranslation();
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText} numberOfLines={1}>
        {t.footer}
      </Text>
    </View>
  );
}

const TABS = [
  { href: '/', icon: 'home', iconOutline: 'home-outline', labelKey: 'home' },
  { href: '/history', icon: 'time', iconOutline: 'time-outline', labelKey: 'activity' },
  { href: '/setup', icon: 'construct', iconOutline: 'construct-outline', labelKey: 'setup' },
] as const;

export function TabBar() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Pressable
            key={tab.href}
            accessibilityRole="button"
            style={styles.tabItem}
            onPress={() => router.replace(tab.href as '/')}
          >
            <Ionicons
              name={(active ? tab.icon : tab.iconOutline) as keyof typeof Ionicons.glyphMap}
              size={22}
              color={active ? theme.aqua : theme.muted}
            />
            <Text style={[styles.tabLabel, { color: active ? theme.aqua : theme.muted }]}>
              {t.tabs[tab.labelKey as 'home' | 'activity' | 'setup']}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Page({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.glow} pointerEvents="none" />
      <Header />
      {scroll ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.contentContainer]}>{children}</View>
      )}
      <Footer />
      <TabBar />
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={(state: PressableStateCallbackType) => [styles.card, style, state.pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export type ButtonVariant = 'primary' | 'ghost' | 'blue' | 'danger';

export function Btn({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  icon,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.aqua, fg: '#090D16', border: 'transparent' },
    ghost: { bg: 'transparent', fg: theme.text, border: theme.border },
    blue: { bg: theme.recvBg, fg: theme.blue, border: theme.recvBorder },
    danger: { bg: 'transparent', fg: theme.danger, border: theme.danger },
  };
  const colors = palette[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={(state) => [
        styles.button,
        { backgroundColor: colors.bg, borderColor: colors.border },
        state.pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={colors.fg} style={styles.buttonIcon} /> : null}
      <Text style={[styles.buttonLabel, { color: colors.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function Title({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Sub({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.sub, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Row({
  children,
  style,
  spaceBetween = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  spaceBetween?: boolean;
}) {
  return (
    <View style={[styles.row, spaceBetween && styles.rowBetween, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  glow: {
    position: 'absolute',
    top: -140,
    right: -140,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: theme.glow,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  wordmark: {
    fontFamily: Fonts.extrabold,
    fontSize: 30,
    color: theme.text,
    letterSpacing: 0.5,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  footerText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: theme.muted,
    writingDirection: 'ltr',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.card,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  tabLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 18,
  },
  pressed: {
    opacity: 0.75,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  buttonIcon: {
    marginEnd: 2,
  },
  buttonLabel: {
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
  disabled: {
    opacity: 0.45,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: theme.card,
  },
  pillActive: {
    backgroundColor: theme.aqua,
    borderColor: theme.aqua,
  },
  pillLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: theme.muted,
  },
  pillLabelActive: {
    color: '#090D16',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: theme.text,
  },
  sub: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: theme.text,
  },
  muted: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: theme.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowBetween: {
    justifyContent: 'space-between',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  pulseCore: {
    opacity: 0.9,
  },
});
