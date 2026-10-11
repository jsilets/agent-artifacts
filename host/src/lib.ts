// Pure helpers for the Worker: slugs, page metadata, tokens and route parsing.

/** A slug is `<group>/<name>`. Each part is lowercase letters, digits and hyphens. */
const PART = '[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?';
const SLUG_RE = new RegExp(`^${PART}/${PART}$`);

export function isSlug(s: string): boolean {
  return SLUG_RE.test(s);
}

export interface PageMeta {
  title: string;
  repo: string | null;
  sha: string | null;
}

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Reads the title from `<title>`. Reads the repo and the commit from the SNAPSHOT comment
 * ("SNAPSHOT: <repo> at <sha> (<branch>) on <date>"), which agents read and people never see.
 * Pages from before that comment held the commit in the `.k-stamp` line, so that is the fallback.
 */
export function parseMeta(html: string, slug: string): PageMeta {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = (t && decode(t[1])) || slug.split('/')[1];
  const isSha = (x: string | undefined) => !!x && /^[0-9a-f]{4,40}$|^no-git$/.test(x);
  const snap = html.match(/<!--\s*SNAPSHOT:\s*(\S+)\s+at\s+(\S+)/);
  if (snap) return { title, repo: snap[1], sha: isSha(snap[2]) ? snap[2] : null };
  const stamp = html.match(/<p class="k-stamp"[^>]*>([\s\S]*?)<\/p>/i);
  if (!stamp) return { title, repo: null, sha: null };
  const [repo, sha] = decode(stamp[1]).split(' · ').map((x) => x.trim());
  return { title, repo: repo || null, sha: isSha(sha) ? sha : null };
}

/** 32 random bytes in base64url: the share token. */
export function newToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isToken(s: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(s);
}

export type Route =
  | { kind: 'library' }
  | { kind: 'view'; slug: string; version: number | null }
  | { kind: 'raw'; slug: string; version: number }
  | { kind: 'kit-css' }
  | { kind: 'share-css' }
  | { kind: 'api-list' }
  | { kind: 'api-page'; slug: string }
  | { kind: 'api-shares'; slug: string }
  | { kind: 'api-share'; token: string }
  | { kind: 'share-view'; token: string }
  | { kind: 'share-raw'; token: string }
  | { kind: 'not-found' };

const NUM = /^[1-9][0-9]{0,8}$/;

/** Maps a path to a route. Every slug is exactly two parts, so the routes never overlap. */
export function route(path: string): Route {
  const p = path.split('/').slice(1);
  const slug = p.length >= 3 ? `${p[1]}/${p[2]}` : '';
  const ok = isSlug(slug);
  if (path === '/') return { kind: 'library' };
  if (path === '/_/explain.css') return { kind: 'kit-css' };
  if (path === '/s/_/explain.css') return { kind: 'share-css' };
  if (p[0] === 'p' && ok && p.length === 3) return { kind: 'view', slug, version: null };
  if (p[0] === 'p' && ok && p.length === 5 && p[3] === 'v' && NUM.test(p[4])) return { kind: 'view', slug, version: +p[4] };
  if (p[0] === 'raw' && ok && p.length === 4 && NUM.test(p[3])) return { kind: 'raw', slug, version: +p[3] };
  if (p[0] === 'api' && p[1] === 'pages') {
    const s = p.length >= 4 ? `${p[2]}/${p[3]}` : '';
    if (p.length === 2) return { kind: 'api-list' };
    if (isSlug(s) && p.length === 4) return { kind: 'api-page', slug: s };
    if (isSlug(s) && p.length === 5 && p[4] === 'shares') return { kind: 'api-shares', slug: s };
  }
  if (p[0] === 'api' && p[1] === 'shares' && p.length === 3 && isToken(p[2])) return { kind: 'api-share', token: p[2] };
  if (p[0] === 's' && p.length === 2 && isToken(p[1])) return { kind: 'share-view', token: p[1] };
  if (p[0] === 's' && p.length === 3 && isToken(p[1]) && p[2] === 'raw') return { kind: 'share-raw', token: p[1] };
  return { kind: 'not-found' };
}

/** The R2 key of one stored version. */
export const blobKey = (slug: string, version: number) => `pages/${slug}/${version}.html`;

export type Theme = 'light' | 'dark';

export const parseTheme = (v: string | null): Theme | null => (v === 'light' || v === 'dark' ? v : null);

/** Sets data-theme on the page's <html> tag, so the kit draws that theme whatever the OS uses. */
export function withTheme(html: string, theme: Theme): string {
  return html.replace(/<html\b([^>]*)>/i, (_, attrs: string) => `<html${attrs.replace(/\s+data-theme\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, '')} data-theme="${theme}">`);
}
