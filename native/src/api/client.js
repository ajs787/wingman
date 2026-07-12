import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const SESSION_COOKIE_NAME = 'wingman_session';
const SESSION_COOKIE_KEY = 'wingman.sessionCookie';
const SESSION_TOKEN_KEY = 'wingman.sessionToken';
const USER_KEY = 'wingman.user';

// The session token/cookie are secrets — keep them in the device Keychain
// (expo-secure-store), not plaintext AsyncStorage. Falls back to AsyncStorage
// where SecureStore is unavailable (e.g. web), and migrates tokens saved by
// older builds that used AsyncStorage.
async function secureGet(key) {
  try {
    const value = await SecureStore.getItemAsync(key);
    if (value != null) return value;
  } catch {}
  const legacy = await AsyncStorage.getItem(key).catch(() => null);
  if (legacy != null) {
    try {
      await SecureStore.setItemAsync(key, legacy);
      await AsyncStorage.removeItem(key);
    } catch {}
    return legacy;
  }
  return null;
}

async function secureSet(key, value) {
  try {
    await SecureStore.setItemAsync(key, value);
    await AsyncStorage.removeItem(key).catch(() => {});
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function secureDelete(key) {
  await SecureStore.deleteItemAsync(key).catch(() => {});
  await AsyncStorage.removeItem(key).catch(() => {});
}

function getExpoHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest?.hostUri;

  if (!hostUri) return null;
  return hostUri.replace(/^https?:\/\//, '').split(':')[0];
}

function getDefaultBaseUrl() {
  const expoHost = getExpoHost();

  if (expoHost && !['localhost', '127.0.0.1', '::1'].includes(expoHost)) {
    return `http://${expoHost}:3000`;
  }

  return Platform.select({
    android: 'http://10.0.2.2:3000',
    default: 'http://127.0.0.1:3000',
  });
}

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

// Precedence: build-time env var -> app.json `extra.apiBaseUrl` (the deployed
// backend, baked into every build) -> local dev default.
export const API_BASE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL ||
    Constants.expoConfig?.extra?.apiBaseUrl ||
    getDefaultBaseUrl()
);

export function getApiDebugInfo() {
  return {
    apiBaseUrl: API_BASE_URL,
    expoHost: getExpoHost(),
    platform: Platform.OS,
    envApiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || null,
  };
}

function toAbsoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function parseSessionCookie(rawCookie) {
  if (!rawCookie) return null;
  const source = Array.isArray(rawCookie) ? rawCookie.join(',') : String(rawCookie);
  const cookies = source.split(/,(?=\s*[^;,]+=)/g);
  const session = cookies.find((cookie) => cookie.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!session) return null;
  return session.split(';')[0].trim();
}

async function persistCookieFromResponse(response) {
  const rawCookie = (
    response.headers?.get?.('set-cookie') ||
    response.headers?.get?.('Set-Cookie') ||
    response.headers?.map?.['set-cookie'] ||
    response.headers?.map?.['Set-Cookie']
  );
  const sessionCookie = parseSessionCookie(rawCookie);
  if (!sessionCookie) return;

  const value = sessionCookie.split('=')[1];
  if (!value) {
    await secureDelete(SESSION_COOKIE_KEY);
    await secureDelete(SESSION_TOKEN_KEY);
  } else {
    await secureSet(SESSION_COOKIE_KEY, sessionCookie);
    await secureSet(SESSION_TOKEN_KEY, value);
  }
}

async function persistSessionToken(data) {
  const sessionToken = data?.sessionToken || data?.token;
  if (sessionToken) {
    await secureSet(SESSION_TOKEN_KEY, sessionToken);
  }
}

export function imageUrl(path) {
  return toAbsoluteUrl(path);
}

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveStoredUser(user) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  await secureDelete(SESSION_COOKIE_KEY);
  await secureDelete(SESSION_TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

export async function apiRequest(path, options = {}) {
  const {
    body,
    headers = {},
    method = body ? 'POST' : 'GET',
    isFormData = false,
  } = options;

  const [sessionCookie, sessionToken] = await Promise.all([
    secureGet(SESSION_COOKIE_KEY),
    secureGet(SESSION_TOKEN_KEY),
  ]);
  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (sessionToken) {
    requestHeaders.Authorization = `Bearer ${sessionToken}`;
  }

  if (sessionCookie) {
    requestHeaders.Cookie = sessionCookie;
  }

  let requestBody = body;
  if (body && !isFormData) {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const url = toAbsoluteUrl(path);
  let response;

  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
    });
  } catch (cause) {
    const error = new Error(
      `Could not reach the Wingman API at ${API_BASE_URL}. ` +
      'Make sure the backend is running. For a real phone, start the backend with npm run dev:lan and Expo with npm run native:ios:lan, or set EXPO_PUBLIC_API_BASE_URL to your deployed HTTPS URL.'
    );
    error.cause = cause;
    error.url = url;
    throw error;
  }

  await persistCookieFromResponse(response);

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.error || data?.message || `Request failed (${response.status})`;
    const error = new Error(typeof message === 'string' ? message : 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function login(email, password) {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  const user = {
    userId: data.userId,
    email: data.email,
    netid: data.netid,
    hasProfile: data.hasProfile,
  };
  await persistSessionToken(data);
  await saveStoredUser(user);
  return user;
}

export async function signup(email, password) {
  const data = await apiRequest('/api/auth/signup', {
    method: 'POST',
    body: { email, password },
  });
  if (data.requiresEmailVerification) {
    return {
      requiresEmailVerification: true,
      email: data.email,
      devVerificationCode: data.devVerificationCode,
    };
  }

  const user = {
    userId: data.userId,
    email: data.email,
    netid: data.netid,
    hasProfile: data.hasProfile,
  };
  await persistSessionToken(data);
  await saveStoredUser(user);
  return user;
}

export async function verifyEmail(email, code) {
  const data = await apiRequest('/api/auth/email/verify', {
    method: 'POST',
    body: { email, code },
  });
  const user = {
    userId: data.userId,
    email: data.email,
    netid: data.netid,
    hasProfile: data.hasProfile,
  };
  await persistSessionToken(data);
  await saveStoredUser(user);
  return user;
}

export async function resendEmailVerification(email) {
  return apiRequest('/api/auth/email/resend', {
    method: 'POST',
    body: { email },
  });
}

export async function logout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } finally {
    await clearSession();
  }
}

export function photoFormFile(asset, position) {
  const extension = asset.fileName?.split('.').pop() || asset.uri?.split('.').pop() || 'jpg';
  const mimeType = asset.mimeType || `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  return {
    uri: asset.uri,
    name: asset.fileName || `wingman-photo-${position}.${extension}`,
    type: mimeType,
  };
}
