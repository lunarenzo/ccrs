import React, { useEffect } from 'react';
import { Stack } from "expo-router";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { emitNotificationRoute } from '../services/notificationBus';
import * as Notifications from 'expo-notifications';

export default function RootLayout() {
  useEffect(() => {
    // Ensure Android notification channels exist before any push arrives
    // This prevents Android from dropping notifications that reference a missing channelId
    notificationService.configureNotificationChannels().catch((e) => {
      console.warn('[notifications] Failed to configure channels', e);
    });

    // Configure notification channels on app start
    (async () => {
      try {
        await Notifications.getNotificationChannelsAsync();
      } catch (e) {
        console.warn('[notifications] channel setup failed:', e);
      }
    })();

    // Set up notification handlers
    const notificationListener = notificationService.addNotificationReceivedListener(
      (notification) => {
        // Handle foreground notifications
      }
    );

    const responseListener = notificationService.addNotificationResponseListener(
      (response) => {
        const data = response.notification.request.content.data;
        
        // Handle notification tap - navigate to relevant screen
        if (data.type === 'assignment' && data.reportId) {
          // Emit a route event; listeners decide how to present
          emitNotificationRoute({ type: 'assignment', reportId: String(data.reportId) });
        }
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
