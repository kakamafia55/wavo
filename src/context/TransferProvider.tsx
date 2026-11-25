import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as DocumentPicker from 'expo-document-picker';
import type {
  DownloadResult,
  HistoryEntry,
  HotspotInfo,
  ManifestEntry,
  SharedFileInfo,
} from '../../modules/naqla-wifi/src/NaqlaWifi';
import { errorCode, Native, NaqlaEvents, parseQR, type NativeErrorCode, type QRPayload } from '../core/native';
import { formatProgress } from '../core/format';

export type PickedFile = { uri: string; name: string };

export type DownloadState = {
  status: 'idle' | 'downloading' | 'done' | 'error';
  progress: number;
  result?: DownloadResult;
  error?: NativeErrorCode;
};

export type SessionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export type AppError = { code: NativeErrorCode; retry?: () => void };

type TransferContextValue = {
  picked: PickedFile[];
  sharedFiles: SharedFileInfo[];
  hotspot: HotspotInfo | null;
  sharing: boolean;
  preparing: boolean;
  pickFiles: () => Promise<void>;
  startSharing: () => Promise<void>;
  endSharing: () => Promise<void>;
  session: SessionStatus;
  host: string | null;
  sessionInfo: QRPayload | null;
  manifest: ManifestEntry[];
  downloads: Record<number, DownloadState>;
  handleScan: (data: string) => Promise<void>;
  download: (entry: ManifestEntry) => Promise<void>;
  resetSession: () => Promise<void>;
  openFile: (uri: string, mimeType: string) => Promise<void>;
  shareFile: (uri: string, mimeType: string) => Promise<void>;
  history: HistoryEntry[];
  refreshHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  error: AppError | null;
  showError: (code: NativeErrorCode, retry?: () => void) => void;
  dismissError: () => void;
};

const TransferContext = createContext<TransferContextValue | null>(null);

export function useTransfer(): TransferContextValue {
  const ctx = useContext(TransferContext);
  if (!ctx) throw new Error('useTransfer must be used inside TransferProvider');
  return ctx;
}

function assetToPicked(asset: DocumentPicker.DocumentPickerAsset): PickedFile {
  return { uri: asset.uri, name: asset.name ?? asset.uri.split('/').pop() ?? 'file' };
}

export function TransferProvider({ children }: { children: React.ReactNode }) {
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFileInfo[]>([]);
  const [hotspot, setHotspot] = useState<HotspotInfo | null>(null);
  const [sharing, setSharing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [session, setSession] = useState<SessionStatus>('idle');
  const [host, setHost] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<QRPayload | null>(null);
  const [manifest, setManifest] = useState<ManifestEntry[]>([]);
  const [downloads, setDownloads] = useState<Record<number, DownloadState>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<AppError | null>(null);

  const operation = useRef<'idle' | 'busy'>('idle');
  const scanLock = useRef(false);
  const activeTransfer = useRef<number | null>(null);
  const sessionActive = useRef(false);

  const showError = useCallback((code: NativeErrorCode, retry?: () => void) => {
    setError({ code, retry });
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await Native.getHistory());
    } catch {
      // history is best-effort
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    const sub = NaqlaEvents.addListener('onTransferProgress', (event) => {
      setDownloads((prev) => {
        const current = prev[event.index];
        if (!current || current.status !== 'downloading') return prev;
        return { ...prev, [event.index]: { ...current, progress: formatProgress(event.received, event.total) } };
      });
    });
    return () => sub.remove();
  }, []);

  const pickFiles = useCallback(async () => {
    if (operation.current !== 'idle') return;
    operation.current = 'busy';
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
        copyToCacheDirectory: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPicked(result.assets.map(assetToPicked));
      }
    } catch (e) {
      showError(errorCode(e));
    } finally {
      operation.current = 'idle';
    }
  }, [showError]);

  const startSharing = useCallback(async () => {
    if (operation.current !== 'idle' || sharing) return;
    operation.current = 'busy';
    setPreparing(true);
    try {
      let files = picked;
      if (files.length === 0) {
        const result = await DocumentPicker.getDocumentAsync({
          multiple: true,
          type: '*/*',
          copyToCacheDirectory: false,
        });
        if (result.canceled || !result.assets || result.assets.length === 0) return;
        files = result.assets.map(assetToPicked);
        setPicked(files);
      }
      const resolved = await Native.setSharedFiles(
        JSON.stringify(files.map((f) => ({ uri: f.uri, name: f.name })))
      );
      setSharedFiles(resolved);
      const info = await Native.startHotspot();
      setHotspot(info);
      await Native.startTransferServer(info.token, info.port);
      setSharing(true);
    } catch (e) {
      showError(errorCode(e), () => {
        void startSharing();
      });
    } finally {
      operation.current = 'idle';
      setPreparing(false);
    }
  }, [picked, sharing, showError]);

  const endSharing = useCallback(async () => {
    if (operation.current !== 'idle') return;
    operation.current = 'busy';
    try {
      await Native.stopTransferServer();
      await Native.stopHotspot();
    } catch {
      // best effort cleanup
    }
    setSharing(false);
    setHotspot(null);
    setSharedFiles([]);
    setPicked([]);
    operation.current = 'idle';
  }, []);

  const handleScan = useCallback(
    async (data: string) => {
      if (scanLock.current || activeTransfer.current !== null || operation.current !== 'idle') return;
      if (sessionActive.current) return;
      let payload: QRPayload;
      try {
        payload = parseQR(data);
      } catch {
        showError('INVALID_QR');
        return;
      }
      scanLock.current = true;
      operation.current = 'busy';
      setSession('connecting');
      try {
        const resolvedHost = await Native.joinNetwork(payload.ssid, payload.password);
        setHost(resolvedHost);
        setSessionInfo(payload);
        const entries = await Native.fetchManifest(resolvedHost, payload.token, payload.port);
        setManifest(entries);
        setDownloads({});
        sessionActive.current = true;
        setSession('connected');
      } catch (e) {
        setSession('error');
        try {
          await Native.disconnectNetwork();
        } catch {
          // best effort
        }
        setHost(null);
        setSessionInfo(null);
        setManifest([]);
        showError(errorCode(e), () => {
          void handleScan(data);
        });
      } finally {
        scanLock.current = false;
        operation.current = 'idle';
      }
    },
    [showError]
  );

  const resetSession = useCallback(async () => {
    try {
      await Native.disconnectNetwork();
    } catch {
      // best effort
    }
    sessionActive.current = false;
    setSession('idle');
    setHost(null);
    setSessionInfo(null);
    setManifest([]);
    setDownloads({});
  }, []);

  const download = useCallback(
    async (entry: ManifestEntry) => {
      if (activeTransfer.current !== null || !host || !sessionInfo) return;
      activeTransfer.current = entry.index;
      setDownloads((prev) => ({
        ...prev,
        [entry.index]: {
          status: 'downloading',
          progress: prev[entry.index]?.status === 'downloading' ? prev[entry.index].progress : 0,
        },
      }));
      try {
        const result = await Native.downloadFile(
          host,
          sessionInfo.token,
          sessionInfo.port,
          entry.index,
          entry.name,
          entry.size,
          entry.mimeType
        );
        setDownloads((prev) => ({ ...prev, [entry.index]: { status: 'done', progress: 1, result } }));
        await refreshHistory();
      } catch (e) {
        const code = errorCode(e);
        setDownloads((prev) => ({
          ...prev,
          [entry.index]: { ...(prev[entry.index] ?? { progress: 0 }), status: 'error', error: code },
        }));
        showError(code, () => {
          void download(entry);
        });
      } finally {
        activeTransfer.current = null;
      }
    },
    [host, sessionInfo, refreshHistory, showError]
  );

  const openFile = useCallback(
    async (uri: string, mimeType: string) => {
      try {
        await Native.openSavedFile(uri, mimeType);
      } catch (e) {
        showError(errorCode(e));
      }
    },
    [showError]
  );

  const shareFile = useCallback(
    async (uri: string, mimeType: string) => {
      try {
        await Native.shareSavedFile(uri, mimeType);
      } catch (e) {
        showError(errorCode(e));
      }
    },
    [showError]
  );

  const clearHistory = useCallback(async () => {
    try {
      await Native.clearHistory();
    } catch {
      // best effort
    }
    setHistory([]);
  }, []);

  const value = useMemo<TransferContextValue>(
    () => ({
      picked,
      sharedFiles,
      hotspot,
      sharing,
      preparing,
      pickFiles,
      startSharing,
      endSharing,
      session,
      host,
      sessionInfo,
      manifest,
      downloads,
      handleScan,
      download,
      resetSession,
      openFile,
      shareFile,
      history,
      refreshHistory,
      clearHistory,
      error,
      showError,
      dismissError,
    }),
    [
      picked,
      sharedFiles,
      hotspot,
      sharing,
      preparing,
      pickFiles,
      startSharing,
      endSharing,
      session,
      host,
      sessionInfo,
      manifest,
      downloads,
      handleScan,
      download,
      resetSession,
      openFile,
      shareFile,
      history,
      refreshHistory,
      clearHistory,
      error,
      showError,
      dismissError,
    ]
  );

  return <TransferContext.Provider value={value}>{children}</TransferContext.Provider>;
}
