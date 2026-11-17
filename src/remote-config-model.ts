import { themeColorKeys } from './theme-colors';
import { z } from 'zod';
import type { paths } from './api/schema';
const text = (max: number) => z.object({ en: z.string().min(1).max(max), my: z.string().min(1).max(max) }).strict();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const palette = z.partialRecord(z.enum(themeColorKeys), color);
export const remoteConfigSchema = z.object({
  schemaVersion: z.literal(1), revision: z.string().min(1).max(80),
  theme: z.object({ light: palette, dark: palette }).strict(),
  carousel: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]{1,40}$/), label: text(80), title: text(120), body: text(400), action: text(60),
    route: z.enum(['/severance', '/severance/guide', '/insurance']), color,
    art: z.enum(['calculator', 'coins', 'insurance']),
  }).strict()).max(8),
  notices: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]{1,40}$/), title: text(120), body: text(1500) }).strict()).max(20),
  features: z.object({ carouselVisible: z.boolean(), carouselAutoplay: z.boolean(), carouselIntervalMs: z.number().int().min(4000).max(30000), noticesVisible: z.boolean() }).strict(),
}).strict().refine(value => new Set(value.carousel.map(item => item.id)).size === value.carousel.length && new Set(value.notices.map(item => item.id)).size === value.notices.length);
export type RemoteConfig = paths['/v1/mobile-config']['get']['responses'][200]['content']['application/json'];
export const defaultRemoteConfig: RemoteConfig = {
  schemaVersion: 1, revision: 'bundled-v1', theme: { light: {}, dark: {} }, carousel: [], notices: [],
  features: { carouselVisible: true, carouselAutoplay: true, carouselIntervalMs: 4000, noticesVisible: true },
};
export function parseRemoteConfig(raw: string): RemoteConfig | undefined {
  if (raw.length > 32768) return;
  try { const result = remoteConfigSchema.safeParse(JSON.parse(raw)); return result.success ? result.data : undefined; } catch { return; }
}
export function localizedConfigText(text: { en: string; my: string }, language: string) { return language.startsWith('my') ? text.my : text.en; }
