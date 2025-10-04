import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { citizenRealtimeNotificationService, CitizenRealtimeNotification } from '../../services/realtimeNotificationService';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<CitizenRealtimeNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const userNotifications = await citizenRealtimeNotificationService.getNotifications(user.uid);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('[NotificationsScreen] Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const handleNotificationPress = async (notification: CitizenRealtimeNotification) => {
    if (!user?.uid) return;

    // Mark as seen if not already
    if (!notification.seen) {
      try {
        await citizenRealtimeNotificationService.markAsSeen(user.uid, notification.id);
        
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, seen: true } : n)
        );
      } catch (error) {
        console.error('[NotificationsScreen] Error marking notification as seen:', error);
      }
    }

    // Show notification details
    Alert.alert(
      notification.title,
      notification.body,
      [
        {
          text: 'OK',
          style: 'default',
        }
      ]
    );
  };

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'report_update':
        return 'document-text';
      case 'message':
        return 'chatbubble';
      case 'resolution':
        return 'checkmark-circle';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'report_update':
        return theme.colors.primary;
      case 'message':
        return theme.colors.warning;
      case 'resolution':
        return theme.colors.success;
      default:
        return theme.colors.text;
    }
  };

  const formatTimestamp = (timestamp: any) => {
    let date: Date;
    
    if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (timestamp && timestamp.seconds) {
      // Firebase serverTimestamp format
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date();
    }
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const unreadCount = notifications.filter(n => !n.seen).length;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.colors.danger }]}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons 
              name="notifications-outline" 
              size={64} 
              color={theme.colors.textSecondary} 
            />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No notifications yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              You'll receive updates about your reports here
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                { 
                  backgroundColor: notification.seen ? theme.colors.background : theme.colors.cardBackground,
                  borderBottomColor: theme.colors.border 
                }
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Ionicons
                    name={getNotificationIcon(notification.type)}
                    size={20}
                    color={getNotificationColor(notification.type)}
                    style={styles.notificationIcon}
                  />
                  <Text style={[styles.notificationTitle, { color: theme.colors.text }]}>
                    {notification.title}
                  </Text>
                  {!notification.seen && (
                    <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
                  )}
                </View>
                <Text style={[styles.notificationBody, { color: theme.colors.textSecondary }]}>
                  {notification.body}
                </Text>
                <Text style={[styles.notificationTime, { color: theme.colors.textSecondary }]}>
                  {formatTimestamp(notification.timestamp)}
                </Text>
                {notification.data?.reportId && (
                  <Text style={[styles.reportId, { color: theme.colors.primary }]}>
                    Report: {notification.data.reportId}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  notificationItem: {
    borderBottomWidth: 1,
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  notificationBody: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    marginBottom: 4,
  },
  reportId: {
    fontSize: 12,
    fontWeight: '500',
  },
});