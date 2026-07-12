import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import {
  apiRequest,
  clearSession,
  getStoredUser,
  imageUrl,
  login,
  logout,
  photoFormFile,
  resendEmailVerification,
  signup,
  verifyEmail,
} from './src/api/client';
import {
  Avatar,
  BrandMark,
  BottomTabs,
  Button,
  Card,
  EmptyState,
  Header,
  IconButton,
  Pill,
  Screen,
  Sparkle,
  TextField,
} from './src/components/ui';
import { fontAssets, fonts } from './src/fonts';
import { colors, gradients, shadow } from './src/theme';
import {
  CLASS_YEARS,
  GENDERS,
  LOOKING_FOR,
  PROMPT_GROUPS,
  US_COLLEGES,
  US_MAJORS,
} from './src/options';

function firstPhoto(profile) {
  return imageUrl(profile?.photos?.[0]?.url || profile?.photos?.[0]);
}

function initialsName(profile) {
  return profile?.first_name || profile?.name || 'there';
}

const MAX_PROFILE_PHOTOS = 5;
const PHOTO_GRID_COLUMNS = 3;
const PHOTO_GRID_GAP = 10;
const INVITE_CODE_LENGTH = 8;
const DEFAULT_DISTANCE_MILES = 50;
const ONBOARDING_STEPS = [
  { title: 'About you', subtitle: 'Start with the essentials.', icon: 'person' },
  { title: 'School', subtitle: 'Add enough context for better matches.', icon: 'school' },
  { title: 'Photos', subtitle: 'Pick the photos people will see first.', icon: 'images' },
  { title: 'Prompts', subtitle: 'Add a line or two if you want.', icon: 'chatbubble-ellipses' },
];

function normalizeLookingFor(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value) {
  return Array.isArray(value) ? value.join(', ') : value;
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function LoadingScreen() {
  return (
    <Screen scroll={false}>
      <View style={styles.centered}>
        <BrandMark size={56} iconSize={31} />
        <ActivityIndicator color={colors.black} />
      </View>
    </Screen>
  );
}

// Spring easing from the brand motion sheet: cubic-bezier(.22,.9,.3,1).
const BRAND_SPRING = Easing.bezier(0.22, 0.9, 0.3, 1);

function IntroScreen({ onDone }) {
  // Icon tile is 128px inside a 150px stage, matching the launch spec's ratio
  // (a too-small tile is what made the ring look oversized before).
  const introLogoSize = 128;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const backdropOpacity = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.45)).current;
  const logoRotate = useRef(new Animated.Value(-10)).current; // degrees
  const introLift = useRef(new Animated.Value(0)).current;
  const introScale = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(0.4)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleLift = useRef(new Animated.Value(16)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const idleBob = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;
  const spark1 = useRef(new Animated.Value(0)).current;
  const spark2 = useRef(new Animated.Value(0)).current;
  const spark3 = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.4)).current;
  const dot2 = useRef(new Animated.Value(0.4)).current;
  const dot3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const sparkPop = (value, delay) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration: 170, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]);

    const dotPulse = (value, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: 1, duration: 440, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.35, duration: 440, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      );

    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(idleBob, { toValue: -9, duration: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(idleBob, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );

    // Radial glow behind the icon breathes 0.5 -> 0.9 (wm-glow).
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.9, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.5, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );

    // Spring-in with the overshoot wobble from wm-icon-in:
    // scale 0.45 -> 1.12 -> 0.95 -> 1.02 -> 1, rotate -10 -> 4 -> -2 -> 1 -> 0.
    const wobbleStep = (scaleTo, rotTo, duration, easing = Easing.inOut(Easing.quad)) =>
      Animated.parallel([
        Animated.timing(logoScale, { toValue: scaleTo, duration, easing, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: rotTo, duration, easing, useNativeDriver: true }),
      ]);

    const springIn = Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        wobbleStep(1.12, 4, 240, BRAND_SPRING), // overshoot
        wobbleStep(0.95, -2, 150),              // settle back
        wobbleStep(1.02, 1, 140),
        wobbleStep(1, 0, 130),
      ]),
    ]);

    const main = Animated.sequence([
      // 1. spring in + ring pulse + sizzle sparks
      Animated.parallel([
        springIn,
        Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0.5, duration: 120, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(ringScale, { toValue: 1.5, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]),
        ]),
        sparkPop(spark1, 210),
        sparkPop(spark2, 340),
        sparkPop(spark3, 450),
      ]),
      // 2. wordmark + tagline rise, loading dots appear
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(titleLift, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(160),
          Animated.timing(tagOpacity, { toValue: 1, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(120),
          Animated.timing(dotsOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        ]),
      ]),
      // 3. idle hold (bob + dots pulse)
      Animated.delay(760),
      // 4. hand off to the app
      Animated.parallel([
        Animated.timing(containerOpacity, { toValue: 0, duration: 540, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(introLift, { toValue: -40, duration: 640, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(introScale, { toValue: 0.94, duration: 640, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);

    bob.start();
    glow.start();
    const dotLoops = [dotPulse(dot1, 0), dotPulse(dot2, 150), dotPulse(dot3, 300)];
    dotLoops.forEach((loop) => loop.start());
    main.start(({ finished }) => {
      if (finished) onDone();
    });

    return () => {
      main.stop();
      bob.stop();
      glow.stop();
      dotLoops.forEach((loop) => loop.stop());
    };
  }, [onDone]);

  const logoRotateDeg = logoRotate.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] });

  return (
    <View pointerEvents="none" style={styles.introOverlay}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
        <LinearGradient
          colors={['#2c2521', '#1f1a17', '#171310']}
          locations={[0, 0.6, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.introGlow, { opacity: Animated.multiply(glowOpacity, backdropOpacity) }]} />
      <Animated.View
        style={[
          styles.introRoot,
          {
            opacity: containerOpacity,
            transform: [{ translateY: introLift }, { scale: introScale }],
          },
        ]}
      >
        <View style={styles.introLogoWrap}>
          <Animated.View
            style={[styles.introRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
          />
          <Animated.View
            style={[
              styles.introSpark,
              styles.introSpark1,
              { opacity: spark1, transform: [{ scale: spark1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.1] }) }] },
            ]}
          >
            <Sparkle size={22} color="#ffffff" />
          </Animated.View>
          <Animated.View
            style={[
              styles.introSpark,
              styles.introSpark2,
              { opacity: spark2, transform: [{ scale: spark2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.1] }) }] },
            ]}
          >
            <Sparkle size={14} color="#ffe2ec" />
          </Animated.View>
          <Animated.View
            style={[
              styles.introSpark,
              styles.introSpark3,
              { opacity: spark3, transform: [{ scale: spark3.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.1] }) }] },
            ]}
          >
            <Sparkle size={12} color="#ffffff" />
          </Animated.View>
          <Animated.View
            style={[
              styles.introLogo,
              {
                opacity: logoOpacity,
                transform: [{ translateY: idleBob }, { scale: logoScale }, { rotate: logoRotateDeg }],
              },
            ]}
          >
            <BrandMark size={introLogoSize} />
          </Animated.View>
        </View>
        <Animated.Text
          style={[
            styles.introTitle,
            { opacity: titleOpacity, transform: [{ translateY: titleLift }] },
          ]}
        >
          wing<Text style={styles.introTitleAccent}>man</Text>
        </Animated.Text>
        <Animated.Text style={[styles.introTagline, { opacity: tagOpacity }]}>
          you're the matchmaker
        </Animated.Text>
      </Animated.View>
      <Animated.View style={[styles.introDots, { opacity: dotsOpacity }]}>
        <Animated.View style={[styles.introDot, { opacity: dot1 }]} />
        <Animated.View style={[styles.introDot, { opacity: dot2 }]} />
        <Animated.View style={[styles.introDot, { opacity: dot3 }]} />
      </Animated.View>
    </View>
  );
}

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isSignup = mode === 'signup';
  const needsVerification = !!verificationEmail;

  async function submit() {
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    if (isSignup && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const user = isSignup
        ? await signup(email.trim().toLowerCase(), password)
        : await login(email.trim().toLowerCase(), password);
      if (user.requiresEmailVerification) {
        setVerificationEmail(user.email);
        setVerificationCode(user.devVerificationCode || '');
        setNotice('Enter the 6-digit code we sent to your school email.');
        return;
      }
      await onAuthed(user);
    } catch (err) {
      if (err.data?.code === 'EMAIL_NOT_VERIFIED') {
        setVerificationEmail(err.data.email || email.trim().toLowerCase());
        setNotice('Verify your email before logging in.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitVerification() {
    setError('');
    setNotice('');
    if (verificationCode.trim().length !== 6) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const user = await verifyEmail(verificationEmail, verificationCode.trim());
      await onAuthed(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setError('');
    setNotice('');
    setResending(true);
    try {
      const data = await resendEmailVerification(verificationEmail);
      if (data.devVerificationCode) setVerificationCode(data.devVerificationCode);
      setNotice(data.alreadyVerified ? 'Email is already verified. Try logging in.' : 'A new code was sent.');
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  if (needsVerification) {
    return (
      <Screen>
        <View style={styles.authScreenBody}>
          <View style={styles.authHero}>
            <BrandMark size={66} />
            <Text style={[styles.appName, styles.appNameStacked]}>wing<Text style={styles.appNameAccent}>man</Text></Text>
            <Text style={styles.brandTagline}>verify your school email</Text>
          </View>

          <Card style={styles.authCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="mail" size={20} color={colors.amber} />
              <Text style={styles.sectionTitleNoMargin}>Check your inbox</Text>
            </View>
            <Text style={styles.helpText}>We sent a 6-digit code to {verificationEmail}.</Text>
            <TextField
              label="Verification code"
              value={verificationCode}
              onChangeText={(value) => setVerificationCode(value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              keyboardType="number-pad"
              autoCapitalize="none"
              maxLength={6}
            />
            {notice ? (
              <View style={styles.noticeBanner}>
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ) : null}
            <ErrorBanner message={error} />
            <Button onPress={submitVerification} loading={loading}>Verify email</Button>
            <View style={{ height: 12 }} />
            <Button variant="secondary" onPress={resendVerification} loading={resending}>Resend code</Button>
            <View style={{ height: 12 }} />
            <Button
              variant="ghost"
              onPress={() => {
                setVerificationEmail('');
                setVerificationCode('');
                setError('');
                setNotice('');
              }}
            >
              Back to login
            </Button>
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.authScreenBody}>
        <View style={styles.authHero}>
          <BrandMark size={72} />
          <Text style={[styles.appName, styles.appNameStacked]}>wing<Text style={styles.appNameAccent}>man</Text></Text>
          <Text style={styles.brandTagline}>you're the matchmaker</Text>
        </View>

        <Card style={styles.authCard}>
          <View style={styles.segment}>
            <Pressable
              onPress={() => setMode('login')}
              style={[styles.segmentItem, !isSignup && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, !isSignup && styles.segmentTextActive]}>Log in</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('signup')}
              style={[styles.segmentItem, isSignup && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, isSignup && styles.segmentTextActive]}>Sign up</Text>
            </Pressable>
          </View>

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@school.edu"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            rightIcon={passwordVisible ? 'eye-outline' : 'eye-off-outline'}
            rightIconLabel={passwordVisible ? 'Hide password' : 'Show password'}
            onRightIconPress={() => setPasswordVisible((current) => !current)}
          />
          {isSignup ? (
            <TextField
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Confirm password"
              secureTextEntry={!confirmVisible}
              autoCapitalize="none"
              rightIcon={confirmVisible ? 'eye-outline' : 'eye-off-outline'}
              rightIconLabel={confirmVisible ? 'Hide password' : 'Show password'}
              onRightIconPress={() => setConfirmVisible((current) => !current)}
            />
          ) : null}
          <ErrorBanner message={error} />
          <Button onPress={submit} loading={loading}>
            {isSignup ? 'Create account' : 'Log in'}
          </Button>
        </Card>
      </View>
    </Screen>
  );
}

function OptionRow({ title, options, value, onChange, multi = false, multiMax = 3 }) {
  const selected = Array.isArray(value) ? value : [value].filter(Boolean);
  function toggle(option) {
    if (!multi) {
      onChange(option);
      return;
    }
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option].slice(0, multiMax));
    }
  }

  return (
    <View style={styles.optionBlock}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.pillWrap}>
        {options.map((option) => (
          <Pill
            key={option}
            label={option}
            active={selected.includes(option)}
            onPress={() => toggle(option)}
          />
        ))}
      </View>
    </View>
  );
}

function RangeSlider({ label, value, onChange, min, max, suffix = '', maxLabel }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const clampedValue = Math.min(max, Math.max(min, Number(value) || min));
  const percent = (clampedValue - min) / (max - min);

  function updateFromX(x) {
    if (!trackWidth) return;
    const nextPercent = Math.min(1, Math.max(0, x / trackWidth));
    onChange(Math.round(min + nextPercent * (max - min)));
  }

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => updateFromX(event.nativeEvent.locationX),
    onPanResponderMove: (event) => updateFromX(event.nativeEvent.locationX),
  }), [trackWidth, min, max]);

  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{clampedValue}{suffix}</Text>
      </View>
      <View
        {...panResponder.panHandlers}
        style={styles.sliderTrack}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      >
        <View style={[styles.sliderFill, { width: `${percent * 100}%` }]} />
        <View style={[styles.sliderThumb, { left: `${percent * 100}%` }]} />
      </View>
      <View style={styles.sliderRange}>
        <Text style={styles.helpText}>{min}{suffix}</Text>
        <Text style={styles.helpText}>{maxLabel || `${max}+${suffix}`}</Text>
      </View>
    </View>
  );
}

function AgeSlider({ value, onChange, min = 18, max = 35 }) {
  return <RangeSlider label="Age" value={value} onChange={onChange} min={min} max={max} maxLabel={`${max}+`} />;
}

function DistanceSlider({ value, onChange }) {
  return (
    <RangeSlider
      label="Feed distance"
      value={value}
      onChange={onChange}
      min={5}
      max={100}
      suffix=" mi"
      maxLabel="100+ mi"
    />
  );
}

function SearchSelectField({ label, value, options, onChange, icon = 'search' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();
  const filteredOptions = options
    .filter((option) => option.toLowerCase().includes(trimmedQuery.toLowerCase()))
    .slice(0, 36);

  function choose(option) {
    onChange(option);
    setQuery('');
    setOpen(false);
  }

  return (
    <View style={styles.fieldLike}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Pressable style={styles.selectField} onPress={() => setOpen(true)}>
        <Ionicons name={icon} size={19} color={colors.orange} />
        <Text style={[styles.selectValue, !value && styles.selectPlaceholder]}>
          {value || `Select or type ${label.toLowerCase()}`}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <Modal visible={open} animationType="slide">
        <Screen>
          <Header title={label} subtitle="Pick a match or type your own." onBack={() => setOpen(false)} />
          <TextField
            label={`Search ${label.toLowerCase()}`}
            value={query}
            onChangeText={setQuery}
            placeholder={`Type ${label.toLowerCase()}`}
            autoCapitalize="words"
          />
          {trimmedQuery ? (
            <Pressable style={styles.selectOptionPrimary} onPress={() => choose(trimmedQuery)}>
              <Ionicons name="create" size={19} color="#fff" />
              <Text style={styles.selectOptionPrimaryText}>Use "{trimmedQuery}"</Text>
            </Pressable>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled">
            {filteredOptions.map((option) => (
              <Pressable key={option} style={styles.selectOption} onPress={() => choose(option)}>
                <Text style={styles.selectOptionText}>{option}</Text>
                {value === option ? <Ionicons name="checkmark" size={20} color={colors.orange} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </Screen>
      </Modal>
    </View>
  );
}

function photoPromptForIndex(promptRows, index) {
  return promptRows[index] || {};
}

function getPromptAnswer(prompt) {
  return prompt?.prompt_answer || prompt?.answer || '';
}

function getProfilePhotoUri(photo) {
  if (!photo) return null;
  if (typeof photo === 'string') return imageUrl(photo);
  return photo.uri || imageUrl(photo.url || photo);
}

function ProfileAlternatingSections({ prompts = [], photos = [] }) {
  const promptRows = prompts
    .map((prompt) => ({ prompt: prompt.prompt, answer: getPromptAnswer(prompt) }))
    .filter((prompt) => prompt.prompt && prompt.answer);
  const extraPhotos = photos.slice(1);
  const rows = [];
  const count = Math.max(promptRows.length, extraPhotos.length);

  for (let index = 0; index < count; index += 1) {
    const prompt = promptRows[index];
    const photoUri = getProfilePhotoUri(extraPhotos[index]);

    if (prompt) {
      rows.push(
        <Card key={`prompt-${index}`} style={styles.promptDisplay}>
          <Text style={styles.promptQuestion}>{prompt.prompt}</Text>
          <Text style={styles.promptAnswer}>{prompt.answer}</Text>
        </Card>
      );
    }

    if (photoUri) {
      rows.push(
        <Image key={`photo-${index}-${photoUri}`} source={{ uri: photoUri }} style={styles.extraPhoto} />
      );
    }
  }

  return rows;
}

function StepHeader({ step, total }) {
  return (
    <View style={styles.stepHero}>
      <View style={styles.stepIcon}>
        <Ionicons name={step.icon} size={28} color="#fff" />
      </View>
      <Text style={styles.stepKicker}>Step {step.index + 1} of {total}</Text>
      <Text style={styles.stepTitle}>{step.title}</Text>
      <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
      <View style={styles.stepDots}>
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={[styles.stepDot, index <= step.index && styles.stepDotActive]}
          />
        ))}
      </View>
    </View>
  );
}

function ProfilePreviewModal({ visible, profile, onClose }) {
  const photos = profile.photos || [];
  const mainPhoto = getProfilePhotoUri(photos[0]);

  return (
    <Modal visible={visible} animationType="slide">
      <Screen>
        <Header title="Profile preview" subtitle="Check how your profile will look." onBack={onClose} />
        <View style={styles.candidateCard}>
          <View style={styles.candidateImageWrap}>
            {mainPhoto ? (
              <Image source={{ uri: mainPhoto }} style={styles.candidateImage} />
            ) : (
              <View style={styles.candidateImageEmpty}>
                <Text style={styles.avatarTextLarge}>{profile.name?.[0] || '?'}</Text>
              </View>
            )}
            <View style={styles.imageShade} />
            <View style={styles.imageCaption}>
              <Text style={styles.candidateName}>{profile.name || 'Your name'}{profile.age ? `, ${profile.age}` : ''}</Text>
              <Text style={styles.candidateMeta}>{profile.school || 'School'} · {profile.major || 'Major'}</Text>
            </View>
          </View>

          <Card style={styles.detailCard}>
            <InfoRow icon="school" label="School" value={profile.school} />
            <InfoRow icon="book" label="Major" value={profile.major} />
            <InfoRow icon="calendar" label="Year" value={profile.year} />
            <InfoRow icon="heart" label="Looking for" value={joinList(profile.lookingFor)} />
          </Card>

          <ProfileAlternatingSections prompts={profile.prompts} photos={photos} />
        </View>
        <Button onPress={onClose}>Back to editing</Button>
      </Screen>
    </Modal>
  );
}

function PhotoSlot({
  photo,
  index,
  reorderMode,
  slotWidth,
  swapTarget,
  swapFromIndex,
  onPick,
  onRemove,
  onMove,
  onDragTarget,
  onDragStart,
}) {
  const drag = useRef(new Animated.ValueXY()).current;
  const [dragging, setDragging] = useState(false);
  const slotHeight = slotWidth ? slotWidth * 4 / 3 : 0;

  function targetIndexForGesture(gesture) {
    if (!slotWidth || !slotHeight) return index;
    const strideX = slotWidth + PHOTO_GRID_GAP;
    const strideY = slotHeight + PHOTO_GRID_GAP;
    const colDelta = Math.round(gesture.dx / strideX);
    const rowDelta = Math.round(gesture.dy / strideY);
    return Math.max(
      0,
      Math.min(MAX_PROFILE_PHOTOS - 1, index + rowDelta * PHOTO_GRID_COLUMNS + colDelta)
    );
  }

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => reorderMode && !!photo,
    onStartShouldSetPanResponderCapture: () => reorderMode && !!photo,
    onMoveShouldSetPanResponder: (_, gesture) => (
      reorderMode && !!photo && (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3)
    ),
    onPanResponderGrant: () => {
      setDragging(true);
      onDragStart(index);
      drag.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: Animated.event(
      [null, { dx: drag.x, dy: drag.y }],
      {
        useNativeDriver: false,
        listener: (_, gesture) => {
          const nextTarget = targetIndexForGesture(gesture);
          onDragTarget(nextTarget !== index ? nextTarget : null);
        },
      }
    ),
    onPanResponderRelease: (_, gesture) => {
      setDragging(false);
      onDragTarget(null);
      onDragStart(null);
      Animated.spring(drag, {
        toValue: { x: 0, y: 0 },
        friction: 8,
        tension: 80,
        useNativeDriver: false,
      }).start();

      const distance = Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy));
      if (distance < 18) return;

      const targetIndex = targetIndexForGesture(gesture);
      if (targetIndex !== index) onMove(index, targetIndex);
    },
    onPanResponderTerminate: () => {
      setDragging(false);
      onDragTarget(null);
      onDragStart(null);
      Animated.spring(drag, {
        toValue: { x: 0, y: 0 },
        friction: 8,
        tension: 80,
        useNativeDriver: false,
      }).start();
    },
  }), [drag, index, onDragStart, onDragTarget, onMove, photo, reorderMode, slotHeight, slotWidth]);

  const dragHandlers = reorderMode && photo ? panResponder.panHandlers : {};
  const slotStrideX = slotWidth + PHOTO_GRID_GAP;
  const slotStrideY = slotHeight + PHOTO_GRID_GAP;
  const swapTransform = swapTarget && swapFromIndex !== null && slotWidth
    ? [
      { translateX: ((swapFromIndex % PHOTO_GRID_COLUMNS) - (index % PHOTO_GRID_COLUMNS)) * slotStrideX },
      { translateY: (Math.floor(swapFromIndex / PHOTO_GRID_COLUMNS) - Math.floor(index / PHOTO_GRID_COLUMNS)) * slotStrideY },
      { scale: 0.96 },
    ]
    : [];

  const slotContent = photo?.existingUrl ? (
    <>
      <Image source={{ uri: photo.existingUrl }} style={styles.photoImage} />
      <View style={styles.photoPositionBadge}>
        <Text style={styles.photoPositionText}>{index + 1}</Text>
      </View>
      <Pressable style={styles.photoRemove} onPress={() => onRemove(index)}>
        <Ionicons name="close" size={14} color="#fff" />
      </Pressable>
      {reorderMode ? (
        <View style={styles.photoDragHandle}>
          <Ionicons name="reorder-three" size={23} color="#fff" />
        </View>
      ) : null}
    </>
  ) : (
    <View style={styles.photoEmpty}>
      <Ionicons name="image" size={24} color={colors.muted} />
      <Text style={styles.photoEmptyText}>{index === 0 ? 'Main' : `Photo ${index + 1}`}</Text>
    </View>
  );

  return (
    <Animated.View
      {...dragHandlers}
      style={[
        styles.photoSlot,
        reorderMode && photo && styles.photoSlotDraggable,
        swapTarget && styles.photoSlotSwapTarget,
        dragging && styles.photoSlotDragging,
        {
          transform: dragging ? drag.getTranslateTransform() : swapTransform,
          zIndex: dragging ? 20 : 1,
        },
      ]}
    >
      <Pressable
        style={styles.photoSlotPressable}
        onPress={() => {
          if (!reorderMode) onPick(index);
        }}
      >
        {slotContent}
      </Pressable>
    </Animated.View>
  );
}

function OnboardingScreen({ profile, onComplete, onBack, editing = false, allAtOnce = false }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [age, setAge] = useState(profile?.age ? Number(profile.age) : 18);
  const [school, setSchool] = useState(profile?.school || '');
  const [year, setYear] = useState(profile?.year || '');
  const [major, setMajor] = useState(profile?.majors?.[0] || profile?.major || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [lookingFor, setLookingFor] = useState(() => normalizeLookingFor(profile?.looking_for));
  const [photos, setPhotos] = useState(() => {
    const initial = Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
      const existing = profile?.photos?.find((photo) => photo.position === index);
      return existing ? {
        id: existing.filename || `existing-${index}`,
        existingUrl: imageUrl(existing.url),
        filename: existing.filename,
        prompt: existing.prompt || '',
        answer: existing.prompt_answer || '',
      } : null;
    });
    return initial;
  });
  const [promptRows, setPromptRows] = useState(() => (
    [0, 1, 2].map((index) => ({
      prompt: profile?.photos?.[index]?.prompt || PROMPT_GROUPS[index][0],
      answer: profile?.photos?.[index]?.prompt_answer || '',
    }))
  ));
  const [reorderMode, setReorderMode] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [photoGridWidth, setPhotoGridWidth] = useState(0);
  const [swapTargetIndex, setSwapTargetIndex] = useState(null);
  const [dragSourceIndex, setDragSourceIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openPhotoCount = photos.filter((photo) => !photo).length;
  const filledPhotoCount = photos.length - openPhotoCount;
  const photoSlotWidth = photoGridWidth
    ? (photoGridWidth - PHOTO_GRID_GAP * (PHOTO_GRID_COLUMNS - 1)) / PHOTO_GRID_COLUMNS
    : 0;
  const currentStep = { ...ONBOARDING_STEPS[stepIndex], index: stepIndex };
  const isLastStep = allAtOnce || stepIndex === ONBOARDING_STEPS.length - 1;
  const requiredComplete = [firstName, age, year, gender].every((value) => String(value || '').trim()) && lookingFor.length > 0;
  const basicsComplete = [firstName, age, gender].every((value) => String(value || '').trim()) && lookingFor.length > 0;

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  function getOpenIndexesFrom(index, currentPhotos) {
    const openIndexes = currentPhotos
      .map((photo, photoIndex) => (!photo ? photoIndex : null))
      .filter((photoIndex) => photoIndex !== null);
    if (!openIndexes.includes(index)) return openIndexes;
    return [index, ...openIndexes.filter((photoIndex) => photoIndex !== index)];
  }

  async function pickPhoto(index) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo permission needed', 'Allow photo access to add profile pictures.');
      return;
    }

    const replacingPhoto = !!photos[index];
    const targetIndexes = replacingPhoto ? [index] : getOpenIndexesFrom(index, photos);
    if (!targetIndexes.length) {
      Alert.alert('Photo slots full', 'Remove a photo before adding another one.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: targetIndexes.length > 1,
      selectionLimit: targetIndexes.length,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (result.canceled) return;
    const assets = (result.assets || []).slice(0, targetIndexes.length);
    if (!assets.length) return;

    setPhotos((prev) => {
      const next = [...prev];
      assets.forEach((asset, assetIndex) => {
        const targetIndex = targetIndexes[assetIndex];
        next[targetIndex] = {
          id: asset.assetId || `${asset.uri}-${Date.now()}-${assetIndex}`,
          asset,
          existingUrl: asset.uri,
        };
      });
      return next;
    });
  }

  function addPhotos() {
    const firstOpenIndex = photos.findIndex((photo) => !photo);
    if (firstOpenIndex === -1) {
      Alert.alert('Photo slots full', 'Remove a photo before adding another one.');
      return;
    }
    pickPhoto(firstOpenIndex);
  }

  function removePhoto(index) {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }

  function movePhoto(index, targetIndex) {
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPhotos((prev) => {
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function updateLookingFor(next) {
    const selectedEveryone = next.includes('Everyone') && !lookingFor.includes('Everyone');
    if (selectedEveryone) {
      setLookingFor(['Everyone']);
      return;
    }
    setLookingFor(next.filter((item) => item !== 'Everyone'));
  }

  function updatePrompt(index, key, value) {
    setPromptRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  }

  function buildPreviewProfile() {
    return {
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      age,
      school,
      major,
      location,
      year,
      lookingFor,
      prompts: promptRows,
      photos: photos
        .map((photo, index) => (
          photo
            ? { uri: photo.existingUrl, ...photoPromptForIndex(promptRows, index) }
            : null
        ))
        .filter(Boolean),
    };
  }

  function goBackStep() {
    setError('');
    if (allAtOnce) {
      onBack?.();
      return;
    }
    if (stepIndex > 0) {
      setStepIndex((current) => current - 1);
      return;
    }
    onBack?.();
  }

  function goNextStep() {
    setError('');
    if (stepIndex === 0 && !basicsComplete) {
      setError('Add your first name, age, gender, and what you are looking for.');
      return;
    }
    if (stepIndex === 1 && !String(year || '').trim()) {
      setError('Pick your class year before moving on.');
      return;
    }
    setStepIndex((current) => Math.min(ONBOARDING_STEPS.length - 1, current + 1));
  }

  function openPreview() {
    setError('');
    if (!requiredComplete) {
      setError('Finish the required fields before previewing your profile.');
      return;
    }
    setPreviewOpen(true);
  }

  async function saveProfile() {
    setError('');
    const required = [firstName, age, year, gender];
    if (required.some((value) => !String(value || '').trim()) || lookingFor.length === 0) {
      setError('Finish the required fields first.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        age: Number(age),
        school: school.trim() || undefined,
        year,
        majors: [major.trim()].filter(Boolean),
        minors: [],
        major: major.trim() || undefined,
        location: location.trim() || null,
        gender,
        looking_for: lookingFor.join(', '),
        personality_answer: null,
        favorite_cuisine: undefined,
        favorite_cuisines: [],
        race_ethnicities: [],
        alcohol_use: null,
        weed_use: null,
        drug_use: null,
      };
      await apiRequest('/api/profile', { method: 'PUT', body: payload });

      const existingPhotos = photos
        .map((photo, index) => {
          if (!photo?.filename || photo.asset) return null;
          const promptRow = photoPromptForIndex(promptRows, index);
          return {
            position: index,
            filename: photo.filename,
            prompt: promptRow.prompt || null,
            prompt_answer: promptRow.answer || null,
          };
        })
        .filter(Boolean);

      if (editing || existingPhotos.length) {
        await apiRequest('/api/photos?action=reorder', {
          method: 'POST',
          body: { photos: existingPhotos },
        });
      }

      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        if (!photo?.asset) continue;

        const fd = new FormData();
        fd.append('file', photoFormFile(photo.asset, index));
        fd.append('position', String(index));
        const promptRow = photoPromptForIndex(promptRows, index);
        if (promptRow.prompt) fd.append('prompt', promptRow.prompt);
        if (promptRow.answer) fd.append('prompt_answer', promptRow.answer);
        await apiRequest('/api/photos', { method: 'POST', body: fd, isFormData: true });
      }

      await onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Header
        title={editing ? 'Edit profile' : 'Create profile'}
        subtitle={allAtOnce ? 'Update your profile details.' : 'Build it one step at a time.'}
        onBack={goBackStep}
      />

      {!allAtOnce ? <StepHeader step={currentStep} total={ONBOARDING_STEPS.length} /> : null}

      {allAtOnce || stepIndex === 0 ? (
        <Card style={styles.formCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="person" size={20} color={colors.amber} />
            <Text style={styles.sectionTitleNoMargin}>Basics</Text>
          </View>
          <TextField label="First name" value={firstName} onChangeText={setFirstName} />
          <TextField label="Last name" value={lastName} onChangeText={setLastName} />
          <AgeSlider value={age} onChange={setAge} />
          <OptionRow title="Gender" options={GENDERS} value={gender} onChange={setGender} />
          <OptionRow
            title="Looking for"
            options={LOOKING_FOR}
            value={lookingFor}
            onChange={updateLookingFor}
            multi
            multiMax={LOOKING_FOR.length}
          />
        </Card>
      ) : null}

      {allAtOnce || stepIndex === 1 ? (
        <Card style={styles.formCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="school" size={20} color={colors.amber} />
            <Text style={styles.sectionTitleNoMargin}>School</Text>
          </View>
          <Text style={styles.helpText}>Pick from the list or type your own school and major.</Text>
          <OptionRow title="Class year" options={CLASS_YEARS} value={year} onChange={setYear} />
          <SearchSelectField
            label="School"
            value={school}
            options={US_COLLEGES}
            onChange={setSchool}
            icon="school"
          />
          <SearchSelectField
            label="Major"
            value={major}
            options={US_MAJORS}
            onChange={setMajor}
            icon="book"
          />
          <TextField
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="New Brunswick, NJ"
            autoCorrect={false}
          />
        </Card>
      ) : null}

      {allAtOnce || stepIndex === 2 ? (
        <Card style={styles.formCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="images" size={20} color={colors.amber} />
            <Text style={styles.sectionTitleNoMargin}>Photos</Text>
          </View>
          <Text style={styles.helpText}>Add up to five photos. The first one is your main photo.</Text>
          <View style={styles.photoToolbar}>
            <Button
              style={styles.photoToolButton}
              variant="secondary"
              onPress={addPhotos}
              disabled={openPhotoCount === 0}
            >
              Add photos
            </Button>
            <Button
              style={styles.photoToolButton}
              variant={reorderMode ? 'primary' : 'secondary'}
              onPress={() => setReorderMode((current) => !current)}
              disabled={filledPhotoCount < 2}
            >
              Reorder
            </Button>
          </View>
          <View
            style={styles.photoGrid}
            onLayout={(event) => setPhotoGridWidth(event.nativeEvent.layout.width)}
          >
            {photos.map((photo, index) => (
              <PhotoSlot
                // Key by fixed grid position, NOT photo id: these are positional
                // slots, so a reorder should just swap each slot's `photo` prop.
                // Keying by photo id made React relocate whole slot instances
                // (each with its own drag state), which broke the reorder gesture.
                key={index}
                photo={photo}
                index={index}
                reorderMode={reorderMode}
                slotWidth={photoSlotWidth}
                swapTarget={swapTargetIndex === index}
                swapFromIndex={dragSourceIndex}
                onPick={pickPhoto}
                onRemove={removePhoto}
                onMove={movePhoto}
                onDragTarget={setSwapTargetIndex}
                onDragStart={setDragSourceIndex}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {allAtOnce || stepIndex === 3 ? (
        <Card style={styles.formCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="chatbubble-ellipses" size={20} color={colors.amber} />
            <Text style={styles.sectionTitleNoMargin}>Prompts</Text>
          </View>
          <Text style={styles.helpText}>Pick a prompt and answer it in your own voice.</Text>
          {promptRows.map((row, index) => (
            <View key={index} style={styles.promptBox}>
              <SearchSelectField
                label={`Prompt ${index + 1}`}
                options={[...new Set([row.prompt, ...PROMPT_GROUPS[index]])].filter(Boolean)}
                value={row.prompt}
                onChange={(value) => updatePrompt(index, 'prompt', value)}
                icon="chatbubble"
              />
              <TextField
                label="Answer"
                value={row.answer}
                onChangeText={(value) => updatePrompt(index, 'answer', value)}
                multiline
              />
            </View>
          ))}
        </Card>
      ) : null}

      <ErrorBanner message={error} />
      <View style={styles.onboardingActions}>
        {allAtOnce ? (
          <Button style={styles.actionButton} variant="secondary" onPress={onBack}>
            Cancel
          </Button>
        ) : stepIndex > 0 ? (
          <Button style={styles.actionButton} variant="secondary" onPress={goBackStep}>
            Back
          </Button>
        ) : null}
        {!isLastStep ? (
          <Button style={styles.actionButton} onPress={goNextStep}>
            Next
          </Button>
        ) : (
          <Button style={styles.actionButton} onPress={saveProfile} loading={saving}>
            {editing ? 'Save' : 'Finish'}
          </Button>
        )}
      </View>
      <Button variant="secondary" onPress={openPreview}>
        Preview profile
      </Button>
      <ProfilePreviewModal
        visible={previewOpen}
        profile={buildPreviewProfile()}
        onClose={() => setPreviewOpen(false)}
      />
    </Screen>
  );
}

function HomeScreen({ profile, onSelectOwner, onRoute, onSignOut, setPendingMatches }) {
  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState([]);
  const [delegates, setDelegates] = useState([]);
  const [matchCount, setMatchCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [invite, setInvite] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [delegationData, matchData, rankData] = await Promise.all([
        apiRequest('/api/delegations'),
        profile?._id ? apiRequest(`/api/matches?ownerId=${profile._id}`) : Promise.resolve({ matches: [] }),
        profile?._id ? apiRequest(`/api/wingman/rank?ownerId=${profile._id}`).catch(() => ({ leaderboard: [] })) : Promise.resolve({ leaderboard: [] }),
      ]);
      setOwners(delegationData.owners || []);
      setDelegates(delegationData.delegates || []);
      setLeaderboard(rankData.leaderboard || []);
      const matches = matchData.matches || [];
      setMatchCount(matches.length);
      const pending = matches.filter((match) => match.myStatus === 'pending').length;
      setPendingCount(pending);
      setPendingMatches(pending);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [profile?._id]);

  async function createInvite() {
    try {
      const data = await apiRequest('/api/invite/create', { method: 'POST' });
      setInvite(data.invite);
    } catch (err) {
      Alert.alert('Invite failed', err.message);
    }
  }

  return (
    <Screen
      footer={<BottomTabs current="home" pending={pendingCount} onNavigate={onRoute} />}
    >
      <Header
        title={`Hey, ${initialsName(profile)}`}
        subtitle="Who are you swiping for today?"
        right={<IconButton icon="log-out-outline" label="Sign out" onPress={onSignOut} />}
      />

      <ErrorBanner message={error} />

      <Card style={styles.profileHero}>
        <Avatar uri={firstPhoto(profile)} name={profile?.name} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{profile?.name || 'Your profile'}</Text>
          <Text style={styles.mutedText}>{profile?.school || 'Add your school'} · {profile?.majors?.[0] || profile?.major || 'Add your major'}</Text>
        </View>
        <IconButton icon="create-outline" label="Edit profile" onPress={() => onRoute('profile')} />
      </Card>

      {invite ? (
        <Card style={styles.inviteCard}>
          <Text style={styles.sectionLabel}>Invite code</Text>
          <Text style={styles.inviteCode}>{invite.code}</Text>
          <Text style={styles.helpText}>This code expires in about 10 minutes.</Text>
        </Card>
      ) : null}

      <View style={styles.actionRow}>
        <Button style={styles.actionButton} onPress={createInvite}>Create invite</Button>
        <Button style={styles.actionButton} variant="secondary" onPress={() => onRoute('delegate')}>Enter code</Button>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My matches</Text>
        <Pressable onPress={() => onRoute('matches')}>
          <Text style={styles.linkText}>{matchCount} total</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator color={colors.black} /> : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Swipe for a friend</Text>
        <Text style={styles.mutedText}>{owners.length} active</Text>
      </View>

      {!loading && owners.length === 0 ? (
        <EmptyState
          icon="key"
          title="No friends added yet"
          body="Enter a friend's invite code to start swiping for them."
        />
      ) : null}

      {owners.map((owner) => (
        <Pressable key={owner._id} onPress={() => onSelectOwner(owner)} style={styles.ownerRow}>
          <Avatar uri={imageUrl(owner.photos?.[0]?.url)} name={owner.name} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{owner.name}</Text>
            <Text style={styles.mutedText}>{owner.school || owner.year || 'Friend'} · {owner.majors?.join(', ') || owner.major || 'Profile'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      ))}

      {delegates.length ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My wingman crew</Text>
            <Text style={styles.mutedText}>{delegates.length} active</Text>
          </View>
          {(leaderboard.length ? leaderboard : delegates.map((d) => ({ wingman: { _id: d._id, name: d.name, photo: d.photos?.[0]?.url } }))).map((entry, position) => {
            const wingman = entry.wingman || {};
            const hasRank = typeof entry.score === 'number';
            return (
              <View key={wingman._id || position} style={styles.ownerRow}>
                {hasRank ? <Text style={styles.leaderRankText}>{position + 1}</Text> : null}
                <Avatar uri={imageUrl(wingman.photo)} name={wingman.name} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{wingman.name}</Text>
                  <Text style={styles.mutedText}>{hasRank ? `${entry.tier} · ${entry.confirmedMatches || 0} matches made` : 'Active wingman'}</Text>
                </View>
                {hasRank ? (
                  <View style={styles.scorePill}>
                    <Ionicons name="flame" size={12} color="#fff" />
                    <Text style={styles.scorePillText}>{entry.score}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}

const NOTE_MAX_LENGTH = 300;

function NoteModal({ visible, candidate, onCancel, onSubmit }) {
  const [note, setNote] = useState('');
  // What the like replies to: null = plain like, or { type: 'prompt'|'photo', ref, label }.
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    if (!visible) {
      setNote('');
      setReplyTo(null);
    }
  }, [visible]);

  const prompts = (candidate?.prompts || []).filter((p) => p?.prompt);
  const photoCount = (candidate?.photos || []).length;
  const replyOptions = [
    { key: 'none', label: 'Just a like', value: null },
    ...prompts.map((p, i) => ({
      key: `prompt-${i}`,
      label: `“${p.prompt}”`,
      value: { type: 'prompt', ref: p.prompt, label: p.prompt },
    })),
    ...Array.from({ length: photoCount }, (_, i) => ({
      key: `photo-${i}`,
      label: `Photo ${i + 1}`,
      value: { type: 'photo', ref: String(i), label: `Photo ${i + 1}` },
    })),
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Add a note?</Text>
          <Text style={styles.helpText}>Send a plain like, or reply to one of {candidate?.first_name || candidate?.name || 'their'}’s prompts or photos.</Text>
          {replyOptions.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.replyChipRow}>
              {replyOptions.map((option) => {
                const active = (option.value?.type || 'none') === (replyTo?.type || 'none') && (option.value?.ref ?? null) === (replyTo?.ref ?? null);
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setReplyTo(option.value)}
                    style={[styles.replyChip, active && styles.replyChipActive]}
                  >
                    <Text style={[styles.replyChipText, active && styles.replyChipTextActive]} numberOfLines={1}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          <TextField
            value={note}
            onChangeText={(text) => setNote(text.slice(0, NOTE_MAX_LENGTH))}
            placeholder={replyTo ? `Your take on ${replyTo.type === 'photo' ? 'this photo' : 'this answer'}...` : 'You both love the same things...'}
            multiline
          />
          <Text style={styles.charCountText}>{note.length}/{NOTE_MAX_LENGTH}</Text>
          <View style={styles.actionRow}>
            <Button style={styles.actionButton} variant="secondary" onPress={onCancel}>Skip</Button>
            <Button style={styles.actionButton} onPress={() => onSubmit(note.trim() || null, replyTo)}>Send like</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SwipeScreen({ owner, onBack }) {
  const [tab, setTab] = useState('feed');
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [index, setIndex] = useState(0);
  const [likedRows, setLikedRows] = useState([]);
  const [likedLoading, setLikedLoading] = useState(false);
  const [incomingRows, setIncomingRows] = useState([]);
  const [incomingLoading, setIncomingLoading] = useState(false);
  const [error, setError] = useState('');
  const [matchInfo, setMatchInfo] = useState(null);
  const [sentName, setSentName] = useState(null);
  const [threadFor, setThreadFor] = useState(null);
  const sentTimer = useRef(null);

  const candidate = candidates[index];

  async function loadFeed() {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/api/feed?ownerId=${owner._id}&limit=25`);
      setCandidates(data.candidates || []);
      setIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadLiked(silent = false) {
    if (!silent) setLikedLoading(true);
    try {
      const data = await apiRequest(`/api/feed/liked?ownerId=${owner._id}`);
      setLikedRows(data.liked || []);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLikedLoading(false);
    }
  }

  async function loadIncoming(silent = false) {
    if (!silent) setIncomingLoading(true);
    try {
      const data = await apiRequest(`/api/likes/incoming?ownerId=${owner._id}`);
      setIncomingRows(data.incoming || []);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setIncomingLoading(false);
    }
  }

  useEffect(() => {
    loadFeed();
    loadLiked(true);
    loadIncoming(true);
    return () => { if (sentTimer.current) clearTimeout(sentTimer.current); };
  }, [owner?._id]);

  // Optimistic: advance the deck instantly for a snappy feel, persist in the background.
  // A right-swipe no longer instant-matches — it lands with the other side's wingmen.
  function swipe(direction, friendNote = null, replyTo = null) {
    const target = candidates[index];
    if (!target) return;
    setError('');
    setIndex((current) => current + 1);
    apiRequest('/api/swipe', {
      method: 'POST',
      body: {
        owner_user_id: owner._id,
        target_user_id: target._id,
        direction,
        friend_note: friendNote,
        comment_type: replyTo?.type || 'none',
        comment_ref: replyTo?.ref ?? undefined,
      },
    })
      .then((data) => {
        if (data.sent) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setSentName(target.first_name || target.name || 'them');
          if (sentTimer.current) clearTimeout(sentTimer.current);
          sentTimer.current = setTimeout(() => setSentName(null), 2200);
          loadLiked(true);
        }
      })
      .catch((err) => {
        if (err.data?.code === 'LIKE_LIMIT_REACHED') {
          setError('Daily like limit reached for this friend.');
        } else {
          setError(err.message);
        }
      });
  }

  // Accept/reject an incoming like on the owner's behalf. Accepting is the moment a
  // wingman makes the match — that's where the celebration fires now.
  async function decide(row, action) {
    try {
      const data = await apiRequest('/api/likes/decision', {
        method: 'POST',
        body: { potential_match_id: row._id, action },
      });
      setIncomingRows((prev) => prev.map((item) => (
        item._id === row._id
          ? { ...item, status: data.status, myDecision: action, matchId: data.matchId || item.matchId }
          : item
      )));
      if (action === 'accept' && data.matchCreated) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setMatchInfo({ candidate: row.candidate });
      } else {
        Haptics.selectionAsync().catch(() => {});
      }
    } catch (err) {
      Alert.alert('Could not save decision', err.message);
    }
  }

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.swipeShell}>
        <Header title={`For ${owner.name}`} subtitle="Likes go to their wingmen for a final yes" onBack={onBack} />
        <View style={styles.feedTabs}>
          {[
            { key: 'feed', label: 'Feed', icon: 'albums' },
            { key: 'liked', label: 'Sent', icon: 'heart' },
            { key: 'incoming', label: 'Likes in', icon: 'mail-unread' },
          ].map((item) => {
            const active = tab === item.key;
            const pendingIncoming = incomingRows.filter((row) => row.status === 'pending' && !row.myDecision).length;
            const badge = item.key === 'liked' ? likedRows.length : item.key === 'incoming' ? pendingIncoming : 0;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  setTab(item.key);
                  if (item.key === 'liked') loadLiked();
                  if (item.key === 'incoming') loadIncoming();
                }}
                style={[styles.feedTab, active && styles.feedTabActive]}
              >
                <Ionicons name={item.icon} size={17} color={active ? colors.text : colors.muted} />
                <Text style={[styles.feedTabText, active && styles.feedTabTextActive]}>{item.label}</Text>
                {badge > 0 ? (
                  <View style={styles.likedCountBadge}>
                    <Text style={styles.likedCountText}>{badge}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <ErrorBanner message={error} />
        {tab === 'liked' ? (
          likedLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.black} />
            </View>
          ) : likedRows.length === 0 ? (
            <EmptyState
              icon="heart"
              title="No likes sent yet"
              body="Profiles you and the other wingmen like will show up here."
            />
          ) : (
            <ScrollView style={styles.candidateScroll} showsVerticalScrollIndicator={false}>
              {likedRows.map((item) => (
                <LikedCandidateCard key={item.targetId} item={item} />
              ))}
            </ScrollView>
          )
        ) : tab === 'incoming' ? (
          incomingLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.black} />
            </View>
          ) : incomingRows.length === 0 ? (
            <EmptyState
              icon="mail-open"
              title="No incoming likes"
              body={`When someone's wingman likes ${owner.first_name || owner.name}, it lands here for you to review.`}
            />
          ) : (
            <ScrollView style={styles.candidateScroll} showsVerticalScrollIndicator={false}>
              {incomingRows.map((row) => (
                <IncomingLikeCard
                  key={row._id}
                  row={row}
                  ownerName={owner.first_name || owner.name}
                  onAccept={() => decide(row, 'accept')}
                  onReject={() => decide(row, 'reject')}
                  onThread={() => setThreadFor(row)}
                />
              ))}
            </ScrollView>
          )
        ) : loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.black} />
          </View>
        ) : !candidate ? (
          <EmptyState
            icon="checkmark-circle"
            title="No more profiles"
            body="You have reached the end of this feed for now."
          />
        ) : (
          <SwipeDeck candidates={candidates} index={index} onCommit={swipe} />
        )}
        {sentName ? (
          <View style={styles.sentToast} pointerEvents="none">
            <Ionicons name="paper-plane" size={16} color="#fff" />
            <Text style={styles.sentToastText}>Like sent — {sentName}’s wingmen will review it</Text>
          </View>
        ) : null}
        <MatchCelebration
          visible={!!matchInfo}
          owner={owner}
          candidate={matchInfo?.candidate}
          subtitle={`You matched ${owner.first_name || owner.name || 'your friend'} with ${matchInfo?.candidate?.first_name || matchInfo?.candidate?.name || 'someone'} — they can start chatting now.`}
          onClose={() => setMatchInfo(null)}
        />
        <WingmanThreadModal
          row={threadFor}
          visible={!!threadFor}
          onClose={() => setThreadFor(null)}
        />
      </View>
    </Screen>
  );
}

function CandidateCard({ candidate }) {
  const photos = candidate.photos || [];
  const mainPhoto = imageUrl(photos[0]);
  return (
    <View style={styles.candidateCard}>
      <View style={styles.candidateImageWrap}>
        {mainPhoto ? (
          <Image source={{ uri: mainPhoto }} style={styles.candidateImage} />
        ) : (
          <View style={styles.candidateImageEmpty}>
            <Text style={styles.avatarTextLarge}>{candidate.name?.[0] || '?'}</Text>
          </View>
        )}
        <View style={styles.imageShade} />
        <View style={styles.imageCaption}>
          <Text style={styles.candidateName}>{candidate.name}{candidate.age ? `, ${candidate.age}` : ''}</Text>
          <Text style={styles.candidateMeta}>{candidate.school || candidate.year || 'Student'} · {candidate.majors?.join(', ') || candidate.major || 'Major not set'}</Text>
        </View>
      </View>

      <Card style={styles.detailCard}>
        <InfoRow icon="school" label="School" value={candidate.school} />
        <InfoRow icon="book" label="Major" value={candidate.majors?.join(', ') || candidate.major} />
        <InfoRow icon="calendar" label="Year" value={candidate.year} />
        <InfoRow icon="heart" label="Looking for" value={candidate.looking_for} />
        <InfoRow icon="location" label="Location" value={candidate.location} />
      </Card>

      <ProfileAlternatingSections prompts={candidate.prompts || []} photos={photos} />
    </View>
  );
}

const SCREEN_W = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_W * 0.26;

function DeckCardFace({ candidate }) {
  const photo = imageUrl(candidate.photos?.[0]);
  const comp = candidate.ranking?.compatibility;
  const reasons = (candidate.ranking?.explainability?.reasons || []).slice(0, 3);
  const meta = [candidate.school, candidate.majors?.join(', ') || candidate.major, candidate.year]
    .filter(Boolean)
    .join('  ·  ');
  return (
    <View style={styles.cardFace}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.cardPhoto} />
      ) : (
        <LinearGradient colors={gradients.pink} start={gradients.pinkStart} end={gradients.pinkEnd} style={[styles.cardPhoto, styles.cardPhotoEmpty]}>
          <Text style={styles.cardInitial}>{candidate.name?.[0]?.toUpperCase() || '?'}</Text>
        </LinearGradient>
      )}
      {typeof comp === 'number' ? (
        <View style={styles.compBadge}>
          <Text style={styles.compBadgeText}>✨ {comp}% match</Text>
        </View>
      ) : null}
      <LinearGradient colors={['rgba(20,12,10,0)', 'rgba(20,12,10,0.92)']} style={styles.cardScrim} pointerEvents="none" />
      <View style={styles.cardInfo} pointerEvents="none">
        <Text style={styles.cardName}>
          {candidate.name || 'Someone'}{candidate.age ? `, ${candidate.age}` : ''}
        </Text>
        {meta ? <Text style={styles.cardMeta}>{meta}</Text> : null}
        {reasons.length ? (
          <View style={styles.reasonRow}>
            {reasons.map((reason, i) => (
              <View key={i} style={styles.reasonChip}>
                <Text style={styles.reasonChipText}>{reason}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SwipeDeck({ candidates, index, onCommit }) {
  const pan = useRef(new Animated.ValueXY()).current;
  const crossed = useRef(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const current = candidates[index];
  const next = candidates[index + 1];

  const rotate = pan.x.interpolate({ inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2], outputRange: ['-10deg', '0deg', '10deg'], extrapolate: 'clamp' });
  const likeOpacity = pan.x.interpolate({ inputRange: [14, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, -14], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = pan.x.interpolate({ inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2], outputRange: [1, 0.93, 1], extrapolate: 'clamp' });
  const nextOpacity = pan.x.interpolate({ inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2], outputRange: [1, 0.5, 1], extrapolate: 'clamp' });

  const forceSwipe = (direction, note = null, replyTo = null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const toX = direction === 'right' ? SCREEN_W * 1.35 : -SCREEN_W * 1.35;
    Animated.timing(pan, { toValue: { x: toX, y: 0 }, duration: 230, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      crossed.current = false;
      onCommit(direction, note, replyTo);
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
        onPanResponderMove: (e, g) => {
          pan.setValue({ x: g.dx, y: g.dy * 0.18 });
          const past = Math.abs(g.dx) > SWIPE_THRESHOLD;
          if (past && !crossed.current) {
            crossed.current = true;
            Haptics.selectionAsync().catch(() => {});
          } else if (!past && crossed.current) {
            crossed.current = false;
          }
        },
        onPanResponderRelease: (e, g) => {
          // A pure tap is handled by the Pressable wrapping the card (opens the
          // full profile); the pan responder only claims the gesture once the
          // finger moves >6px, so here we only need to resolve real drags.
          if (g.dx > SWIPE_THRESHOLD || g.vx > 0.7) forceSwipe('right');
          else if (g.dx < -SWIPE_THRESHOLD || g.vx < -0.7) forceSwipe('left');
          else {
            crossed.current = false;
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, tension: 70, useNativeDriver: true }).start();
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, candidates]
  );

  if (!current) return null;

  return (
    <View style={styles.deckWrap}>
      <View style={styles.deckArea}>
        {next ? (
          <Animated.View style={[styles.deckCard, { transform: [{ scale: nextScale }], opacity: nextOpacity }]} pointerEvents="none">
            <DeckCardFace candidate={next} />
          </Animated.View>
        ) : null}
        <Animated.View
          style={[styles.deckCard, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}
          {...panResponder.panHandlers}
        >
          <Pressable style={styles.deckCardPressable} onPress={() => setDetailOpen(true)}>
            <DeckCardFace candidate={current} />
          </Pressable>
          <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]} pointerEvents="none">
            <Text style={styles.stampTextLike}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]} pointerEvents="none">
            <Text style={styles.stampTextNope}>NOPE</Text>
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.deckActions}>
        <Pressable onPress={() => forceSwipe('left')} style={({ pressed }) => [styles.circleBtn, styles.circleBtnPass, pressed && styles.circleBtnPressed]}>
          <Ionicons name="close" size={32} color={colors.red} />
        </Pressable>
        <Pressable onPress={() => setDetailOpen(true)} style={({ pressed }) => [styles.circleBtnSmall, pressed && styles.circleBtnPressed]}>
          <Ionicons name="information-outline" size={20} color={colors.muted} />
        </Pressable>
        <Pressable onPress={() => setNoteOpen(true)} style={({ pressed }) => [styles.circleBtn, styles.circleBtnLike, pressed && styles.circleBtnPressed]}>
          <Ionicons name="heart" size={28} color="#fff" />
        </Pressable>
      </View>

      <NoteModal
        visible={noteOpen}
        candidate={current}
        onCancel={() => { setNoteOpen(false); forceSwipe('right', null); }}
        onSubmit={(note, replyTo) => { setNoteOpen(false); forceSwipe('right', note, replyTo); }}
      />

      <Modal visible={detailOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailOpen(false)}>
        <Screen>
          <View style={styles.detailHeader}>
            <Text style={styles.detailHeaderTitle}>{current.name || 'Profile'}</Text>
            <IconButton icon="close" label="Close" onPress={() => setDetailOpen(false)} />
          </View>
          <CandidateCard candidate={current} />
        </Screen>
      </Modal>
    </View>
  );
}

function MatchCelebration({ visible, owner, candidate, onClose, subtitle, cta = 'Keep swiping', eyebrow = 'you’re the matchmaker' }) {
  const fade = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0.6)).current;
  const leftX = useRef(new Animated.Value(-70)).current;
  const rightX = useRef(new Animated.Value(70)).current;
  const heart = useRef(new Animated.Value(0)).current;
  const sparks = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    pop.setValue(0.6);
    leftX.setValue(-70);
    rightX.setValue(70);
    heart.setValue(0);
    sparks.forEach((s) => s.setValue(0));
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      Animated.spring(leftX, { toValue: 0, friction: 7, tension: 55, useNativeDriver: true }),
      Animated.spring(rightX, { toValue: 0, friction: 7, tension: 55, useNativeDriver: true }),
      Animated.sequence([Animated.delay(260), Animated.spring(heart, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true })]),
      ...sparks.map((s, i) =>
        Animated.sequence([Animated.delay(320 + i * 120), Animated.spring(s, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true })])
      ),
    ]).start();
  }, [visible]);

  if (!visible || !candidate) return null;

  const sparkStyle = (v) => ({ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] });
  const ownerName = owner?.name?.split(' ')[0] || 'your friend';
  const candName = candidate?.name?.split(' ')[0] || 'someone';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={[styles.matchOverlay, { opacity: fade }]}>
        <LinearGradient colors={['#2a0f1d', '#e0447f', '#2a0f1d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.matchGlow} pointerEvents="none" />

        <Animated.View style={[styles.matchSpark, { top: '20%', left: '15%' }, sparkStyle(sparks[0])]} pointerEvents="none"><Sparkle size={30} color="#ffffff" /></Animated.View>
        <Animated.View style={[styles.matchSpark, { top: '25%', right: '13%' }, sparkStyle(sparks[1])]} pointerEvents="none"><Sparkle size={20} color="#ffe2ec" /></Animated.View>
        <Animated.View style={[styles.matchSpark, { bottom: '30%', left: '19%' }, sparkStyle(sparks[2])]} pointerEvents="none"><Sparkle size={18} color="#ffe2ec" /></Animated.View>
        <Animated.View style={[styles.matchSpark, { bottom: '34%', right: '17%' }, sparkStyle(sparks[3])]} pointerEvents="none"><Sparkle size={26} color="#ffffff" /></Animated.View>

        <Text style={styles.matchEyebrow}>{eyebrow}</Text>
        <Animated.Text style={[styles.matchTitle, { transform: [{ scale: pop }] }]}>It’s a match!</Animated.Text>

        <View style={styles.matchAvatars}>
          <Animated.View style={[styles.matchAvatarRing, { transform: [{ translateX: leftX }] }]}>
            <Avatar uri={firstPhoto(owner)} name={owner?.name} size={104} />
          </Animated.View>
          <Animated.View style={[styles.matchHeart, { transform: [{ scale: heart }] }]} pointerEvents="none">
            <Ionicons name="heart" size={28} color={colors.pink} />
          </Animated.View>
          <Animated.View style={[styles.matchAvatarRing, styles.matchAvatarRingRight, { transform: [{ translateX: rightX }] }]}>
            <Avatar uri={firstPhoto(candidate)} name={candidate?.name} size={104} />
          </Animated.View>
        </View>

        <Text style={styles.matchSub}>
          {subtitle || `You matched ${ownerName} with ${candName} — it’s in their matches to review.`}
        </Text>

        <Pressable onPress={onClose} style={({ pressed }) => [styles.matchButton, pressed && styles.circleBtnPressed]}>
          <Text style={styles.matchButtonText}>{cta}</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

function LikedCandidateCard({ item }) {
  const candidate = item.candidate || {};
  const photo = imageUrl(candidate.photos?.[0]);
  const swipers = item.swipers || [];

  return (
    <Card style={styles.likedCard}>
      <View style={styles.matchTop}>
        <Avatar uri={photo} name={candidate.name} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{candidate.name || 'Unknown'}{candidate.age ? `, ${candidate.age}` : ''}</Text>
          <Text style={styles.mutedText}>{candidate.school || candidate.year || 'Profile'} · {candidate.majors?.join(', ') || candidate.major || '-'}</Text>
          <Text style={styles.statusText}>
            Liked by {swipers.map((swiper) => swiper.name).join(', ')}
          </Text>
        </View>
      </View>
      <View style={styles.swiperList}>
        {swipers.map((swiper, swiperIndex) => (
          <View key={swiper._id || `${item.targetId}-${swiper.name}-${swiperIndex}`} style={styles.swiperRow}>
            <Avatar uri={imageUrl(swiper.photo)} name={swiper.name} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={styles.swiperName}>{swiper.name}</Text>
              {swiper.friend_note ? (
                <Text style={styles.swiperNote} numberOfLines={2}>{swiper.friend_note}</Text>
              ) : (
                <Text style={styles.swiperNote}>Swiped right</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

// A like sent TO the owner, awaiting this wingman's verdict. Shows the candidate,
// every sender + their note (plain / prompt reply / photo reply), decisions so far,
// and accept/reject actions. One reject doesn't kill it — any accept makes the match.
function IncomingLikeCard({ row, ownerName, onAccept, onReject, onThread }) {
  const candidate = row.candidate || {};
  const photo = imageUrl(candidate.photos?.[0]?.url);
  const senders = row.senders || [];
  const decisions = row.decisions || [];
  const accepted = row.status === 'accepted';
  const decided = !!row.myDecision;

  return (
    <Card style={styles.likedCard}>
      <View style={styles.matchTop}>
        <Avatar uri={photo} name={candidate.name} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{candidate.name || 'Unknown'}{candidate.age ? `, ${candidate.age}` : ''}</Text>
          <Text style={styles.mutedText}>{candidate.school || candidate.year || 'Profile'} · {candidate.majors?.join(', ') || candidate.major || '-'}</Text>
          <Text style={styles.statusText}>
            {accepted ? `Matched for ${ownerName} ✓` : `Their wingmen think they’d be great for ${ownerName}`}
          </Text>
        </View>
      </View>

      <View style={styles.swiperList}>
        {senders.map((sender, senderIndex) => (
          <View key={`${sender.wingman?._id || 'w'}-${senderIndex}`} style={styles.swiperRow}>
            <Avatar uri={imageUrl(sender.wingman?.photo)} name={sender.wingman?.name} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={styles.swiperName}>{sender.wingman?.name || 'A wingman'}</Text>
              {sender.comment_type === 'prompt' && sender.comment_ref ? (
                <Text style={styles.replyContextText}>replying to “{sender.comment_ref}”</Text>
              ) : sender.comment_type === 'photo' ? (
                <Text style={styles.replyContextText}>replying to photo {Number(sender.comment_ref) + 1 || ''}</Text>
              ) : null}
              <Text style={styles.swiperNote} numberOfLines={3}>{sender.comment || 'Sent a like'}</Text>
            </View>
          </View>
        ))}
      </View>

      {decisions.length > 0 ? (
        <View style={styles.decisionRow}>
          {decisions.map((d, i) => (
            <View key={`${d.wingman?._id || 'd'}-${i}`} style={[styles.decisionPill, d.decision === 'accept' ? styles.decisionPillAccept : styles.decisionPillReject]}>
              <Ionicons name={d.decision === 'accept' ? 'checkmark' : 'close'} size={12} color="#fff" />
              <Text style={styles.decisionPillText}>{d.wingman?.name?.split(' ')[0] || 'Wingman'}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* The decision (Pass/Match) is the primary, same-weight binary choice.
          "Ask their wingmen" is a distinct kind of action (conversation, not a
          decision), so it's demoted to a ghost link below rather than competing
          for attention as a third equal-weight button. */}
      {!accepted ? (
        <View style={styles.actionRow}>
          <Button style={styles.actionButton} variant="secondary" onPress={onReject} disabled={row.myDecision === 'reject'}>
            {row.myDecision === 'reject' ? 'Passed' : 'Pass'}
          </Button>
          <Button style={styles.actionButton} onPress={onAccept}>
            {decided && row.myDecision === 'accept' ? 'Accepted' : 'Match them'}
          </Button>
        </View>
      ) : null}
      <Button variant="ghost" onPress={onThread}>Ask their wingmen about them</Button>
    </Card>
  );
}

// Back-and-forth between the two sides' wingmen about one potential match.
function WingmanThreadModal({ row, visible, onClose }) {
  const [messages, setMessages] = useState([]);
  const [mySide, setMySide] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!row?._id) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/api/likes/${row._id}/thread`);
      setMessages(data.messages || []);
      setMySide(data.mySide || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (visible) {
      setMessages([]);
      setContent('');
      load();
    }
  }, [visible, row?._id]);

  async function send() {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const data = await apiRequest(`/api/likes/${row._id}/thread`, {
        method: 'POST',
        body: { body: trimmed },
      });
      setMessages((prev) => [...prev, data.message]);
      setContent('');
    } catch (err) {
      Alert.alert('Message failed', err.message);
    } finally {
      setSending(false);
    }
  }

  const candidateName = row?.candidate?.first_name || row?.candidate?.name || 'them';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen
        scroll={false}
        footer={(
          <View style={styles.messageComposer}>
            <View style={{ flex: 1 }}>
              <TextField value={content} onChangeText={setContent} placeholder={`Talk about ${candidateName}...`} />
            </View>
            <IconButton icon="send" label="Send" tone="dark" onPress={send} disabled={sending} />
          </View>
        )}
      >
        <Header title="Wingman huddle" subtitle={`Both crews, talking about ${candidateName}`} onBack={onClose} />
        <ErrorBanner message={error} />
        {loading ? (
          <ActivityIndicator color={colors.black} />
        ) : messages.length === 0 ? (
          <EmptyState icon="chatbubbles" title="No messages yet" body="Ask the other side's wingmen anything before you decide." />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messages}
            renderItem={({ item }) => (
              <View style={[styles.messageBubble, item.mine ? styles.messageMe : styles.messageThem]}>
                {!item.mine ? (
                  <Text style={styles.threadSenderText}>{item.sender?.name || 'Wingman'} · {item.side === mySide ? 'your side' : 'their side'}</Text>
                ) : null}
                <Text style={[styles.messageText, item.mine && styles.messageTextMe]}>{item.body}</Text>
              </View>
            )}
          />
        )}
      </Screen>
    </Modal>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.orange} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

function DelegateScreen({ onBack, onDone }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateCode(value) {
    const next = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, INVITE_CODE_LENGTH);
    setCode(next);
  }

  async function redeem() {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/api/invite/redeem', {
        method: 'POST',
        body: { code: code.trim().toUpperCase() },
      });
      Alert.alert('You are in', `You are now swiping for ${data.owner?.name || 'your friend'}.`);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Header title="Enter invite code" subtitle="Become a friend's wingman." onBack={onBack} />
      <Card>
        <TextField
          label="Invite code"
          value={code}
          onChangeText={updateCode}
          placeholder={'X'.repeat(INVITE_CODE_LENGTH)}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={INVITE_CODE_LENGTH}
        />
        <ErrorBanner message={error} />
        <Button onPress={redeem} loading={loading} disabled={code.trim().length !== INVITE_CODE_LENGTH}>Redeem code</Button>
      </Card>
    </Screen>
  );
}

function MatchesScreen({ profile, onRoute, onOpenChat, setPendingMatches }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/api/matches?ownerId=${profile._id}`);
      const rows = data.matches || [];
      setMatches(rows);
      // Matches are live the moment both sides' wingmen say yes — nothing pending.
      setPendingMatches(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (profile?._id) load();
  }, [profile?._id]);

  return (
    <Screen footer={<BottomTabs current="matches" onNavigate={onRoute} />}>
      <Header title="Matches" subtitle="Everyone your wingmen matched you with." />
      <ErrorBanner message={error} />
      {loading ? <ActivityIndicator color={colors.black} /> : null}
      {!loading && matches.length === 0 ? (
        <EmptyState icon="heart" title="No matches yet" body="When a wingman on each side says yes, you’re matched and it lands right here." />
      ) : null}
      {matches.map((match) => (
        <MatchCard
          key={match._id}
          match={match}
          onChat={() => onOpenChat(match)}
        />
      ))}
    </Screen>
  );
}

function MatchCard({ match, onChat }) {
  const person = match.profile || {};
  const photo = imageUrl(person.photos?.[0]?.url);
  const matchedByList = match.matchedByList?.length
    ? match.matchedByList
    : match.matchedBy
      ? [match.matchedBy]
      : [];

  return (
    <Card style={styles.matchCard}>
      <View style={styles.matchTop}>
        <Avatar uri={photo} name={person.name} size={70} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{person.name || 'Unknown'}{person.age ? `, ${person.age}` : ''}</Text>
          <Text style={styles.mutedText}>{person.school || person.year || 'Profile'} · {person.majors?.join(', ') || person.major || '-'}</Text>
          <Text style={styles.statusText}>You&rsquo;re matched · ready to chat</Text>
        </View>
      </View>
      {matchedByList.length > 0 ? (
        <View style={styles.friendNote}>
          <Text style={styles.sectionLabel}>
            {matchedByList.length === 1 ? 'Liked by' : 'Liked by your friends'}
          </Text>
          <View style={styles.swiperList}>
            {matchedByList.map((friend, friendIndex) => (
              <View key={friend._id || `${friend.name}-${friendIndex}`} style={styles.swiperRow}>
                <Avatar uri={imageUrl(friend.photo)} name={friend.name} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.swiperName}>{friend.name}</Text>
                  <Text style={styles.swiperNote}>
                    {friend.friend_note ? `“${friend.friend_note}”` : 'Liked them for you'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <Button onPress={onChat}>Message {person.first_name || person.name}</Button>
    </Card>
  );
}

function ChatListScreen({ onRoute, onOpenChat }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/api/chat/list');
      setChats(data.chats || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Screen footer={<BottomTabs current="chats" onNavigate={onRoute} />}>
      <Header title="Chats" subtitle="Messages with accepted matches." />
      <ErrorBanner message={error} />
      {loading ? <ActivityIndicator color={colors.black} /> : null}
      {!loading && chats.length === 0 ? (
        <EmptyState icon="chatbubble" title="No conversations" body="Accept a match to start chatting." />
      ) : null}
      {chats.map((chat) => (
        <Pressable key={chat.matchId} style={styles.chatRow} onPress={() => onOpenChat({ _id: chat.matchId, profile: chat.otherUser })}>
          <Avatar uri={imageUrl(chat.otherUser?.photo)} name={chat.otherUser?.name} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{chat.otherUser?.name || 'Unknown'}</Text>
            <Text style={styles.mutedText} numberOfLines={1}>
              {chat.lastMessage ? `${chat.lastMessage.isMe ? 'You: ' : ''}${chat.lastMessage.content}` : 'Start the conversation'}
            </Text>
          </View>
          {chat.unreadCount > 0 ? (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadText}>{chat.unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </Screen>
  );
}

// A new "run" starts when the sender changes or when more than this many
// minutes pass since the previous message — mirrors Discord/iMessage grouping
// so consecutive messages read as one thought without a timestamp on every line.
const CHAT_RUN_GAP_MINUTES = 5;

function chatDateLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function chatTimeLabel(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Flattens messages into a render list of date dividers + message rows, each
// row annotated with whether it starts a new visual "run" and whether a
// timestamp shows by default (end of a run, or a real time gap to the next
// message even from the same sender).
function buildChatItems(messages) {
  const items = [];
  let lastDateKey = null;

  messages.forEach((msg, i) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    if (dateKey !== lastDateKey) {
      items.push({ type: 'date', key: `date-${dateKey}`, label: chatDateLabel(msg.createdAt) });
      lastDateKey = dateKey;
    }

    const prev = messages[i - 1];
    const next = messages[i + 1];
    const minutesSince = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000;

    const groupStart =
      !prev ||
      prev.isMe !== msg.isMe ||
      new Date(prev.createdAt).toDateString() !== dateKey ||
      minutesSince(msg.createdAt, prev.createdAt) > CHAT_RUN_GAP_MINUTES;

    const showTimestampDefault =
      !next ||
      next.isMe !== msg.isMe ||
      new Date(next.createdAt).toDateString() !== dateKey ||
      minutesSince(next.createdAt, msg.createdAt) > CHAT_RUN_GAP_MINUTES;

    items.push({ type: 'message', key: msg._id, message: msg, groupStart, showTimestampDefault });
  });

  return items;
}

function ChatDateDivider({ label }) {
  return (
    <View style={styles.chatDateDivider}>
      <Text style={styles.chatDateDividerText}>{label}</Text>
    </View>
  );
}

function ChatMessageRow({ item, revealed, onToggleReveal }) {
  const { message: msg, groupStart, showTimestampDefault } = item;
  const showTimestamp = showTimestampDefault || revealed;

  return (
    <Pressable
      onPress={() => onToggleReveal(msg._id)}
      style={[styles.chatMessageRow, msg.isMe ? styles.chatMessageRowMe : styles.chatMessageRowThem, groupStart && styles.chatMessageRowGroupStart]}
    >
      <View style={[styles.messageBubble, msg.isMe ? styles.messageMe : styles.messageThem]}>
        <Text style={[styles.messageText, msg.isMe && styles.messageTextMe]}>{msg.content}</Text>
      </View>
      {showTimestamp ? (
        <Text style={[styles.chatTimestamp, msg.isMe && styles.chatTimestampMe]}>{chatTimeLabel(msg.createdAt)}</Text>
      ) : null}
    </Pressable>
  );
}

// Report reasons match the server enum (lib/types/safety REPORT_REASONS).
const REPORT_REASONS = [
  { key: 'harassment', label: 'Harassment' },
  { key: 'spam', label: 'Spam' },
  { key: 'fake_profile', label: 'Fake profile' },
  { key: 'inappropriate_content', label: 'Inappropriate content' },
  { key: 'underage', label: 'Underage' },
  { key: 'hate_speech', label: 'Hate speech' },
  { key: 'scam', label: 'Scam' },
  { key: 'other', label: 'Other' },
];

function ChatRoomScreen({ match, onBack }) {
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(match.profile || null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  // Tapping a message toggles its exact timestamp even mid-run, like iMessage.
  const [revealedId, setRevealedId] = useState(null);
  // Safety: report + block (Apple App Store 1.2 requirement for UGC/dating).
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [safetyBusy, setSafetyBusy] = useState(false);

  async function submitReport() {
    if (!otherUser?._id || reportDetails.trim().length < 5 || safetyBusy) return;
    setSafetyBusy(true);
    try {
      await apiRequest('/api/report', {
        method: 'POST',
        body: {
          reportedUserId: otherUser._id,
          reason: reportReason,
          details: reportDetails.trim(),
          matchId: match._id,
          conversationId: match._id,
          autoBlock: true,
        },
      });
      setReportOpen(false);
      setReportDetails('');
      Alert.alert('Report submitted', 'Thanks — our team will review this, and we’ve blocked this person for you.');
      onBack();
    } catch (err) {
      Alert.alert('Could not submit report', err.message);
    } finally {
      setSafetyBusy(false);
    }
  }

  function confirmBlock() {
    Alert.alert(
      `Block ${otherUser?.first_name || otherUser?.name || 'this person'}?`,
      'You will no longer see each other or be able to message.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest('/api/block', {
                method: 'POST',
                body: { blockedUserId: otherUser._id, reason: 'Blocked from chat.' },
              });
              onBack();
            } catch (err) {
              Alert.alert('Could not block', err.message);
            }
          },
        },
      ]
    );
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/api/chat?matchId=${match._id}`);
      setMessages(data.messages || []);
      setOtherUser(data.otherUser || match.profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [match?._id]);

  async function send() {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const data = await apiRequest('/api/chat', {
        method: 'POST',
        body: { matchId: match._id, content: trimmed },
      });
      setMessages((prev) => [...prev, data.message]);
      setContent('');
    } catch (err) {
      Alert.alert('Message failed', err.message);
    } finally {
      setSending(false);
    }
  }

  const chatItems = useMemo(() => buildChatItems(messages), [messages]);

  return (
    <Screen
      scroll={false}
      footer={(
        <View style={styles.messageComposer}>
          <View style={{ flex: 1 }}>
            <TextField value={content} onChangeText={setContent} placeholder="Message..." />
          </View>
          <IconButton icon="send" label="Send" tone="dark" onPress={send} disabled={sending || !content.trim()} />
        </View>
      )}
    >
      <Header
        title={otherUser?.name || 'Chat'}
        subtitle="Accepted match"
        onBack={onBack}
        right={<IconButton icon="ellipsis-horizontal" label="Safety options" onPress={() => setMenuOpen(true)} />}
      />
      <ErrorBanner message={error} />
      {loading ? (
        <ActivityIndicator color={colors.black} />
      ) : chatItems.length === 0 ? (
        <EmptyState icon="chatbubble-ellipses" title="No messages yet" body={`Say hey to ${otherUser?.first_name || otherUser?.name || 'them'} to start the conversation!`} />
      ) : (
        <FlatList
          data={chatItems}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) =>
            item.type === 'date' ? (
              <ChatDateDivider label={item.label} />
            ) : (
              <ChatMessageRow
                item={item}
                revealed={revealedId === item.message._id}
                onToggleReveal={(id) => setRevealedId((current) => (current === id ? null : id))}
              />
            )
          }
        />
      )}

      {/* Safety action sheet */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
            <Pressable
              style={styles.sheetRow}
              onPress={() => { setMenuOpen(false); setReportOpen(true); }}
            >
              <Ionicons name="flag" size={20} color={colors.text} />
              <Text style={styles.sheetRowText}>Report {otherUser?.first_name || otherUser?.name || 'user'}</Text>
            </Pressable>
            <Pressable
              style={styles.sheetRow}
              onPress={() => { setMenuOpen(false); confirmBlock(); }}
            >
              <Ionicons name="ban" size={20} color={colors.red} />
              <Text style={[styles.sheetRowText, { color: colors.red }]}>Block {otherUser?.first_name || otherUser?.name || 'user'}</Text>
            </Pressable>
            <Pressable style={[styles.sheetRow, styles.sheetCancel]} onPress={() => setMenuOpen(false)}>
              <Text style={styles.sheetRowText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Report modal */}
      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Report {otherUser?.first_name || otherUser?.name || 'user'}</Text>
            <Text style={styles.helpText}>Reports are private. This person won’t know who reported them, and we’ll block them for you.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.replyChipRow}>
              {REPORT_REASONS.map((r) => {
                const active = reportReason === r.key;
                return (
                  <Pressable key={r.key} onPress={() => setReportReason(r.key)} style={[styles.replyChip, active && styles.replyChipActive]}>
                    <Text style={[styles.replyChipText, active && styles.replyChipTextActive]}>{r.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <TextField
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder="Share what happened (at least 5 characters)"
              multiline
            />
            <View style={styles.actionRow}>
              <Button style={styles.actionButton} variant="secondary" onPress={() => setReportOpen(false)}>Cancel</Button>
              <Button style={styles.actionButton} onPress={submitReport} loading={safetyBusy} disabled={reportDetails.trim().length < 5}>
                Submit report
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function FilterSelectField({ label, value, options, onChange, icon }) {
  return (
    <View style={styles.filterSelectRow}>
      <View style={{ flex: 1 }}>
        <SearchSelectField
          label={label}
          value={value}
          options={options}
          onChange={onChange}
          icon={icon}
        />
      </View>
      {value ? (
        <IconButton icon="close" label={`Clear ${label}`} onPress={() => onChange('')} />
      ) : null}
    </View>
  );
}

function DealbreakerToggle({ title, body, value, onChange, icon = 'filter' }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[styles.dealbreakerRow, value && styles.dealbreakerRowActive]}
    >
      <View style={[styles.dealbreakerIcon, value && styles.dealbreakerIconActive]}>
        <Ionicons name={icon} size={18} color={value ? '#fff' : colors.orange} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.dealbreakerTitle}>{title}</Text>
        <Text style={styles.dealbreakerBody}>{body}</Text>
      </View>
      <View style={[styles.switchTrack, value && styles.switchTrackActive]}>
        <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
      </View>
    </Pressable>
  );
}

function DatingFiltersScreen({ profile, onBack, onSaved }) {
  const filters = profile?.filters || {};
  const initialAgeMin = Math.round(Number(filters.age_min) || 18);
  const initialAgeMax = Math.round(Number(filters.age_max) || 35);
  const [distance, setDistance] = useState(Math.round(Number(filters.distance_miles) || DEFAULT_DISTANCE_MILES));
  const [distanceDealbreaker, setDistanceDealbreaker] = useState(filters.distance_dealbreaker ?? true);
  const [ageMin, setAgeMin] = useState(Math.min(initialAgeMin, initialAgeMax));
  const [ageMax, setAgeMax] = useState(Math.max(initialAgeMin, initialAgeMax));
  const [ageDealbreaker, setAgeDealbreaker] = useState(!!filters.age_dealbreaker);
  const [school, setSchool] = useState(filters.school || '');
  const [schoolDealbreaker, setSchoolDealbreaker] = useState(!!filters.school_dealbreaker);
  const [major, setMajor] = useState(filters.majors?.[0] || '');
  const [majorDealbreaker, setMajorDealbreaker] = useState(!!filters.majors_dealbreaker);
  const [year, setYear] = useState(filters.year || '');
  const [yearDealbreaker, setYearDealbreaker] = useState(!!filters.year_dealbreaker);
  const [gender, setGender] = useState(filters.gender || '');
  const [genderDealbreaker, setGenderDealbreaker] = useState(!!filters.gender_dealbreaker);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateAgeMin(next) {
    const value = Math.min(next, ageMax);
    setAgeMin(value);
  }

  function updateAgeMax(next) {
    const value = Math.max(next, ageMin);
    setAgeMax(value);
  }

  function clearFilters() {
    setDistance(DEFAULT_DISTANCE_MILES);
    setDistanceDealbreaker(true);
    setAgeMin(18);
    setAgeMax(35);
    setAgeDealbreaker(false);
    setSchool('');
    setSchoolDealbreaker(false);
    setMajor('');
    setMajorDealbreaker(false);
    setYear('');
    setYearDealbreaker(false);
    setGender('');
    setGenderDealbreaker(false);
  }

  async function saveFilters() {
    setSaving(true);
    setError('');
    try {
      const nextFilters = {
        ...(profile?.filters || {}),
        distance_miles: distance,
        distance_dealbreaker: distanceDealbreaker,
        age_min: ageMin,
        age_max: ageMax,
        age_dealbreaker: ageDealbreaker,
        school: school.trim() || null,
        school_dealbreaker: schoolDealbreaker,
        majors: major.trim() ? [major.trim()] : [],
        majors_dealbreaker: majorDealbreaker,
        year: year || null,
        year_dealbreaker: yearDealbreaker,
        gender: gender || null,
        gender_dealbreaker: genderDealbreaker,
      };

      const data = await apiRequest('/api/profile/filters', {
        method: 'PUT',
        body: { filters: nextFilters },
      });
      onSaved(data.filters || nextFilters);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Header title="Dating filters" subtitle="Used by every friend swiping for you." onBack={onBack} />
      <Card style={styles.formCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="location" size={20} color={colors.amber} />
          <Text style={styles.sectionTitleNoMargin}>Distance</Text>
        </View>
        <DistanceSlider value={distance} onChange={setDistance} />
        <DealbreakerToggle
          title="Use distance as a dealbreaker"
          body="Profiles farther than this will not appear in your friends' feed."
          value={distanceDealbreaker}
          onChange={setDistanceDealbreaker}
          icon="navigate"
        />
      </Card>

      <Card style={styles.formCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="calendar" size={20} color={colors.amber} />
          <Text style={styles.sectionTitleNoMargin}>Age range</Text>
        </View>
        <RangeSlider label="Minimum age" value={ageMin} onChange={updateAgeMin} min={18} max={60} maxLabel="60+" />
        <RangeSlider label="Maximum age" value={ageMax} onChange={updateAgeMax} min={18} max={60} maxLabel="60+" />
        <DealbreakerToggle
          title="Use age as a dealbreaker"
          body="Only profiles inside this age range will appear."
          value={ageDealbreaker}
          onChange={setAgeDealbreaker}
          icon="calendar"
        />
      </Card>

      <Card style={styles.formCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="school" size={20} color={colors.amber} />
          <Text style={styles.sectionTitleNoMargin}>School and major</Text>
        </View>
        <FilterSelectField label="School" value={school} options={US_COLLEGES} onChange={setSchool} icon="school" />
        <DealbreakerToggle
          title="Use school as a dealbreaker"
          body="Only people from this school will appear."
          value={schoolDealbreaker}
          onChange={setSchoolDealbreaker}
          icon="school"
        />
        <FilterSelectField label="Major" value={major} options={US_MAJORS} onChange={setMajor} icon="book" />
        <DealbreakerToggle
          title="Use major as a dealbreaker"
          body="Only people in this major will appear."
          value={majorDealbreaker}
          onChange={setMajorDealbreaker}
          icon="book"
        />
      </Card>

      <Card style={styles.formCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="options" size={20} color={colors.amber} />
          <Text style={styles.sectionTitleNoMargin}>More filters</Text>
        </View>
        <OptionRow title="Class year" options={CLASS_YEARS} value={year} onChange={setYear} />
        <DealbreakerToggle
          title="Use class year as a dealbreaker"
          body="Only people with this class year will appear."
          value={yearDealbreaker}
          onChange={setYearDealbreaker}
          icon="ribbon"
        />
        <OptionRow title="Gender" options={GENDERS} value={gender} onChange={setGender} />
        <DealbreakerToggle
          title="Use gender as a dealbreaker"
          body="Only people matching this gender filter will appear."
          value={genderDealbreaker}
          onChange={setGenderDealbreaker}
          icon="people"
        />
      </Card>

      <ErrorBanner message={error} />
      <View style={styles.onboardingActions}>
        <Button style={styles.actionButton} variant="secondary" onPress={clearFilters}>Reset</Button>
        <Button style={styles.actionButton} onPress={saveFilters} loading={saving}>Save filters</Button>
      </View>
    </Screen>
  );
}

// How this user is doing AS a wingman: score, tier, accept rate. Fed by
// GET /api/wingman/rank (computed live from their sent likes' outcomes).
function WingmanRankCard({ rank }) {
  if (!rank) return null;
  const statItems = [
    { label: 'Likes sent', value: rank.sent ?? 0 },
    { label: 'Accepted', value: rank.accepted ?? 0 },
    { label: 'Matches made', value: rank.confirmedMatches ?? 0 },
    { label: 'Assists', value: rank.assists ?? 0 },
  ];
  return (
    <Card style={styles.rankCard}>
      <View style={styles.rankHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionLabel}>Wingman rank</Text>
          <Text style={styles.rankTierText}>{rank.tier || 'Rookie'}</Text>
          <Text style={styles.mutedText}>{Math.round((rank.acceptRate ?? 0.5) * 100)}% of your likes get accepted</Text>
        </View>
        <View style={styles.rankScoreBubble}>
          <Text style={styles.rankScoreText}>{rank.score ?? 0}</Text>
          <Text style={styles.rankScoreLabel}>pts</Text>
        </View>
      </View>
      <View style={styles.rankStatsRow}>
        {statItems.map((stat) => (
          <View key={stat.label} style={styles.rankStat}>
            <Text style={styles.rankStatValue}>{stat.value}</Text>
            <Text style={styles.rankStatLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function ProfileScreen({ profile, onRoute, onEdit, onFilters, onSignOut, onDeleted }) {
  const [rank, setRank] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/api/wingman/rank')
      .then((data) => { if (!cancelled) setRank(data.rank || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Apple App Store 5.1.1(v): an account created in-app must be deletable in-app.
  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently erases your profile, matches, and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await apiRequest('/api/account', { method: 'DELETE' });
              await onDeleted();
            } catch (err) {
              setDeleting(false);
              Alert.alert('Could not delete account', err.message);
            }
          },
        },
      ]
    );
  }

  return (
    <Screen footer={<BottomTabs current="profile" onNavigate={onRoute} />}>
      <Header
        title="Profile"
        subtitle="Account and profile settings."
        right={<IconButton icon="options-outline" label="Dating filters" onPress={onFilters} />}
      />
      <Card style={styles.profileCenter}>
        <Avatar uri={firstPhoto(profile)} name={profile?.name} size={96} />
        <Text style={styles.profileName}>{profile?.name || 'Your profile'}</Text>
        <Text style={styles.mutedText}>{profile?.email}</Text>
        <Text style={styles.mutedText}>{profile?.school || 'School not set'} · {profile?.major || profile?.majors?.[0] || 'Major not set'}</Text>
      </Card>
      <WingmanRankCard rank={rank} />
      <Button onPress={onEdit}>Edit profile</Button>
      <View style={{ height: 12 }} />
      <Button variant="secondary" onPress={onSignOut}>Sign out</Button>
      <Pressable onPress={confirmDelete} disabled={deleting} style={styles.deleteAccountRow}>
        <Text style={styles.deleteAccountText}>{deleting ? 'Deleting…' : 'Delete my account'}</Text>
      </Pressable>
    </Screen>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);
  const [introDone, setIntroDone] = useState(false);
  const [route, setRoute] = useState('loading');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [pendingMatches, setPendingMatches] = useState(0);

  async function loadProfile(nextRoute) {
    const data = await apiRequest('/api/profile');
    setProfile(data.profile);
    setRoute(nextRoute || (data.profile?.name ? 'home' : 'onboarding'));
    return data.profile;
  }

  async function hydrate() {
    try {
      const stored = await getStoredUser();
      if (!stored) {
        setRoute('auth');
        return;
      }
      setUser(stored);
      await loadProfile();
    } catch {
      await clearSession();
      setUser(null);
      setProfile(null);
      setRoute('auth');
    }
  }

  useEffect(() => {
    hydrate();
  }, []);

  async function handleAuthed(nextUser) {
    setUser(nextUser);
    await loadProfile(nextUser.hasProfile ? 'home' : 'onboarding');
  }

  async function handleProfileComplete() {
    await loadProfile('home');
  }

  async function handleProfileEditComplete() {
    await loadProfile('profile');
  }

  async function handleSignOut() {
    await logout();
    setUser(null);
    setProfile(null);
    setRoute('auth');
  }

  // Account already deleted server-side; just drop the local session and reset.
  async function handleAccountDeleted() {
    await clearSession();
    setUser(null);
    setProfile(null);
    setRoute('auth');
  }

  function navigateTab(key) {
    if (key === 'home') setRoute('home');
    if (key === 'matches') setRoute('matches');
    if (key === 'chats') setRoute('chats');
    if (key === 'profile') setRoute('profile');
    if (key === 'delegate') setRoute('delegate');
  }

  const screen = useMemo(() => {
    if (!fontsLoaded) return <LoadingScreen />;
    if (route === 'loading') return <LoadingScreen />;
    if (route === 'auth') {
      return <AuthScreen onAuthed={handleAuthed} />;
    }
    if (route === 'onboarding') {
      return (
        <OnboardingScreen
          profile={profile}
          onComplete={handleProfileComplete}
          editing={false}
          onBack={handleSignOut}
        />
      );
    }
    if (route === 'editProfile' && profile) {
      return (
        <OnboardingScreen
          profile={profile}
          onComplete={handleProfileEditComplete}
          editing
          allAtOnce
          onBack={() => setRoute('profile')}
        />
      );
    }
    if (route === 'datingFilters' && profile) {
      return (
        <DatingFiltersScreen
          profile={profile}
          onBack={() => setRoute('profile')}
          onSaved={(filters) => {
            setProfile((current) => ({ ...current, filters }));
            setRoute('profile');
          }}
        />
      );
    }
    if (route === 'delegate') {
      return <DelegateScreen onBack={() => setRoute('home')} onDone={() => setRoute('home')} />;
    }
    if (route === 'swipe' && selectedOwner) {
      return <SwipeScreen owner={selectedOwner} onBack={() => setRoute('home')} />;
    }
    if (route === 'matches' && profile) {
      return (
        <MatchesScreen
          profile={profile}
          onRoute={navigateTab}
          setPendingMatches={setPendingMatches}
          onOpenChat={(match) => {
            setSelectedMatch(match);
            setRoute('chatRoom');
          }}
        />
      );
    }
    if (route === 'chats') {
      return (
        <ChatListScreen
          onRoute={navigateTab}
          onOpenChat={(match) => {
            setSelectedMatch(match);
            setRoute('chatRoom');
          }}
        />
      );
    }
    if (route === 'chatRoom' && selectedMatch) {
      return <ChatRoomScreen match={selectedMatch} onBack={() => setRoute('chats')} />;
    }
    if (route === 'profile' && profile) {
      return (
        <ProfileScreen
          profile={profile}
          onRoute={navigateTab}
          onEdit={() => setRoute('editProfile')}
          onFilters={() => setRoute('datingFilters')}
          onSignOut={handleSignOut}
          onDeleted={handleAccountDeleted}
        />
      );
    }
    return (
      <HomeScreen
        profile={profile}
        setPendingMatches={setPendingMatches}
        onRoute={navigateTab}
        onSignOut={handleSignOut}
        onSelectOwner={(owner) => {
          setSelectedOwner(owner);
          setRoute('swipe');
        }}
      />
    );
  }, [fontsLoaded, introDone, route, profile, selectedOwner, selectedMatch, pendingMatches]);

  return (
    <View style={styles.appRoot}>
      <StatusBar style="dark" />
      {screen}
      {fontsLoaded && route !== 'loading' && !introDone ? (
        <IntroScreen
          onDone={() => setIntroDone(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  introGlow: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    marginLeft: -170,
    width: 340,
    height: 300,
    borderRadius: 170,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  introRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introLogoWrap: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  introSpark: {
    position: 'absolute',
  },
  introSpark1: { top: -6, right: 8 },
  introSpark2: { bottom: 6, left: -2 },
  introSpark3: { top: 20, left: 12 },
  introLogo: {
    shadowColor: '#78281433',
    shadowOpacity: 0.55,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  introTitle: {
    marginTop: 13,
    color: '#ffffff',
    fontSize: 40,
    letterSpacing: -1.2,
    fontFamily: fonts.displayExtraBold,
  },
  introTitleAccent: {
    color: colors.pinkLight,
  },
  introTagline: {
    marginTop: 8,
    color: '#c8bcae',
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    fontFamily: fonts.mono,
  },
  introDots: {
    position: 'absolute',
    bottom: 64,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  introDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  authScreenBody: {
    flexGrow: 1,
    paddingTop: 44,
  },
  authHero: {
    alignItems: 'center',
    marginBottom: 42,
  },
  appName: {
    color: colors.text,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.4,
    fontFamily: fonts.displayExtraBold,
  },
  appNameAccent: {
    color: colors.pink,
  },
  appNameStacked: {
    marginTop: 16,
  },
  brandTagline: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: fonts.mono,
  },
  heroTitle: {
    marginTop: 16,
    color: colors.text,
    textAlign: 'center',
    fontSize: 34,
    lineHeight: 38,
    fontFamily: fonts.displayExtraBold,
  },
  heroBody: {
    marginTop: 10,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: fonts.body,
  },
  authCard: {
    padding: 20,
    borderRadius: 24,
    marginTop: 2,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: colors.surfaceWarm,
    borderRadius: 14,
    marginBottom: 20,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.muted,
    fontFamily: fonts.bodyExtraBold,
  },
  segmentTextActive: {
    color: colors.text,
  },
  errorBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: colors.red,
    fontFamily: fonts.bodyBold,
  },
  noticeBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
  },
  formCard: {
    marginBottom: 16,
  },
  stepHero: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  stepIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
    marginBottom: 10,
  },
  stepKicker: {
    color: colors.amber,
    fontSize: 12,
    fontFamily: fonts.bodyExtraBold,
    marginBottom: 4,
  },
  stepTitle: {
    color: colors.text,
    fontSize: 25,
    fontFamily: fonts.displayExtraBold,
  },
  stepSubtitle: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
    fontFamily: fonts.body,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 14,
  },
  stepDot: {
    width: 18,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.secondaryPressed,
  },
  stepDotActive: {
    backgroundColor: colors.black,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontFamily: fonts.displayExtraBold,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitleNoMargin: {
    color: colors.text,
    fontSize: 19,
    fontFamily: fonts.displayExtraBold,
  },
  sectionLabel: {
    color: colors.slate,
    fontSize: 13,
    fontFamily: fonts.bodyExtraBold,
    marginBottom: 8,
  },
  helpText: {
    color: colors.muted,
    lineHeight: 20,
    fontFamily: fonts.body,
  },
  fieldLike: {
    marginBottom: 14,
  },
  filterSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectField: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectValue: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.body,
  },
  selectPlaceholder: {
    color: colors.muted,
  },
  selectOption: {
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  selectOptionText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
  },
  selectOptionPrimary: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.black,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  selectOptionPrimaryText: {
    color: '#fff',
    fontFamily: fonts.bodyExtraBold,
  },
  sliderBlock: {
    marginBottom: 18,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderValue: {
    color: colors.text,
    fontSize: 18,
    fontFamily: fonts.displayExtraBold,
  },
  sliderTrack: {
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceWarm,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: '100%',
    backgroundColor: colors.black,
  },
  sliderThumb: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: colors.black,
    marginLeft: -13,
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  optionBlock: {
    marginTop: 4,
    marginBottom: 12,
  },
  dealbreakerRow: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dealbreakerRowActive: {
    borderColor: colors.black,
    backgroundColor: '#fff1ec',
  },
  dealbreakerIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  dealbreakerIconActive: {
    backgroundColor: colors.black,
  },
  dealbreakerTitle: {
    color: colors.text,
    fontFamily: fonts.bodyExtraBold,
  },
  dealbreakerBody: {
    color: colors.muted,
    lineHeight: 18,
    marginTop: 2,
    fontSize: 12,
    fontFamily: fonts.body,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
    backgroundColor: colors.surfaceWarm,
  },
  switchTrackActive: {
    backgroundColor: colors.black,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  switchThumbActive: {
    transform: [{ translateX: 18 }],
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PHOTO_GRID_GAP,
    marginTop: 14,
  },
  photoToolbar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  photoToolButton: {
    flex: 1,
  },
  photoSlot: {
    width: '30.8%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surfaceWarm,
  },
  photoSlotPressable: {
    flex: 1,
  },
  photoSlotDraggable: {
    borderColor: colors.amber,
  },
  photoSlotSwapTarget: {
    borderColor: colors.black,
    borderWidth: 3,
  },
  photoSlotDragging: {
    opacity: 0.92,
    shadowColor: '#5A3A2A',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoEmptyText: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: fonts.bodyExtraBold,
  },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPositionBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPositionText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: fonts.bodyExtraBold,
  },
  photoDragHandle: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    width: 38,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 8,
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontFamily: fonts.displayExtraBold,
  },
  mutedText: {
    color: colors.muted,
    lineHeight: 19,
    fontFamily: fonts.body,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  onboardingActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
  },
  inviteCard: {
    marginBottom: 14,
  },
  inviteCode: {
    color: colors.text,
    fontSize: 34,
    letterSpacing: 3,
    fontFamily: fonts.displayExtraBold,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
  },
  linkText: {
    color: colors.orange,
    fontFamily: fonts.bodyExtraBold,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 13,
    marginBottom: 10,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontFamily: fonts.displayExtraBold,
  },
  swipeShell: {
    flex: 1,
    padding: 20,
  },
  feedTabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 5,
    borderRadius: 18,
    backgroundColor: colors.surfaceWarm,
    marginBottom: 12,
  },
  feedTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  feedTabActive: {
    backgroundColor: colors.surface,
  },
  feedTabText: {
    color: colors.muted,
    fontFamily: fonts.bodyExtraBold,
  },
  feedTabTextActive: {
    color: colors.text,
  },
  likedCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
  },
  likedCountText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: fonts.bodyExtraBold,
  },
  candidateScroll: {
    flex: 1,
  },
  swipeActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
  },
  swipeButton: {
    flex: 1,
  },
  deckWrap: {
    flex: 1,
    paddingTop: 6,
  },
  deckArea: {
    flex: 1,
    marginBottom: 16,
  },
  deckCard: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...shadow,
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  deckCardPressable: {
    flex: 1,
  },
  cardFace: {
    flex: 1,
  },
  cardPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardPhotoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInitial: {
    color: '#fff',
    fontSize: 104,
    fontFamily: fonts.displayExtraBold,
  },
  cardScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
  },
  cardInfo: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 24,
  },
  cardName: {
    color: '#fff',
    fontSize: 30,
    letterSpacing: -0.6,
    fontFamily: fonts.displayExtraBold,
  },
  cardMeta: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    marginTop: 4,
    fontFamily: fonts.bodyMedium,
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  reasonChip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  reasonChipText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    textTransform: 'capitalize',
  },
  compBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(20,12,10,0.5)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  compBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: fonts.bodyExtraBold,
  },
  stamp: {
    position: 'absolute',
    top: 44,
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 4,
  },
  stampLike: {
    left: 24,
    borderColor: colors.green,
    transform: [{ rotate: '-16deg' }],
  },
  stampNope: {
    right: 24,
    borderColor: colors.red,
    transform: [{ rotate: '16deg' }],
  },
  stampTextLike: {
    color: colors.green,
    fontSize: 34,
    letterSpacing: 1.5,
    fontFamily: fonts.displayExtraBold,
  },
  stampTextNope: {
    color: colors.red,
    fontSize: 34,
    letterSpacing: 1.5,
    fontFamily: fonts.displayExtraBold,
  },
  deckActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingBottom: 6,
  },
  circleBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  circleBtnPass: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  circleBtnLike: {
    backgroundColor: colors.pink,
  },
  circleBtnSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  circleBtnPressed: {
    transform: [{ scale: 0.92 }],
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  detailHeaderTitle: {
    fontSize: 24,
    color: colors.text,
    fontFamily: fonts.displayExtraBold,
  },
  matchOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  matchGlow: {
    position: 'absolute',
    top: '24%',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  matchSpark: {
    position: 'absolute',
  },
  matchEyebrow: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: fonts.mono,
    marginBottom: 12,
  },
  matchTitle: {
    color: '#ffffff',
    fontSize: 48,
    letterSpacing: -1.2,
    fontFamily: fonts.displayExtraBold,
  },
  matchAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 26,
  },
  matchAvatarRing: {
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.92)',
    overflow: 'hidden',
  },
  matchAvatarRingRight: {},
  matchHeart: {
    marginHorizontal: -16,
    zIndex: 5,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  matchSub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: fonts.bodyMedium,
    marginBottom: 30,
    paddingHorizontal: 8,
  },
  matchButton: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 46,
    ...shadow,
  },
  matchButtonText: {
    color: colors.pink,
    fontSize: 16,
    fontFamily: fonts.bodyExtraBold,
  },
  candidateCard: {
    paddingBottom: 20,
    gap: 12,
  },
  candidateImageWrap: {
    aspectRatio: 3 / 4,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.black,
  },
  candidateImage: {
    width: '100%',
    height: '100%',
  },
  candidateImageEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextLarge: {
    color: '#fff',
    fontSize: 64,
    fontFamily: fonts.displayExtraBold,
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  imageCaption: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
  },
  candidateName: {
    color: '#fff',
    fontSize: 30,
    fontFamily: fonts.displayExtraBold,
  },
  candidateMeta: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: fonts.bodyBold,
    marginTop: 4,
  },
  reasonCard: {
    backgroundColor: colors.black,
  },
  reasonText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: fonts.bodyExtraBold,
  },
  detailCard: {
    gap: 12,
  },
  likedCard: {
    gap: 14,
    marginBottom: 12,
  },
  swiperList: {
    gap: 9,
  },
  swiperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  swiperName: {
    color: colors.text,
    fontFamily: fonts.bodyExtraBold,
  },
  swiperNote: {
    color: colors.muted,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    color: colors.slate,
    width: 82,
    fontFamily: fonts.bodyExtraBold,
  },
  infoValue: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bodyBold,
  },
  promptDisplay: {
    backgroundColor: colors.orange,
    borderColor: '#9a3412',
    borderWidth: 1,
  },
  promptQuestion: {
    color: '#ffedd5',
    fontFamily: fonts.bodyExtraBold,
    marginBottom: 10,
  },
  promptAnswer: {
    color: '#fff7ed',
    fontSize: 28,
    lineHeight: 34,
    fontFamily: fonts.displayExtraBold,
  },
  extraPhoto: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 22,
    backgroundColor: colors.surfaceWarm,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 12,
  },
  sheetCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetRowText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
  },
  sheetCancel: {
    borderBottomWidth: 0,
    justifyContent: 'center',
  },
  deleteAccountRow: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
  },
  deleteAccountText: {
    color: colors.red,
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontFamily: fonts.displayExtraBold,
  },
  matchCard: {
    marginBottom: 14,
    gap: 14,
  },
  matchTop: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  statusText: {
    color: colors.orange,
    fontFamily: fonts.bodyExtraBold,
    marginTop: 5,
  },
  friendNote: {
    backgroundColor: colors.surfaceWarm,
    borderRadius: 16,
    padding: 12,
  },
  noteText: {
    color: colors.text,
    lineHeight: 20,
    fontFamily: fonts.bodyBold,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unreadPill: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
  },
  unreadText: {
    color: '#fff',
    fontFamily: fonts.bodyExtraBold,
  },
  messages: {
    paddingVertical: 12,
  },
  chatDateDivider: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  chatDateDividerText: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    backgroundColor: colors.surfaceWarm,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  chatMessageRow: {
    marginTop: 2,
  },
  chatMessageRowMe: {
    alignItems: 'flex-end',
  },
  chatMessageRowThem: {
    alignItems: 'flex-start',
  },
  chatMessageRowGroupStart: {
    marginTop: 12,
  },
  chatTimestamp: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: fonts.mono,
    marginTop: 4,
    marginHorizontal: 4,
  },
  chatTimestampMe: {
    textAlign: 'right',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 17,
  },
  messageMe: {
    alignSelf: 'flex-end',
    backgroundColor: colors.black,
  },
  messageThem: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceWarm,
  },
  messageText: {
    color: colors.text,
    lineHeight: 20,
    fontFamily: fonts.body,
  },
  messageTextMe: {
    color: '#fff',
  },
  messageComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  profileCenter: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  profileFilterCard: {
    gap: 12,
    marginBottom: 16,
  },
  profileName: {
    color: colors.text,
    fontSize: 24,
    fontFamily: fonts.displayExtraBold,
  },

  // --- Like notes: reply-to-prompt/photo chips + counter ---
  replyChipRow: {
    flexGrow: 0,
    marginBottom: 10,
  },
  replyChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    maxWidth: 220,
  },
  replyChipActive: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
  replyChipText: {
    color: colors.text,
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
  },
  replyChipTextActive: {
    color: '#fff',
  },
  charCountText: {
    alignSelf: 'flex-end',
    color: colors.muted,
    fontSize: 12,
    fontFamily: fonts.mono,
    marginTop: 4,
    marginBottom: 4,
  },

  // --- "Like sent" toast (a like now goes to the other side's wingmen) ---
  sentToast: {
    position: 'absolute',
    bottom: 108,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.charcoal,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...shadow,
  },
  sentToastText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
  },

  // --- Incoming likes review ---
  replyContextText: {
    color: colors.pink,
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    marginBottom: 1,
  },
  decisionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  decisionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  decisionPillAccept: {
    backgroundColor: colors.green,
  },
  decisionPillReject: {
    backgroundColor: colors.red,
  },
  decisionPillText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },

  // --- Wingman thread ---
  threadSenderText: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    marginBottom: 3,
  },

  // --- Wingman rank ---
  leaderRankText: {
    width: 20,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 15,
    fontFamily: fonts.displayExtraBold,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.pink,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  scorePillText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: fonts.bodyExtraBold,
  },
  rankCard: {
    gap: 14,
    marginBottom: 16,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankTierText: {
    color: colors.text,
    fontSize: 22,
    fontFamily: fonts.displayExtraBold,
    marginBottom: 2,
  },
  rankScoreBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankScoreText: {
    color: '#fff',
    fontSize: 22,
    fontFamily: fonts.displayExtraBold,
    lineHeight: 26,
  },
  rankScoreLabel: {
    color: '#ffd0e4',
    fontSize: 11,
    fontFamily: fonts.mono,
  },
  rankStatsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  rankStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  rankStatValue: {
    color: colors.text,
    fontSize: 18,
    fontFamily: fonts.displayExtraBold,
  },
  rankStatLabel: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: fonts.body,
    textAlign: 'center',
  },
});
