import { supabase } from '../lib/supabase';

const INSTALLATION_KEY = 'udayana:device-installation:v1';
let inMemoryInstallationToken: string | null = null;

type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    mobile?: boolean;
    platform?: string;
    brands?: Array<{ brand: string; version: string }>;
    getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>;
  };
};

export type DeviceAccessState = {
  pilotEnabled: boolean;
  pilotPaused: boolean;
  status: 'active' | 'locked';
  lockReason: string | null;
  totalDevices: number;
  maxDevices: number;
  hasOpenRequest: boolean;
};

function createInstallationToken() {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return `${webCrypto.randomUUID()}-${webCrypto.randomUUID()}`;
  }

  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(32);
    webCrypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  // Only reachable in obsolete browsers. This identifier is an audit hint,
  // not an authentication credential or enforcement proof.
  return `${Date.now()}-${Array.from({ length: 6 }, () => Math.random().toString(36).slice(2)).join('-')}`;
}

function getInstallationToken() {
  try {
    const existing = localStorage.getItem(INSTALLATION_KEY);
    if (existing && existing.length >= 32) return existing;

    const token = createInstallationToken();
    localStorage.setItem(INSTALLATION_KEY, token);
    return token;
  } catch {
    // Storage can be unavailable in hardened/private browser contexts. The
    // in-memory fallback remains stable for the current page session only.
    if (!inMemoryInstallationToken) inMemoryInstallationToken = createInstallationToken();
    return inMemoryInstallationToken;
  }
}

export function getCurrentInstallationToken() {
  if (typeof window === 'undefined') return '';
  return getInstallationToken();
}

function parseBrowser(userAgent: string) {
  const patterns: Array<[string, RegExp]> = [
    ['Microsoft Edge', /Edg\/([\d.]+)/],
    ['Opera', /(?:OPR|Opera)\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/]
  ];
  for (const [name, pattern] of patterns) {
    const match = userAgent.match(pattern);
    if (match) return { name, version: match[1] ?? '' };
  }
  return { name: 'Unknown browser', version: '' };
}

function parseOperatingSystem(userAgent: string, platformHint?: string) {
  const windows = userAgent.match(/Windows NT ([\d.]+)/);
  if (windows) return { name: 'Windows', version: windows[1] ?? '' };

  const android = userAgent.match(/Android ([\d.]+)/);
  if (android) return { name: 'Android', version: android[1] ?? '' };

  const ios = userAgent.match(/(?:iPhone OS|CPU OS) ([\d_]+)/);
  if (ios) return { name: 'iOS', version: (ios[1] ?? '').replace(/_/g, '.') };

  const mac = userAgent.match(/Mac OS X ([\d_]+)/);
  if (mac) return { name: 'macOS', version: (mac[1] ?? '').replace(/_/g, '.') };

  if (/Linux/i.test(userAgent)) return { name: 'Linux', version: '' };
  return { name: platformHint || 'Unknown OS', version: '' };
}

function inferDeviceType(userAgent: string, mobileHint?: boolean): DeviceType {
  if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))) {
    return 'tablet';
  }
  if (mobileHint || /Mobi|iPhone|iPod|Android/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

async function collectDeviceMetadata() {
  const nav = navigator as NavigatorWithUserAgentData;
  const userAgent = nav.userAgent ?? '';
  const userAgentData = nav.userAgentData;
  let highEntropy: Record<string, unknown> = {};

  try {
    highEntropy = await userAgentData?.getHighEntropyValues?.([
      'model',
      'platformVersion',
      'fullVersionList'
    ]) ?? {};
  } catch {
    // Browser privacy controls may intentionally withhold these hints.
  }

  const parsedBrowser = parseBrowser(userAgent);
  const fullVersionList = Array.isArray(highEntropy.fullVersionList)
    ? highEntropy.fullVersionList as Array<{ brand?: string; version?: string }>
    : [];
  const preferredBrand = fullVersionList.find((brand) =>
    brand.brand && !/not.?a.?brand/i.test(brand.brand)
  );
  const browserName = preferredBrand?.brand || parsedBrowser.name;
  const browserVersion = preferredBrand?.version || parsedBrowser.version;
  const parsedOs = parseOperatingSystem(userAgent, userAgentData?.platform);
  const osVersion = typeof highEntropy.platformVersion === 'string'
    ? highEntropy.platformVersion
    : parsedOs.version;
  const model = typeof highEntropy.model === 'string' ? highEntropy.model : '';
  const deviceType = inferDeviceType(userAgent, userAgentData?.mobile);

  return {
    displayName: `${browserName} on ${parsedOs.name}`,
    deviceType,
    browserName,
    browserVersion,
    osName: parsedOs.name,
    osVersion,
    model,
    language: nav.language || '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  };
}

/**
 * Registers an approximate browser installation for audit reporting.
 *
 * The local token prevents multiple tabs and normal re-logins from appearing
 * as new devices. It is deliberately not treated as a security proof: a user
 * can clear browser storage, so enforcement will need a stronger server-side
 * session policy in the later locking phase.
 */
function isMissingPilotFunction(error: { code?: string; message?: string }) {
  return error.code === 'PGRST202'
    || error.code === '42883'
    || /not found|schema cache/i.test(error.message ?? '');
}

function mapAccessRow(row: Record<string, unknown> | null | undefined): DeviceAccessState | null {
  if (!row) return null;
  return {
    pilotEnabled: row.pilot_enabled === true,
    pilotPaused: row.pilot_paused === true,
    status: row.access_status === 'locked' ? 'locked' : 'active',
    lockReason: typeof row.lock_reason === 'string' ? row.lock_reason : null,
    totalDevices: Number(row.total_devices ?? 0),
    maxDevices: Number(row.max_devices ?? 2),
    hasOpenRequest: row.has_open_request === true
  };
}

function auditParams(metadata: Awaited<ReturnType<typeof collectDeviceMetadata>>) {
  return {
    p_installation_token: getInstallationToken(),
    p_display_name: metadata.displayName,
    p_device_type: metadata.deviceType,
    p_browser_name: metadata.browserName,
    p_browser_version: metadata.browserVersion,
    p_os_name: metadata.osName,
    p_os_version: metadata.osVersion,
    p_model: metadata.model,
    p_language: metadata.language,
    p_timezone: metadata.timezone
  };
}

export async function registerCurrentDeviceAccess(): Promise<DeviceAccessState | null> {
  if (typeof window === 'undefined') return null;

  const metadata = await collectDeviceMetadata();
  const params = auditParams(metadata);
  const pilot = await supabase.rpc('register_device_access', params);

  if (!pilot.error) {
    const row = (Array.isArray(pilot.data) ? pilot.data[0] : pilot.data) as Record<string, unknown> | null;
    const effectiveAccess = await getCurrentDeviceAccess();
    return effectiveAccess ?? mapAccessRow(row);
  }

  if (!isMissingPilotFunction(pilot.error)) {
    console.warn('Device pilot registration skipped:', pilot.error.message);
    return getCurrentDeviceAccess();
  }

  // The pilot migration is not installed yet. Preserve phase-one audit
  // behavior without restricting any student.
  const { data, error } = await supabase.rpc('audit_register_device', params);

  if (error) {
    // Audit mode must always fail open. A missing/not-yet-applied migration or
    // temporary database issue must never stop a student from entering the LMS.
    console.warn('Device audit registration skipped:', error.message);
    return null;
  }

  const audit = (Array.isArray(data) ? data[0] : data) as DeviceAuditResult | null;
  if (!audit) return null;
  return {
    pilotEnabled: false,
    pilotPaused: false,
    status: 'active',
    lockReason: null,
    totalDevices: audit.total_devices,
    maxDevices: 2,
    hasOpenRequest: false
  };
}

export async function getCurrentDeviceAccess(): Promise<DeviceAccessState | null> {
  const rollout = await supabase.rpc('get_my_device_rollout_access');
  if (!rollout.error) {
    const row = (Array.isArray(rollout.data) ? rollout.data[0] : rollout.data) as Record<string, unknown> | null;
    return mapAccessRow(row);
  }
  if (!isMissingPilotFunction(rollout.error)) return null;

  const pilot = await supabase.rpc('get_my_device_access');
  if (pilot.error) return null;
  const row = (Array.isArray(pilot.data) ? pilot.data[0] : pilot.data) as Record<string, unknown> | null;
  return mapAccessRow(row);
}
