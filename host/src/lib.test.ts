import { describe, expect, it } from 'vitest';
import { blobKey, isSlug, isToken, newToken, parseMeta, route } from './lib';

describe('isSlug', () => {
  it('takes <group>/<name>', () => {
    expect(isSlug('legislative-intelligence-engine/engine-overview')).toBe(true);
    expect(isSlug('a/b')).toBe(true);
  });
  it('refuses other shapes', () => {
    for (const s of ['a', 'a/b/c', 'A/b', 'a/-b', 'a/b-', '../x', 'a/b c', '/a/b', 'a//b', '']) expect(isSlug(s)).toBe(false);
  });
});

describe('parseMeta', () => {
  const page = (stamp: string) => `<html><title>How &amp; why</title><p class="k-stamp">${stamp}</p></html>`;
  it('reads the title, repo and sha from the stamp', () => {
    expect(parseMeta(page('legislative-intelligence-engine · 0880549 · 2026-10-10 · snapshot'), 'x/y')).toEqual({
      title: 'How & why',
      repo: 'legislative-intelligence-engine',
      sha: '0880549',
    });
  });
  it('keeps no-git as the sha and drops a sha that is not hex', () => {
    expect(parseMeta(page('scratch · no-git · 2026-10-10 · snapshot'), 'x/y').sha).toBe('no-git');
    expect(parseMeta(page('scratch · <b>hi</b> · 2026-10-10'), 'x/y').sha).toBe(null);
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
  });
  it('refuses bad slugs, versions and tokens', () => {
    for (const p of ['/p/g', '/p/G/n', '/p/g/n/v/0', '/p/g/n/v/x', '/raw/g/n', '/raw/g/n/01', '/s/short', '/s/' + t + '/x', '/api/pages/g/n/x'])
      expect(route(p).kind).toBe('not-found');
  });
});

it('blobKey puts each version under the slug', () => {
  expect(blobKey('g/n', 2)).toBe('pages/g/n/2.html');
});
