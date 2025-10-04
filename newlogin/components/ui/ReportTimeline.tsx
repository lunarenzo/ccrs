import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReportStatus } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useStyles } from './ReportTimeline.styles';
import { GenericTheme } from '../../constants/theme';

interface TimelineStep {
  status: ReportStatus;
  label: string;
  description: string;
  icon: string;
  color: (theme: GenericTheme) => string;
}

interface ReportTimelineProps {
  status: ReportStatus;
  timestamp: Date;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    status: 'pending',
    label: 'Report Submitted',
    description: 'Your report has been received and is awaiting review.',
    icon: 'document-text',
    color: (theme) => theme.colors.warning,
  },
  {
    status: 'validated',
    label: 'Report Validated',
    description: 'Report has been reviewed and validated by authorities.',
    icon: 'checkmark-circle',
    color: (theme) => theme.colors.info,
  },
  {
    status: 'responding',
    label: 'Under Investigation',
    description: 'Authorities are actively investigating this report.',
    icon: 'search',
    color: (theme) => theme.colors.secondary,
  },
  {
    status: 'resolved',
    label: 'Case Resolved',
    description: 'The case has been resolved successfully.',
    icon: 'shield-checkmark',
    color: (theme) => theme.colors.success,
  },
];

export default function ReportTimeline({ status, timestamp }: ReportTimelineProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const getCurrentStepIndex = () => {
    return TIMELINE_STEPS.findIndex(step => step.status === status);
  };

  const currentStepIndex = getCurrentStepIndex();

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  // Handle rejected status separately
  if (status === 'rejected') {
    return (
      <View style={styles.container}>
        <View style={styles.timelineItem}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.danger }]}>
              <Ionicons name="close-circle" size={20} color="white" />
            </View>
          </View>
          <View style={styles.contentContainer}>
            <Text style={styles.stepLabel}>Report Rejected</Text>
            <Text style={styles.stepDescription}>
              This report was rejected after review. Please contact support if you believe this was an error.
            </Text>
            <Text style={styles.timeText}>{formatTimeAgo(timestamp)}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {TIMELINE_STEPS.map((step, index) => {
        const isCompleted = index <= currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isLast = index === TIMELINE_STEPS.length - 1;

        return (
          <View key={step.status} style={styles.timelineItem}>
            <View style={styles.iconContainer}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isCompleted ? step.color(theme) : theme.colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={step.icon as any}
                  size={20}
                  color={isCompleted ? theme.colors.white : theme.colors.textSecondary}
                />
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.connector,
                    {
                      backgroundColor: isCompleted ? step.color(theme) : theme.colors.border,
                    },
                  ]}
                />
              )}
            </View>
            <View style={styles.contentContainer}>
              <Text
                style={[
                  styles.stepLabel,
                  isCompleted ? styles.completedLabel : styles.incompleteLabel,
                  isCurrent && styles.currentLabel,
                ]}
              >
                {step.label}
              </Text>
              <Text
                style={[
                  styles.stepDescription,
                  isCompleted ? styles.completedDescription : styles.incompleteDescription,
                ]}
              >
                {step.description}
              </Text>
              {isCurrent && (
                <Text style={styles.timeText}>{formatTimeAgo(timestamp)}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

