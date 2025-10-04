import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService, type OfficerMetrics } from '../services/firestoreService';

export function OfficerAnalyticsScreen() {
  const { officer } = useAuth();
  const [metrics, setMetrics] = useState<OfficerMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!officer?.uid) {
        setHasError('Not authenticated');
        setIsLoading(false);
        return;
      }
      try {
        const data = await firestoreService.getOfficerMetrics(officer.uid);
        if (isMounted) setMetrics(data);
      } catch (e: any) {
        console.error('Failed to load metrics', e);
        if (isMounted) setHasError('Failed to load analytics');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [officer?.uid]);

  const maxDaily = useMemo(() => {
    if (!metrics) return 1;
    return Math.max(1, ...metrics.dailyAssignedLast7.map(d => d.count));
  }, [metrics]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}> 
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading analytics…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasError || !metrics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{hasError || 'No metrics available'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Last {metrics.periodDays} days</Text>

        <View style={styles.kpiRow}>
          <KPI label="Assigned" value={String(metrics.assignedLast30)} color="#3B82F6" />
          <KPI label="Open" value={String(metrics.openCount)} color="#F59E0B" />
        </View>
        <View style={styles.kpiRow}>
          <KPI label="Resolved" value={String(metrics.resolvedCount)} color="#10B981" />
          <KPI label="Avg. Resolution (h)" value={metrics.averageResolutionHours == null ? '—' : String(metrics.averageResolutionHours)} color="#6B7280" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assigned per day (last 7)</Text>
          <View accessible accessibilityLabel="Assigned per day bar chart" style={styles.chart}>
            {metrics.dailyAssignedLast7.map((d, idx) => {
              const heightPct = (d.count / maxDaily) * 100;
              return (
                <View key={idx} style={styles.barContainer} accessibilityLabel={`Day ${d.label}, ${d.count} assigned`}>
                  <View style={[styles.bar, { height: `${heightPct}%` }]} />
                  <Text style={styles.barLabel}>{d.label}</Text>
                  <Text style={styles.barValue}>{d.count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface KPIProps { label: string; value: string; color: string }
function KPI({ label, value, color }: KPIProps) {
  return (
    <View style={[styles.kpi, { borderColor: color }]}
      accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  loadingText: { marginTop: 12, color: '#6B7280' },
  errorText: { color: '#EF4444', fontSize: 16 },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpi: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 2 },
  kpiValue: { fontSize: 22, fontWeight: '700' },
  kpiLabel: { marginTop: 6, color: '#6B7280', fontSize: 12 },
  section: { marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 160 },
  barContainer: { alignItems: 'center', flex: 1 },
  bar: { width: '60%', backgroundColor: '#3B82F6', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barLabel: { marginTop: 4, fontSize: 10, color: '#6B7280' },
  barValue: { fontSize: 10, color: '#111827' },
});
