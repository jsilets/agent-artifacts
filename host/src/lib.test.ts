import { describe, expect, it } from 'vitest';
import { blobKey, ftsQuery, isSlug, isToken, newToken, pageChunks, parseMeta, parseTheme, plainText, route, thumbKey, withTheme } from './lib';

describe('isSlug', () => {
  it('takes <group>/<name>', () => {
    expect(isSlug('billing-service/engine-overview')).toBe(true);
    expect(isSlug('a/b')).toBe(true);
  });
  it('refuses other shapes', () => {
    for (const s of ['a', 'a/b/c', 'A/b', 'a/-b', 'a/b-', '../x', 'a/b c', '/a/b', 'a//b', '']) expect(isSlug(s)).toBe(false);
  });
});

describe('parseMeta', () => {
  const page = (stamp: string) => `<html><title>How &amp; why</title><p class="k-stamp">${stamp}</p></html>`;
  it('reads the title, repo and sha from the stamp', () => {
    expect(parseMeta(page('billing-service · 0880549 · 2026-10-10 · snapshot'), 'x/y')).toEqual({
      title: 'How & why',
      repo: 'billing-service',
      sha: '0880549',
    });
  });
  it('keeps no-git as the sha and drops a sha that is not hex', () => {
    expect(parseMeta(page('scratch · no-git · 2026-10-10 · snapshot'), 'x/y').sha).toBe('no-git');
    expect(parseMeta(page('scratch · <b>hi</b> · 2026-10-10'), 'x/y').sha).toBe(null);
  });
  it('prefers the SNAPSHOT comment for the repo and commit', () => {
    const html = '<!-- SNAPSHOT: billing-service at 0880549 (main) on 2026-10-10. Do not plan from it. --><title>T</title><p class="k-stamp">billing-service · snapshot · Oct 10, 2026</p>';
    expect(parseMeta(html, 'x/y')).toEqual({ title: 'T', repo: 'billing-service', sha: '0880549' });
  });
  it('falls back to the slug name when there is no title or stamp', () => {
    expect(parseMeta('<html><body>hi</body></html>', 'group/my-page')).toEqual({ title: 'my-page', repo: null, sha: null });
  });
});

describe('tokens', () => {
  it('makes 43-character base64url tokens from 32 bytes, each one new', () => {
    const a = newToken(), b = newToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isToken(a)).toBe(true);
    expect(a).not.toBe(b);
  });
  it('refuses tokens of the wrong shape', () => {
    expect(isToken('short')).toBe(false);
    expect(isToken('a'.repeat(42) + '=')).toBe(false);
  });
});

describe('route', () => {
  const t = 'A'.repeat(43);
  it('maps every v1 route', () => {
    expect(route('/')).toEqual({ kind: 'library' });
    expect(route('/p/g/n')).toEqual({ kind: 'view', slug: 'g/n', version: null });
    expect(route('/p/g/n/v/3')).toEqual({ kind: 'view', slug: 'g/n', version: 3 });
    expect(route('/raw/g/n/12')).toEqual({ kind: 'raw', slug: 'g/n', version: 12 });
    expect(route('/api/pages')).toEqual({ kind: 'api-list' });
    expect(route('/api/pages/g/n')).toEqual({ kind: 'api-page', slug: 'g/n' });
    expect(route('/api/pages/g/n/shares')).toEqual({ kind: 'api-shares', slug: 'g/n' });
    expect(route(`/api/shares/${t}`)).toEqual({ kind: 'api-share', token: t });
    expect(route(`/s/${t}`)).toEqual({ kind: 'share-view', token: t });
    expect(route(`/s/${t}/raw`)).toEqual({ kind: 'share-raw', token: t });
    expect(route('/_/explain.css')).toEqual({ kind: 'kit-css' });
    expect(route('/s/_/explain.css')).toEqual({ kind: 'share-css' });
  });
  it('refuses bad slugs, versions and tokens', () => {
    for (const p of ['/p/g', '/p/G/n', '/p/g/n/v/0', '/p/g/n/v/x', '/raw/g/n', '/raw/g/n/01', '/s/short', '/s/' + t + '/x', '/api/pages/g/n/x'])
      expect(route(p).kind).toBe('not-found');
  });
});

it('blobKey puts each version under the slug', () => {
  expect(blobKey('g/n', 2)).toBe('pages/g/n/2.html');
});

describe('withTheme', () => {
  it('adds data-theme to the html tag', () => {
    expect(withTheme('<!doctype html>\n<html lang="en" class="no-js"><body>', 'dark')).toBe('<!doctype html>\n<html lang="en" class="no-js" data-theme="dark"><body>');
  });
  it('replaces a data-theme that the page already has', () => {
    expect(withTheme('<html data-theme="dark" data-host="inline">', 'light')).toBe('<html data-host="inline" data-theme="light">');
  });
  it('accepts only light and dark', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('auto')).toBe(null);
    expect(parseTheme(null)).toBe(null);
  });
});

describe('new routes', () => {
  it('maps the pin, refresh, search and thumbnail routes', () => {
    expect(route('/api/pages/a/b/pin')).toEqual({ kind: 'api-pin', slug: 'a/b' });
    expect(route('/api/pages/a/b/refresh')).toEqual({ kind: 'api-refresh', slug: 'a/b' });
    expect(route('/api/search')).toEqual({ kind: 'api-search' });
    expect(route('/t/a/b/3/dark.webp')).toEqual({ kind: 'thumb', slug: 'a/b', version: 3, theme: 'dark' });
    expect(route('/t/a/b/3/auto.webp')).toEqual({ kind: 'not-found' });
    expect(thumbKey('a/b', 3, 'light')).toBe('pages/a/b/3.light.webp');
  });
});

describe('icon routes', () => {
  it('serves the icons under /s/_/ and /favicon.ico', () => {
    expect(route('/s/_/favicon.svg')).toEqual({ kind: 'icon', name: 'favicon.svg' });
    expect(route('/s/_/apple-touch-icon.png')).toEqual({ kind: 'icon', name: 'apple-touch-icon.png' });
    expect(route('/favicon.ico')).toEqual({ kind: 'icon', name: 'favicon.ico' });
    expect(route('/s/_/other.png')).toEqual({ kind: 'not-found' });
  });
});

describe('ftsQuery', () => {
  it('quotes each word and matches its prefix', () => {
    expect(ftsQuery('Legis engine')).toBe('"legis"* "engine"*');
  });
  it('drops FTS syntax that the reader typed', () => {
    expect(ftsQuery('"a" OR b* -c (d)')).toBe('"a"* "or"* "b"* "c"* "d"*');
    expect(ftsQuery(' ** ')).toBe(null);
  });
});

describe('pageChunks', () => {
  const html = `<html><head><title>T</title><style>.x{}</style></head><body>
<h1>How it works</h1><p>Intro &amp; scope.</p>
<section class="k-claim"><h2>Bills arrive <em>hourly</em></h2><p>The poller reads the feed.</p></section>
<section id="votes" class="k-claim c-blue"><h2>Votes</h2><p>Roll calls.</p><script>var no = 1;</script></section>
</body></html>`;
  it('splits the page at each claim and keeps or adds ids', () => {
    expect(pageChunks(html)).toEqual([
      { anchor: '', heading: '', body: 'How it works Intro & scope.' },
      { anchor: 'claim-1', heading: 'Bills arrive hourly', body: 'The poller reads the feed.' },
      { anchor: 'votes', heading: 'Votes', body: 'Roll calls.' },
    ]);
  });
  it('decodes entities', () => {
    expect(plainText('a&nbsp;&rarr;&#x42;&#67;')).toBe('a →BC');
  });
});
