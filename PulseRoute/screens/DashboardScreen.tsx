import React, { useState, useRef, useEffect } from 'react';
import { saveData, loadData } from '../storage/storage';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Pending Sync';
type FilterOption = 'All' | 'Pending' | 'Transit';

interface Delivery {
  id: string;
  customer: string;
  address: string;
  status: DeliveryStatus;
}

type TelemetryEvent = {
  tracking_id: string;
  timestamp: number;
  telemetry: {
    latitude: number;
    longitude: number;
    speed_kmh: number;
  };
  device_metrics: {
    battery_level: number;
    network_latency_ms: number;
  };
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const colors = {
  bg: '#F5F5F7',
  surface: '#FFFFFF',
  border: '#E5E5EA',
  borderStrong: '#C7C7CC',
  textPrimary: '#1C1C1E',
  textSecondary: '#6C6C70',
  textTertiary: '#AEAEB2',

  pending:     { bg: '#FFF4E0', text: '#9A6100', pip: '#F59E0B' },
  transit:     { bg: '#E5F0FF', text: '#1A4FA3', pip: '#3B82F6' },
  delivered:   { bg: '#E3FAF0', text: '#0F6E56', pip: '#22C55E' },
  pendingSync: { bg: '#F3F0FF', text: '#5B21B6', pip: '#8B5CF6' },

  onlineBg:      '#E3FAF0',
  onlineBorder:  '#86EFAC',
  onlineDot:     '#22C55E',
  offlineBg:     '#F5F5F7',
  offlineBorder: '#E5E5EA',
} as const;

// ─── Animated Toggle ──────────────────────────────────────────────────────────

function OnlineToggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  const anim      = useRef(new Animated.Value(value ? 1 : 0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  };

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      bounciness: 12,
      speed: 18,
    }).start();
    value ? startPulse() : stopPulse();
    return () => stopPulse();
  }, [value]);

  const thumbTranslate   = anim.interpolate({ inputRange: [0,1], outputRange: [2, 26] });
  const trackBg          = anim.interpolate({ inputRange: [0,1], outputRange: [colors.offlineBg,     colors.onlineBg] });
  const trackBorderColor = anim.interpolate({ inputRange: [0,1], outputRange: [colors.offlineBorder, colors.onlineBorder] });

  return (
    <View style={styles.toggleRow}>
      <Text style={[styles.toggleLabel, value ? styles.toggleLabelOnline : styles.toggleLabelOffline]}>
        {value ? 'Online' : 'Offline'}
      </Text>
      <Pressable onPress={onToggle} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel="Toggle online status">
        <Animated.View style={[styles.toggleTrack, { backgroundColor: trackBg, borderColor: trackBorderColor }]}>
          <Animated.View style={[styles.toggleThumb, { transform: [{ translateX: thumbTranslate }] }]}>
            {value && <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />}
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function getStatusColors(status: DeliveryStatus) {
  switch (status) {
    case 'Pending':      return colors.pending;
    case 'In Transit':   return colors.transit;
    case 'Delivered':    return colors.delivered;
    case 'Pending Sync': return colors.pendingSync;
  }
}

// ─── Delivery Card ────────────────────────────────────────────────────────────

function DeliveryCard({
  item,
  onPress,
  onMarkDelivered,
}: {
  item: Delivery;
  onPress: () => void;
  onMarkDelivered: () => void;
}) {
  const sc = getStatusColors(item.status);
  const canMark = item.status === 'Pending' || item.status === 'In Transit';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.card}>
      <View style={[styles.statusPip, { backgroundColor: sc.pip }]} />

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.orderId}>{item.id}</Text>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.customerName}>{item.customer}</Text>
        <Text style={styles.address} numberOfLines={1}>📍 {item.address}</Text>

        {canMark && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); onMarkDelivered(); }}
            activeOpacity={0.8}
            style={styles.markBtn}
          >
            <Text style={styles.markBtnText}>Mark as Delivered</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.cardChevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

const DEFAULT_DELIVERIES: Delivery[] = [
  { id: 'PR-1001', customer: 'Alice Johnson', address: 'Pattom, Trivandrum', status: 'Pending' },
  { id: 'PR-1002', customer: 'Bob Smith', address: 'Kowdiar, Trivandrum', status: 'In Transit' },
  { id: 'PR-1003', customer: 'Charlie Brown', address: 'Kazhakkoottam, Trivandrum', status: 'Pending' },
  { id: 'PR-1004', customer: 'Diana Patel', address: 'Vazhuthacaud, Trivandrum', status: 'In Transit' },
];

export default function DashboardScreen({ navigation }: any) {
  const [isOnline, setIsOnline] = useState(false);
  const [filter, setFilter] = useState<FilterOption>('All');
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Storage State
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>(DEFAULT_DELIVERIES);
  const [syncQueue, setSyncQueue] = useState<string[]>([]);

  // ── Initialize AsyncStorage Data ──────────────────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      const savedDeliveries = await loadData('deliveries');
      if (savedDeliveries) {
        setDeliveries(savedDeliveries);
      }

      const savedQueue = await loadData('syncQueue');
      if (savedQueue) {
        setSyncQueue(savedQueue);
      }

      setIsStorageLoaded(true); // Flag that loading is complete
    };

    loadInitialData();
  }, []);

  // ── Auto-save deliveries to AsyncStorage ────────────────────────────────
  useEffect(() => {
    if (isStorageLoaded) {
      saveData('deliveries', deliveries);
    }
  }, [deliveries, isStorageLoaded]);

  // ── Auto-save syncQueue to AsyncStorage ─────────────────────────────────
  useEffect(() => {
    if (isStorageLoaded) {
      saveData('syncQueue', syncQueue);
    }
  }, [syncQueue, isStorageLoaded]);

  // ── Auto-sync when coming back online ────────────────────────────────────
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      setIsSyncing(true);

      const timeout = setTimeout(() => {
        setSyncQueue([]);
        setIsSyncing(false);

        setDeliveries((prev) =>
          prev.map((d) =>
            d.status === 'Pending Sync' ? { ...d, status: 'Delivered' } : d
          )
        );
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isOnline, syncQueue]);

  // ── Telemetry simulator ───────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const event: TelemetryEvent = {
        tracking_id: 'PR-1004',
        timestamp: Date.now(),
        telemetry: {
          latitude: 8.5241 + Math.random() * 0.01,
          longitude: 76.9366 + Math.random() * 0.01,
          speed_kmh: Math.floor(Math.random() * 80),
        },
        device_metrics: {
          battery_level: Math.floor(60 + Math.random() * 40),
          network_latency_ms: Math.floor(20 + Math.random() * 100),
        },
      };

      setTelemetryLogs((prev) => [
        event,
        ...prev.slice(0, 9),
      ]);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // ── markDelivered — queues offline, commits immediately if online ─────────
  const markDelivered = (id: string) => {
    if (isOnline) {
      setDeliveries((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'Delivered' } : d))
      );
    } else {
      setDeliveries((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'Pending Sync' } : d))
      );
      setSyncQueue((prev) => [...prev, id]);
    }
  };

  const filteredDeliveries = deliveries.filter((d) => {
    if (filter === 'All')     return true;
    if (filter === 'Pending') return d.status === 'Pending' || d.status === 'Pending Sync';
    if (filter === 'Transit') return d.status === 'In Transit';
    return true;
  });

  const totalCount   = deliveries.length;
  const transitCount = deliveries.filter((d) => d.status === 'In Transit').length;
  const doneCount    = deliveries.filter((d) => d.status === 'Delivered').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.wordmark}>
            <View style={styles.wordmarkIcon}>
              <Text style={styles.wordmarkIconText}>🚚</Text>
            </View>
            <View>
              <Text style={styles.wordmarkTitle}>PulseRoute</Text>
              <Text style={styles.wordmarkSub}>DRIVER CONSOLE</Text>
            </View>
          </View>
          <OnlineToggle value={isOnline} onToggle={() => setIsOnline((v) => !v)} />
        </View>

        {/* ── Stats bar ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalCount}</Text>
            <Text style={styles.statLabel}>TOTAL</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: colors.transit.pip }]}>{transitCount}</Text>
            <Text style={styles.statLabel}>IN TRANSIT</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: colors.delivered.pip }]}>{doneCount}</Text>
            <Text style={styles.statLabel}>DONE</Text>
          </View>
        </View>

        {/* ── Sync banners ── */}
        {isSyncing && (
          <View style={[styles.syncBanner, styles.syncBannerSyncing]}>
            <Text style={[styles.syncBannerText, { color: '#1A4FA3' }]}>
              🔄 Syncing {syncQueue.length} update{syncQueue.length > 1 ? 's' : ''}…
            </Text>
          </View>
        )}
        {!isOnline && syncQueue.length > 0 && !isSyncing && (
          <View style={styles.syncBanner}>
            <Text style={styles.syncBannerText}>
              ⏳ {syncQueue.length} update{syncQueue.length > 1 ? 's' : ''} queued — will sync when online
            </Text>
          </View>
        )}
      </View>

      {/* ── Section header + filter pills ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>DELIVERIES</Text>
        <View style={styles.pillRow}>
          {(['All', 'Pending', 'Transit'] as FilterOption[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.pill, filter === f && styles.pillActive]}
            >
              <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Delivery list ── */}
      <FlatList
        data={filteredDeliveries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <DeliveryCard
            item={item}
            onPress={() => navigation.navigate('Detail', { delivery: item })}
            onMarkDelivered={() => markDelivered(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No deliveries match this filter.</Text>
          </View>
        }
        ListFooterComponent={
          /* ── Telemetry feed ── */
          <View style={styles.telemetryBox}>
            <View style={styles.telemetryHeader}>
              <View style={styles.telemetryDot} />
              <Text style={styles.telemetryTitle}>LIVE TELEMETRY</Text>
            </View>
            <ScrollView style={styles.telemetryScroll} nestedScrollEnabled>
              {telemetryLogs.length === 0 ? (
                <Text style={styles.telemetryRow}>Waiting for signal…</Text>
              ) : (
                telemetryLogs.map((log, i) => (
                  <View key={log.timestamp + '-' + i} style={styles.logBlock}>
                    <Text style={[styles.telemetryRow, i === 0 && styles.telemetryRowLatest]}>
                      {log.tracking_id}
                    </Text>
                    <Text style={[styles.telemetryRow, i === 0 && styles.telemetryRowLatest]}>
                      📍 {log.telemetry.latitude.toFixed(4)}, {log.telemetry.longitude.toFixed(4)}
                    </Text>
                    <Text style={[styles.telemetryRow, i === 0 && styles.telemetryRowLatest]}>
                      🚗 {log.telemetry.speed_kmh} km/h   🔋 {log.device_metrics.battery_level}%   📶 {log.device_metrics.network_latency_ms} ms
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },

  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  wordmark:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmarkIcon:     { width: 38, height: 38, backgroundColor: colors.bg, borderRadius: 10, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  wordmarkIconText: { fontSize: 18 },
  wordmarkTitle:    { fontSize: 17, fontWeight: '600', color: colors.textPrimary, letterSpacing: -0.3 },
  wordmarkSub:      { fontSize: 10, color: colors.textTertiary, letterSpacing: 0.8, marginTop: 1 },

  toggleRow:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel:        { fontSize: 13, fontWeight: '500' },
  toggleLabelOnline:  { color: colors.delivered.text },
  toggleLabelOffline: { color: colors.textSecondary },
  toggleTrack:        { width: 52, height: 28, borderRadius: 14, borderWidth: 1, justifyContent: 'center' },
  toggleThumb:        { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  pulseDot:           { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.onlineDot },

  statsRow:  { flexDirection: 'row', gap: 8, paddingBottom: 16 },
  statCard:  { flex: 1, backgroundColor: colors.bg, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  statNum:   { fontSize: 22, fontWeight: '600', color: colors.textPrimary, lineHeight: 26 },
  statLabel: { fontSize: 10, color: colors.textTertiary, letterSpacing: 0.6, marginTop: 2 },

  syncBanner:        { borderTopWidth: 0.5, borderTopColor: '#F59E0B', backgroundColor: '#FFF4E0', paddingVertical: 8, marginHorizontal: -20 },
  syncBannerSyncing: { backgroundColor: '#E5F0FF', borderTopColor: '#3B82F6' },
  syncBannerText:    { fontSize: 12, color: '#9A6100', textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  sectionTitle:  { fontSize: 11, fontWeight: '600', color: colors.textTertiary, letterSpacing: 0.8 },

  pillRow:        { flexDirection: 'row', gap: 6 },
  pill:           { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.surface },
  pillActive:     { backgroundColor: colors.bg, borderColor: colors.borderStrong },
  pillText:       { fontSize: 12, color: colors.textSecondary },
  pillTextActive: { color: colors.textPrimary, fontWeight: '500' },

  listContent: { paddingHorizontal: 16, paddingBottom: 8 },

  card:         { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 0.5, borderColor: colors.border, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  statusPip:    { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  cardBody:     { flex: 1, minWidth: 0 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  orderId:      { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: 'Courier' },
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:    { fontSize: 11, fontWeight: '500' },
  customerName: { fontSize: 14, color: colors.textPrimary, marginBottom: 2 },
  address:      { fontSize: 12, color: colors.textTertiary },

  markBtn:     { marginTop: 10, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8, borderWidth: 0.5, borderColor: colors.delivered.pip, alignSelf: 'flex-start' },
  markBtnText: { fontSize: 12, fontWeight: '500', color: colors.delivered.text },

  cardChevron: { fontSize: 22, color: colors.textTertiary, lineHeight: 24, marginTop: 2 },

  emptyState: { paddingTop: 40, alignItems: 'center' },
  emptyText:  { fontSize: 14, color: colors.textTertiary },

  // Telemetry
  telemetryBox: {
    marginHorizontal: 0,
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  telemetryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.delivered.pip,
  },
  telemetryTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.8,
  },
  telemetryScroll: { maxHeight: 220 },
  logBlock: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  telemetryRow: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: 'Courier',
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  telemetryRowLatest: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
});