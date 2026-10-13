import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { EXPORT_DIR } from './excel';

export const BOARD_IDS = ['uno', 'nano', 'mega2560'] as const;
export type BoardId = (typeof BOARD_IDS)[number];

export const MAX_SKETCH_CHARS = 20_000;

export type BoardInfo = {
  name: string;
  mcu: string;
  logicVoltage: string;
  digitalPins: string;
  pwmPins: number[];
  analogPins: string[];
  interruptPins: number[];
  i2c: { sda: string; scl: string };
  spi: { mosi: number; miso: number; sck: number; ss: number };
  uart: string;
  maxPinCurrentMa: { recommended: number; absoluteMax: number };
  source: string;
};

const SOURCE = 'Pinout dan spesifikasi resmi Arduino (docs.arduino.cc)';

/** Data pin statis dari dokumentasi resmi Arduino. Board lain belum tersedia. */
export const BOARDS: Record<BoardId, BoardInfo> = {
  uno: {
    name: 'Arduino Uno R3',
    mcu: 'ATmega328P',
    logicVoltage: '5V',
    digitalPins: 'D0-D13',
    pwmPins: [3, 5, 6, 9, 10, 11],
    analogPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
    interruptPins: [2, 3],
    i2c: { sda: 'A4', scl: 'A5' },
    spi: { mosi: 11, miso: 12, sck: 13, ss: 10 },
    uart: 'Serial: D0 (RX), D1 (TX). Dipakai juga oleh USB, jadi hindari saat Serial aktif.',
    maxPinCurrentMa: { recommended: 20, absoluteMax: 40 },
    source: SOURCE,
  },
  nano: {
    name: 'Arduino Nano',
    mcu: 'ATmega328P',
    logicVoltage: '5V',
    digitalPins: 'D0-D13 (A0-A7 juga bisa dipakai sebagai digital)',
    pwmPins: [3, 5, 6, 9, 10, 11],
    analogPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'],
    interruptPins: [2, 3],
    i2c: { sda: 'A4', scl: 'A5' },
    spi: { mosi: 11, miso: 12, sck: 13, ss: 10 },
    uart: 'Serial: D0 (RX), D1 (TX). Dipakai juga oleh USB, jadi hindari saat Serial aktif.',
    maxPinCurrentMa: { recommended: 20, absoluteMax: 40 },
    source: SOURCE,
  },
  mega2560: {
    name: 'Arduino Mega 2560 R3',
    mcu: 'ATmega2560',
    logicVoltage: '5V',
    digitalPins: 'D0-D53',
    pwmPins: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 44, 45, 46],
    analogPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15'],
    interruptPins: [2, 3, 18, 19, 20, 21],
    i2c: { sda: 'D20', scl: 'D21' },
    spi: { mosi: 51, miso: 50, sck: 52, ss: 53 },
    uart: 'Serial: D0 (RX), D1 (TX). Serial1: D19 (RX), D18 (TX). Serial2: D17 (RX), D16 (TX). Serial3: D15 (RX), D14 (TX).',
    maxPinCurrentMa: { recommended: 20, absoluteMax: 40 },
    source: SOURCE,
  },
};

export function getBoardInfo(board: BoardId): BoardInfo {
  return BOARDS[board];
}

/** Nama sketch Arduino: huruf, angka, garis bawah, dimulai huruf. */
export function sketchBaseName(name: string): string {
  const cleaned = name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  if (!cleaned) return 'sketch';
  return /^[a-zA-Z]/.test(cleaned) ? cleaned : `sketch_${cleaned}`;
}

/** Sketch wajib punya void setup() dan void loop(). Mengembalikan pesan error, atau null bila valid. */
export function validateSketch(code: string): string | null {
  if (!/\bvoid\s+setup\s*\(\s*\)/.test(code)) return 'Sketch harus memiliki fungsi void setup().';
  if (!/\bvoid\s+loop\s*\(\s*\)/.test(code)) return 'Sketch harus memiliki fungsi void loop().';
  return null;
}

export async function writeSketch(sketchName: string, code: string): Promise<string> {
  await mkdir(EXPORT_DIR, { recursive: true });
  const filePath = path.join(EXPORT_DIR, `${sketchName}.ino`);
  await writeFile(filePath, code, 'utf8');
  return filePath;
}
