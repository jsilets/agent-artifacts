// agent-pages: stores HTML pages with versions, shows them in a sandboxed viewer,
// and serves share links. See ../README.md for the routes and the auth model.
import kitCss from '../../kit/explain.css?raw';
import { verifyAccessJwt, type Identity } from './auth';
import { blobKey, newToken, parseMeta, parseTheme, route, withTheme, type Theme } from './lib';
import { libraryHtml, messageHtml, sharedHtml, viewerHtml, type PageRow, type VersionRow } from './views';

interface Env {
  DB: D1Database;
  PAGES: R2Bucket;
  ENVIRONMENT: string;
  ACCESS_TEAM: string;
  ACCESS_AUD: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

/** Stored pages run with no origin: they cannot read the host's cookies, storage or API. */
const PAGE_CSP = 'sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox';

const BASE_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-robots-tag': 'noindex, nofollow',
};

function hostCsp(nonce: string) {
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    "connect-src 'self'",
    "frame-src 'self'",
    "img-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, 'content-type': 'application/json', 'cache-control': 'no-store' } });

const fail = (status: number, error: string) => json({ error }, status);

function page(html: string, nonce: string, status = 200) {
  return new Response(html, {
    status,
    headers: { ...BASE_HEADERS, 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': hostCsp(nonce) },
  });
}

async function rawPage(obj: R2ObjectBody, immutable: boolean, theme: Theme | null) {
  const body = theme ? withTheme(await obj.text(), theme) : obj.body;
  return new Response(body, {
    headers: {
      ...BASE_HEADERS,
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': PAGE_CSP,
      'cache-control': immutable ? 'private, max-age=31536000, immutable' : 'no-store',
    },
  });
}

const now = () => new Date().toISOString();

async function identify(req: Request, env: Env): Promise<Identity | null> {
  // Local development has no Access in front of it.
  if (env.ENVIRONMENT === 'development' && !env.ACCESS_AUD) return { who: 'local', kind: 'person' };
  return verifyAccessJwt(req.headers.get('cf-access-jwt-assertion'), { team: env.ACCESS_TEAM, aud: env.ACCESS_AUD });
}

async function getPage(env: Env, slug: string) {
  return env.DB.prepare('SELECT slug, title, repo, latest, updated_at FROM pages WHERE slug = ?').bind(slug).first<PageRow>();
}

async function getVersion(env: Env, slug: string, version: number) {
  return env.DB.prepare('SELECT version, sha, created_at FROM versions WHERE slug = ? AND version = ?').bind(slug, version).first<VersionRow>();
}

async function publish(req: Request, env: Env, slug: string, origin: string) {
  if (!(req.headers.get('content-type') || '').startsWith('text/html')) return fail(415, 'send the page as text/html');
  if (+(req.headers.get('content-length') || 0) > MAX_BYTES) return fail(413, 'the page is over 5 MB');
  const html = await req.text();
  const bytes = new TextEncoder().encode(html).byteLength;
  if (bytes > MAX_BYTES) return fail(413, 'the page is over 5 MB');
  if (!/<html[\s>]/i.test(html)) return fail(400, 'the body is not an HTML document');
  const meta = parseMeta(html, slug);
  const at = now();
  // One statement picks the next number, so two publishes of one slug never share a version.
  await env.DB.prepare('INSERT INTO pages (slug, title, repo, latest, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?) ON CONFLICT (slug) DO NOTHING')
    .bind(slug, meta.title, meta.repo, at, at)
    .run();
  const row = await env.DB.prepare(
    'INSERT INTO versions (slug, version, sha, bytes, created_at) SELECT ?, COALESCE(MAX(version), 0) + 1, ?, ?, ? FROM versions WHERE slug = ? RETURNING version',
  )
    .bind(slug, meta.sha, bytes, at, slug)
    .first<{ version: number }>();
  const version = row!.version;
  try {
    await env.PAGES.put(blobKey(slug, version), html, { httpMetadata: { contentType: 'text/html; charset=utf-8' } });
  } catch (e) {
    await env.DB.prepare('DELETE FROM versions WHERE slug = ? AND version = ?').bind(slug, version).run();
    throw e;
  }
  await env.DB.prepare('UPDATE pages SET latest = MAX(latest, ?), title = ?, repo = ?, updated_at = ? WHERE slug = ?')
    .bind(version, meta.title, meta.repo, at, slug)
    .run();
  return json({ slug, version, title: meta.title, url: `${origin}/p/${slug}`, versionUrl: `${origin}/p/${slug}/v/${version}` }, 201);
}

async function deletePage(env: Env, slug: string) {
  if (!(await getPage(env, slug))) return fail(404, 'no such page');
  let cursor: string | undefined;
  do {
    const list = await env.PAGES.list({ prefix: `pages/${slug}/`, cursor });
    if (list.objects.length) await env.PAGES.delete(list.objects.map((o) => o.key));
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM shares WHERE slug = ?').bind(slug),
    env.DB.prepare('DELETE FROM versions WHERE slug = ?').bind(slug),
    env.DB.prepare('DELETE FROM pages WHERE slug = ?').bind(slug),
  ]);
  return new Response(null, { status: 204, headers: BASE_HEADERS });
}

async function createShare(req: Request, env: Env, slug: string, origin: string) {
  const p = await getPage(env, slug);
  if (!p) return fail(404, 'no such page');
  const body = (await req.json().catch(() => ({}))) as { version?: number | 'latest' };
  const v = body.version ?? 'latest';
  let version: number | null = null;
  if (v !== 'latest') {
    if (!Number.isInteger(v) || !(await getVersion(env, slug, v))) return fail(400, 'no such version');
    version = v;
  }
  const token = newToken();
  await env.DB.prepare('INSERT INTO shares (token, slug, version, created_at) VALUES (?, ?, ?, ?)').bind(token, slug, version, now()).run();
  return json({ token, slug, version, url: `${origin}/s/${token}` }, 201);
}

async function listShares(env: Env, slug: string, origin: string) {
  const { results } = await env.DB.prepare('SELECT token, version, created_at FROM shares WHERE slug = ? ORDER BY created_at DESC').bind(slug).all<{ token: string; version: number | null; created_at: string }>();
  return json(results.map((s) => ({ ...s, url: `${origin}/s/${s.token}` })));
}

/** Resolves a share token to its page and version, or null when the page or version is gone. */
async function resolveShare(env: Env, token: string) {
  const s = await env.DB.prepare('SELECT slug, version FROM shares WHERE token = ?').bind(token).first<{ slug: string; version: number | null }>();
  if (!s) return null;
  const p = await getPage(env, s.slug);
  if (!p) return null;
  const v = await getVersion(env, s.slug, s.version ?? p.latest);
  return v ? { page: p, version: v } : null;
}

async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const r = route(url.pathname);
  const nonce = newToken();
  const method = req.method;
  // The viewer asks for ?theme=light or ?theme=dark when the reader picks a theme.
  const theme = parseTheme(url.searchParams.get('theme'));

  const css = () => new Response(kitCss, { headers: { ...BASE_HEADERS, 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=300' } });
  // The kit CSS is public, so a share link can load it with no login.
  if (r.kind === 'share-css') return css();

  // Share links: Access lets /s/* through with no login, so the token is the only check.
  if (r.kind === 'share-view' || r.kind === 'share-raw') {
    if (method !== 'GET') return fail(405, 'method not allowed');
    const hit = await resolveShare(env, r.token);
    if (!hit) return page(messageHtml('Link not found', 'This share link does not exist or was revoked.', nonce, '/s/_/explain.css'), nonce, 404);
    if (r.kind === 'share-view') return page(sharedHtml({ token: r.token, title: hit.page.title, repo: hit.page.repo, version: hit.version }, nonce), nonce);
    const obj = await env.PAGES.get(blobKey(hit.page.slug, hit.version.version));
    return obj ? rawPage(obj, false, theme) : fail(404, 'no such version');
  }

  const who = await identify(req, env);
  if (!who) return fail(403, 'Cloudflare Access did not sign this request');

  // A page runs with an opaque origin, so its requests carry "Origin: null". Writes must come
  // from the host itself or from a client that sends no Origin (the CLI).
  if (method !== 'GET' && method !== 'HEAD') {
    const o = req.headers.get('origin');
    if (o && o !== url.origin) return fail(403, 'cross-origin write refused');
  }

  switch (r.kind) {
    case 'kit-css':
      return css();
    case 'library': {
      const { results } = await env.DB.prepare('SELECT slug, title, repo, latest, updated_at FROM pages ORDER BY updated_at DESC').all<PageRow>();
      return page(libraryHtml(results, nonce), nonce);
    }
    case 'view': {
      const p = await getPage(env, r.slug);
      if (!p) return page(messageHtml('Page not found', `No page has the slug ${r.slug}.`, nonce), nonce, 404);
      const { results: versions } = await env.DB.prepare('SELECT version, sha, created_at FROM versions WHERE slug = ? ORDER BY version DESC').bind(r.slug).all<VersionRow>();
      const version = versions.find((v) => v.version === (r.version ?? p.latest));
      if (!version) return page(messageHtml('Version not found', `${r.slug} has no version ${r.version}.`, nonce), nonce, 404);
      return page(viewerHtml({ slug: p.slug, title: p.title, repo: p.repo, version, versions, latest: p.latest, followsLatest: r.version === null }, nonce), nonce);
    }
    case 'raw': {
      const obj = await env.PAGES.get(blobKey(r.slug, r.version));
      return obj ? rawPage(obj, true, theme) : fail(404, 'no such version');
    }
    case 'api-list': {
      if (method !== 'GET') return fail(405, 'method not allowed');
      const { results } = await env.DB.prepare('SELECT slug, title, repo, latest, updated_at FROM pages ORDER BY updated_at DESC').all<PageRow>();
      return json(results.map((p) => ({ ...p, url: `${url.origin}/p/${p.slug}` })));
    }
    case 'api-page':
      if (method === 'PUT') return publish(req, env, r.slug, url.origin);
      if (method === 'DELETE') return deletePage(env, r.slug);
      if (method === 'GET') {
        const p = await getPage(env, r.slug);
        return p ? json({ ...p, url: `${url.origin}/p/${p.slug}` }) : fail(404, 'no such page');
      }
      return fail(405, 'method not allowed');
    case 'api-shares':
      if (method === 'POST') return createShare(req, env, r.slug, url.origin);
      if (method === 'GET') return listShares(env, r.slug, url.origin);
      return fail(405, 'method not allowed');
    case 'api-share': {
      if (method !== 'DELETE') return fail(405, 'method not allowed');
      const res = await env.DB.prepare('DELETE FROM shares WHERE token = ?').bind(r.token).run();
      return res.meta.changes ? new Response(null, { status: 204, headers: BASE_HEADERS }) : fail(404, 'no such share');
    }
    default:
      return url.pathname.startsWith('/api/') ? fail(404, 'no such route') : page(messageHtml('Not found', 'No page is at this address.', nonce), nonce, 404);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    try {
      return await handle(req, env);
    } catch (e) {
      console.error(e);
      return fail(500, 'internal error');
    }
  },
} satisfies ExportedHandler<Env>;

