import React, { useState, useRef, useEffect } from 'react';
import { saveData, loadData } from '../storage/storage';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather, Ionicons } from '@expo/vector-icons';
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
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Pending Sync' | 'Failed';
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

// ─── Design Tokens (Updated to match reference image) ─────────────────────────

const colors = {
  bg: '#F8F9FB', // Soft off-white background
  surface: '#FFFFFF',
  border: '#F3F4F6',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  // Primary brand colors from image
  primary: '#8B5CF6',
  primaryLight: '#F5F3FF',

  pending:     { bg: '#FFFBEB', text: '#D97706', pip: '#F59E0B' },
  transit:     { bg: '#F5F3FF', text: '#8B5CF6', pip: '#8B5CF6' }, // Light purple for active
  delivered:   { bg: '#ECFDF5', text: '#059669', pip: '#10B981' },
  pendingSync: { bg: '#F3F4F6', text: '#4B5563', pip: '#6B7280' },
  failed:      { bg: '#FEF2F2', text: '#DC2626', pip: '#EF4444' },

  onlineBg:      '#8B5CF6', // Purple toggle
  onlineBorder:  '#8B5CF6',
  onlineDot:     '#FFFFFF',
  offlineBg:     '#E5E7EB',
  offlineBorder: '#E5E7EB',
} as const;

// ─── Animated Toggle ──────────────────────────────────────────────────────────

function OnlineToggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      bounciness: 10,
      speed: 14,
    }).start();
  }, [value]);

  const thumbTranslate   = anim.interpolate({ inputRange: [0, 1], outputRange: [4, 28] });
  const trackBg          = anim.interpolate({ inputRange: [0, 1], outputRange: [colors.offlineBg, colors.onlineBg] });

  return (
    <View style={styles.toggleRow}>
      <Text style={[styles.toggleLabel, value ? styles.toggleLabelOnline : styles.toggleLabelOffline]}>
        {value ? 'Online' : 'Offline'}
      </Text>
      <Pressable onPress={onToggle}>
        <Animated.View style={[styles.toggleTrack, { backgroundColor: trackBg }]}>
          <Animated.View style={[styles.toggleThumb, { transform: [{ translateX: thumbTranslate }] }]} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

function getStatusColors(status: DeliveryStatus) {
  switch (status) {
    case 'Pending':      return colors.pending;
    case 'In Transit':   return colors.transit;
    case 'Delivered':    return colors.delivered;
    case 'Pending Sync': return colors.pendingSync;
    case 'Failed':       return colors.failed;
  }
}

// ─── Delivery Card (Redesigned) ───────────────────────────────────────────────

function DeliveryCard({
  item,
  onPress,
  onMarkDelivered,
  onMarkFailed,
}: {
  item: Delivery;
  onPress: () => void;
  onMarkDelivered: () => void;
  onMarkFailed: () => void;
}) {
  const sc = getStatusColors(item.status);
  const canMark = item.status === 'Pending' || item.status === 'In Transit';
  const swipeableRef = useRef<Swipeable>(null);

  const renderLeftActions = () => (
    <View style={styles.actionLeft}>
      <Feather name="check-circle" size={24} color="#FFF" />
      <Text style={styles.actionText}>Delivered</Text>
    </View>
  );

  const renderRightActions = () => (
    <View style={styles.actionRight}>
      <Feather name="x-circle" size={24} color="#FFF" />
      <Text style={styles.actionText}>Failed</Text>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      enabled={canMark}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      friction={2}
      overshootFriction={8}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') onMarkDelivered();
        else if (direction === 'right') onMarkFailed();
        swipeableRef.current?.close();
      }}
    >
      <TouchableOpacity 
        onPress={onPress} 
        activeOpacity={0.8} 
        style={[styles.card, item.status === 'In Transit' && styles.cardActive]}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <Feather name="package" size={20} color={sc.pip} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.customerName}>{item.customer}</Text>
            <Text style={styles.orderId}>ID: {item.id}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
          </View>
        </View>

        {/* Routing Indicator mimicking the reference image */}
        <View style={styles.routingContainer}>
          <View style={styles.routePoint}>
            <View style={styles.routeDotOrigin} />
            <Text style={styles.routeText} numberOfLines={1}>Warehouse</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDotDest, { backgroundColor: sc.pip }]} />
            <Text style={[styles.routeText, { color: colors.textPrimary }]} numberOfLines={1}>{item.address}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

const DEFAULT_DELIVERIES: Delivery[] = [
  { id: 'H314315796', customer: 'Alice Johnson', address: 'Pattom, Trivandrum', status: 'Pending' },
  { id: 'L814315788', customer: 'Bob Smith', address: 'Kowdiar, Trivandrum', status: 'In Transit' },
  { id: 'M914315742', customer: 'Charlie Brown', address: 'Kazhakkoottam, Trivandrum', status: 'Pending' },
  { id: 'K214315711', customer: 'Diana Patel', address: 'Vazhuthacaud, Trivandrum', status: 'In Transit' },
];

export default function DashboardScreen({ navigation }: any) {
  const [isOnline, setIsOnline] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('All');
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>(DEFAULT_DELIVERIES);
  const [syncQueue, setSyncQueue] = useState<string[]>([]);

  // Smooth layout animation function
  const animateListChange = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      const savedDeliveries = await loadData('deliveries');
      if (savedDeliveries) setDeliveries(savedDeliveries);
      const savedQueue = await loadData('syncQueue');
      if (savedQueue) setSyncQueue(savedQueue);
      setIsStorageLoaded(true);
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (isStorageLoaded) saveData('deliveries', deliveries);
  }, [deliveries, isStorageLoaded]);

  useEffect(() => {
    if (isStorageLoaded) saveData('syncQueue', syncQueue);
  }, [syncQueue, isStorageLoaded]);

  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      setIsSyncing(true);
      const timeout = setTimeout(() => {
        animateListChange();
        setSyncQueue([]);
        setIsSyncing(false);
        setDeliveries((prev) =>
          prev.map((d) => (d.status === 'Pending Sync' ? { ...d, status: 'Delivered' } : d))
        );
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, syncQueue]);

  useEffect(() => {
    const interval = setInterval(() => {
      const event: TelemetryEvent = {
        tracking_id: 'L814315788',
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
      setTelemetryLogs((prev) => [event, ...prev.slice(0, 9)]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const markDelivered = (id: string) => {
    animateListChange();
    if (isOnline) {
      setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'Delivered' } : d)));
    } else {
      setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'Pending Sync' } : d)));
      setSyncQueue((prev) => [...prev, id]);
    }
  };

  const markFailed = (id: string) => {
    animateListChange();
    if (isOnline) {
      setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'Failed' } : d)));
    } else {
      setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'Pending Sync' } : d)));
      setSyncQueue((prev) => [...prev, id]);
    }
  };

  const filteredDeliveries = deliveries.filter((d) => {
    if (filter === 'All') return true;
    if (filter === 'Pending') return d.status === 'Pending' || d.status === 'Pending Sync';
    if (filter === 'Transit') return d.status === 'In Transit';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.wordmarkSub}>DRIVER CONSOLE</Text>
            <Text style={styles.wordmarkTitle}>PulseRoute</Text>
          </View>
          <View style={styles.headerActions}>
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} style={{ marginRight: 16 }} />
            <OnlineToggle value={isOnline} onToggle={() => setIsOnline((v) => !v)} />
          </View>
        </View>

        {/* Sync Banners */}
        {isSyncing && (
          <View style={[styles.syncBanner, styles.syncBannerSyncing]}>
            <Feather name="refresh-cw" size={14} color={colors.primary} />
            <Text style={[styles.syncBannerText, { color: colors.primary }]}>
               Syncing {syncQueue.length} update{syncQueue.length > 1 ? 's' : ''}...
            </Text>
          </View>
        )}
        {!isOnline && syncQueue.length > 0 && !isSyncing && (
          <View style={styles.syncBanner}>
            <Feather name="wifi-off" size={14} color={colors.pending.text} />
            <Text style={styles.syncBannerText}>
               {syncQueue.length} queued — waiting for connection
            </Text>
          </View>
        )}

        {/* Filter Pills */}
        <View style={styles.pillRow}>
          {(['All', 'Pending', 'Transit'] as FilterOption[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => { animateListChange(); setFilter(f); }}
              style={[styles.pill, filter === f && styles.pillActive]}
            >
              <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredDeliveries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <DeliveryCard
            item={item}
            onPress={() => navigation.navigate('Detail', { delivery: item })}
            onMarkDelivered={() => markDelivered(item.id)}
            onMarkFailed={() => markFailed(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No deliveries found.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.telemetryBox}>
            <View style={styles.telemetryHeader}>
              <Feather name="activity" size={16} color={colors.primary} />
              <Text style={styles.telemetryTitle}>Live Telemetry</Text>
            </View>
            <ScrollView style={styles.telemetryScroll} nestedScrollEnabled>
              {telemetryLogs.length === 0 ? (
                <Text style={styles.telemetryRow}>Connecting to satellite...</Text>
              ) : (
                telemetryLogs.map((log, i) => (
                  <View key={log.timestamp + '-' + i} style={[styles.logBlock, i === 0 && styles.logBlockLatest]}>
                    <Text style={[styles.telemetryRow, i === 0 && styles.telemetryRowLatest]}>
                      Tracking: {log.tracking_id}
                    </Text>
                    <Text style={[styles.telemetryRow, i === 0 && styles.telemetryRowLatest]}>
                      📍 {log.telemetry.latitude.toFixed(4)}, {log.telemetry.longitude.toFixed(4)}
                    </Text>
                    <Text style={[styles.telemetryRow, i === 0 && styles.telemetryRowLatest]}>
                      🚗 {log.telemetry.speed_kmh} km/h   🔋 {log.device_metrics.battery_level}%   📶 {log.device_metrics.network_latency_ms}ms
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: colors.bg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmarkSub: { fontSize: 12, color: colors.textSecondary, letterSpacing: 1, fontWeight: '600', marginBottom: 4 },
  wordmarkTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleLabelOnline: { color: colors.primary },
  toggleLabelOffline: { color: colors.textSecondary },
  toggleTrack: { width: 56, height: 32, borderRadius: 16, justifyContent: 'center' },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 },

  syncBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.pending.bg, paddingVertical: 12, borderRadius: 12, marginBottom: 20 },
  syncBannerSyncing: { backgroundColor: colors.primaryLight },
  syncBannerText: { fontSize: 13, color: colors.pending.text, fontWeight: '600' },

  pillRow: { flexDirection: 'row', gap: 10 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  pillText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: colors.surface, fontWeight: '600' },

  listContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 },

  // Card Styling
  card: { 
    backgroundColor: colors.surface, 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  cardActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  customerName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  orderId: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  routingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 12,
    borderRadius: 16,
  },
  routePoint: { flex: 1 },
  routeLine: { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.textTertiary, marginHorizontal: 10, borderRadius: 1 },
  routeDotOrigin: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.textTertiary, marginBottom: 6 },
  routeDotDest: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  routeText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  emptyState: { paddingTop: 60, alignItems: 'center', opacity: 0.6 },
  emptyText: { fontSize: 15, color: colors.textSecondary, marginTop: 12, fontWeight: '500' },

  // Telemetry Box
  telemetryBox: { marginTop: 24, backgroundColor: colors.surface, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  telemetryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  telemetryTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  telemetryScroll: { maxHeight: 200 },
  logBlock: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  logBlockLatest: { backgroundColor: colors.primaryLight, borderRadius: 12, paddingHorizontal: 12, borderBottomWidth: 0, marginBottom: 8 },
  telemetryRow: { fontSize: 12, color: colors.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 4 },
  telemetryRowLatest: { color: colors.primary, fontWeight: '600' },

  // Swipe Actions
  actionLeft: { backgroundColor: colors.delivered.pip, justifyContent: 'center', alignItems: 'center', width: 100, borderRadius: 24, marginBottom: 16 },
  actionRight: { backgroundColor: colors.failed.pip, justifyContent: 'center', alignItems: 'center', width: 100, borderRadius: 24, marginBottom: 16 },
  actionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, marginTop: 4 },
});