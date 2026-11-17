import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { AiJobs } from '../ai/ai-jobs.js';
import { AiError, type AiService } from '../ai/ai.service.js';
import { extractPdfLinks } from './pdf-links.js';
import { WorkoutImportService } from './workout-import.service.js';

/** PDF mínimo e fictício: uma linha "SUPINO RETO" com um link de vídeo na frente. */
function fakePdf(url = 'https://youtu.be/video-teste') {
  const text = 'BT /F1 12 Tf 80 700 Td (SUPINO RETO   4   12,12,10,10) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> /Annots [6 0 R] >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Type /Annot /Subtype /Link /Rect [50 695 70 715] /Border [0 0 0] /A << /S /URI /URI (${url}) >> >>`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((body, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const sheet = {
  recognized: true,
  problem: null,
  name: 'Ficha de teste',
  notes: 'Seguir 8 semanas.',
  workouts: [
    {
      name: 'Dia 1',
      focus: 'Peito',
      notes: null,
      exercises: [
        {
          name: 'Supino reto',
          sets: 4,
          repsPerSet: [12, 12, 10, 10],
          unit: 'reps',
          restSeconds: 60,
          notes: null,
          videoUrl: 'https://youtu.be/video-teste',
        },
        {
          name: 'Crucifixo',
          sets: 3,
          repsPerSet: [12],
          unit: 'reps',
          restSeconds: 60,
          notes: null,
          videoUrl: 'https://youtu.be/link-inventado',
        },
      ],
    },
  ],
};
const setup = (configured = true) => {
  const structured = vi.fn();
  const service = new WorkoutImportService({ configured, structured } as unknown as AiService, new AiJobs());
  return { service, structured };
};
const request = (bytes: Buffer) => ({ fileName: 'ficha.pdf', pdfBase64: bytes.toString('base64') });

describe('extractPdfLinks', () => {
  it('encontra o link e o texto da mesma linha', async () => {
    const { pages, links } = await extractPdfLinks(new Uint8Array(fakePdf()));
    expect(pages).toBe(1);
    expect(links).toEqual([{ page: 1, url: 'https://youtu.be/video-teste', text: 'SUPINO RETO 4 12,12,10,10' }]);
  });
  it('ignora links que não são https', async () => {
    const { links } = await extractPdfLinks(new Uint8Array(fakePdf('http://exemplo.test/video')));
    expect(links).toEqual([]);
  });
});

describe('WorkoutImportService', () => {
  it('envia o PDF e os links ao modelo e só aceita os links que estão no PDF', async () => {
    const { service, structured } = setup();
    structured.mockResolvedValue(sheet);
    const program = await service.read(fakePdf(), 'ficha.pdf');
    const call = structured.mock.calls[0][0];
    expect(call.content[0]).toMatchObject({ type: 'document', source: { media_type: 'application/pdf' } });
    expect(JSON.parse(call.content[1].text).links).toEqual([
      { page: 1, url: 'https://youtu.be/video-teste', text: 'SUPINO RETO 4 12,12,10,10' },
    ]);
    expect(call.effort).toBe('high');
    const [bench, fly] = program.workouts[0]!.exercises;
    expect(bench).toMatchObject({ repsPerSet: [12, 12, 10, 10], videoUrl: 'https://youtu.be/video-teste' });
    expect(fly!.videoUrl).toBeUndefined();
    expect(program).toMatchObject({ source: 'ai-import', notes: 'Seguir 8 semanas.' });
  });
  it('recusa arquivo que não é PDF e falta de configuração antes de chamar a IA', () => {
    const { service, structured } = setup();
    expect(() => service.start('user', request(Buffer.from('não sou um pdf')))).toThrow(BadRequestException);
    expect(() => service.start('user', { fileName: 'x.pdf' })).toThrow(BadRequestException);
    expect(() => setup(false).service.start('user', request(fakePdf()))).toThrow(ServiceUnavailableException);
    expect(structured).not.toHaveBeenCalled();
  });
  it('explica quando o PDF não é uma ficha e quando a IA falha, sem salvar nada', async () => {
    const { service, structured } = setup();
    structured.mockResolvedValueOnce({ ...sheet, recognized: false, problem: 'É um boleto.' });
    await expect(service.read(fakePdf(), 'boleto.pdf')).rejects.toThrow(UnprocessableEntityException);
    structured.mockRejectedValueOnce(new AiError('invalid'));
    await expect(service.read(fakePdf(), 'ficha.pdf')).rejects.toThrow(BadGatewayException);
    await expect(service.read(Buffer.from('%PDF-quebrado'), 'ficha.pdf')).rejects.toThrow('Não consegui abrir');
  });
  it('lê em segundo plano e entrega o programa só para quem enviou', async () => {
    const { service, structured } = setup();
    structured.mockResolvedValue(sheet);
    const { id } = service.start('user', request(fakePdf()));
    expect(service.job('user', id)).toEqual({ status: 'running' });
    expect(() => service.job('other', id)).toThrow('não existe mais');
    await vi.waitFor(() => expect(service.job('user', id).status).toBe('done'));
  });
});
