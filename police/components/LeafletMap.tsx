import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  onMapReady?: () => void;
}

export function LeafletMap({ latitude, longitude, address, onMapReady }: LeafletMapProps) {
  const { width, height } = Dimensions.get('window');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Incident Location</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
            body { margin: 0; padding: 0; }
            #map { height: 100vh; width: 100vw; }
            .custom-popup {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .popup-title {
                font-weight: 600;
                color: #1F2937;
                margin-bottom: 4px;
            }
            .popup-address {
                color: #6B7280;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
            // Initialize the map
            const map = L.map('map').setView([${latitude}, ${longitude}], 16);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);
            
            // Custom icon for incident marker
            const incidentIcon = L.divIcon({
                html: '<div style="background-color: #DC2626; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [26, 26],
                iconAnchor: [13, 13],
                className: 'custom-incident-marker'
            });
            
            // Add marker for incident location
            const marker = L.marker([${latitude}, ${longitude}], { icon: incidentIcon })
                .addTo(map);
            
            // Add popup with incident information
            const popupContent = \`
                <div class="custom-popup">
                    <div class="popup-title">Incident Location</div>
                    <div class="popup-address">${address || 'Location coordinates: ' + latitude + ', ' + longitude}</div>
                </div>
            \`;
            
            marker.bindPopup(popupContent).openPopup();
            
            // Notify React Native that map is ready
            setTimeout(() => {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'MAP_READY',
                        latitude: ${latitude},
                        longitude: ${longitude}
                    }));
                }
            }, 1000);
            
            // Handle map events
            map.on('click', function(e) {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'MAP_CLICK',
                        latitude: e.latlng.lat,
                        longitude: e.latlng.lng
                    }));
                }
            });
        </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY' && onMapReady) {
        onMapReady();
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={[styles.webview, { width, height: height * 0.4 }]}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
  webview: {
    backgroundColor: 'transparent',
  },
});
