import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { useTranslation } from '../core/locale';
import { formatSize } from '../core/format';
import { useTransfer } from '../context/TransferProvider';
import HistoryRow from '../components/HistoryRow';
import { Card, FadeIn, Fonts, Muted, Page, Pill, Row, Title, theme } from '../components/ui';

type Filter = 'all' | 'sent' | 'received';

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { history } = useTransfer();
  const [filter, setFilter] = useState<Filter>('all');

  const completed = useMemo(() => history.filter((h) => h.status === 'completed'), [history]);
  const totalSize = useMemo(() => completed.reduce((sum, h) => sum + h.size, 0), [completed]);
  const filtered = useMemo(
    () => (filter === 'all' ? history : history.filter((h) => h.direction === filter)),
    [history, filter]
  );

  return (
    <Page scroll={false}>
      <FadeIn style={styles.flex}>
        <Title style={styles.title}>{t.history.title}</Title>

        <Row style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{completed.length}</Text>
            <Muted>{t.history.totalTransfers}</Muted>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{formatSize(totalSize)}</Text>
            <Muted>{t.history.totalSize}</Muted>
          </Card>
        </Row>

        <Row style={styles.pills}>
          <Pill label={t.history.all} active={filter === 'all'} onPress={() => setFilter('all')} />
          <Pill label={t.history.sent} active={filter === 'sent'} onPress={() => setFilter('sent')} />
          <Pill label={t.history.received} active={filter === 'received'} onPress={() => setFilter('received')} />
        </Row>

        <FlatList
          style={styles.flex}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <HistoryRow entry={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Card>
              <Muted>{t.history.empty}</Muted>
            </Card>
          }
        />
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
  statsRow: {
    gap: 12,
    paddingHorizontal: 20,
  },
  statCard: {
    flex: 1,
    gap: 4,
  },
  statValue: {
    fontFamily: Fonts.extrabold,
    fontSize: 24,
    color: theme.aqua,
  },
  pills: {
    gap: 10,
    paddingHorizontal: 20,
    flexWrap: 'wrap',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
});
