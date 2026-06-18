import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Pending Sync' | 'Failed';

interface Delivery {
  id: string;
  customer: string;
  address: string;
  status: DeliveryStatus;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
// Same status palette as the dashboard, plus a purple "primary" accent for the
// new hero / progress / action elements.

const colors = {
  bg: '#F7F7FC',
  surface: '#FFFFFF',
  border: '#ECEBF2',
  borderStrong: '#DAD8E6',
  textPrimary: '#1C1C28',
  textSecondary: '#6E6C80',
  textTertiary: '#A6A4B5',

  primary: '#6C5CE7',
  primaryDark: '#4D3FCB',
  primaryLight: '#EFEBFF',

  pending:     { bg: '#FFF4E0', text: '#9A6100', pip: '#F59E0B' },
  transit:     { bg: '#E5F0FF', text: '#1A4FA3', pip: '#3B82F6' },
  delivered:   { bg: '#E3FAF0', text: '#0F6E56', pip: '#22C55E' },
  pendingSync: { bg: '#F3F0FF', text: '#5B21B6', pip: '#8B5CF6' },
  failed:      { bg: '#FEF2F2', text: '#991B1B', pip: '#EF4444' },
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
                <Text style={styles.timelineDotText}>
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
  const { delivery }: { delivery: Delivery } = route.params;
  const sc = getStatusColors(delivery.status);
  const canAct = delivery.status === 'Pending' || delivery.status === 'In Transit' || delivery.status === 'Pending Sync';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.iconButton}
          accessibilityLabel="Go back"
        >
          <Text style={styles.iconButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Delivery Details</Text>
          <Text style={styles.headerSubtitle}>{delivery.id}</Text>
        </View>

        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
          <View style={[styles.badgeDot, { backgroundColor: sc.pip }]} />
          <Text style={[styles.badgeText, { color: sc.text }]}>{delivery.status}</Text>
        </View>
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
          </View>

          <View style={styles.divider} />

          <View style={styles.chipRow}>
            <View style={[styles.infoChip, { backgroundColor: colors.primaryLight }]}>
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
  scrollContent: { padding: 16, paddingBottom: 32, gap: 12 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: { fontSize: 18, color: colors.textPrimary },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, letterSpacing: -0.2 },
  headerSubtitle: { fontSize: 12, color: colors.textTertiary, fontFamily: 'Courier', marginTop: 1 },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  // Generic card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 16,
    shadowColor: '#1C1C28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: colors.textTertiary, letterSpacing: 0.7, marginBottom: 12 },

  // Hero card
  heroCard: { gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: { fontSize: 18, fontWeight: '700', color: colors.primaryDark },
  heroName: { fontSize: 17, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
  heroAddress: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.border },
  chipRow: { flexDirection: 'row', gap: 8 },
  infoChip: { backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  infoChipText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },

  // Timeline
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineStep: { alignItems: 'center', width: 64 },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  timelineDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  timelineDotCurrent: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  timelineDotFailed: { backgroundColor: colors.failed.pip, borderColor: colors.failed.pip },
  timelineDotText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  timelineLabel: { fontSize: 11, color: colors.textTertiary, textAlign: 'center' },
  timelineLabelActive: { color: colors.textPrimary, fontWeight: '500' },
  timelineConnector: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 13, marginHorizontal: -8 },
  timelineConnectorDone: { backgroundColor: colors.primary },

  // Route
  routeRow: { flexDirection: 'row', gap: 14 },
  routeMarkerCol: { alignItems: 'center', paddingTop: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeDotEnd: { backgroundColor: colors.textPrimary },
  routeLine: { width: 2, flex: 1, minHeight: 32, backgroundColor: colors.border, marginVertical: 4 },
  routeTextCol: { flex: 1, justifyContent: 'space-between' },
  routePoint: { marginBottom: 18 },
  routePointLabel: { fontSize: 10, fontWeight: '600', color: colors.textTertiary, letterSpacing: 0.6, marginBottom: 3 },
  routePointValue: { fontSize: 13, color: colors.textPrimary },

  // Map placeholder
  mapCard: { padding: 12, gap: 12 },
  mapSurface: {
    height: 160,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
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
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mapBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.delivered.pip },
  mapBadgeText: { fontSize: 11, fontWeight: '500', color: colors.textPrimary },
  mapButton: { alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bg },
  mapButtonText: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },

  // Instructions
  noteRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  noteIcon: { fontSize: 15, marginTop: 1 },
  noteText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

  // Telemetry grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statChip: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statChipIcon: { fontSize: 15, marginBottom: 6 },
  statChipValue: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  statChipLabel: { fontSize: 10, color: colors.textTertiary, letterSpacing: 0.5, marginTop: 2 },

  // Bottom action bar
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonText: { fontSize: 18 },
  failButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.failed.pip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failButtonText: { fontSize: 14, fontWeight: '600', color: colors.failed.pip },
  deliveredButton: {
    flex: 1.4,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveredButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  statusBar: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  statusBarText: { fontSize: 13, fontWeight: '500' },
});