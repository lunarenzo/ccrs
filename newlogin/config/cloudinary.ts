// Cloudinary configuration
// Replace these values with your actual Cloudinary credentials

export const CLOUDINARY_CONFIG = {
  // Your Cloudinary cloud name - get this from your Cloudinary dashboard
  CLOUD_NAME: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
  
  // Your unsigned upload preset - create this in your Cloudinary settings
  UPLOAD_PRESET: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'your-upload-preset',
  
  // API Base URL
  API_BASE_URL: 'https://api.cloudinary.com/v1_1',
  
  // File size limits
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_VIDEO_DURATION: 30, // 30 seconds
  
  // Supported formats
  SUPPORTED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  SUPPORTED_VIDEO_FORMATS: ['mp4', 'mov', 'avi', 'webm'],
};

// Helper function to get upload URL
export const getUploadUrl = (resourceType: 'image' | 'video' = 'image') => {
  return `${CLOUDINARY_CONFIG.API_BASE_URL}/${CLOUDINARY_CONFIG.CLOUD_NAME}/${resourceType}/upload`;
};

// Helper function to get optimized image URL
export const getOptimizedImageUrl = (publicId: string, options?: {
  width?: number;
  height?: number;
  quality?: 'auto' | number;
  format?: 'auto' | string;
}) => {
  const { width, height, quality = 'auto', format = 'auto' } = options || {};
  
  let transformations = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);
  
  const transformString = transformations.length > 0 ? `${transformations.join(',')}/` : '';
  
  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload/${transformString}${publicId}`;
};

// Helper function to get video thumbnail URL
export const getVideoThumbnailUrl = (publicId: string, options?: {
  width?: number;
  height?: number;
  quality?: 'auto' | number;
}) => {
  const { width = 200, height = 150, quality = 'auto' } = options || {};
  
  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.CLOUD_NAME}/video/upload/w_${width},h_${height},c_fill,q_${quality},f_jpg/${publicId}.jpg`;
};
