import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MediaUploadResult } from '../../services/mediaService';
import { ProgressBar } from './ProgressBar';
import { useStyles } from './FileUpload.styles';
import { useTheme } from '../../contexts/ThemeContext';

export interface UploadingFile {
  id: string;
  name: string;
  progress: number;
}

interface FileUploadProps {
  onFileUpload: () => void;
  onRemoveFile: (uri: string) => void;
  uploadedFiles: MediaUploadResult[];
  uploadingFiles?: UploadingFile[];
  isLoading?: boolean;
}

export function FileUpload({ 
  onFileUpload, 
  onRemoveFile, 
  uploadedFiles, 
  uploadingFiles = [],
  isLoading 
}: FileUploadProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const isAtLimit = uploadedFiles.length >= 5;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload an evidence</Text>
      
      <View style={styles.uploadSection}>
        <View style={styles.uploadButtonContainer}>
          <TouchableOpacity
            style={[
              styles.uploadButton,
              isLoading && styles.uploadButtonLoading,
              isAtLimit && styles.uploadButtonDisabled
            ]}
            onPress={onFileUpload}
            disabled={isLoading || isAtLimit}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Ionicons name="camera" size={24} color={theme.colors.white} />
            )}
          </TouchableOpacity>
        </View>
        
        <Text style={styles.uploadText}>
          {isLoading ? 'Uploading...' : isAtLimit ? 'Upload Limit Reached' : 'Upload File/s'}
        </Text>
        <Text style={styles.helperText}>
          {isLoading 
            ? 'Please wait while we process your file' 
            : isAtLimit 
            ? `Maximum of 5 files reached (${uploadedFiles.length}/5)`
            : `Click to upload photos (${uploadedFiles.length}/5 files)`
          }
        </Text>
        
        {(uploadedFiles.length > 0 || uploadingFiles.length > 0) && (
          <View style={styles.uploadedFilesContainer}>
            <Text style={styles.uploadedFilesTitle}>
              {uploadedFiles.length + uploadingFiles.length} file(s) selected
            </Text>
            {uploadingFiles.map((file) => (
              <View key={file.id} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Ionicons name="document-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.name}
                  </Text>
                </View>
                <ProgressBar progress={file.progress} style={{ flex: 1, marginLeft: 8 }} />
              </View>
            ))}
            {uploadedFiles.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Ionicons 
                    name={file.type === 'video' ? 'videocam' : 'image'} 
                    size={16} 
                    color={theme.colors.primary} 
                  />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.fileName || `${file.type}_${index + 1}.${file.type === 'image' ? 'jpg' : 'mp4'}`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemoveFile(file.url)}
                >
                  <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
