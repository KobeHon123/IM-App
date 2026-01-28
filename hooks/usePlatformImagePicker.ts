import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface ImagePickerOptions {
  mediaTypes?: 'Images' | 'Videos' | 'All';
  allowsMultipleSelection?: boolean;
  quality?: number;
  aspect?: [number, number];
  allowsEditing?: boolean;
}

export interface ImagePickerResult {
  uri: string;
  type?: string;
  size?: number;
  name?: string;
}

/**
 * Cross-platform hook for image picking
 * On mobile: Uses expo-image-picker
 * On web: Uses HTML file input
 */
export const usePlatformImagePicker = () => {
  const requestPermissionsAsync = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      // Web doesn't need permissions
      return true;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  const launchImageLibraryAsync = async (
    options?: ImagePickerOptions
  ): Promise<ImagePickerResult | null> => {
    if (Platform.OS === 'web') {
      // Web implementation using file input
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = options?.allowsMultipleSelection ?? false;

        input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (!file) {
            resolve(null);
            return;
          }

          const reader = new FileReader();
          reader.onload = (event: any) => {
            resolve({
              uri: event.target.result as string,
              type: file.type,
              size: file.size,
              name: file.name,
            });
          };
          reader.readAsDataURL(file);
        };

        input.click();
      });
    }

    // Mobile implementation
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          options?.mediaTypes === 'Videos'
            ? ImagePicker.MediaTypeOptions.Videos
            : options?.mediaTypes === 'All'
              ? ImagePicker.MediaTypeOptions.All
              : ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: options?.allowsMultipleSelection ?? false,
        quality: options?.quality ?? 1,
        aspect: options?.aspect,
        allowsEditing: options?.allowsEditing ?? false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          type: asset.type,
          size: asset.fileSize,
          name: asset.fileName,
        };
      }

      return null;
    } catch (error) {
      console.error('Error launching image picker:', error);
      return null;
    }
  };

  return {
    requestPermissionsAsync,
    launchImageLibraryAsync,
  };
};
