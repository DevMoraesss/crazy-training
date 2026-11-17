import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/** Um link do PDF e o texto da mesma linha (normalmente o nome do exercício). */
export type PdfLink = { page: number; url: string; text: string };

type Text = { str: string; x: number; y: number; height: number };

/**
 * Lê os links de vídeo do PDF e o texto que está na mesma altura de cada link. As fichas
 * costumam ter um botão de play na frente do exercício, e o link fica nessa linha.
 * A IA recebe esta lista e só pode usar estes endereços: ela nunca inventa um link.
 */
export async function extractPdfLinks(data: Uint8Array): Promise<{ pages: number; links: PdfLink[] }> {
  const task = getDocument({ data, useSystemFonts: false, verbosity: 0 });
  try {
    const pdf = await task.promise;
    const links: PdfLink[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const annotations = (await page.getAnnotations()) as { subtype?: string; url?: string; rect?: number[] }[];
      const texts: Text[] = [];
      for (const item of (await page.getTextContent()).items)
        if ('str' in item && item.str.trim())
          texts.push({ str: item.str.trim(), x: item.transform[4], y: item.transform[5], height: item.height });
      for (const annotation of annotations) {
        if (annotation.subtype !== 'Link' || !annotation.url || annotation.rect?.length !== 4) continue;
        let url: URL;
        try {
          url = new URL(annotation.url);
        } catch {
          continue;
        }
        if (url.protocol !== 'https:') continue;
        const bottom = Math.min(annotation.rect[1]!, annotation.rect[3]!);
        const top = Math.max(annotation.rect[1]!, annotation.rect[3]!);
        const middle = (bottom + top) / 2;
        // Textos que cruzam a faixa do link; fica com os mais próximos do centro, na ordem da leitura.
        const text = texts
          .filter((item) => item.y - 2 <= top && item.y + Math.max(item.height, 6) + 2 >= bottom)
          .sort((a, b) => Math.abs(a.y - middle) - Math.abs(b.y - middle))
          .slice(0, 6)
          .sort((a, b) => a.x - b.x)
          .map((item) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .slice(0, 160);
        links.push({ page: number, url: url.href, text });
      }
      page.cleanup();
    }
    return { pages: pdf.numPages, links };
  } finally {
    await task.destroy();
  }
}
