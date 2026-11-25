import NaQlaWifi, {
  NaqlaEvents,
  type DownloadResult,
  type HistoryEntry,
  type HotspotInfo,
  type ManifestEntry,
  type PermissionStates,
  type SharedFileInfo,
} from '../../modules/naqla-wifi/src/NaqlaWifi';

export { NaqlaEvents };

export type QRPayload = {
  v: 1;
  type: 'naqla-local';
  ssid: string;
  password: string;
  token: string;
  port: number;
};

const MAX_QR_LENGTH = 4096;
const TOKEN_RE = /^[a-f0-9]{64}$/;

export function parseQR(data: string): QRPayload {
  const trimmed = data.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_QR_LENGTH) {
    throw new Error('INVALID_QR');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(trimmed);
  } catch {
    throw new Error('INVALID_QR');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('INVALID_QR');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.v !== 1) throw new Error('INVALID_QR');
  if (obj.type !== 'naqla-local') throw new Error('INVALID_QR');
  if (typeof obj.ssid !== 'string' || obj.ssid.length < 1 || obj.ssid.length > 32) {
    throw new Error('INVALID_QR');
  }
  if (typeof obj.password !== 'string' || obj.password.length < 8 || obj.password.length > 63) {
    throw new Error('INVALID_QR');
  }
  if (typeof obj.token !== 'string') throw new Error('INVALID_QR');
  const token = obj.token.toLowerCase();
  if (!TOKEN_RE.test(token)) throw new Error('INVALID_QR');
  if (typeof obj.port !== 'number' || !Number.isInteger(obj.port) || obj.port < 1 || obj.port > 65535) {
    throw new Error('INVALID_QR');
  }
  return {
    v: 1,
    type: 'naqla-local',
    ssid: obj.ssid,
    password: obj.password,
    token,
    port: obj.port,
  };
}

export function buildQRPayload(info: HotspotInfo): string {
  return JSON.stringify({
    v: 1,
    type: 'naqla-local',
    ssid: info.ssid,
    password: info.password,
    token: info.token,
    port: info.port,
  } satisfies QRPayload);
}

export type NativeErrorCode =
  | 'INVALID_QR'
  | 'PERMISSION_DENIED'
  | 'HOTSPOT_FAILED'
  | 'CONNECTION_FAILED'
  | 'FORBIDDEN'
  | 'DOWNLOAD_FAILED'
  | 'SAVE_FAILED'
  | 'UNSUPPORTED_ANDROID'
  | 'NO_ACTIVITY'
  | 'GENERIC';

export function errorCode(e: unknown): NativeErrorCode {
  if (e instanceof Error && e.message === 'INVALID_QR') return 'INVALID_QR';
  const code = String((e as { code?: unknown })?.code ?? (e as Error | undefined)?.message ?? '');
  if (code.includes('PERMISSION_DENIED')) return 'PERMISSION_DENIED';
  if (code.includes('HOTSPOT_FAILED')) return 'HOTSPOT_FAILED';
  if (code.includes('CONNECTION_FAILED')) return 'CONNECTION_FAILED';
  if (code.includes('FORBIDDEN')) return 'FORBIDDEN';
  if (code.includes('DOWNLOAD_FAILED')) return 'DOWNLOAD_FAILED';
  if (code.includes('SAVE_FAILED') || code.includes('UNSUPPORTED_ANDROID')) return code.includes('UNSUPPORTED_ANDROID') ? 'UNSUPPORTED_ANDROID' : 'SAVE_FAILED';
  if (code.includes('NO_ACTIVITY')) return 'NO_ACTIVITY';
  return 'GENERIC';
}

export const Native = {
  setSharedFiles: (json: string): Promise<SharedFileInfo[]> => NaQlaWifi.setSharedFiles(json),
  startHotspot: (): Promise<HotspotInfo> => NaQlaWifi.startHotspot(),
  startTransferServer: (token: string, port: number): Promise<boolean> =>
    NaQlaWifi.startTransferServer(token, port),
  stopTransferServer: (): Promise<boolean> => NaQlaWifi.stopTransferServer(),
  stopHotspot: (): Promise<boolean> => NaQlaWifi.stopHotspot(),
  joinNetwork: (ssid: string, password: string): Promise<string> => NaQlaWifi.joinNetwork(ssid, password),
  disconnectNetwork: (): Promise<boolean> => NaQlaWifi.disconnectNetwork(),
  fetchManifest: (host: string, token: string, port: number): Promise<ManifestEntry[]> =>
    NaQlaWifi.fetchManifest(host, token, port),
  downloadFile: (
    host: string,
    token: string,
    port: number,
    index: number,
    name: string,
    size: number,
    mimeType: string
  ): Promise<DownloadResult> => NaQlaWifi.downloadFile(host, token, port, index, name, size, mimeType),
  openSavedFile: (uri: string, mimeType: string | null): Promise<void> =>
    NaQlaWifi.openSavedFile(uri, mimeType),
  shareSavedFile: (uri: string, mimeType: string | null): Promise<void> =>
    NaQlaWifi.shareSavedFile(uri, mimeType),
  getHistory: (): Promise<HistoryEntry[]> => NaQlaWifi.getHistory(),
  clearHistory: (): Promise<boolean> => NaQlaWifi.clearHistory(),
  getPermissionStates: (): Promise<PermissionStates> => NaQlaWifi.getPermissionStates(),
  openLocationSettings: (): Promise<boolean> => NaQlaWifi.openLocationSettings(),
};
