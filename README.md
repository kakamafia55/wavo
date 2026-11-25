# Wavo (ويفو) — `naqla` / `NaQlaWifi`

Offline peer-to-peer file sharing between two Android phones. The sender starts a
temporary **LocalOnlyHotspot** plus a local HTTP server; the receiver scans a QR code,
joins the hotspot directly with `WifiNetworkSpecifier`, and downloads files straight
over the local network. **No internet, no cloud, no accounts.**

## How it works

1. **Send** — pick files (`expo-document-picker`, SAF URIs, no storage permission),
   `NaQlaWifi.startHotspot()` starts a `LocalOnlyHotspot` and returns
   `{ ssid, password, port: 47821, token }` (64-char hex token from `SecureRandom`).
   `startTransferServer(token, port)` serves:
   - `GET /manifest?token=…` → `[{ index, name, size, mimeType }]`
   - `GET /file/{index}?token=…&offset=…` → file bytes, supports `Range: bytes=offset-`
     (`206 Partial Content` + `Content-Range`), 256 KB buffers, token checked on every
     request (`403` otherwise).
2. A QR code encodes `{"v":1,"type":"naqla-local","ssid":…,"password":…,"token":…,"port":47821}`.
3. **Receive** — scan the QR (`parseQR` trims and strictly validates the payload),
   `joinNetwork(ssid, password)` uses `WifiNetworkSpecifier` + `ConnectivityManager.requestNetwork`
   **without** `NET_CAPABILITY_INTERNET`, binds the process to the network, and extracts the
   sender's IPv4 from `LinkProperties.dhcpServerAddress` (API 30+) or the gateway route
   (30 s timeout).
4. `downloadFile(...)` resumes partial downloads from a `.part` file in the cache
   (`offset = part.length()`, `Range` header) and, when complete, saves to
   `MediaStore.Downloads` under `Download/Naqla/` (`IS_PENDING`, duplicate names become
   `file (1).ext`, file descriptor synced, cache file deleted).
5. Completed transfers are appended to a persistent history (`wavo_history`
   SharedPreferences, max **300** entries; Wi-Fi passwords and tokens are never stored).

## Stack

- Expo SDK 58, React Native, TypeScript (strict), Expo Router (`src/app/`)
- `expo-camera` (QR scanning), `expo-document-picker`, `expo-localization`, `expo-font`
  (local Cairo fonts), `react-native-qrcode-svg`, `@expo/vector-icons/Ionicons`
- Local Kotlin Expo module: `modules/naqla-wifi` (`NaQlaWifiModule.kt`, `TransferHistory.kt`)
- Dark-only design system in `src/components/ui.tsx`; full Arabic (RTL) + English (LTR)
  dictionaries in `src/core/locale.ts`

## Setup

```bash
npm install
# add the Cairo TTF files to assets/fonts/ (see assets/fonts/README.md)
# replace the placeholder PNGs in assets/ with real artwork
npx expo prebuild        # generates the android/ project with the local module
npx expo run:android     # or: npm run android
```

## Permissions (Android)

`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `NEARBY_WIFI_DEVICES`
(`usesPermissionFlags="neverForLocation"`), `ACCESS_WIFI_STATE`, `CHANGE_WIFI_STATE`,
`CHANGE_NETWORK_STATE`, `ACCESS_NETWORK_STATE`, `INTERNET`, `CAMERA`,
`BLUETOOTH_CONNECT`. Legacy `READ/WRITE_EXTERNAL_STORAGE` are explicitly excluded —
received files are written through scoped `MediaStore.Downloads` (Android 10+).
`usesCleartextTraffic` is enabled because the transfer itself is plain HTTP on the
local hotspot only. Min SDK 26 (hotspot), API 29+ for saving received files.

The manifest is assembled by the config plugin `plugins/withNaQlaWifi.js`.

## Screens

| Route        | Purpose                                                            |
| ------------ | ------------------------------------------------------------------ |
| `/`          | Home: Send / Receive cards, info, recent activity                  |
| `/send`      | Pick files → hotspot + server → QR code, end sharing               |
| `/receive`   | Camera QR scan → join → manifest → resumable downloads → open/share |
| `/history`   | Stats, All/Sent/Received filters, up to 300 persisted entries      |
| `/setup`     | Permission checklist (Wi-Fi/nearby, camera, location, bluetooth)   |

Footer on every page: `© Eng - Mohamed Badran`.
