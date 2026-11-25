import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from '../core/locale';
import { formatSize } from '../core/format';
import { useTransfer } from '../context/TransferProvider';
import { Btn, Card, FadeIn, Fonts, Muted, Page, Row, Sub, Title, theme } from '../components/ui';

function ScanFrame() {
  const laser = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(laser, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(laser, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [laser]);
  const translateY = laser.interpolate({ inputRange: [0, 1], outputRange: [0, 196] });
  return (
    <View style={styles.scanFrame} pointerEvents="none">
      <Animated.View style={[styles.laser, { transform: [{ translateY }] }]} />
    </View>
  );
}

export default function ReceiveScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const { session, manifest, downloads, handleScan, download, resetSession, openFile, shareFile } = useTransfer();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const scanningEnabled = session === 'idle' || session === 'error';
  const statusText =
    session === 'connecting'
      ? t.receive.connecting
      : session === 'connected'
        ? t.receive.connected
        : session === 'error'
          ? t.receive.failed
          : t.receive.scanning;

  return (
    <Page scroll={false}>
      <FadeIn style={styles.flex}>
        <Title style={styles.title}>{t.receive.title}</Title>

        {!permission?.granted ? (
          <Card style={styles.centerCard}>
            <Ionicons name="camera-outline" size={40} color={theme.blue} />
            <Sub style={styles.centerText}>{t.receive.cameraNeeded}</Sub>
            <Btn variant="primary" icon="camera" label={t.receive.requestCamera} onPress={() => void requestPermission()} />
          </Card>
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanningEnabled ? ({ data }) => void handleScan(data) : undefined}
            />
            {scanningEnabled ? <ScanFrame /> : null}
          </View>
        )}

        <Card>
          <Row>
            <Ionicons
              name={session === 'connected' ? 'checkmark-circle' : session === 'error' ? 'close-circle' : 'radio-button-on'}
              size={22}
              color={session === 'connected' ? theme.aqua : session === 'error' ? theme.danger : theme.blue}
            />
            <Sub>{statusText}</Sub>
          </Row>
        </Card>

        {session === 'connected' ? (
          <Card style={styles.flex}>
            <Sub style={styles.filesTitle}>{t.receive.availableFiles}</Sub>
            {manifest.length === 0 ? <Muted>{t.receive.noFiles}</Muted> : null}
            {manifest.map((entry) => {
              const state = downloads[entry.index];
              return (
                <Row key={entry.index} style={styles.fileRow}>
                  <Ionicons name="document-outline" size={18} color={theme.aqua} />
                  <View style={styles.fileMeta}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {entry.name}
                    </Text>
                    <Text style={styles.fileSize}>{formatSize(entry.size)}</Text>
                  </View>
                  {!state || state.status === 'idle' || state.status === 'error' ? (
                    <Btn
                      variant="primary"
                      label={t.receive.download}
                      style={styles.smallBtn}
                      onPress={() => void download(entry)}
                    />
                  ) : state.status === 'downloading' ? (
                    <Text style={styles.progress}>{Math.round(state.progress * 100)}%</Text>
                  ) : (
                    <Row style={styles.doneActions}>
                      <Btn
                        variant="blue"
                        icon="open-outline"
                        label={t.receive.open}
                        style={styles.smallBtn}
                        onPress={() => state.result && void openFile(state.result.uri, state.result.mimeType)}
                      />
                      <Btn
                        variant="ghost"
                        icon="share-social-outline"
                        label={t.receive.share}
                        style={styles.smallBtn}
                        onPress={() => state.result && void shareFile(state.result.uri, state.result.mimeType)}
                      />
                    </Row>
                  )}
                </Row>
              );
            })}
            <Btn variant="ghost" icon="qr-code" label={t.receive.scanAgain} onPress={() => void resetSession()} />
          </Card>
        ) : null}
      </FadeIn>
    </Page>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    gap: 16,
  },
  title: {
    paddingHorizontal: 20,
  },
  centerCard: {
    marginHorizontal: 20,
    alignItems: 'center',
    gap: 14,
    paddingVertical: 30,
  },
  centerText: {
    textAlign: 'center',
  },
  cameraWrap: {
    marginHorizontal: 20,
    height: 300,
    borderRadius: theme.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
  },
  camera: {
    flex: 1,
  },
  scanFrame: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    marginHorizontal: 'auto',
    width: 220,
    height: 220,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: theme.aqua,
    overflow: 'hidden',
  },
  laser: {
    position: 'absolute',
    left: 20,
    width: 180,
    height: 2,
    backgroundColor: theme.aqua,
    opacity: 0.9,
  },
  filesTitle: {
    marginBottom: 8,
  },
  fileRow: {
    paddingVertical: 8,
    gap: 10,
  },
  fileMeta: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: theme.text,
  },
  fileSize: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: theme.muted,
  },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  doneActions: {
    gap: 8,
  },
  progress: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: theme.aqua,
  },
});
