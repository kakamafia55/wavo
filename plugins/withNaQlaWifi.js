const { withAndroidManifest } = require('@expo/config-plugins');

const TOOLS_NS = 'http://schemas.android.com/tools';

const REQUIRED_PERMISSIONS = [
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_WIFI_STATE',
  'android.permission.CHANGE_WIFI_STATE',
  'android.permission.CHANGE_NETWORK_STATE',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.INTERNET',
  'android.permission.CAMERA',
  'android.permission.BLUETOOTH_CONNECT',
];

const FORBIDDEN_PERMISSIONS = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

function ensurePermission(manifest, name, extraAttrs) {
  if (!manifest['uses-permission']) manifest['uses-permission'] = [];
  const list = manifest['uses-permission'];
  let entry = list.find((e) => e.$ && e.$['android:name'] === name);
  if (!entry) {
    entry = { $: { 'android:name': name } };
    list.push(entry);
  }
  entry.$ = Object.assign({}, entry.$, extraAttrs || {});
}

function removePermission(manifest, name) {
  if (!manifest['uses-permission']) return;
  manifest['uses-permission'] = manifest['uses-permission'].filter(
    (e) => !(e.$ && e.$['android:name'] === name)
  );
}

function withNaQlaWifi(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$['xmlns:tools'] = TOOLS_NS;

    const application = manifest.application[0];
    application.$['android:usesCleartextTraffic'] = 'true';

    for (const permission of REQUIRED_PERMISSIONS) {
      ensurePermission(manifest, permission);
    }
    ensurePermission(manifest, 'android.permission.NEARBY_WIFI_DEVICES', {
      'android:usesPermissionFlags': 'neverForLocation',
      'tools:targetApi': 's',
    });
    for (const permission of FORBIDDEN_PERMISSIONS) {
      removePermission(manifest, permission);
    }
    return cfg;
  });
}

module.exports = withNaQlaWifi;
