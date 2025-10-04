import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Divider, Icon, MediaSlider, ReportTimeline } from '../components/ui';
import { REPORT_STATUS_LABELS } from '../constants/categories';
import { useTheme } from '../contexts/ThemeContext';
import { ReportService } from '../services/reportService';
import { getStatusColor, useStyles } from '../styles/report-detail.styles';
import { Report, ReportCategory } from '../types';
import { findCategoryDetails } from '../utils/categoryUtils';

export default function ReportDetailScreen() {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      if (!reportId) {
        setError('Report ID is missing.');
        setIsLoading(false);
        return;
      }

      try {
        const fetchedReport = await ReportService.getReportById(reportId);
        if (fetchedReport) {
          setReport(fetchedReport);
        } else {
          setError('Report not found.');
        }
      } catch (err) {
        console.error('Error fetching report details:', err);
        setError('Failed to load report details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchReport();
  }, [reportId]);

  const renderCategoryIcon = (category: ReportCategory) => {
    const { main: mainCategory } = findCategoryDetails(category);
    if (!mainCategory?.icon) {
      return <Text style={styles.categoryIcon}>📝</Text>;
    }
    if (typeof mainCategory.icon === 'number') {
      return <Image source={mainCategory.icon} style={styles.categoryImage} />;
    }
    if (typeof mainCategory.icon === 'string') {
      return <Icon name={mainCategory.icon as any} style={styles.categoryIcon} size="lg" />;
    }
    return <Text style={styles.categoryIcon}>📝</Text>;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading Report...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonOnError}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>Report data is unavailable.</Text>
      </View>
    );
  }

  const { main: mainCategory, sub: subCategory } = findCategoryDetails(
    report.category as ReportCategory
  );
  const statusLabel = REPORT_STATUS_LABELS[report.status as keyof typeof REPORT_STATUS_LABELS];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} style={styles.backButtonIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {report.media_urls && report.media_urls.length > 0 && (
          <MediaSlider mediaUrls={report.media_urls} />
        )}

        <View style={styles.detailsContainer}>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              {renderCategoryIcon(report.category as ReportCategory)}
              <View style={styles.categoryTextContainer}>
                <Text style={styles.categoryLabel}>
                  {`${mainCategory?.label || 'Category'} - ${subCategory?.label || 'Details'}`}
                </Text>
              </View>
            </View>

            <View style={styles.internalDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={[styles.detailValue, getStatusColor(report.status, theme)]}>
                {statusLabel}
              </Text>
            </View>

            <View style={styles.internalDivider} />

            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Description:</Text>
              <Text style={styles.descriptionText}>{report.description}</Text>
            </View>

            {report.location && (
              <>
                <View style={styles.internalDivider} />
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.locationText}>
                    {report.location.address?.formattedAddress ||
                      `${report.location.latitude.toFixed(6)}, ${report.location.longitude.toFixed(6)}`}
                  </Text>
                </View>
              </>
            )}

            <View style={styles.internalDivider} />

            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Additional Information:</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Report ID</Text>
                <Text style={styles.infoValue}>{report.id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Submitted</Text>
                <Text style={styles.infoValue}>{formatDate(report.timestamp)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Updated</Text>
                <Text style={styles.infoValue}>{formatDate(report.updatedAt)}</Text>
              </View>
            </View>
          </View>

          <Divider title="Progress Timeline" />
          <ReportTimeline status={report.status} timestamp={report.timestamp} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

