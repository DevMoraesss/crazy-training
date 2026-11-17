import { MAX_WORKOUT_PDF_BYTES, programSchema, workoutPdfRequestSchema } from '@crazy-training/shared';
import { getDocumentAsync } from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { runJob } from './api';

/** Abre o seletor de arquivos e lê o PDF da ficha em base64. null quando a pessoa cancela. */
export async function pickWorkoutPdf() {
  const result = await getDocumentAsync({
    type: ['application/pdf', 'com.adobe.pdf'],
    multiple: false,
    copyToCacheDirectory: true,
    base64: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset || !asset.size || asset.size > MAX_WORKOUT_PDF_BYTES)
    throw new Error('Selecione a ficha em PDF, com até 3 MB.');
  let base64: string;
  if (Platform.OS === 'web') {
    try {
      if (!asset.file) throw new Error('Não foi possível ler o PDF.');
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(new Error('Não foi possível ler o PDF.'));
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
  return workoutPdfRequestSchema.parse({ fileName: asset.name, pdfBase64: base64 });
}

/** Envia a ficha ao servidor, que lê com IA em segundo plano, e devolve o programa para revisão. */
export async function importWorkoutPdf(pdf: { fileName: string; pdfBase64: string }) {
  return programSchema.parse(await runJob('/workouts/import', pdf));
}
