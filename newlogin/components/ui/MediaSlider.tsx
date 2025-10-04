import React, { useState, useMemo } from 'react';
import {
  View,
  Image,
  ScrollView,
  Dimensions,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const MEDIA_HEIGHT = 300;

interface MediaSliderProps {
  mediaUrls: string[];
}

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  player?: ReturnType<typeof useVideoPlayer>;
}

export default function MediaSlider({ mediaUrls }: MediaSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!mediaUrls || mediaUrls.length === 0) {
    return (
      <View style={styles.noMediaContainer}>
        <Ionicons name="image-outline" size={48} color="#ccc" />
        <Text style={styles.noMediaText}>No media attached</Text>
      </View>
    );
  }

  // Determine media type based on file extension
  const getMediaType = (url: string): 'image' | 'video' => {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    
    const lowerUrl = url.toLowerCase();
    
    if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
      return 'video';
    }
    if (imageExtensions.some(ext => lowerUrl.includes(ext))) {
      return 'image';
    }
    
    // Default to image if we can't determine
    return 'image';
  };

  // Create media items and separate video URLs
  const mediaItems: MediaItem[] = useMemo(() => {
    return mediaUrls.map(url => ({
      url,
      type: getMediaType(url)
    }));
  }, [mediaUrls]);

  // Create video players for all video URLs at the top level
  const videoUrls = mediaItems.filter(item => item.type === 'video').map(item => item.url);
  const videoPlayers = videoUrls.map(url => 
    useVideoPlayer(url, player => {
      player.loop = false;
    })
  );

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentIndex(index);
  };

  const renderMediaItem = (item: MediaItem, index: number) => {
    if (item.type === 'video') {
      // Find the corresponding video player
      const videoIndex = videoUrls.indexOf(item.url);
      const player = videoPlayers[videoIndex];

      return (
        <View key={index} style={styles.mediaContainer}>
          <VideoView
            style={styles.video}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
            nativeControls
            contentFit="contain"
          />
        </View>
      );
    } else {
      return (
        <View key={index} style={styles.mediaContainer}>
          <Image
            source={{ uri: item.url }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {mediaItems.map((item, index) => renderMediaItem(item, index))}
      </ScrollView>

      {/* Media Counter with Type Indicator */}
      {mediaItems.length > 1 && (
        <View style={styles.counterContainer}>
          <View style={styles.counterContent}>
            <Ionicons 
              name={mediaItems[currentIndex].type === 'video' ? 'videocam' : 'image'} 
              size={16} 
              color="white" 
            />
            <Text style={styles.counterText}>
              {currentIndex + 1} / {mediaItems.length}
            </Text>
          </View>
        </View>
      )}

      {/* Single item type indicator */}
      {mediaItems.length === 1 && mediaItems[0].type === 'video' && (
        <View style={styles.typeIndicator}>
          <Ionicons name="videocam" size={16} color="white" />
        </View>
      )}

      {/* Dots Indicator */}
      {mediaItems.length > 1 && (
        <View style={styles.dotsContainer}>
          {mediaItems.map((item, index) => (
            <View key={index} style={styles.dotWrapper}>
              <View
                style={[
                  styles.dot,
                  index === currentIndex ? styles.activeDot : styles.inactiveDot,
                ]}
              />
              {item.type === 'video' && (
                <Ionicons 
                  name="videocam" 
                  size={8} 
                  color={index === currentIndex ? "white" : "rgba(255, 255, 255, 0.5)"} 
                  style={styles.dotIcon}
                />
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  scrollView: {
    height: MEDIA_HEIGHT,
  },
  mediaContainer: {
    width,
    height: MEDIA_HEIGHT,
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  noMediaContainer: {
    width,
    height: MEDIA_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  noMediaText: {
    marginTop: 8,
    fontSize: 16,
    color: '#999',
  },
  counterContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  typeIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  dotWrapper: {
    position: 'relative',
    marginHorizontal: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    backgroundColor: 'white',
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotIcon: {
    position: 'absolute',
    top: -2,
    left: -2,
  },
});
