import { describe, expect, it } from 'vitest';
import { BOARDS, getBoardInfo, sketchBaseName, validateSketch } from '@/lib/skills/arduino';

describe('sketchBaseName', () => {
  it('mengganti karakter tidak valid dengan garis bawah', () => {
    expect(sketchBaseName('blink LED-1!')).toBe('blink_LED_1');
  });

  it('menambah awalan bila diawali angka', () => {
    expect(sketchBaseName('1sensor')).toBe('sketch_1sensor');
  });

  it('memakai nama default bila kosong setelah dibersihkan', () => {
    expect(sketchBaseName('!!!')).toBe('sketch');
  });
});

describe('validateSketch', () => {
  it('menerima sketch dengan setup dan loop', () => {
    expect(validateSketch('void setup() {}\nvoid loop() {}')).toBeNull();
  });

  it('menolak sketch tanpa loop', () => {
    expect(validateSketch('void setup() {}')).toContain('loop');
  });

  it('menolak sketch tanpa setup', () => {
    expect(validateSketch('void loop() {}')).toContain('setup');
  });
});

describe('getBoardInfo', () => {
  it('Uno memakai PWM 3, 5, 6, 9, 10, 11', () => {
    expect(getBoardInfo('uno').pwmPins).toEqual([3, 5, 6, 9, 10, 11]);
  });

  it('Mega punya 16 pin analog dan SPI di 50-53', () => {
    const mega = getBoardInfo('mega2560');
    expect(mega.analogPins).toHaveLength(16);
    expect(mega.spi).toEqual({ mosi: 51, miso: 50, sck: 52, ss: 53 });
  });

  it('Nano hanya punya pin digital D0-D13, A6 dan A7 bukan digital', () => {
    expect(getBoardInfo('nano').digitalPins).toBe('D0-D13');
    expect(getBoardInfo('nano').analogPins).toContain('A7');
  });

  it('semua board punya sumber data', () => {
    for (const board of Object.values(BOARDS)) {
      expect(board.source).toContain('Arduino');
    }
  });
});
