import React, { useId } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Defs,
  ClipPath,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
  Path,
  Circle,
  Rect,
  Ellipse,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../fonts';
import { colors, gradients, shadow } from '../theme';

// The drumstick mark, ported 1:1 from the brand sheet. Unique gradient/clip
// ids per instance so multiple marks on one screen don't collide.
function Drumstick({ size = 32 }) {
  const uid = useId().replace(/[:]/g, '');
  const grad = `wmGold-${uid}`;
  const clip = `wmMeat-${uid}`;
  const meatPath =
    'M48 82C41 71 43 55 54 44C62 35 74 28 86 32C99 37 101 57 92 69C84 79 70 83 60 85C54 86 51 86 48 82Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <SvgLinearGradient id={grad} x1="38" y1="100" x2="94" y2="26" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#a85e1d" />
          <Stop offset="0.45" stopColor="#cd8128" />
          <Stop offset="0.8" stopColor="#e3a23f" />
          <Stop offset="1" stopColor="#f1bf58" />
        </SvgLinearGradient>
        <ClipPath id={clip}>
          <Path d={meatPath} />
        </ClipPath>
      </Defs>
      <G transform="translate(60,62) scale(1.16) translate(-59.5,-70.6)">
        {/* bone — dark base */}
        <Path d="M55 78 L31 99" stroke="#201913" strokeWidth={15.5} strokeLinecap="round" fill="none" />
        <Circle cx={27} cy={96} r={9.2} fill="#201913" />
        <Circle cx={31} cy={105} r={8.2} fill="#201913" />
        {/* bone — light */}
        <Path d="M55 78 L31 99" stroke="#efe7d4" strokeWidth={9} strokeLinecap="round" fill="none" />
        <Circle cx={27} cy={96} r={6} fill="#efe7d4" />
        <Circle cx={31} cy={105} r={5.4} fill="#efe7d4" />
        {/* bone — shading */}
        <Path d="M22.5 99.2A6 6 0 0 0 32 98" fill="none" stroke="#cdbf9f" strokeWidth={2.4} strokeLinecap="round" />
        <Path d="M26.4 108A5.4 5.4 0 0 0 35.4 106.4" fill="none" stroke="#cdbf9f" strokeWidth={2.2} strokeLinecap="round" />
        <Path d="M53 80 L34 96" stroke="#cdbf9f" strokeWidth={2.2} strokeLinecap="round" opacity={0.65} />
        {/* meat */}
        <G clipPath={`url(#${clip})`}>
          <Rect x={0} y={0} width={120} height={120} fill={`url(#${grad})`} />
          <Path d="M44 60C55 69 65 56 76 63C83 67 89 60 96 57L98 100L38 100Z" fill="#6d3917" />
          <Path d="M60 39C70 33 82 34 88 43C83 39 73 39 65 45C62 47 60 44 60 39Z" fill="#f6cd76" opacity={0.6} />
          <Ellipse cx={82} cy={41} rx={4} ry={2.6} fill="#fbe6b0" opacity={0.7} transform="rotate(-32 82 41)" />
        </G>
        {/* meat outline + crease */}
        <Path d={meatPath} fill="none" stroke="#201913" strokeWidth={3.6} strokeLinejoin="round" />
        <Path d="M44 60C55 69 65 56 76 63C83 67 89 60 95 57" fill="none" stroke="#4a2710" strokeWidth={2.4} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

export function BrandMark({ size = 44 }) {
  const inner = Math.round(size * 0.78);
  return (
    <LinearGradient
      colors={gradients.pink}
      start={gradients.pinkStart}
      end={gradients.pinkEnd}
      style={[
        styles.brandMark,
        { width: size, height: size, borderRadius: Math.round(size * 0.28) },
      ]}
    >
      <Drumstick size={inner} />
    </LinearGradient>
  );
}

// 4-point sizzle star, from the brand motion sheet.
export function Sparkle({ size = 16, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 1C12.7 7 13 9.3 23 12 13 14.7 12.7 17 12 23 11.3 17 11 14.7 1 12 11 9.3 11.3 7 12 1Z"
        fill={color}
      />
    </Svg>
  );
}

export function Screen({ children, scroll = true, footer, padded = true }) {
  const content = (
    <View style={[styles.content, padded && styles.padded]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
            {content}
          </ScrollView>
        ) : content}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Button({ children, onPress, variant = 'primary', disabled = false, loading = false, style }) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        (pressed && !disabled && isPrimary) && styles.buttonPressedScale,
        (pressed && !disabled && variant === 'secondary') && styles.buttonPressedSecondary,
        (pressed && !disabled && variant === 'ghost') && styles.buttonPressedGhost,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {isPrimary ? (
            <LinearGradient
              colors={gradients.pink}
              start={gradients.pinkStart}
              end={gradients.pinkEnd}
              style={[StyleSheet.absoluteFill, pressed && !disabled && styles.buttonGradientPressed]}
            />
          ) : null}
          {loading ? (
            <ActivityIndicator color={isPrimary ? '#fff' : colors.text} />
          ) : (
            <Text style={[styles.buttonText, !isPrimary && styles.buttonTextSecondary]}>
              {children}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, tone = 'light', disabled = false }) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.iconButton,
        tone === 'dark' && styles.iconButtonDark,
        pressed && styles.buttonPressedSecondary,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Ionicons name={icon} size={22} color={tone === 'dark' ? '#fff' : colors.text} />
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline = false,
  autoCapitalize = 'sentences',
  autoCorrect,
  maxLength,
  rightIcon,
  onRightIconPress,
  rightIconLabel,
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputShell, multiline && styles.inputShellMultiline]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#b88794"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
        {rightIcon ? (
          <Pressable
            accessibilityLabel={rightIconLabel}
            onPress={onRightIconPress}
            hitSlop={8}
            style={styles.inputIconButton}
          >
            <Ionicons name={rightIcon} size={21} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Pill({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Header({ title, subtitle, onBack, right }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <IconButton icon="chevron-back" label="Back" onPress={onBack} />
      ) : (
        <BrandMark size={44} iconSize={23} />
      )}
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right || <View style={{ width: 44 }} />}
    </View>
  );
}

export function BottomTabs({ current, onNavigate, pending = 0 }) {
  const items = [
    { key: 'home', label: 'Feed', icon: 'albums' },
    { key: 'matches', label: 'Matches', icon: 'heart' },
    { key: 'chats', label: 'Chats', icon: 'chatbubble' },
    { key: 'profile', label: 'Profile', icon: 'person' },
  ];

  return (
    <View style={styles.tabsWrap}>
      <View style={styles.tabs}>
        {items.map((item) => {
          const active = current === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onNavigate(item.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <View>
                <Ionicons name={item.icon} size={21} color={active ? colors.pink : colors.muted} />
                {item.key === 'matches' && pending > 0 ? (
                  <View style={styles.badgeDot}>
                    <Text style={styles.badgeText}>{pending}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Avatar({ uri, name, size = 52 }) {
  const dims = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return (
      <View style={[styles.avatar, dims]}>
        <Image source={{ uri }} style={styles.avatarImage} />
      </View>
    );
  }
  return (
    <LinearGradient
      colors={gradients.pink}
      start={gradients.pinkStart}
      end={gradients.pinkEnd}
      style={[styles.avatar, dims]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>
        {name?.[0]?.toUpperCase() || '?'}
      </Text>
    </LinearGradient>
  );
}

export function EmptyState({ icon = 'sparkles', title, body }) {
  return (
    <Card style={styles.empty}>
      <Ionicons name={icon} size={34} color={colors.orange} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
  },
  padded: {
    padding: 20,
  },
  button: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  buttonPressedScale: {
    transform: [{ scale: 0.99 }],
  },
  buttonGradientPressed: {
    opacity: 0.9,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonPressedPrimary: {
    backgroundColor: colors.blackPressed,
    transform: [{ scale: 0.99 }],
  },
  buttonPressedSecondary: {
    backgroundColor: colors.secondaryPressed,
    borderColor: colors.black,
    transform: [{ scale: 0.99 }],
  },
  buttonPressedGhost: {
    backgroundColor: colors.surfaceWarm,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontFamily: fonts.bodyExtraBold,
    fontSize: 15,
  },
  buttonTextSecondary: {
    color: colors.text,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  iconButtonDark: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  field: {
    gap: 8,
    marginBottom: 14,
  },
  label: {
    color: colors.slate,
    fontSize: 13,
    fontFamily: fonts.bodyBold,
  },
  inputShell: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputShellMultiline: {
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 15,
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.body,
  },
  inputMultiline: {
    minHeight: 104,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  inputIconButton: {
    width: 48,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    ...shadow,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 13,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  pillActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  pillText: {
    color: colors.slate,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  pillTextActive: {
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  brandMark: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontFamily: fonts.displayExtraBold,
  },
  headerSubtitle: {
    color: colors.muted,
    marginTop: 2,
    fontSize: 13,
    fontFamily: fonts.body,
  },
  tabsWrap: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 8,
    backgroundColor: colors.background,
  },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
  },
  tab: {
    flex: 1,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 3,
  },
  tabActive: {
    backgroundColor: colors.surfaceWarm,
  },
  tabText: {
    fontSize: 11,
    color: colors.muted,
    fontFamily: fonts.bodyBold,
  },
  tabTextActive: {
    color: colors.pink,
  },
  badgeDot: {
    position: 'absolute',
    top: -7,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: fonts.bodyExtraBold,
  },
  avatar: {
    overflow: 'hidden',
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#fff',
    fontFamily: fonts.displayExtraBold,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 34,
    gap: 10,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontFamily: fonts.displayExtraBold,
  },
  emptyBody: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fonts.body,
  },
});
