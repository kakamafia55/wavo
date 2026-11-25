import { EventEmitter, requireNativeModule } from 'expo-modules-core';

export type SharedFileInput = {
  uri: string;
  name?: string;
};

export type SharedFileInfo = {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
};

export type HotspotInfo = {
  ssid: string;
  password: string;
  port: number;
  token: string;
};

export type ManifestEntry = {
  index: number;
  name: string;
  size: number;
  mimeType: string;
};

export type DownloadResult = {
  uri: string;
  name: string;
  mimeType: string;
};

export type HistoryDirection = 'sent' | 'received';

export type HistoryEntry = {
  id: string;
  direction: HistoryDirection;
  name: string;
  size: number;
  uri: string | null;
  mimeType: string;
  status: string;
  timestamp: number;
};

export type PermissionStates = {
  wifi: boolean;
  camera: boolean;
  locationServices: boolean;
  bluetooth: boolean;
};

export type NaqlaWifiModuleEvents = {
  onHotspotEvent: (event: { state: string; reason?: number }) => void;
  onServerEvent: (event: { error?: string }) => void;
  onTransferProgress: (event: { index: number; name: string; received: number; total: number }) => void;
};

type NativeNaqlaWifiModule = {
  setSharedFiles(json: string): Promise<SharedFileInfo[]>;
  startHotspot(): Promise<HotspotInfo>;
  startTransferServer(token: string, port: number): Promise<boolean>;
  stopTransferServer(): Promise<boolean>;
  stopHotspot(): Promise<boolean>;
  joinNetwork(ssid: string, password: string): Promise<string>;
  disconnectNetwork(): Promise<boolean>;
  fetchManifest(host: string, token: string, port: number): Promise<ManifestEntry[]>;
  downloadFile(
    host: string,
    token: string,
    port: number,
    index: number,
    name: string,
    size: number,
    mimeType: string
  ): Promise<DownloadResult>;
  openSavedFile(uri: string, mimeType: string | null): Promise<void>;
  shareSavedFile(uri: string, mimeType: string | null): Promise<void>;
  getHistory(): Promise<HistoryEntry[]>;
  clearHistory(): Promise<boolean>;
  getPermissionStates(): Promise<PermissionStates>;
  openLocationSettings(): Promise<boolean>;
};

const NaQlaWifi = requireNativeModule<NativeNaqlaWifiModule>('NaQlaWifi');

export default NaQlaWifi;

type NativeModuleArg = ConstructorParameters<typeof EventEmitter>[0];

export const NaqlaEvents = new EventEmitter<NaqlaWifiModuleEvents>(
  NaQlaWifi as unknown as NativeModuleArg
);
