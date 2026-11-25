import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HistoryEntry } from '../../modules/naqla-wifi/src/NaqlaWifi';
import { useTranslation } from '../core/locale';
import { formatSize, formatTimestamp } from '../core/format';
import { useTransfer } from '../context/TransferProvider';
import { Btn, Card, Fonts, Row, theme } from './ui';

export default function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const { t, lang } = useTranslation();
  const { openFile, shareFile } = useTransfer();
  const sent = entry.direction === 'sent';
  const canAct = !sent && entry.status === 'completed' && !!entry.uri;

  return (
    <Card style={styles.rowCard}>
      <Row>
        <View
          style={[
            styles.iconWrap,
            { borderColor: sent ? theme.blue : theme.aqua, backgroundColor: sent ? 'rgba(138,181,255,0.08)' : 'rgba(113,242,203,0.08)' },
          ]}
        >
          <Ionicons
            name={sent ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
            size={24}
            color={sent ? theme.blue : theme.aqua}
          />
        </View>
        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={1}>
            {entry.name}
          </Text>
          <Text style={styles.sub}>
            {formatSize(entry.size)} · {formatTimestamp(entry.timestamp, lang)}
          </Text>
        </View>
        {canAct ? (
          <Row style={styles.actions}>
            <Btn
              variant="blue"
              icon="open-outline"
              label={t.history.open}
              style={styles.smallBtn}
              onPress={() => void openFile(entry.uri as string, entry.mimeType)}
            />
            <Btn
              variant="ghost"
              icon="share-social-outline"
              label={t.history.share}
              style={styles.smallBtn}
              onPress={() => void shareFile(entry.uri as string, entry.mimeType)}
            />
          </Row>
        ) : null}
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  rowCard: {
    padding: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    color: theme.text,
  },
  sub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: theme.muted,
  },
  actions: {
    gap: 8,
  },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
});
