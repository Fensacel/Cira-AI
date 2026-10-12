import { tool } from 'ai';
import { z } from 'zod';
import { mkdir, readFile, readdir, stat, writeFile } from 'fs/promises';
import path from 'path';
import { errorResult } from './shared';

/** Folder kerja yang boleh diakses. Ganti lewat AIGWEH_WORKSPACE_DIR. */
const WORKSPACE_ROOT = path.resolve(process.env.AIGWEH_WORKSPACE_DIR ?? path.join(process.cwd(), 'workspace'));
const MAX_READ_BYTES = 200_000;
const MAX_WRITE_CHARS = 500_000;

/** Resolve path relatif dan tolak yang keluar dari WORKSPACE_ROOT (termasuk path traversal). */
export function resolveInWorkspace(relativePath: string): string {
  if (path.isAbsolute(relativePath)) throw new Error('Gunakan path relatif terhadap workspace.');
  const full = path.resolve(WORKSPACE_ROOT, relativePath);
  if (full !== WORKSPACE_ROOT && !full.startsWith(WORKSPACE_ROOT + path.sep)) {
    throw new Error('Path di luar workspace ditolak.');
  }
  return full;
}

export const readWorkspaceFileTool = tool({
  description: 'Baca file teks dari workspace (maksimal 200 KB). Path relatif terhadap folder workspace.',
  inputSchema: z.object({
    relativePath: z.string().min(1).describe('Path file, contoh src/index.ts'),
  }),
  execute: async ({ relativePath }) => {
    try {
      const full = resolveInWorkspace(relativePath);
      const info = await stat(full);
      if (!info.isFile()) throw new Error('Path bukan file.');
      if (info.size > MAX_READ_BYTES) throw new Error(`File terlalu besar (${info.size} byte).`);
      const content = await readFile(full, 'utf8');
      return { success: true, relativePath, content };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const writeWorkspaceFileTool = tool({
  description:
    'Tulis file teks ke workspace. File yang ada akan ditimpa. Folder induk dibuat otomatis. Path relatif terhadap folder workspace.',
  inputSchema: z.object({
    relativePath: z.string().min(1).describe('Path file tujuan'),
    content: z.string().max(MAX_WRITE_CHARS).describe('Isi file'),
  }),
  execute: async ({ relativePath, content }) => {
    try {
      const full = resolveInWorkspace(relativePath);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, content, 'utf8');
      return { success: true, relativePath, bytes: Buffer.byteLength(content, 'utf8') };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const listWorkspaceDirTool = tool({
  description: 'Daftar isi folder di workspace. Kosongkan path untuk folder root.',
  inputSchema: z.object({
    relativePath: z.string().default('').describe('Path folder, kosong untuk root'),
  }),
  execute: async ({ relativePath }) => {
    try {
      const full = resolveInWorkspace(relativePath || '.');
      const entries = await readdir(full, { withFileTypes: true });
      return {
        success: true,
        entries: entries
          .map((entry) => ({ name: entry.name, type: entry.isDirectory() ? 'dir' : 'file' }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const workspaceSkills = { readWorkspaceFileTool, writeWorkspaceFileTool, listWorkspaceDirTool };
