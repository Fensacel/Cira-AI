import { readFile } from 'fs/promises';
import path from 'path';
import { EXPORT_DIR } from '@/lib/skills/excel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CONTENT_TYPES: Record<string, string> = {
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ino': 'text/plain; charset=utf-8',
};

/** Hanya nama file hasil ekspor (huruf, angka, spasi, _, -) dengan ekstensi xlsx, csv, docx, pptx, atau ino. */
const SAFE_FILE = /^[a-zA-Z0-9 _-]{1,100}\.(xlsx|csv|docx|pptx|ino)$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;
  if (!SAFE_FILE.test(file)) {
    return Response.json({ error: 'Nama file tidak valid' }, { status: 400 });
  }
  try {
    const data = await readFile(path.join(EXPORT_DIR, file));
    return new Response(data, {
      headers: {
        'Content-Type': CONTENT_TYPES[path.extname(file)],
        'Content-Disposition': `attachment; filename="${file}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return Response.json({ error: 'File tidak ditemukan' }, { status: 404 });
  }
}
