import { DocumentError, LEGACY_EXTENSIONS, LEGACY_MESSAGE, extractDocumentText } from '@/lib/document-extract';
import { MAX_DOCUMENT_BYTES, getFileExtension, isDocumentFilename } from '@/lib/document-parts';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'File tidak ditemukan.' }, { status: 400 });
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return Response.json({ error: 'Ukuran dokumen maksimal 16 MB.' }, { status: 413 });
  }
  const ext = getFileExtension(file.name);
  if (LEGACY_EXTENSIONS.includes(ext)) {
    return Response.json({ error: LEGACY_MESSAGE }, { status: 422 });
  }
  if (!isDocumentFilename(file.name)) {
    return Response.json({ error: 'Format dokumen tidak didukung.' }, { status: 400 });
  }

  try {
    const result = await extractDocumentText(file);
    return Response.json(result);
  } catch (error) {
    if (error instanceof DocumentError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    console.error('[api/extract]', error);
    return Response.json({ error: 'Gagal membaca dokumen.' }, { status: 500 });
  }
}
