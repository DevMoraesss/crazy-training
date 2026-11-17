import { MAX_FOOD_IMAGE_BYTES, foodImageSchema } from '@crazy-training/shared';
import { getDocumentAsync } from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

export async function pickFoodImage() {
  const result = await getDocumentAsync({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    multiple: false,
    copyToCacheDirectory: true,
    base64: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset || !asset.size || asset.size > MAX_FOOD_IMAGE_BYTES)
    throw new Error('Selecione uma imagem JPEG, PNG ou WebP de até 2 MB.');
  let base64: string;
  if (Platform.OS === 'web') {
    try {
      if (!asset.file) throw new Error('Não foi possível ler a imagem.');
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
        reader.readAsDataURL(asset.file!);
      });
    } finally {
      if (asset.uri.startsWith('blob:')) URL.revokeObjectURL(asset.uri);
    }
  } else {
    const file = new File(asset.uri);
    try {
      base64 = await file.base64();
    } finally {
      if (file.exists) file.delete();
    }
  }
  return foodImageSchema.parse({ mimeType: asset.mimeType, base64 });
}
