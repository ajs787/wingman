import React from 'react';
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
import { Bird } from 'lucide-react-native';
import { fonts } from '../fonts';
import { colors, shadow } from '../theme';

export function BrandMark({ size = 44, iconSize = 24 }) {
  return (
    <View
      style={[
        styles.brandMark,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.34),
        },
      ]}
    >
      <View style={styles.websiteBird}>
        <Bird
          size={iconSize}
          color={colors.logoPink}
          strokeWidth={2.55}
        />
      </View>
    </View>
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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        (pressed && !disabled && variant === 'primary') && styles.buttonPressedPrimary,
        (pressed && !disabled && variant === 'secondary') && styles.buttonPressedSecondary,
        (pressed && !disabled && variant === 'ghost') && styles.buttonPressedGhost,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.text} />
      ) : (
        <Text style={[
          styles.buttonText,
          variant !== 'primary' && styles.buttonTextSecondary,
        ]}
        >
          {children}
        </Text>
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
                <Ionicons name={item.icon} size={21} color={active ? colors.text : '#94a3b8'} />
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
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImage} />
      ) : (
        <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>
          {name?.[0]?.toUpperCase() || '?'}
        </Text>
      )}
    </View>
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
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  websiteBird: {
    transform: [{ rotate: '-12deg' }, { scaleX: -1 }],
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
    color: '#94a3b8',
    fontFamily: fonts.bodyBold,
  },
  tabTextActive: {
    color: colors.text,
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
