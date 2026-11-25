import React, { useCallback, useState } from 'react';
import { Linking, PermissionsAndroid, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import type { PermissionStates } from '../../modules/naqla-wifi/src/NaqlaWifi';
import { Native } from '../core/native';
import { useTranslation } from '../core/locale';
import { Btn, Card, FadeIn, Fonts, Muted, Page, Row, Sub, Title, theme } from '../components/ui';

type AndroidPermission = Parameters<typeof PermissionsAndroid.request>[0];

const androidApiLevel =
  typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

type ItemKey = 'wifi' | 'camera' | 'locationServices' | 'bluetooth';

type SetupItem = {
  key: ItemKey;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  ok: boolean | undefined;
  optional?: boolean;
  perm?: string;
  location?: boolean;
};

export default function SetupScreen() {
  const { t } = useTranslation();
  const [states, setStates] = useState<PermissionStates | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setStates(await Native.getPermissionStates());
    } catch {
      setStates(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const items: SetupItem[] = [
    {
      key: 'wifi',
      icon: 'wifi',
      label: t.setup.wifiNearby,
      ok: states?.wifi,
      perm:
        androidApiLevel >= 33
          ? 'android.permission.NEARBY_WIFI_DEVICES'
          : 'android.permission.ACCESS_FINE_LOCATION',
    },
    {
      key: 'camera',
      icon: 'camera',
      label: t.setup.camera,
      ok: states?.camera,
      perm: 'android.permission.CAMERA',
    },
    {
      key: 'locationServices',
      icon: 'location',
      label: t.setup.locationServices,
      ok: states?.locationServices,
      location: true,
    },
    {
      key: 'bluetooth',
      icon: 'bluetooth',
      label: t.setup.bluetooth,
      ok: states?.bluetooth,
      optional: true,
      perm: androidApiLevel >= 31 ? 'android.permission.BLUETOOTH_CONNECT' : undefined,
    },
  ];

  const enableItem = useCallback(
    async (item: SetupItem) => {
      if (item.location) {
        await Native.openLocationSettings();
        return;
      }
      if (item.perm) {
        const result = await PermissionsAndroid.request(item.perm as AndroidPermission);
        if (result === 'never_ask_again') {
          await Linking.openSettings();
        }
      } else {
        await Linking.openSettings();
      }
    },
    []
  );

  const handleEnable = useCallback(
    async (item: SetupItem) => {
      setBusy(true);
      try {
        await enableItem(item);
      } finally {
        await reload();
        setBusy(false);
      }
    },
    [enableItem, reload]
  );

  const handleEnableAll = useCallback(async () => {
    setBusy(true);
    try {
      for (const item of items) {
        const current = states?.[item.key];
        if (!current) {
          await enableItem(item);
        }
      }
    } finally {
      await reload();
      setBusy(false);
    }
  }, [enableItem, items, reload, states]);

  return (
    <Page>
      <FadeIn>
        <Title>{t.setup.title}</Title>
        <Sub>{t.setup.subtitle}</Sub>

        {items.map((item) => (
          <Card key={item.key}>
            <Row>
              <View style={styles.itemIcon}>
                <Ionicons name={item.icon} size={22} color={theme.aqua} />
              </View>
              <View style={styles.itemMeta}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Text style={[styles.itemStatus, { color: item.ok ? theme.aqua : theme.danger }]}>
                  {item.ok ? (item.location ? t.setup.on : t.setup.granted) : item.location ? t.setup.off : t.setup.notGranted}
                </Text>
              </View>
              <Btn
                variant="blue"
                label={t.setup.enable}
                disabled={busy || item.ok === true}
                style={styles.enableBtn}
                onPress={() => void handleEnable(item)}
              />
            </Row>
          </Card>
        ))}

        <Btn
          variant="primary"
          icon="checkmark-done-outline"
          label={t.setup.enableAll}
          disabled={busy}
          onPress={() => void handleEnableAll()}
        />
        <Btn
          variant="ghost"
          icon="refresh-outline"
          label={t.setup.refresh}
          disabled={busy}
          onPress={() => void reload()}
        />
        {!states ? <Muted>{t.errors.GENERIC}</Muted> : null}
      </FadeIn>
    </Page>
  );
}

const styles = StyleSheet.create({
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: 'rgba(113,242,203,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMeta: {
    flex: 1,
    gap: 2,
  },
  itemLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    color: theme.text,
  },
  itemStatus: {
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  enableBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
});
