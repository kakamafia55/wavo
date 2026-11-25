import React from 'react';
import { Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../core/locale';
import { useTransfer } from '../context/TransferProvider';
import { Btn, Card, theme, Fonts } from './ui';

const SETTINGS_CODES = new Set(['PERMISSION_DENIED', 'HOTSPOT_FAILED', 'UNSUPPORTED_ANDROID']);

export default function ErrorOverlay() {
  const { t } = useTranslation();
  const { error, dismissError } = useTransfer();

  const visible = error !== null;
  const body = error ? t.errors[error.code] ?? t.errors.GENERIC : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismissError}>
      <View style={styles.backdrop}>
        <Card style={styles.dialog}>
          <View style={styles.iconWrap}>
            <Ionicons name="pulse-outline" size={40} color={theme.danger} />
          </View>
          <Text style={styles.title}>{t.errors.title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            {error && SETTINGS_CODES.has(error.code) ? (
              <Btn
                variant="blue"
                icon="settings-outline"
                label={t.errors.settings}
                onPress={() => {
                  void Linking.openSettings();
                }}
              />
            ) : null}
            {error?.retry ? (
              <Btn
                variant="primary"
                icon="refresh-outline"
                label={t.errors.tryAgain}
                onPress={() => {
                  const retry = error.retry;
                  dismissError();
                  retry?.();
                }}
              />
            ) : null}
            <Btn variant="ghost" label={t.errors.close} onPress={dismissError} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 12, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.danger,
    backgroundColor: 'rgba(255, 179, 166, 0.08)',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 19,
    color: theme.text,
    textAlign: 'center',
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: theme.muted,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
});
