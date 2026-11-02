import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { encode } from 'base64-arraybuffer';

/**
 * Hands the STL to the user: the browser download on web, the native share / save sheet on iOS and Android.
 * Throws a readable Error when it cannot.
 */
export async function saveStl(fileName: string, bytes: Uint8Array): Promise<void> {
  if (Platform.OS === 'web') {
    const copy = new Uint8Array(bytes);
    const blob = new Blob([copy.buffer], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('No writable folder is available.');

  const path = `${directory}${fileName}`;
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  await FileSystem.writeAsStringAsync(path, encode(buffer), { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(path, {
    mimeType: 'model/stl',
    dialogTitle: 'Save STL',
    UTI: 'public.3d-content',
  });
}
