import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService, Report } from '../services/firestoreService';
import { notificationService } from '../services/notificationService';
import { ReportDetailScreen } from './ReportDetailScreen';
import { addNotificationRouteListener } from '../services/notificationBus';
import { useRouter, type Href } from 'expo-router';
import { cacheService } from '../services/cacheService';

interface ReportCardProps {
  report: Report;
  onPress: () => void;
}

function ReportCard({ report, onPress }: ReportCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return '#F59E0B';
      case 'accepted': return '#10B981';
      case 'responding': return '#3B82F6';
      case 'resolved': return '#6B7280';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#D97706';
      case 'low': return '#65A30D';
      default: return '#6B7280';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <TouchableOpacity style={styles.reportCard} onPress={onPress}>
      <View style={styles.reportHeader}>
        <View style={styles.reportTitleContainer}>
          <Text style={styles.reportTitle} numberOfLines={1}>
            {report.title || `${report.category} Report`}
          </Text>
          <View style={styles.badgeContainer}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(report.priority) }]}>
              <Text style={styles.badgeText}>{report.priority.toUpperCase()}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
              <Text style={styles.badgeText}>{report.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <Text style={styles.reportCategory}>{report.category}</Text>
      <Text style={styles.reportLocation} numberOfLines={1}>
         {report.location?.address || 'Location not specified'}
      </Text>
      <Text style={styles.reportDescription} numberOfLines={2}>
        {report.description}
      </Text>
      
      <View style={styles.reportFooter}>
        <Text style={styles.reportTime}>
          {formatDate(report.createdAt)}
        </Text>
        {report.assignmentStatus === 'pending' && (
          <Text style={styles.pendingText}>Action Required</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function AssignmentInboxScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const { officer, signOut } = useAuth();
  const prevIdsRef = useRef<Set<string>>(new Set());
  const router = useRouter();
  const ASSIGNED_TTL_MS = 60 * 1000; // 1 minute

  function assignedCacheKey(uid: string) {
    return `assignedReports:${uid}`;
  }

  useEffect(() => {
    if (officer?.uid) {
      // Try cache first for instant UI
      (async () => {
        const cached = await cacheService.getCache<Report[]>(assignedCacheKey(officer.uid));
        if (cached && cached.length > 0) {
          setReports(cached);
          setLoading(false);
          prevIdsRef.current = new Set(cached.map((r) => r.id));
        }
      })();

      // Then fetch fresh
      loadReports();
      
      // Set up real-time listener
      const unsubscribe = firestoreService.subscribeToAssignedReports(
        officer.uid,
        (updatedReports) => {
          // Diff newly assigned reports (IDs not seen before) and fire local notifications
          const newIds = new Set(updatedReports.map((r) => r.id));
          const newlyAssigned = updatedReports.filter(
            (r) => !prevIdsRef.current.has(r.id) && (r.assignmentStatus === 'pending' || r.status === 'assigned')
          );

          newlyAssigned.forEach((r) => {
            notificationService.sendLocalNotification({
              type: 'assignment',
              reportId: r.id,
              title: 'New Case Assignment',
              body: `${r.priority.toUpperCase()} priority ${r.category} case assigned`,
              data: { reportId: r.id, priority: r.priority, category: r.category },
            });
          });

          setReports(updatedReports);
          prevIdsRef.current = newIds;
          setLoading(false);
          cacheService.setCache(assignedCacheKey(officer.uid), updatedReports, ASSIGNED_TTL_MS);
        }
      );

      return unsubscribe;
    }
  }, [officer?.uid]);

  // Listen for notification route events to open report detail
  useEffect(() => {
    const remove = addNotificationRouteListener((route) => {
      if (route.type === 'assignment' && route.reportId) {
        setSelectedReportId(route.reportId);
      }
    });
    return remove;
  }, []);

  const loadReports = async () => {
    if (!officer?.uid) return;
    
    try {
      const assignedReports = await firestoreService.getAssignedReports(officer.uid);
      setReports(assignedReports);
      // Initialize previous IDs snapshot on initial load
      prevIdsRef.current = new Set(assignedReports.map((r) => r.id));
      await cacheService.setCache(assignedCacheKey(officer.uid), assignedReports, ASSIGNED_TTL_MS);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleReportPress = (report: Report) => {
    setSelectedReportId(report.id);
  };

  const handleBackFromDetail = () => {
    setSelectedReportId(null);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleOpenAnalytics = () => {
    router.push('/analytics' as Href);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Assignments</Text>
      <Text style={styles.emptyStateText}>
        You don&apos;t have any assigned cases at the moment.
      </Text>
    </View>
  );

  // Show report detail screen if a report is selected
  if (selectedReportId) {
    return (
      <ReportDetailScreen
        reportId={selectedReportId}
        onBack={handleBackFromDetail}
      />
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Assignment Inbox</Text>
          <Text style={styles.headerSubtitle}>
            Welcome, {officer?.displayName || officer?.email}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenAnalytics}>
            <Text style={styles.secondaryButtonText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReportCard
            report={item}
            onPress={() => handleReportPress(item)}
          />
        )}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    marginBottom: 8,
  },
  reportTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  reportCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginBottom: 4,
  },
  reportLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  reportDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  pendingText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
