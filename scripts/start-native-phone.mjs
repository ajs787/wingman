import { spawn } from 'node:child_process';
import os from 'node:os';

const platform = process.argv[2] || 'ios';
const validPlatforms = new Set(['ios', 'android']);

if (!validPlatforms.has(platform)) {
  console.error(`Unsupported native platform "${platform}". Use ios or android.`);
  process.exit(1);
}

function getLanAddress() {
  const addresses = [];

  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      addresses.push(entry.address);
    }
  }

  const preferred =
    addresses.find((address) => address.startsWith('192.168.')) ||
    addresses.find((address) => address.startsWith('10.')) ||
    addresses.find((address) => /^172\.(1[6-9]|2\d|3[0-1])\./.test(address));

  return preferred || addresses[0];
}

const lanAddress = process.env.WINGMAN_LAN_IP || getLanAddress();

if (!lanAddress) {
  console.error('Could not find a LAN IP address. Set WINGMAN_LAN_IP manually.');
  process.exit(1);
}

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || `http://${lanAddress}:3000`;
const port = process.env.EXPO_PORT || '8081';
const expoArgs = ['expo', 'start', `--${platform}`, '--lan', '--clear', '--port', port];

console.log(`Starting Expo for ${platform} with API ${apiBaseUrl}`);
console.log(`Using Metro port ${port}. If Expo says the port is already running, stop the old Expo terminal first.`);
console.log('Make sure the backend is running with: npm run dev:lan');

const child = spawn('npx', expoArgs, {
  cwd: new URL('../native', import.meta.url),
  env: {
    ...process.env,
    EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
  },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
