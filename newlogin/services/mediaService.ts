import * as ImagePicker from 'expo-image-picker';
import { CLOUDINARY_CONFIG, getUploadUrl } from '../config/cloudinary';

export interface MediaUploadResult {
  url: string;
  publicId: string;
  type: 'image' | 'video';
  size: number;
  fileName?: string;
}

export interface MediaUploadError {
  code: string;
  message: string;
}

export class MediaService {
  private static readonly MAX_IMAGE_SIZE = CLOUDINARY_CONFIG.MAX_IMAGE_SIZE;
  private static readonly MAX_VIDEO_SIZE = CLOUDINARY_CONFIG.MAX_VIDEO_SIZE;
  private static readonly MAX_VIDEO_DURATION = CLOUDINARY_CONFIG.MAX_VIDEO_DURATION;

  /**
   * Request camera and media library permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      return cameraPermission.status === 'granted' && mediaLibraryPermission.status === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Pick image from camera or gallery
   */
  static async pickImage(source: 'camera' | 'gallery' = 'gallery'): Promise<ImagePicker.ImagePickerResult> {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    };

    if (source === 'camera') {
      return await ImagePicker.launchCameraAsync(options);
    } else {
      return await ImagePicker.launchImageLibraryAsync(options);
    }
  }

  /**
   * Pick video from camera or gallery
   */
  static async pickVideo(source: 'camera' | 'gallery' = 'gallery'): Promise<ImagePicker.ImagePickerResult> {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['videos'],
      allowsEditing: true,
      videoMaxDuration: this.MAX_VIDEO_DURATION,
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    };

    if (source === 'camera') {
      return await ImagePicker.launchCameraAsync(options);
    } else {
      return await ImagePicker.launchImageLibraryAsync(options);
    }
  }

  /**
   * Validate file size based on media type
   */
  static validateFileSize(uri: string, type: 'image' | 'video', fileSize?: number): { isValid: boolean; error?: string } {
    if (!fileSize) {
      return { isValid: true }; // Skip validation if size is not available
    }

    const maxSize = type === 'image' ? this.MAX_IMAGE_SIZE : this.MAX_VIDEO_SIZE;
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));

    if (fileSize > maxSize) {
      return {
        isValid: false,
        error: `${type === 'image' ? 'Image' : 'Video'} size exceeds ${maxSizeMB}MB limit`
      };
    }

    return { isValid: true };
  }

  /**
   * Upload media to Cloudinary
   */
  static async uploadToCloudinary(
    uri: string, 
    type: 'image' | 'video', 
    onProgress?: (progress: number) => void
  ): Promise<MediaUploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append('file', {
        uri,
        type: type === 'image' ? 'image/jpeg' : 'video/mp4',
        name: `${type}_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
      } as any);

      formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);
      formData.append('resource_type', type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          if (onProgress) {
            onProgress(progress);
          }
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            const result = JSON.parse(xhr.responseText);
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              type,
              size: result.bytes,
            });
          } else {
            console.error('Cloudinary upload error:', xhr.responseText);
            reject(new Error(`Failed to upload ${type}: ${xhr.responseText || 'Unknown error'}`));
          }
        }
      };
      
      xhr.onerror = () => {
        console.error('Cloudinary upload error:', xhr.responseText);
        reject(new Error(`Failed to upload ${type}: Network error`));
      };

      xhr.open('POST', getUploadUrl(type));
      xhr.send(formData);
    });
  }

  /**
   * Complete media selection and upload process
   */
  static async selectAndUploadMedia(
    mediaType: 'image' | 'video',
    source: 'camera' | 'gallery' = 'gallery',
    onProgress?: (progress: number) => void
  ): Promise<MediaUploadResult> {
    try {
      // Request permissions
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Camera and media library permissions are required');
      }

      // Pick media
      let result: ImagePicker.ImagePickerResult;
      if (mediaType === 'image') {
        result = await this.pickImage(source);
      } else {
        result = await this.pickVideo(source);
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        throw new Error('Media selection was cancelled');
      }

      const asset = result.assets[0];

      // Validate file size
      const validation = this.validateFileSize(asset.uri, mediaType, asset.fileSize);
      if (!validation.isValid) {
        throw new Error(validation.error || 'File validation failed');
      }

      // Upload to Cloudinary
      const uploadResult = await this.uploadToCloudinary(asset.uri, mediaType, onProgress);
      
      // Add original filename if available
      return {
        ...uploadResult,
        fileName: asset.fileName || `${mediaType}_${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`
      };
    } catch (error) {
      console.error('Media selection and upload error:', error);
      throw error;
    }
  }

  /**
   * Delete media from Cloudinary (optional cleanup)
   */
  static async deleteFromCloudinary(publicId: string, type: 'image' | 'video'): Promise<boolean> {
    try {
      // Note: This requires server-side implementation or signed requests
      // For now, we'll just return true as deletion is typically handled server-side
      console.log(`Would delete ${type} with publicId: ${publicId}`);
      return true;
    } catch (error) {
      console.error('Error deleting media:', error);
      return false;
    }
  }
}
