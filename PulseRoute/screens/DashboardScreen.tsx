import React, { useState, useRef, useEffect, useCallback, useLayoutEffect, memo } from 'react';
import { saveData, loadData } from '../storage/storage';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
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
  Easing,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AnimatedFeather = Animated.createAnimatedComponent(Feather);

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

// ─── Design Tokens (Blue Theme - Arc / Linear Aesthetic) ──────────────────────

const colors = {
  bg: '#F8F9FB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  borderActive: 'rgba(59, 130, 246, 0.25)',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  primary: '#3B82F6',
  primaryLight: '#EFF6FF',

  pending:     { bg: '#FFFBEB', text: '#D97706', pip: '#F59E0B', border: 'rgba(245, 158, 11, 0.2)' },
  transit:     { bg: '#EFF6FF', text: '#3B82F6', pip: '#3B82F6', border: 'rgba(59, 130, 246, 0.2)' },
  delivered:   { bg: '#ECFDF5', text: '#059669', pip: '#10B981', border: 'rgba(16, 185, 129, 0.2)' },
  pendingSync: { bg: '#F3F4F6', text: '#4B5563', pip: '#6B7280', border: 'rgba(107, 114, 128, 0.2)' },
  failed:      { bg: '#FEF2F2', text: '#DC2626', pip: '#EF4444', border: 'rgba(239, 68, 68, 0.2)' },

  onlineBg:      '#3B82F6',
  onlineBorder:  '#3B82F6',
  onlineDot:     '#FFFFFF',
  offlineBg:     '#E5E7EB',
  offlineBorder: '#E5E7EB',
} as const;

// ─── Animated Toggle ──────────────────────────────────────────────────────────

const OnlineToggle = memo(function OnlineToggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      bounciness: 10,
      speed: 14,
    }).start();
  }, [value, anim]);

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
});

// ─── 3D Floating Package Graphic ──────────────────────────────────────────────

const FloatingPackage = memo(function FloatingPackage() {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8, // Slightly smaller float range to match tighter sizing
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0, 
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  const shadowScale = floatAnim.interpolate({
    inputRange: [-8, 0],
    outputRange: [0.6, 1],
  });

  const shadowOpacity = floatAnim.interpolate({
    inputRange: [-8, 0],
    outputRange: [0.2, 0.5],
  });

  return (
    <View style={styles.floatingContainer}>
      <Animated.Text 
        style={[
          styles.packageEmoji, 
          { transform: [{ translateY: floatAnim }] }
        ]}
      >
        📦
      </Animated.Text>
      <Animated.View
        style={[
          styles.packageShadow,
          {
            transform: [{ scale: shadowScale }],
            opacity: shadowOpacity,
          },
        ]}
      />
    </View>
  );
});

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

// ─── Shimmer Component ────────────────────────────────────────────────────────

const ShimmerBar = memo(function ShimmerBar() {
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 2,
        duration: 2200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerAnim]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.shimmerOverlay,
        {
          transform: [
            {
              translateX: shimmerAnim.interpolate({
                inputRange: [-1, 2],
                outputRange: [-300, 700],
              }),
            },
          ],
        },
      ]}
    />
  );
});

// ─── Pulsing Badge ────────────────────────────────────────────────────────────

const PulsingBadge = memo(function PulsingBadge({ status }: { status: DeliveryStatus }) {
  const sc = getStatusColors(status);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isTransit = status === 'In Transit';

  useEffect(() => {
    if (!isTransit) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.07,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [isTransit, pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.badge,
        { backgroundColor: sc.bg, borderColor: sc.border, transform: [{ scale: pulseAnim }] },
      ]}
    >
      <Text style={[styles.badgeText, { color: sc.text }]}>{status}</Text>
    </Animated.View>
  );
});

// ─── Bouncing Pin Icon ─────────────────────────────────────────────────────────

const BouncingPin = memo(function BouncingPin({ status }: { status: DeliveryStatus }) {
  const sc = getStatusColors(status);
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const isTransit = status === 'In Transit';

  useEffect(() => {
    if (!isTransit) return;
    const delay = Math.floor(Math.random() * 600);
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.spring(bounceAnim, {
            toValue: -6,
            useNativeDriver: true,
            speed: 20,
            bounciness: 12,
          }),
          Animated.spring(bounceAnim, {
            toValue: 0,
            useNativeDriver: true,
            speed: 12,
            bounciness: 8,
          }),
          Animated.delay(1800),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [isTransit, bounceAnim]);

  return (
    <Animated.View
      style={[
        styles.addressIconWrapper,
        { backgroundColor: sc.bg, borderWidth: 1, borderColor: sc.border, transform: [{ translateY: bounceAnim }] },
      ]}
    >
      <Feather name="map-pin" size={16} color={sc.pip} />
    </Animated.View>
  );
});

// ─── Delivery Card (Ultra-Smooth Interactive Redesign) ────────────────────────

const DeliveryCard = memo(function DeliveryCard({
  item,
  index,
  onPress,
  onMarkDelivered,
  onMarkFailed,
}: {
  item: Delivery;
  index: number;
  onPress: (item: Delivery) => void;
  onMarkDelivered: (id: string) => void;
  onMarkFailed: (id: string) => void;
}) {
  const sc = getStatusColors(item.status);
  const canMark = item.status === 'Pending' || item.status === 'In Transit';
  const swipeableRef = useRef<Swipeable>(null);
  const isTransit = item.status === 'In Transit';

  // 1. Entrance Anim
  const entranceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const delay = index * 70;
    Animated.spring(entranceAnim, {
      toValue: 1,
      delay,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  }, [entranceAnim, index]);

  // 2. Complex Press Mechanics
  const pressScale = useRef(new Animated.Value(1)).current;
  const pressY = useRef(new Animated.Value(0)).current;
  const pressHighlight = useRef(new Animated.Value(0)).current;

  const onPressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.spring(pressY, {
        toValue: 3,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.timing(pressHighlight, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pressScale, pressY, pressHighlight]);

  const onPressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 35,
        bounciness: 8, 
      }),
      Animated.spring(pressY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 35,
        bounciness: 8,
      }),
      Animated.timing(pressHighlight, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pressScale, pressY, pressHighlight]);

  // 3. Physical Closure Micro-Interaction
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  const triggerExitSequence = useCallback((callback: () => void) => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(exitScale, {
          toValue: 0.5,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }),
      ])
    ]).start(() => {
      callback();
    });
  }, [exitOpacity, exitScale]);

  // 4. Organic Breathing State for Active Cards
  const breatheAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isTransit) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.015,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isTransit, breatheAnim]);

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
    <Animated.View
      style={{
        opacity: Animated.multiply(entranceAnim, exitOpacity),
        transform: [
          {
            translateY: entranceAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [40, 0],
            }),
          },
          { scale: exitScale }
        ],
      }}
    >
      <Swipeable
        ref={swipeableRef}
        enabled={canMark}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        friction={2}
        overshootFriction={8}
        onSwipeableOpen={(direction) => {
          if (direction === 'left') {
            triggerExitSequence(() => onMarkDelivered(item.id));
          } else if (direction === 'right') {
            triggerExitSequence(() => onMarkFailed(item.id));
          }
        }}
      >
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={() => onPress(item)}
        >
          <Animated.View
            style={[
              styles.card,
              isTransit && styles.cardActive,
              { 
                transform: [
                  { scale: isTransit ? Animated.multiply(pressScale, breatheAnim) : pressScale },
                  { translateY: pressY }
                ] 
              },
            ]}
          >
            {isTransit && (
              <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]} pointerEvents="none">
                <ShimmerBar />
              </View>
            )}

            <Animated.View 
              style={[
                StyleSheet.absoluteFill, 
                styles.pressOverlay, 
                { opacity: pressHighlight }
              ]} 
              pointerEvents="none" 
            />

            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{item.customer}</Text>
                <Text style={styles.orderId}>Order ID: {item.id}</Text>
              </View>
              <PulsingBadge status={item.status} />
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.addressSection}>
              <BouncingPin status={item.status} />
              <View style={styles.addressTextWrapper}>
                <Text style={styles.addressLabel}>DELIVER TO</Text>
                <Text style={styles.addressValue} numberOfLines={2}>{item.address}</Text>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
}, (prevProps, nextProps) =>
  prevProps.item === nextProps.item && prevProps.index === nextProps.index
);

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

const DEFAULT_DELIVERIES: Delivery[] = [
  { id: 'H314315796', customer: 'Alice Johnson', address: 'Pattom, Trivandrum', status: 'Pending' },
  { id: 'L814315788', customer: 'Bob Smith', address: 'Kowdiar, Trivandrum', status: 'In Transit' },
  { id: 'M914315742', customer: 'Charlie Brown', address: 'Kazhakkoottam, Trivandrum', status: 'Pending' },
  { id: 'K214315711', customer: 'Diana Patel', address: 'Vazhuthacaud, Trivandrum', status: 'In Transit' },
  { id: 'P514315802', customer: 'Ethan Hunt', address: 'Technopark Phase 3, Trivandrum', status: 'In Transit' },
  { id: 'T714315999', customer: 'Fiona Gallagher', address: 'Palayam, Trivandrum', status: 'Pending' },
  { id: 'W314316001', customer: 'George Costanza', address: 'Varkala Cliff, Trivandrum', status: 'In Transit' },
  { id: 'R814316112', customer: 'Hannah Abbott', address: 'Neyyattinkara, Trivandrum', status: 'Pending' },
  { id: 'S414316201', customer: 'Isaac Newton', address: 'Sasthamangalam, Trivandrum', status: 'In Transit' },
  { id: 'J914316345', customer: 'Jane Austen', address: 'Plamoodu, Trivandrum', status: 'Pending' },
  { id: 'V214316499', customer: 'Vincent van Gogh', address: 'Nanthencode, Trivandrum', status: 'In Transit' },
];

export default function DashboardScreen({ navigation }: any) {
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [isOnline, setIsOnline] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('All');
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>(DEFAULT_DELIVERIES);
  const [syncQueue, setSyncQueue] = useState<string[]>([]);

  const syncSpinAnim = useRef(new Animated.Value(0)).current;

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
    if (isSyncing) {
      syncSpinAnim.setValue(0);
      Animated.loop(
        Animated.timing(syncSpinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      syncSpinAnim.stopAnimation();
    }
  }, [isSyncing, syncSpinAnim]);

  const spin = syncSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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

  const handlePress = useCallback((item: Delivery) => {
    navigation.navigate('Detail', { delivery: item });
  }, [navigation]);

  const handleMarkDelivered = useCallback((id: string) => {
    animateListChange();
    if (isOnline) {
      setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'Delivered' } : d)));
    } else {
      setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'Pending Sync' } : d)));
      setSyncQueue((prev) => [...prev, id]);
    }
  }, [isOnline]);

  const handleMarkFailed = useCallback((id: string) => {
    animateListChange();
    if (isOnline) {
      setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'Failed' } : d)));
    } else {
      setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'Pending Sync' } : d)));
      setSyncQueue((prev) => [...prev, id]);
    }
  }, [isOnline]);

  const renderItem = useCallback(({ item, index }: { item: Delivery; index: number }) => (
    <DeliveryCard
      item={item}
      index={index}
      onPress={handlePress}
      onMarkDelivered={handleMarkDelivered}
      onMarkFailed={handleMarkFailed}
    />
  ), [handlePress, handleMarkDelivered, handleMarkFailed]);

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

        {/* Hero Stack with inline Package */}
        <View style={styles.headerHero}>
          <Text style={styles.wordmarkSub}>DRIVER CONSOLE</Text>
          <View style={styles.titleRow}>
            <Text style={styles.wordmarkTitle}>PulseRoute</Text>
            <FloatingPackage />
          </View>
        </View>

        {isSyncing && (
          <View style={[styles.syncBanner, styles.syncBannerSyncing]}>
            <AnimatedFeather
              name="refresh-cw"
              size={14}
              color={colors.primary}
              style={{ transform: [{ rotate: spin }] }}
            />
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

        {/* Filter Pills and Online Toggle Row */}
        <View style={styles.filterToggleRow}>
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
          <OnlineToggle value={isOnline} onToggle={() => setIsOnline((v) => !v)} />
        </View>

      </View>

      <FlatList
        data={filteredDeliveries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={11}
        renderItem={renderItem}
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
              <Text style={styles.telemetryTitle}>LIVE TELEMETRY</Text>
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
    paddingTop: Platform.OS === 'ios' ? 12 : 32,
    paddingBottom: 20, 
    backgroundColor: colors.bg,
  },
  headerHero: {
    alignItems: 'flex-start',
    marginBottom: 24, 
    minHeight: 56,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center', 
  },
  
  // Controls Row containing both Filters and Toggle
  filterToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillRow: { 
    flexDirection: 'row', 
    gap: 8, 
  },

  // Floating Package Adjustments
  floatingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50, 
    height: 50, 
    marginLeft: 8, 
    marginTop: -6, 
  },
  packageEmoji: {
    fontSize: 34, 
    zIndex: 2,
    lineHeight: 40, 
  },
  packageShadow: {
    position: 'absolute',
    bottom: 4, 
    width: 22,
    height: 5,
    backgroundColor: 'rgba(0,0,0,1)',
    borderRadius: 10,
    zIndex: 1,
  },

  wordmarkSub: { 
    fontSize: 11, 
    color: colors.textSecondary, 
    letterSpacing: 1.5, 
    fontWeight: '700', 
    textTransform: 'uppercase',
    marginBottom: 6 
  },
  wordmarkTitle: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: colors.textPrimary, 
    letterSpacing: -0.8 
  },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  toggleLabelOnline: { color: colors.primary },
  toggleLabelOffline: { color: colors.textSecondary },
  toggleTrack: { width: 44, height: 26, borderRadius: 9999, justifyContent: 'center' },
  toggleThumb: { width: 20, height: 20, borderRadius: 9999, backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 },

  syncBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.pending.bg, paddingVertical: 12, borderRadius: 12, marginBottom: 20 },
  syncBannerSyncing: { backgroundColor: colors.primaryLight },
  syncBannerText: { fontSize: 13, color: colors.pending.text, fontWeight: '600' },

  pill: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 9999, 
    backgroundColor: colors.surface, 
    borderWidth: 1, 
    borderColor: colors.border 
  },
  pillActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  pillText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  pillTextActive: { color: colors.surface, fontWeight: '700' },

  listContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.borderActive, 
  },
  pressOverlay: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 20,
    zIndex: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  orderId: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999, 
    marginLeft: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
    zIndex: 2,
  },

  addressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  addressIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 9999, 
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  addressTextWrapper: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '800', 
    color: colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase', 
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },

  shimmerOverlay: {
    width: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ skewX: '-20deg' }],
  },

  emptyState: { paddingTop: 60, alignItems: 'center', opacity: 0.6 },
  emptyText: { fontSize: 15, color: colors.textSecondary, marginTop: 12, fontWeight: '500' },

  telemetryBox: { 
    marginTop: 24, 
    backgroundColor: colors.surface, 
    borderRadius: 24, 
    padding: 20, 
    borderWidth: 1,
    borderColor: colors.border 
  },
  telemetryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  telemetryTitle: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: colors.textPrimary,
    letterSpacing: 1.2,
    textTransform: 'uppercase'
  },
  telemetryScroll: { maxHeight: 200 },
  logBlock: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  logBlockLatest: { backgroundColor: colors.primaryLight, borderRadius: 12, paddingHorizontal: 12, borderBottomWidth: 0, marginBottom: 8 },
  telemetryRow: { fontSize: 12, color: colors.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 4 },
  telemetryRowLatest: { color: colors.primary, fontWeight: '600' },

  actionLeft: { backgroundColor: colors.delivered.pip, justifyContent: 'center', alignItems: 'center', width: 100, borderRadius: 20, marginBottom: 16 },
  actionRight: { backgroundColor: colors.failed.pip, justifyContent: 'center', alignItems: 'center', width: 100, borderRadius: 20, marginBottom: 16 },
  actionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, marginTop: 4 },
});