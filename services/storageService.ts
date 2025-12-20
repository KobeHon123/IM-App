import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/config/firebase';

export class StorageService {
  // Upload a file to Firebase Storage
  static async uploadFile(file: File, path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Upload multiple files
  static async uploadFiles(files: File[], basePath: string): Promise<string[]> {
    try {
      const uploadPromises = files.map((file, index) => {
        const fileName = `${Date.now()}_${index}_${file.name}`;
        const filePath = `${basePath}/${fileName}`;
        return this.uploadFile(file, filePath);
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  }

  // Delete a file from Firebase Storage
  static async deleteFile(url: string): Promise<void> {
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Generate file paths
  static generatePartFilePath(projectId: string, partId: string, fileName: string): string {
    return `projects/${projectId}/parts/${partId}/${fileName}`;
  }

  static generateVenuePhotoPath(projectId: string, venueId: string, fileName: string): string {
    return `projects/${projectId}/venues/${venueId}/${fileName}`;
  }

  static generateLibraryFilePath(partId: string, fileName: string): string {
    return `library/parts/${partId}/${fileName}`;
  }
}