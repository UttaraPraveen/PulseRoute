import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Pending Sync' | 'Failed';

interface Delivery {
  id: string;
  customer: string;
  address: string;
  status: DeliveryStatus;
}

// ─── Design Tokens (Blue Theme - Arc / Linear Aesthetic) ──────────────────────

const colors = {
  bg: '#F8F9FB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  primary: '#3B82F6',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',

  pending:     { bg: '#FFFBEB', text: '#D97706', pip: '#F59E0B', border: 'rgba(245, 158, 11, 0.2)' },
  transit:     { bg: '#EFF6FF', text: '#3B82F6', pip: '#3B82F6', border: 'rgba(59, 130, 246, 0.2)' },
  delivered:   { bg: '#ECFDF5', text: '#059669', pip: '#10B981', border: 'rgba(16, 185, 129, 0.2)' },
  pendingSync: { bg: '#F3F4F6', text: '#4B5563', pip: '#6B7280', border: 'rgba(107, 114, 128, 0.2)' },
  failed:      { bg: '#FEF2F2', text: '#DC2626', pip: '#EF4444', border: 'rgba(239, 68, 68, 0.2)' },
} as const;

function getStatusColors(status: DeliveryStatus) {
  switch (status) {
    case 'Pending':      return colors.pending;
    case 'In Transit':   return colors.transit;
    case 'Delivered':    return colors.delivered;
    case 'Pending Sync': return colors.pendingSync;
    case 'Failed':       return colors.failed;
  }
}

// ─── Step progress ────────────────────────────────────────────────────────────

const STEPS = ['Picked Up', 'In Transit', 'Delivered'];

function getStepIndex(status: DeliveryStatus) {
  if (status === 'Delivered') return 2;
  if (status === 'In Transit' || status === 'Pending Sync' || status === 'Failed') return 1;
  return 0;
}

function StepTimeline({ status }: { status: DeliveryStatus }) {
  const activeIndex = getStepIndex(status);
  const isFailed = status === 'Failed';

  return (
    <View style={styles.timelineRow}>
      {STEPS.map((label, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex;
        const failedHere = isFailed && current;

        return (
          <React.Fragment key={label}>
            <View style={styles.timelineStep}>
              <View
                style={[
                  styles.timelineDot,
                  done && styles.timelineDotDone,
                  current && !failedHere && styles.timelineDotCurrent,
                  failedHere && styles.timelineDotFailed,
                ]}
              >
                <Text style={[styles.timelineDotText, (done || current) && { color: current && !failedHere ? colors.primary : '#FFF' }]}>
                  {failedHere ? '✕' : done ? '✓' : i + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.timelineLabel,
                  (done || current) && styles.timelineLabelActive,
                ]}
              >
                {label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View
                style={[
                  styles.timelineConnector,
                  i < activeIndex && styles.timelineConnectorDone,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Small building blocks ────────────────────────────────────────────────────

function SectionCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function StatChip({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statChipIcon}>{icon}</Text>
      <Text style={styles.statChipValue}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  );
}

// ─── Detail Screen ────────────────────────────────────────────────────────────

export default function DetailScreen({ route, navigation }: any) {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const { delivery }: { delivery: Delivery } = route.params;
  const sc = getStatusColors(delivery.status);
  const canAct = delivery.status === 'Pending' || delivery.status === 'In Transit' || delivery.status === 'Pending Sync';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
         <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.iconButton}
          accessibilityLabel="Go back"
        >
          <Text style={styles.iconButtonText}>←</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero: customer + tracking ── */}
        <SectionCard style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{delivery.customer.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{delivery.customer}</Text>
              <Text style={styles.heroAddress} numberOfLines={2}>📍 {delivery.address}</Text>
            </View>
            
            <View style={[styles.badge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
              <View style={[styles.badgeDot, { backgroundColor: sc.pip }]} />
              <Text style={[styles.badgeText, { color: sc.text }]}>{delivery.status}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.chipRow}>
            <View style={[styles.infoChip, { backgroundColor: colors.primaryLight, borderColor: 'rgba(59, 130, 246, 0.2)' }]}>
              <Text style={[styles.infoChipText, { color: colors.primaryDark }]}>🏷️ Express Priority</Text>
            </View>
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>🆔 {delivery.id}</Text>
            </View>
          </View>
        </SectionCard>

        {/* ── Progress timeline ── */}
        <SectionCard>
          <SectionLabel>SHIPMENT PROGRESS</SectionLabel>
          <StepTimeline status={delivery.status} />
        </SectionCard>

        {/* ── Route: pickup -> drop-off ── */}
        <SectionCard>
          <SectionLabel>ROUTE</SectionLabel>

          <View style={styles.routeRow}>
            <View style={styles.routeMarkerCol}>
              <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
              <View style={styles.routeLine} />
              <View style={[styles.routeDot, styles.routeDotEnd]} />
            </View>
            <View style={styles.routeTextCol}>
              <View style={styles.routePoint}>
                <Text style={styles.routePointLabel}>PICKUP</Text>
                <Text style={styles.routePointValue}>PulseRoute Distribution Hub</Text>
              </View>
              <View style={styles.routePoint}>
                <Text style={styles.routePointLabel}>DROP-OFF</Text>
                <Text style={styles.routePointValue}>{delivery.address}</Text>
              </View>
            </View>
          </View>
        </SectionCard>

        {/* ── Map placeholder ── */}
        <SectionCard style={styles.mapCard}>
          <View style={styles.mapSurface}>
            <View style={styles.mapDashedLine} />
            <View style={[styles.mapPin, styles.mapPinStart]}>
              <Text style={styles.mapPinText}>●</Text>
            </View>
            <View style={[styles.mapPin, styles.mapPinEnd]}>
              <Text style={styles.mapPinText}>📍</Text>
            </View>
            <View style={styles.mapBadge}>
              <View style={styles.mapBadgeDot} />
              <Text style={styles.mapBadgeText}>Live tracking</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.mapButton}>
            <Text style={styles.mapButtonText}>Open Full Navigation</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ── Instructions ── */}
        <SectionCard>
          <SectionLabel>DROP-OFF INSTRUCTIONS</SectionLabel>
          <View style={styles.noteRow}>
            <Text style={styles.noteIcon}>🛎️</Text>
            <Text style={styles.noteText}>Leave the package with the security desk if the customer is unavailable.</Text>
          </View>
          <View style={styles.noteRow}>
            <Text style={styles.noteIcon}>☎️</Text>
            <Text style={styles.noteText}>Contact the customer before marking the delivery as failed.</Text>
          </View>
        </SectionCard>

        {/* ── Telemetry ── */}
        <SectionCard>
          <SectionLabel>RECENT TELEMETRY</SectionLabel>
          <View style={styles.statGrid}>
            <StatChip icon="🚗" value="28 km/h" label="SPEED" />
            <StatChip icon="🔋" value="90%" label="BATTERY" />
            <StatChip icon="📶" value="42 ms" label="LATENCY" />
            <StatChip icon="🛰️" value="Active" label="GPS" />
          </View>
        </SectionCard>
      </ScrollView>

      {/* ── Bottom action bar ── */}
      {canAct ? (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.callButton} accessibilityLabel="Call customer">
            <Text style={styles.callButtonText}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.failButton}>
            <Text style={styles.failButtonText}>Report Failed</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deliveredButton}>
            <Text style={styles.deliveredButtonText}>Mark Delivered</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.actionBar, styles.statusBar]}>
          <View style={[styles.badgeDot, { backgroundColor: sc.pip }]} />
          <Text style={[styles.statusBarText, { color: sc.text }]}>
            {delivery.status === 'Delivered' ? 'This delivery is complete' : `Delivery marked as ${delivery.status.toLowerCase()}`}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 16 },

  // Top Navigation Bar
  topBar: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 8,
    backgroundColor: colors.bg,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 9999, // Pure circle
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border, // Crisp border, no shadow
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: { fontSize: 20, color: colors.textPrimary },

  badge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 9999, // Pill shape
    borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Generic card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border, // No shadows
    padding: 20,
  },
  sectionLabel: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: colors.textTertiary, 
    letterSpacing: 1.2, 
    textTransform: 'uppercase',
    marginBottom: 16 
  },

  // Hero card
  heroCard: { gap: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 9999, // Circle avatar
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
  heroName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4, letterSpacing: -0.3 },
  heroAddress: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.border },
  chipRow: { flexDirection: 'row', gap: 8 },
  infoChip: { 
    backgroundColor: colors.surface, 
    borderRadius: 9999, 
    paddingHorizontal: 12, 
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

  // Timeline
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineStep: { alignItems: 'center', width: 64 },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 2, // Thicker, crisper border for the timeline
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timelineDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  timelineDotCurrent: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  timelineDotFailed: { backgroundColor: colors.failed.pip, borderColor: colors.failed.pip },
  timelineDotText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
  timelineLabel: { fontSize: 11, color: colors.textTertiary, textAlign: 'center', fontWeight: '600' },
  timelineLabelActive: { color: colors.textPrimary, fontWeight: '700' },
  timelineConnector: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 13, marginHorizontal: -8 },
  timelineConnectorDone: { backgroundColor: colors.primary },

  // Route
  routeRow: { flexDirection: 'row', gap: 16 },
  routeMarkerCol: { alignItems: 'center', paddingTop: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeDotEnd: { backgroundColor: colors.textPrimary },
  routeLine: { width: 2, flex: 1, minHeight: 32, backgroundColor: colors.border, marginVertical: 4 },
  routeTextCol: { flex: 1, justifyContent: 'space-between' },
  routePoint: { marginBottom: 18 },
  routePointLabel: { fontSize: 10, fontWeight: '800', color: colors.textTertiary, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  routePointValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },

  // Map placeholder
  mapCard: { padding: 12, gap: 12 },
  mapSurface: {
    height: 160,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)', // Soft border for map area
    overflow: 'hidden',
    justifyContent: 'center',
  },
  mapDashedLine: {
    position: 'absolute',
    left: 36,
    right: 36,
    top: '50%',
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
    opacity: 0.35,
  },
  mapPin: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  mapPinStart: { left: 28, top: '50%', marginTop: -6 },
  mapPinEnd: { right: 24, top: '50%', marginTop: -22 },
  mapPinText: { fontSize: 16, color: colors.primary },
  mapBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mapBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.delivered.pip },
  mapBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textPrimary, letterSpacing: 0.3 },
  mapButton: { alignItems: 'center', paddingVertical: 12, borderRadius: 9999, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  mapButtonText: { fontSize: 13, fontWeight: '800', color: colors.primaryDark },

  // Instructions
  noteRow: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  noteIcon: { fontSize: 15, marginTop: 1 },
  noteText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20, fontWeight: '500' },

  // Telemetry grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statChip: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  statChipIcon: { fontSize: 16, marginBottom: 8 },
  statChipValue: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  statChipLabel: { fontSize: 10, color: colors.textTertiary, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4, fontWeight: '800' },

  // Bottom action bar
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  callButton: {
    width: 54,
    height: 54,
    borderRadius: 9999, // Pill shape
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonText: { fontSize: 20 },
  failButton: {
    flex: 1,
    height: 54,
    borderRadius: 9999, // Pill shape
    borderWidth: 1.5,
    borderColor: colors.failed.pip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failButtonText: { fontSize: 14, fontWeight: '800', color: colors.failed.pip },
  deliveredButton: {
    flex: 1.4,
    height: 54,
    borderRadius: 9999, // Pill shape
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveredButtonText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  statusBar: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  statusBarText: { fontSize: 14, fontWeight: '700' },
});