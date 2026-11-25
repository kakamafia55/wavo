import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from '../core/locale';
import { useTransfer } from '../context/TransferProvider';
import HistoryRow from '../components/HistoryRow';
import { Card, FadeIn, Fonts, Muted, Page, Row, Sub, Title, theme } from '../components/ui';

export default function HomeScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const { history } = useTransfer();
  const recent = history.slice(0, 3);

  return (
    <Page>
      <FadeIn>
        <Row style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            style={[styles.actionCard, { backgroundColor: theme.sendBg }]}
            onPress={() => router.push('/send')}
          >
            <Ionicons name="paper-plane" size={36} color={theme.sendText} />
            <Text style={[styles.actionLabel, { color: theme.sendText }]}>{t.home.send}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.actionCard, { backgroundColor: theme.recvBg, borderColor: theme.recvBorder }]}
            onPress={() => router.push('/receive')}
          >
            <Ionicons name="qr-code" size={36} color={theme.blue} />
            <Text style={[styles.actionLabel, { color: theme.text }]}>{t.home.receive}</Text>
          </Pressable>
        </Row>

        <Card>
          <Title>{t.home.infoTitle}</Title>
          <Sub style={styles.infoBody}>{t.home.infoBody}</Sub>
        </Card>

        <Row spaceBetween style={styles.sectionHeader}>
          <Title style={styles.sectionTitle}>{t.home.recentActivity}</Title>
          <Pressable accessibilityRole="link" onPress={() => router.push('/history')}>
            <Text style={styles.linkText}>{t.home.viewAll}</Text>
          </Pressable>
        </Row>

        {recent.length === 0 ? (
          <Card>
            <Muted>{t.home.noActivity}</Muted>
          </Card>
        ) : (
          recent.map((entry) => <HistoryRow key={entry.id} entry={entry} />)
        )}

        <Card onPress={() => router.push('/setup')}>
          <Row spaceBetween>
            <Row>
              <Ionicons name="checkmark-done-circle-outline" size={24} color={theme.aqua} />
              <View>
                <Text style={styles.readyTitle}>{t.home.getReady}</Text>
                <Text style={styles.readySub}>{t.setup.subtitle}</Text>
              </View>
            </Row>
            <Ionicons name="chevron-forward" size={20} color={theme.muted} />
          </Row>
        </Card>
      </FadeIn>
    </Page>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    gap: 14,
  },
  actionCard: {
    flex: 1,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  actionLabel: {
    fontFamily: Fonts.extrabold,
    fontSize: 20,
  },
  infoBody: {
    marginTop: 8,
  },
  sectionHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
  },
  linkText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: theme.aqua,
  },
  readyTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: theme.text,
  },
  readySub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: theme.muted,
    maxWidth: 240,
  },
});
