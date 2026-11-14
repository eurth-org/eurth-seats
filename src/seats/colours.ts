/**
 * Party colours. The defaults are ten colours that each sit on their own step of lightness
 * (CIELAB L* from about 20 to 91, never less than 7 apart), so they stay apart for people who
 * are red-green or blue-yellow colour blind and in a greyscale print. Colour is still never the
 * only key: every seat block is listed by name beside the chamber.
 *
 * They are given in the order parties get them, which alternates light and dark so that
 * neighbours in the chamber differ most. The first is eurth-blue.
 */
export const DEFAULT_COLOURS = [
  '#2698d4', // blue, L* 60
  '#f5ce44', // gold, 84
  '#7e1c2d', // maroon, 28
  '#07d1c8', // aqua, 76
  '#554c8c', // violet, 36
  '#ca5a35', // rust, 52
  '#dcecb3', // mint, 91
  '#00774f', // green, 44
  '#eb86b5', // pink, 68
  '#1b2d61', // indigo, 20
] as const;

/** The default colour for the party at this place in the list. After ten, they come round again. */
export function defaultColour(index: number): string {
  const n = DEFAULT_COLOURS.length;
  return DEFAULT_COLOURS[((Math.trunc(index) % n) + n) % n]!;
}

/** Any value, made into a six-digit lower-case hex colour. Accepts "#abc", "abc", "#aabbcc" and "aabbcc". */
export function cleanColour(value: unknown, fallback: string = DEFAULT_COLOURS[0]): string {
  if (typeof value !== 'string') return fallback;
  const text = value.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{6}$/.test(text)) return `#${text}`;
  if (/^[0-9a-f]{3}$/.test(text)) return `#${[...text].map((c) => c + c).join('')}`;
  return fallback;
}

const channel = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Red, green and blue as linear light, 0 to 1. */
export function linearRgb(hex: string): [number, number, number] {
  const c = cleanColour(hex);
  return [channel(parseInt(c.slice(1, 3), 16) / 255), channel(parseInt(c.slice(3, 5), 16) / 255), channel(parseInt(c.slice(5, 7), 16) / 255)];
}

/** A colour in CIELAB (D65): lightness L* from 0 to 100, then a* and b*. */
export function labOf([r, g, b]: readonly [number, number, number]): [number, number, number] {
  const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const x = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047);
  const y = f(0.2126729 * r + 0.7151522 * g + 0.072175 * b);
  const z = f((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** How light a colour looks, as CIELAB L*: 0 is black, 100 is white. */
export function lightness(hex: string): number {
  return labOf(linearRgb(hex))[0];
}

/** WCAG relative luminance, 0 to 1. */
export function luminance(hex: string): number {
  const [r, g, b] = linearRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Whichever of the two inks reads better on this colour: for a label laid on a party's colour. */
export function inkOn(hex: string, dark = '#002b36', light = '#ffffff'): string {
  return contrast(hex, dark) >= contrast(hex, light) ? dark : light;
}

export type ColourVision = 'protanopia' | 'deuteranopia' | 'tritanopia';

// Machado, Oliveira and Fernandes (2009), severity 1.0: what a dichromat sees, in linear RGB.
const SIMULATION: Record<ColourVision, readonly (readonly [number, number, number])[]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/** A colour as someone with this kind of colour blindness sees it, in CIELAB. */
export function seenAs(hex: string, vision: ColourVision): [number, number, number] {
  const rgb = linearRgb(hex);
  const out = SIMULATION[vision].map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])));
  return labOf(out as [number, number, number]);
}
