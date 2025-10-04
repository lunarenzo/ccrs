import * as Location from 'expo-location';
import { Location as LocationType, DetailedAddress } from '../types';
// Removed Alert import - using custom alert system now

export interface LocationError {
  code: 'PERMISSION_DENIED' | 'LOCATION_DISABLED' | 'TIMEOUT' | 'UNAVAILABLE' | 'NETWORK_ERROR';
  message: string;
  userMessage: string;
}

export class LocationService {

  static async getCurrentLocation(options?: {
    showUserGuidance?: boolean;
    timeout?: number;
  }): Promise<{ location: LocationType | null; error?: LocationError }> {
    const { showUserGuidance = true, timeout = 15000 } = options || {};
    
    try {
      // Step 1: Request permissions from the user.
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return {
          location: null,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Location permission denied',
            userMessage: 'Location access is required. Please enable it in your device settings.',
          },
        };
      }

      // Step 2: Check if location services are enabled on the device.
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        return {
          location: null,
          error: {
            code: 'LOCATION_DISABLED',
            message: 'Location services are disabled',
            userMessage: 'Please enable location services (GPS) on your device.',
          },
        };
      }

      // Step 3: Get current position with timeout.
      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Location timeout')), timeout)
        ),
      ]);

      const { latitude, longitude } = location.coords;
      
      // Get address from coordinates (non-blocking)
      const address = await this.getAddressFromCoordinates(latitude, longitude);

      return {
        location: {
          latitude,
          longitude,
          address,
          accuracy: location.coords.accuracy || undefined
        }
      };
    } catch (error: any) {
      console.error('Error getting current location:', error);
      
      let locationError: LocationError;
      
      if (error.message === 'Location timeout') {
        locationError = {
          code: 'TIMEOUT',
          message: 'Location request timed out',
          userMessage: 'Unable to get your location. Please make sure you have a clear view of the sky and try again.'
        };
      } else if (error.message.includes('Network')) {
        locationError = {
          code: 'NETWORK_ERROR',
          message: 'Network error while getting location',
          userMessage: 'Network error. Please check your internet connection and try again.'
        };
      } else {
        locationError = {
          code: 'UNAVAILABLE',
          message: 'Unable to get current location',
          userMessage: 'Unable to get your current location. Please try again or enter your location manually.'
        };
      }

      // Note: showUserGuidance alerts are now handled by the calling component
      
      return { location: null, error: locationError };
    }
  }

  static async getAddressFromCoordinates(
    latitude: number, 
    longitude: number
  ): Promise<DetailedAddress | undefined> {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        
        // Build street address from streetNumber and street
        const streetParts = [address.streetNumber, address.street].filter(Boolean);
        const street = streetParts.length > 0 ? streetParts.join(' ') : undefined;
        
        // Create formatted address for display
        const addressParts = [
          street,
          address.district,
          address.city,
          address.region
        ].filter(Boolean);
        
        const detailedAddress: DetailedAddress = {
          street,
          district: address.district || undefined,
          city: address.city || undefined,
          region: address.region || undefined,
          postalCode: address.postalCode || undefined,
          country: address.country || undefined,
          formattedAddress: addressParts.length > 0 ? addressParts.join(', ') : undefined
        };

        return detailedAddress;
      }
      return undefined;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return undefined;
    }
  }

  static formatLocationDisplay(location: LocationType): string {
    if (location.address?.formattedAddress) {
      return location.address.formattedAddress;
    }
    if (location.address) {
      // Build display from address components
      const parts = [
        location.address.street,
        location.address.district,
        location.address.city,
        location.address.region
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }

  static getDetailedLocationDisplay(location: LocationType): DetailedAddress | null {
    return location.address || null;
  }

  static getLocationAccuracyText(accuracy?: number): string {
    if (!accuracy) return 'Unknown accuracy';
    
    if (accuracy <= 5) return 'Very accurate';
    if (accuracy <= 20) return 'Accurate';
    if (accuracy <= 100) return 'Moderately accurate';
    return 'Low accuracy';
  }

  static async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  static showLocationSettingsGuidance(): void {
    // Note: Location settings guidance is now handled by the calling component
    // This method is kept for backward compatibility but no longer shows alerts
  }
}
