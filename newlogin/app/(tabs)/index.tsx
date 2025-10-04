import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { CategorySelector, UploadingFile } from '../../components/ui';
import { useAlertActions } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';
import { LocationError, LocationService } from '../../services/locationService';
import { MediaService, MediaUploadResult } from '../../services/mediaService';
import { ReportService, ReportSubmissionResult } from '../../services/reportService';
import { useStyles } from '../../styles/tabs/index.styles';
import { Location, MainCategory, ReportCategory } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { reportFormSchema } from '../../utils/validation';

export default function ReportScreen() {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { user } = useAuth();
  const { isEmergency: isEmergencyParam } = useLocalSearchParams<{ isEmergency?: string }>();
  const {
    showLocationSuccess,
    showLocationError,
    showUploadLimitWarning,
    showUploadSuccess,
    showUploadError,  
    showValidationError,
    showSubmissionSuccess,
    showSubmissionError,
    showRemoveMediaConfirm,
  } = useAlertActions();
  const [mainCategory, setMainCategory] = useState<MainCategory | null>(null);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<LocationError | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaUploadResult[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isEmergency] = useState<boolean>(isEmergencyParam === 'false' ? false : true); // Default to emergency if not specified

  useEffect(() => {
    const validateForm = () => {
      if (!location) {
        setIsFormValid(false);
        return;
      }

      const result = reportFormSchema.safeParse({
        mainCategory,
        category,
        description,
        location,
        mediaUrls: mediaFiles.map((file) => file.url),
      });

      setIsFormValid(result.success);
    };

    validateForm();
  }, [mainCategory, category, description, location, mediaFiles]);

  useFocusEffect(
    useCallback(() => {
    const getInitialLocation = async () => {
      try {
        setLocationLoading(true);
        setLocationError(null);
        
        const result = await LocationService.getCurrentLocation({ 
          showUserGuidance: true,
          timeout: 20000,
        });
        
        if (result.location) {
          setLocation(result.location);
        } else {
          setLocationError(result.error || null);
        }
      } catch {
        setLocationError({
          code: 'UNAVAILABLE',
          message: 'Unexpected error',
          userMessage: 'Unable to get your current location.',
        });
      } finally {
        setLocationLoading(false);
      }
    };

      getInitialLocation();
    }, [])
  );



  const handleMainCategorySelect = (selectedCategory: MainCategory) => {
    setMainCategory(selectedCategory);
    // Reset subcategory when main category changes
    setCategory(null);
  };

  const handleSubcategorySelect = (selectedSubcategory: ReportCategory) => {
    setCategory(selectedSubcategory);
  };

  const handleDescriptionChange = (text: string) => {
    setDescription(text);
  };

  const handleAddMedia = async (type: 'image' | 'video', source: 'camera' | 'gallery') => {
    if (mediaFiles.length + uploadingFiles.length >= 5) {
      showUploadLimitWarning();
      setShowMediaOptions(false);
      return;
    }

    setShowMediaOptions(false);

    const uploadId = `upload-${Date.now()}`;

    try {
      const result = await MediaService.selectAndUploadMedia(
        type, 
        source,
        (progress) => {
          setUploadingFiles(prev => {
            const existing = prev.find(f => f.id === uploadId);
            if (existing) {
              return prev.map(f => f.id === uploadId ? { ...f, progress } : f);
            }
            return [...prev, { id: uploadId, name: 'Uploading...', progress }];
          });
        }
      );

      setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
      setMediaFiles(prev => [...prev, result]);
      showUploadSuccess(type === 'image' ? 'Photo' : 'Video');

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload media';
      showUploadError(errorMessage);
      setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
    }
  };

  const handleFileUpload = () => {
    setShowMediaOptions(true);
  };

  const handleRemoveMedia = (index: number) => {
    showRemoveMediaConfirm(() => {
      setMediaFiles(prev => prev.filter((_, i) => i !== index));
    });
  };

  const handleRemoveFile = (uri: string) => {
    const index = mediaFiles.findIndex(file => file.url === uri);
    if (index !== -1) {
      handleRemoveMedia(index);
    }
  };

  const handleSubmitReport = async () => {
    try {
      setLoading(true);

      if (!mainCategory) {
        showValidationError('Please select a main category first.');
        setLoading(false);
        return;
      }

      if (!category) {
        showValidationError('Please select a subcategory first.');
        setLoading(false);
        return;
      }

      if (!location) {
        showValidationError('Location not available. Please wait for location to be detected or retry.');
        setLoading(false);
        return;
      }

      // Clean location data to avoid Firebase undefined field errors
      const cleanLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        ...(location.accuracy && { accuracy: location.accuracy }),
        ...(location.address && {
          address: {
            ...(location.address.formattedAddress && { formattedAddress: location.address.formattedAddress }),
            ...(location.address.street && { street: location.address.street }),
            ...(location.address.district && { district: location.address.district }),
            ...(location.address.city && { city: location.address.city }),
            ...(location.address.region && { region: location.address.region }),
            ...(location.address.country && { country: location.address.country }),
            ...(location.address.postalCode && { postalCode: location.address.postalCode }),
          },
        }),
      };

      const formData = {
        mainCategory,
        category,
        description,
        location: cleanLocation,
        mediaUrls: mediaFiles.map(media => media.url),
        isEmergency,
      };

      try {
        reportFormSchema.parse(formData);
      } catch (validationError: unknown) {
        const errorMessage = (validationError as any).errors?.[0]?.message || 'Please check your input and try again.';
        showValidationError(errorMessage);
        setLoading(false);
        return;
      }

      const result: ReportSubmissionResult = await ReportService.submitReport(
        formData,
        user?.uid || null,
        user?.isAnonymous || false
      );

      if (result.success && result.reportId) {
        showSubmissionSuccess(result.reportId);
        
        // Reset form after successful submission
        setMainCategory(null);
        setCategory(null);
        setDescription('');
        setLocation(null);
        setLocationError(null);
        setMediaFiles([]);
      } else if (result.error) {
        showSubmissionError(result.error.userMessage);
      }
    } catch (error: unknown) {
      console.error('Unexpected submission error:', error);
      const errorMessage = 'An unexpected error occurred. Please try again later.';
      showSubmissionError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>
            Details of report
          </Text>
          
          {/* Auto-detected Location */}
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color={theme.colors.textSecondary} style={styles.locationIcon} />
            {locationLoading ? (
              <View style={styles.locationLoadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                <Text style={styles.locationLoadingText}>Getting location...</Text>
              </View>
            ) : location ? (
              <Text style={styles.locationText}>
                {location.address?.city && location.address?.region 
                  ? `${location.address.city}, ${location.address.region}`
                  : location.address?.formattedAddress || 
                    `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
              </Text>
            ) : locationError ? (
              <TouchableOpacity 
                onPress={() => {
                  setLocationError(null);
                  setLocationLoading(true);
                  // Re-trigger location fetch
                  LocationService.getCurrentLocation({ 
                    showUserGuidance: true,
                    timeout: 20000,
                  }).then(result => {
                    if (result.location) {
                      setLocation(result.location);
                    } else {
                      setLocationError(result.error || null);
                    }
                    setLocationLoading(false);
                  }).catch(() => {
                    setLocationError({
                      code: 'UNAVAILABLE',
                      message: 'Unexpected error',
                      userMessage: 'Unable to get your current location.',
                    });
                    setLocationLoading(false);
                  });
                }}
              >
                <Text style={styles.locationRetryText}>
                  Tap to retry location
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.locationText}>Location unavailable</Text>
            )}
          </View>
        </View>

        {/* New CategorySelector Component */}
        <CategorySelector
          selectedMainCategory={mainCategory || undefined}
          selectedSubcategory={category || undefined}
          onMainCategorySelect={handleMainCategorySelect}
          onSubcategorySelect={handleSubcategorySelect}
          description={description}
          onDescriptionChange={handleDescriptionChange}
          onFileUpload={handleFileUpload}
          onRemoveFile={handleRemoveFile}
          onSubmit={handleSubmitReport}
          uploadedFiles={mediaFiles}
          uploadingFiles={uploadingFiles}
          isSubmitting={loading}
          isFormValid={isFormValid}
        />

        {/* Emergency Hotline */}
        <View style={styles.hotlineContainer}>
          <Text style={styles.hotlineText}>
            Emergency Hotline: 911
          </Text>
        </View>

        <Modal
          visible={showMediaOptions}
          transparent
          animationType="slide"
          onRequestClose={() => setShowMediaOptions(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Add Media
              </Text>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleAddMedia('image', 'camera')}
              >
                <Text style={styles.modalButtonText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleAddMedia('image', 'gallery')}
              >
                <Text style={styles.modalButtonText}>Choose Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleAddMedia('video', 'camera')}
              >
                <Text style={styles.modalButtonText}>Record Video</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { marginBottom: 20 }]}
                onPress={() => handleAddMedia('video', 'gallery')}
              >
                <Text style={styles.modalButtonText}>Choose Video</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowMediaOptions(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

