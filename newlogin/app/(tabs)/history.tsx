import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { REPORT_STATUS_LABELS } from '../../constants/categories';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ReportService } from '../../services/reportService';
import { useStyles } from '../../styles/tabs/history.styles';
import { Report } from '../../types';
import { findCategoryDetails } from '../../utils/categoryUtils';

export default function HistoryScreen() {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeError, setIsRealtimeError] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      if (!user) return;

      let userReports: Report[] = [];
      if (user.isAnonymous) {
        userReports = await ReportService.getAnonymousReports();
      } else {
        userReports = await ReportService.getUserReports(user.uid);
      }
      setReports(userReports);
      setError(null);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      
      let errorMessage = 'Failed to load reports. Please try again.';
      
      if (err?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your account status.';
      } else if (err?.code === 'unavailable' || err?.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err?.message) {
        errorMessage = `Error: ${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      setIsRealtimeError(false);
      setIsLoading(true);

      try {
        if (user.isAnonymous) {
          const unsub = await ReportService.subscribeToAnonymousReports((updatedReports) => {
            setReports(updatedReports);
            setIsLoading(false);
            setError(null);
          });
          if (unsub) {
            unsubscribe = unsub;
          }
        } else {
          unsubscribe = ReportService.subscribeToUserReports(user.uid, (updatedReports) => {
            setReports(updatedReports);
            setIsLoading(false);
            setError(null);
          });
        }
      } catch (err: any) {
        console.error('Error setting up real-time updates:', err);
        setIsRealtimeError(true);
        
        // Try fallback to single fetch
        try {
          await loadReports();
        } catch (fallbackErr: any) {
          console.error('Fallback fetch also failed:', fallbackErr);
          let errorMessage = 'Failed to load reports.';
          
          if (fallbackErr?.code === 'permission-denied') {
            errorMessage = 'Permission denied. Please check your account status.';
          } else if (fallbackErr?.code === 'unavailable' || fallbackErr?.message?.includes('network')) {
            errorMessage = 'Network error. Please check your internet connection.';
          } else if (fallbackErr?.message) {
            errorMessage = `Error: ${fallbackErr.message}`;
          }
          
          setError(errorMessage);
          setIsLoading(false);
        }
      }
    };

    setup();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, loadReports]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadReports();
  }, [loadReports]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleReportPress = useCallback((item: Report) => {
    router.push({
      pathname: '/report-detail',
      params: { reportId: item.id },
    });
  }, []);

  const renderReportItem = useCallback(
    ({ item }: { item: Report }) => {
      const { main, sub } = findCategoryDetails(item.category);
      const categoryLabel = `${main?.label || 'Category'} - ${sub?.label || 'Subcategory'}`;
      const statusLabel = REPORT_STATUS_LABELS[item.status as keyof typeof REPORT_STATUS_LABELS];

      return (
        <TouchableOpacity
          style={styles.reportItem}
          onPress={() => handleReportPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.reportItemHeader}>
            <View style={styles.categoryContainer}>
              {typeof main?.icon === 'number' ? (
                <Image source={main.icon} style={styles.categoryIcon} />
              ) : (
                <Text style={styles.categoryIconText}>{main?.icon || '📝'}</Text>
              )}
              <Text style={styles.categoryLabel}>{categoryLabel}</Text>
            </View>
            <Text style={styles.statusLabel}>{statusLabel}</Text>
          </View>

          <Text style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>

          {item.location && (
            <Text style={styles.location}>
              {item.location.address?.formattedAddress ||
                `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`}
            </Text>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>{formatDate(item.timestamp)}</Text>
            <Text style={styles.footerText}>ID: {item.id.slice(-8)}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [theme]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Report History</Text>
        <Text style={styles.subtitle}>
          {user?.isAnonymous
            ? 'Anonymous Reports'
            : user?.authMethod === 'phone'
            ? 'Phone Verified Reports'
            : 'Your Crime Reports'}
        </Text>
      </View>

      {isRealtimeError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Couldn't connect to real-time updates. Showing last known data.
          </Text>
          <TouchableOpacity style={styles.tryAgainButton} onPress={onRefresh}>
            <Text style={styles.tryAgainButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.tryAgainButton} onPress={loadReports}>
            <Text style={styles.tryAgainButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No reports yet. Go to the Report tab to submit your first report.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.id}
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
