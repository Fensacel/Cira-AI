import { tool } from 'ai';
import { z } from 'zod';
import { errorResult } from './shared';
import { BOARD_IDS, MAX_SKETCH_CHARS, getBoardInfo, sketchBaseName, validateSketch } from './arduino';

export const createArduinoSketchTool = tool({
  description:
    'Buat sketch Arduino (.ino) dari kode C++ Arduino. Kode wajib berisi void setup() dan void loop(). Mengembalikan nama file dan isi kode untuk ditampilkan di chat (tidak disimpan ke disk). Tool ini TIDAK mengompilasi dan TIDAK meng-upload ke board.',
  inputSchema: z.object({
    fileName: z.string().min(1).max(100).describe('Nama sketch, contoh blink_led. Huruf, angka, dan garis bawah'),
    code: z.string().min(1).max(MAX_SKETCH_CHARS).describe('Isi lengkap file .ino'),
  }),
  execute: async ({ fileName, code }) => {
    try {
      const problem = validateSketch(code);
      if (problem) return errorResult(new Error(problem));
      return {
        success: true,
        fileName: `${sketchBaseName(fileName)}.ino`,
        code,
        lines: code.split('\n').length,
      };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const arduinoBoardInfoTool = tool({
  description:
    'Ambil data pin board Arduino: pin digital, PWM, analog, interrupt, I2C, SPI, UART, tegangan logika, dan batas arus per pin. Panggil sebelum menulis kode yang memakai pin tertentu. Board yang tersedia: uno, nano, mega2560.',
  inputSchema: z.object({
    board: z.enum(BOARD_IDS).describe('Jenis board Arduino'),
  }),
  execute: async ({ board }) => ({ success: true, board: getBoardInfo(board) }),
});

export const arduinoSkills = { createArduinoSketchTool, arduinoBoardInfoTool };
