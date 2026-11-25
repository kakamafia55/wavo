import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from '../core/locale';
import { buildQRPayload } from '../core/native';
import { formatSize } from '../core/format';
import { useTransfer } from '../context/TransferProvider';
import { Btn, Card, FadeIn, Fonts, Muted, Page, Pulse, Row, Sub, Title, theme } from '../components/ui';

export default function SendScreen() {
  const { t } = useTranslation();
  const { picked, sharedFiles, pickFiles, startSharing, endSharing, sharing, preparing, hotspot } = useTransfer();

  const qrValue = hotspot ? buildQRPayload(hotspot) : null;

  return (
    <Page>
      <FadeIn>
        <Title>{t.send.title}</Title>

        {preparing ? (
          <Card style={styles.centerCard}>
            <Pulse />
            <Sub style={styles.centerText}>{t.send.preparing}</Sub>
          </Card>
        ) : null}

        {!sharing && !preparing ? (
          <>
            <Btn
              variant="primary"
              icon="document-attach-outline"
              label={t.send.pickFiles}
              onPress={() => void pickFiles()}
            />
            {picked.length > 0 ? (
              <Card>
                <Sub>
                  {picked.length} {t.common.files}
                </Sub>
                {picked.map((f) => (
                  <Row key={f.uri} style={styles.fileRow}>
                    <Ionicons name="document-outline" size={18} color={theme.blue} />
                    <Text style={styles.fileName} numberOfLines={1}>
                      {f.name}
                    </Text>
                  </Row>
                ))}
              </Card>
            ) : null}
            <Btn
              variant="primary"
              icon="wifi"
              label={t.send.startSharing}
              disabled={picked.length === 0}
              onPress={() => void startSharing()}
            />
          </>
        ) : null}

        {sharing && qrValue ? (
          <>
            <Card style={styles.centerCard}>
              <View style={styles.qrPad}>
                <QRCode value={qrValue} size={200} backgroundColor="#FFFFFF" color="#090D16" />
              </View>
              <Muted style={styles.centerText}>{t.send.qrHint}</Muted>
            </Card>

            <Card>
              <Sub style={styles.filesTitle}>{t.send.sharedFiles}</Sub>
              {sharedFiles.map((f) => (
                <Row key={f.uri} style={styles.fileRow}>
                  <Ionicons name="document-outline" size={18} color={theme.aqua} />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Text style={styles.fileSize}>{formatSize(f.size)}</Text>
                </Row>
              ))}
            </Card>

            <Btn variant="danger" icon="stop-circle-outline" label={t.send.endSharing} onPress={() => void endSharing()} />
          </>
        ) : null}
      </FadeIn>
    </Page>
  );
}

const styles = StyleSheet.create({
  centerCard: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 28,
  },
  centerText: {
    textAlign: 'center',
  },
  qrPad: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
  },
  filesTitle: {
    marginBottom: 8,
  },
  fileRow: {
    paddingVertical: 6,
    gap: 10,
  },
  fileName: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: theme.text,
  },
  fileSize: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: theme.muted,
  },
});
