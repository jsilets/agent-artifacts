/* explain.js: the runtime for explain pages. One file, no dependencies.
   It draws .k-flow diagrams, .k-dots scores, .k-model sliders, .k-steps and Mermaid blocks.
   In Node (no DOM) it only sets globalThis.Explain, so cli/agent-artifacts.mjs can lint with the same parsers.
   The flow parser and layout (marked below) come from Anthropic's html-plan skill. See ../NOTICE.md. */
(function () {
'use strict';
const HAS_DOM = typeof document !== 'undefined';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function dedent(text) {
  const lines = String(text).replace(/\t/g, '  ').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length), 999);
  return lines.map((l) => l.slice(ind === 999 ? 0 : ind)).join('\n');
}
function srcOf(el) {
  const s = el.querySelector(':scope > script[type="text/plain"]');
  return dedent(s ? s.textContent : '');
}

/* ─── From html-plan (Apache-2.0 / MIT, Anthropic). Changed: TONES uses the kit's color ramps;
       parseFlow and layoutFlow are local constants instead of properties of a namespace. ─── */
const MARK = { '+': 'new', '-': 'gone', '~': 'mod', '!': 'hl' };
function takeMark(line) { const m = line.match(/^([+\-~!])\s+(?=\S)|^([+\-!])(?=[A-Za-z_])/); return m && !/^--/.test(line) && !/^->/.test(line) ? [MARK[m[1] || m[2]], line.slice(m[0].length)] : [null, line]; }
const SHAPES = new Set(['box', 'pill', 'diamond', 'db', 'circle', 'note', 'hex', 'actor']);
const TONES = new Set(['gray', 'purple', 'teal', 'coral', 'pink', 'blue', 'green', 'amber', 'red', 'accent', 'muted', 'ink']);
const EDGE_RE = /^(\S+)\s+(<?)(-->|->|=>|==>|-x->|\.\.>)\s*(\S+?)(?:\s*:\s*(.*))?$/;

/** Flow DSL → { nodes:{id:{id,label,sub,shape,tone,mark,href,detail}}, edges:[], grid:[[id|null]], groups:[], dir, errors:[] } */
const parseFlow = function parseFlow(text) {
  const m = { nodes: {}, order: [], edges: [], grid: [], groups: [], dir: 'TB', errors: [] };
  const node = (id, ln) => { if (!/^[\w.-]+$/.test(id)) m.errors.push(`line ${ln}: bad node id "${id}"`); if (!m.nodes[id]) { m.nodes[id] = { id, label: id, sub: '', shape: 'box', tone: '', mark: null, href: '', detail: [] }; m.order.push(id); } return m.nodes[id]; };
  let last = null;
  text.split('\n').forEach((raw, i) => {
    const ln = i + 1;
    if (!raw.trim() || /^\s*\/\//.test(raw)) return;
    if (/^\s+\S/.test(raw) && last) { last.detail.push(raw.trim()); return; }   // indented → detail of previous node
    let line = raw.trim(); last = null;
    let [mark, rest] = takeMark(line); line = rest;
    let mm;
    if ((mm = line.match(/^dir\s*[:=]?\s*(LR|TB)$/i))) { m.dir = mm[1].toUpperCase(); return; }
    if (line.startsWith('|')) {                                                     // grid row
      const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      m.grid.push(cells.map((c) => (c && c !== '.' && c !== '·') ? (node(c, ln), c) : null)); return;
    }
    if ((mm = line.match(/^group\s+(?:"([^"]+)"|([^:]+?))\s*:\s*(.+)$/i))) {
      const ids = mm[3].split(/[\s,]+/).filter(Boolean); ids.forEach((id) => node(id, ln));
      m.groups.push({ label: mm[1] || mm[2], ids, tone: '' }); return;
    }
    if ((mm = line.match(EDGE_RE))) {
      const [, a, back, op, b, label] = mm; node(a, ln); node(b, ln);
      m.edges.push({ from: a, to: b, label: (label || '').trim(), dash: op === '-->' || op === '..>', bold: op === '=>' || op === '==>', both: back === '<', mark, ln }); return;
    }
    if ((mm = line.match(/^([\w.-]+)\s*=\s*(.*)$/))) {                               // node def
      const n = node(mm[1], ln); let body = mm[2];
      const attr = body.match(/\[([^\]]*)\]\s*$/); if (attr) { body = body.slice(0, attr.index).trim();
        attr[1].split(/[\s,]+/).filter(Boolean).forEach((t) => { if (SHAPES.has(t)) n.shape = t; else if (TONES.has(t)) n.tone = t; else if (t.startsWith('#')) n.href = t; else m.errors.push(`line ${ln}: unknown node attribute "${t}" (shapes: ${[...SHAPES].join(' ')}; tones: ${[...TONES].join(' ')})`); }); }
      const parts = body.split(/\s+\/\s+/); n.label = parts[0].replace(/\\n/g, '\n') || n.id; n.sub = parts.slice(1).join(' / ');
      if (mark) n.mark = mark; last = n; return;
    }
    if (/^[\w.-]+$/.test(line)) { const n = node(line, ln); if (mark) n.mark = mark; last = n; return; }
    m.errors.push(`line ${ln}: couldn't parse "${line}" — expected  id = Label [attrs]  |  a -> b : label  |  | a | b |  |  group Name: a b`);
  });
  // grid sanity
  const seen = {}; m.grid.forEach((row, r) => row.forEach((id, c) => { if (!id) return; if (seen[id]) m.errors.push(`grid: "${id}" appears twice (${seen[id]} and ${r},${c})`); seen[id] = `${r},${c}`; }));
  if (m.grid.length) m.order.forEach((id) => { if (!seen[id]) m.errors.push(`grid: node "${id}" is used but has no cell — add it to a | row |`); });
  return m;
};

/** Sequence DSL → { actors:[{id,label}], steps:[{kind:'msg'|'note'|'div', ...}], errors } */
const layoutFlow = function layoutFlow(m, opt = {}) {
  const ids = m.order; if (!ids.length) return { W: 0, H: 0, boxes: {}, routes: [], groups: [] };
  const wrapAt = 18;
  // wrap labels at ~18 chars; long identifiers soft-break at camelCase / punctuation without inserting spaces
  const soft = (w) => w.length > wrapAt ? w.replace(/([a-z0-9])([A-Z])/g, '$1\u200b$2').replace(/([._/:-])(?=\w)/g, '$1\u200b').split('\u200b').map((t, i) => ({ t, sp: i === 0 })) : [{ t: w, sp: true }];
  const wrap = (s) => { const out = []; String(s).split('\n').forEach((para) => { let cur = ''; para.split(/\s+/).filter(Boolean).flatMap(soft).forEach(({ t, sp }) => { const join = cur ? cur + (sp ? ' ' : '') + t : t; if (join.length > wrapAt && cur) { out.push(cur); cur = t; } else cur = join; }); if (cur) out.push(cur); }); return out.length ? out : ['']; };
  const wrapSub = (t) => { t = String(t || ''); if (t.length <= 24) return t ? [t] : []; const mid = Math.round(t.length / 2); let at = -1; for (let d = 0; d < mid; d++) { if (/[\s/·,]/.test(t[mid - d])) { at = mid - d; break; } if (/[\s/·,]/.test(t[mid + d])) { at = mid + d; break; } } return at > 0 ? [t.slice(0, at + (t[at] === ' ' ? 0 : 1)).trim(), t.slice(at + 1).trim()] : [t]; };
  Object.values(m.nodes).forEach((n) => { n.lines = wrap(n.label); n.subLines = wrapSub(n.sub); });
  const maxLines = Math.max(...Object.values(m.nodes).map((n) => n.lines.length + n.subLines.length * 0.85));
  const longest = Math.max(...Object.values(m.nodes).flatMap((n) => { const pad = n.shape === 'actor' ? 22 : 0; return [...n.lines.map((l) => l.length * 7.3 + pad), ...n.subLines.map((l) => l.length * 6.5 + pad)]; }));
  const splitLbl = (t) => { t = String(t || ''); if (t.length <= 22) return t ? [t] : []; const mid = Math.round(t.length / 2); let at = -1; for (let d = 0; d < mid; d++) { if (t[mid - d] === ' ') { at = mid - d; break; } if (t[mid + d] === ' ') { at = mid + d; break; } } return at > 0 ? [t.slice(0, at), t.slice(at + 1)] : [t]; };
  m.edges.forEach((e) => { e.lines = splitLbl(e.label); e.tw = e.lines.length ? Math.max(24, Math.max(...e.lines.map((l) => l.length)) * 6.4 + 12) : 0; e.th = e.lines.length > 1 ? 30 : 18; });
  const maxLbl = Math.max(0, ...m.edges.map((e) => e.tw ? e.tw + 4 : 0));
  const NWID = opt.nodeW || clamp(Math.ceil(longest + 30), 120, 240), NH = Math.max(50, Math.ceil(20 + maxLines * 16)), GX = clamp(Math.ceil(maxLbl + 22), 56, 92), GY = m.edges.some((e) => e.th > 18) ? 62 : maxLbl > 0 ? 54 : 44, PAD = 28;
  let cells = {}; // id -> {c, r} possibly fractional c for auto layout
  if (m.grid.length) { m.grid.forEach((row, r) => row.forEach((id, c) => { if (id) cells[id] = { c, r }; })); }
  else {
    // longest-path layering over a DAG (back edges ignored via DFS)
    const out = {}, inn = {}; ids.forEach((id) => { out[id] = []; inn[id] = []; });
    const state = {}; const back = new Set();
    m.edges.forEach((e, i) => { if (e.from !== e.to) { out[e.from].push([e.to, i]); inn[e.to].push([e.from, i]); } });
    const dfs = (u) => { state[u] = 1; out[u].forEach(([v, i]) => { if (state[v] === 1) back.add(i); else if (!state[v]) dfs(v); }); state[u] = 2; };
    ids.forEach((id) => { if (!state[id]) dfs(id); });
    const layer = {}; const L = (u) => { if (layer[u] != null) return layer[u]; layer[u] = -1; let best = 0; inn[u].forEach(([p, i]) => { if (!back.has(i)) best = Math.max(best, L(p) + 1); }); return (layer[u] = best); };
    ids.forEach((id) => L(id));
    const layers = []; ids.forEach((id) => { (layers[layer[id]] ||= []).push(id); });
    // barycenter ordering, two down-sweeps
    for (let pass = 0; pass < 2; pass++) for (let i = 1; i < layers.length; i++) { const pos = {}; layers[i - 1].forEach((id, k) => { pos[id] = k; }); layers[i].sort((a, b) => { const pa = inn[a].map(([p]) => pos[p]).filter((x) => x != null), pb = inn[b].map(([p]) => pos[p]).filter((x) => x != null); const ba = pa.length ? pa.reduce((s, x) => s + x, 0) / pa.length : 1e9, bb = pb.length ? pb.reduce((s, x) => s + x, 0) / pb.length : 1e9; return ba - bb; }); }
    const maxN = Math.max(...layers.map((l) => l.length));
    layers.forEach((l, li) => l.forEach((id, k) => { const off = (maxN - l.length) / 2; cells[id] = m.dir === 'LR' ? { c: li, r: k + off } : { c: k + off, r: li }; }));
  }
  const boxes = {}; let W = 0, H = 0;
  ids.forEach((id) => { const cell = cells[id]; if (!cell) return; const n = m.nodes[id]; const x = PAD + cell.c * (NWID + GX), y = PAD + cell.r * (NH + GY); boxes[id] = { id, x, y, w: NWID, h: NH, cx: x + NWID / 2, cy: y + NH / 2, c: cell.c, r: cell.r, n }; W = Math.max(W, x + NWID + PAD); H = Math.max(H, y + NH + PAD); });
  // groups
  const groups = m.groups.map((g) => { const bs = g.ids.map((id) => boxes[id]).filter(Boolean); if (!bs.length) return null; const x0 = Math.min(...bs.map((b) => b.x)) - 14, y0 = Math.min(...bs.map((b) => b.y)) - 22, x1 = Math.max(...bs.map((b) => b.x + b.w)) + 14, y1 = Math.max(...bs.map((b) => b.y + b.h)) + 14; W = Math.max(W, x1 + 8); H = Math.max(H, y1 + 8); return { label: g.label, x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }).filter(Boolean);
  if (groups.length) { const miny = Math.min(0, ...groups.map((g) => g.y - 6)); if (miny < 0) { Object.values(boxes).forEach((b) => { b.y -= miny; b.cy -= miny; }); groups.forEach((g) => { g.y -= miny; }); H -= miny; } }
  // routing
  const occupied = (x, y, skip) => Object.values(boxes).some((b) => !skip.includes(b.id) && x > b.x - 4 && x < b.x + b.w + 4 && y > b.y - 4 && y < b.y + b.h + 4);
  const segClear = (x1, y1, x2, y2, skip) => { const steps = 24; for (let i = 1; i < steps; i++) { const t = i / steps; if (occupied(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, skip)) return false; } return true; };
  const lane = {}; const laneOff = (key) => { lane[key] = (lane[key] || 0) + 1; const k = lane[key] - 1; return k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 8; };
  // 1) decide each edge's exit/entry sides
  const plans = m.edges.map((e) => {
    const a = boxes[e.from], b = boxes[e.to]; if (!a || !b || a === b) return null;
    const skip = [a.id, b.id]; const dx = b.cx - a.cx, dy = b.cy - a.cy;
    const sameRow = Math.abs(dy) < 2, sameCol = Math.abs(dx) < 2;
    let orient; // 'h' = leave from left/right, 'v' = leave from top/bottom
    if (sameRow) orient = 'h'; else if (sameCol) orient = 'v';
    else {
      const hFirstClear = segClear(dx > 0 ? a.x + a.w : a.x, a.cy, dx > 0 ? b.x - GX / 2 : b.x + b.w + GX / 2, a.cy, skip) && segClear(dx > 0 ? b.x - GX / 2 : b.x + b.w + GX / 2, b.cy, dx > 0 ? b.x : b.x + b.w, b.cy, skip);
      const vFirstClear = segClear(a.cx, dy > 0 ? a.y + a.h : a.y, a.cx, dy > 0 ? b.y - GY / 2 : b.y + b.h + GY / 2, skip) && segClear(b.cx, dy > 0 ? b.y - GY / 2 : b.y + b.h + GY / 2, b.cx, dy > 0 ? b.y : b.y + b.h, skip);
      const cols = Math.abs(dx) / (NWID + GX), rws = Math.abs(dy) / (NH + GY);
      const preferH = Math.abs(cols - rws) < 0.2 ? m.dir === 'LR' : cols > rws;
      orient = preferH ? (hFirstClear ? 'h' : vFirstClear ? 'v' : 'h') : (vFirstClear ? 'v' : hFirstClear ? 'h' : 'v');
    }
    const sideA = orient === 'h' ? (dx >= 0 ? 'r' : 'l') : (dy >= 0 ? 'b' : 't');
    const sideB = orient === 'h' ? (sameRow ? (dx >= 0 ? 'l' : 'r') : (dx >= 0 ? 'l' : 'r')) : (sameCol ? (dy >= 0 ? 't' : 'b') : (dy >= 0 ? 't' : 'b'));
    return { e, a, b, skip, dx, dy, sameRow, sameCol, orient, sideA, sideB };
  }).filter(Boolean);
  // 2) spread ports: several edges on one side of a node get distinct attachment points
  const portList = {}; plans.forEach((p) => { (portList[p.a.id + p.sideA] ||= []).push([p, 'A']); (portList[p.b.id + p.sideB] ||= []).push([p, 'B']); });
  Object.values(portList).forEach((list) => {
    const side = list[0][1] === 'A' ? list[0][0].sideA : list[0][0].sideB; const horizSide = side === 't' || side === 'b';
    list.sort((u, v) => { const ou = u[1] === 'A' ? u[0].b : u[0].a, ov = v[1] === 'A' ? v[0].b : v[0].a; return horizSide ? ou.cx - ov.cx : ou.cy - ov.cy; });
    const n = list.length; list.forEach(([p, end], i) => { const off = (i - (n - 1) / 2) * (horizSide ? Math.min(22, (NWID - 30) / Math.max(1, n - 1)) : Math.min(14, (NH - 16) / Math.max(1, n - 1))); p['off' + end] = n > 1 ? off : 0; });
  });
  const port = (bx, side, off) => side === 'r' ? [bx.x + bx.w, bx.cy + off] : side === 'l' ? [bx.x, bx.cy + off] : side === 'b' ? [bx.cx + off, bx.y + bx.h] : [bx.cx + off, bx.y];
  const placed = []; // label rects for collision avoidance
  const routes = plans.map((p) => {
    const { e, a, b, skip, dx, dy, sameRow, sameCol, orient } = p;
    if (sameRow || sameCol) { const o = ((p.offA || 0) + (p.offB || 0)) / 2; p.offA = p.offB = o; }  // straight edges stay straight
    const [sx, sy] = port(a, p.sideA, p.offA), [tx, ty] = port(b, p.sideB, p.offB); let pts;
    if (orient === 'h') {
      if (sameRow && segClear(sx, sy, tx, ty, skip)) pts = [[sx, sy], [tx, ty]];
      else if (sameRow) { const gy = a.y - GY / 2 + laneOff('h' + a.r + ':' + Math.min(a.c, b.c)); pts = [[a.cx + p.offA, a.y], [a.cx + p.offA, gy], [b.cx + p.offB, gy], [b.cx + p.offB, b.y]]; }
      else { let mx = dx >= 0 ? b.x - GX / 2 : b.x + b.w + GX / 2; mx += laneOff('vx' + Math.round(mx / 10)); pts = [[sx, sy], [mx, sy], [mx, ty], [tx, ty]];
        if (!segClear(sx, sy, mx, sy, skip)) { const gy = (dy > 0 ? a.y + a.h + GY / 2 : a.y - GY / 2) + laneOff('hy' + Math.round((dy > 0 ? a.y + a.h : a.y) / 10)); pts = [[a.cx, dy > 0 ? a.y + a.h : a.y], [a.cx, gy], [mx, gy], [mx, ty], [tx, ty]]; } }
    } else {
      if (sameCol && segClear(sx, sy, tx, ty, skip)) pts = [[sx, sy], [tx, ty]];
      else if (sameCol) { const gx = a.x + a.w + GX / 2 + laneOff('v' + a.c + ':' + Math.min(a.r, b.r)); pts = [[a.x + a.w, a.cy + p.offA], [gx, a.cy + p.offA], [gx, b.cy + p.offB], [b.x + b.w, b.cy + p.offB]]; }
      else { let my = dy >= 0 ? b.y - GY / 2 : b.y + b.h + GY / 2; my += laneOff('hy' + Math.round(my / 10)); pts = [[sx, sy], [sx, my], [tx, my], [tx, ty]];
        if (!segClear(sx, sy, sx, my, skip)) { const gx = (dx > 0 ? a.x + a.w + GX / 2 : a.x - GX / 2) + laneOff('vx' + Math.round((dx > 0 ? a.x + a.w : a.x) / 10)); pts = [[dx > 0 ? a.x + a.w : a.x, a.cy], [gx, a.cy], [gx, my], [tx, my], [tx, ty]]; } }
    }
    // simplify collinear points
    pts = pts.filter((pt, i) => i === 0 || i === pts.length - 1 || !((pts[i - 1][0] === pt[0] && pt[0] === pts[i + 1][0]) || (pts[i - 1][1] === pt[1] && pt[1] === pts[i + 1][1])));
    const segsOut = pts.slice(0, -1).map((pt, i) => [pt[0], pt[1], pts[i + 1][0], pts[i + 1][1]]);
    return { e, pts, lx: 0, ly: 0, segs: segsOut };
  });
  // 3) labels — placed once every route is known: try along own segments (longest first), then just off the line,
  //    avoiding nodes, other labels, and other edges' lines
  routes.forEach((r) => {
    const { e, pts } = r; if (!e.label) return;
    const tw = e.tw, th = e.th; const others = routes.filter((o) => o !== r).flatMap((o) => o.segs);
    const segs = pts.slice(0, -1).map((pt, i) => ({ i, l: Math.hypot(pts[i + 1][0] - pt[0], pts[i + 1][1] - pt[1]) })).sort((u, v) => v.l - u.l);
    const at = (i, t) => [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
    const cands = []; segs.forEach(({ i }) => [0.5, 0.33, 0.67, 0.2, 0.8].forEach((t) => cands.push(at(i, t))));
    segs.slice(0, 2).forEach(({ i }) => { const horiz = Math.abs(pts[i + 1][1] - pts[i][1]) < 1; [0.5, 0.35, 0.65].forEach((t) => { const [cx, cy] = at(i, t); if (horiz) { cands.push([cx, cy - th / 2 - 5], [cx, cy + th / 2 + 5]); } else { cands.push([cx - tw / 2 - 6, cy], [cx + tw / 2 + 6, cy]); } }); });
    segs.slice(0, 2).forEach(({ i }) => { const horiz = Math.abs(pts[i + 1][1] - pts[i][1]) < 1; const [cx, cy] = at(i, 0.5); if (horiz) cands.push([cx, cy - NH / 2 - th / 2 - 4], [cx, cy + NH / 2 + th / 2 + 4]); else cands.push([cx - NWID / 2 - tw / 2 - 4, cy], [cx + NWID / 2 + tw / 2 + 4, cy]); });  // last resort: clear of the whole node row/column
    const bad = (x, y) => x - tw / 2 < 2 || y - th / 2 < 2 || placed.some((q) => Math.abs(q.x - x) < (q.w + tw) / 2 + 4 && Math.abs(q.y - y) < (q.h + th) / 2 + 2) || Object.values(boxes).some((bx) => x + tw / 2 > bx.x - 2 && x - tw / 2 < bx.x + bx.w + 2 && y + th / 2 > bx.y - 2 && y - th / 2 < bx.y + bx.h + 2);
    const onOther = (x, y) => others.some(([x1, y1, x2, y2]) => (Math.abs(y1 - y2) < 1 && Math.abs(y - y1) < th / 2 + 1 && x + tw / 2 > Math.min(x1, x2) && x - tw / 2 < Math.max(x1, x2)) || (Math.abs(x1 - x2) < 1 && Math.abs(x - x1) < tw / 2 + 1 && y + th / 2 > Math.min(y1, y2) && y - th / 2 < Math.max(y1, y2)));
    const ok = cands.find(([x, y]) => !bad(x, y) && !onOther(x, y)) || cands.find(([x, y]) => !bad(x, y)) || cands[0];
    [r.lx, r.ly] = ok; placed.push({ x: ok[0], y: ok[1], w: tw, h: th }); W = Math.max(W, ok[0] + tw / 2 + 6); H = Math.max(H, ok[1] + th / 2 + 6);
  });
  return { W, H, boxes, routes, groups, NH, NWID };
};
/* ─── End of html-plan code. ─── */

const TONE_CLASS = { accent: 'purple', muted: 'gray', ink: 'gray' };

/* ─── Expressions for .k-model: numbers, names, + - * / ^, ( ), and a few functions. No eval. ─── */
const FN = { min: Math.min, max: Math.max, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil, sqrt: Math.sqrt, pow: Math.pow, log: Math.log, exp: Math.exp };
function evalExpr(src, vars) {
  const toks = String(src).match(/\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[A-Za-z_]\w*|[-+*/^(),]/g) || [];
  if (toks.join('') !== String(src).replace(/\s+/g, '')) throw new Error(`cannot read "${src}"`);
  let i = 0;
  const peek = () => toks[i], next = () => toks[i++];
  const expr = () => { let v = term(); while (peek() === '+' || peek() === '-') { const op = next(); const r = term(); v = op === '+' ? v + r : v - r; } return v; };
  const term = () => { let v = power(); while (peek() === '*' || peek() === '/') { const op = next(); const r = power(); v = op === '*' ? v * r : v / r; } return v; };
  const power = () => { const v = unary(); if (peek() === '^') { next(); return Math.pow(v, power()); } return v; };
  const unary = () => (peek() === '-' ? (next(), -unary()) : peek() === '+' ? (next(), unary()) : atom());
  const atom = () => {
    const t = next();
    if (t === undefined) throw new Error(`"${src}" ends too early`);
    if (t === '(') { const v = expr(); if (next() !== ')') throw new Error(`missing ")" in "${src}"`); return v; }
    if (/^[\d.]/.test(t)) return parseFloat(t);
    if (/^[A-Za-z_]/.test(t)) {
      if (peek() === '(') {
        if (!FN[t]) throw new Error(`unknown function "${t}"`);
        next(); const args = []; if (peek() !== ')') { args.push(expr()); while (peek() === ',') { next(); args.push(expr()); } }
        if (next() !== ')') throw new Error(`missing ")" after ${t}(`); return FN[t](...args);
      }
      if (!(t in vars)) throw new Error(`unknown name "${t}"`);
      return vars[t];
    }
    throw new Error(`unexpected "${t}" in "${src}"`);
  };
  const v = expr(); if (i < toks.length) throw new Error(`unexpected "${toks[i]}" in "${src}"`); return v;
}
/** "name = expr" lines, in order. Returns the new vars. */
function evalDefs(text, vars) {
  const out = { ...vars };
  dedent(text).split(/\n|;/).map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).forEach((l) => {
    const m = l.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/); if (!m) throw new Error(`expected "name = expression", got "${l}"`);
    out[m[1]] = evalExpr(m[2], out);
  });
  return out;
}
/** Formats: x2 → 2.35×   %1 → 0.123 as 12.3%   $0 → $1,234   n1 → 1,234.5   An optional data-unit adds a suffix. */
function fmt(v, f = 'n1', unit = '') {
  if (!Number.isFinite(v)) return '—';
  const kind = f[0], d = +(f.slice(1) || 0);
  const num = (x) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const s = kind === 'x' ? num(v) + '×' : kind === '%' ? num(v * 100) + '%' : kind === '$' ? (v < 0 ? '−$' : '$') + num(Math.abs(v)) : num(v);
  return s.replace(/^-/, '−') + (unit ? ' ' + unit : '');
}

globalThis.Explain = { parseFlow, layoutFlow, evalExpr, evalDefs, fmt, dedent };
if (!HAS_DOM) return;

/* ─── Flow → SVG ─── */
let flowN = 0;
function shape(b) {
  const { x, y, w, h, n } = b;
  switch (n.shape) {
    case 'pill': case 'actor': return `<rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>`;
    case 'circle': return `<ellipse class="box" cx="${b.cx}" cy="${b.cy}" rx="${w / 2}" ry="${h / 2}"/>`;
    case 'diamond': return `<polygon class="box" points="${b.cx},${y} ${x + w},${b.cy} ${b.cx},${y + h} ${x},${b.cy}"/>`;
    case 'hex': return `<polygon class="box" points="${x + 14},${y} ${x + w - 14},${y} ${x + w},${b.cy} ${x + w - 14},${y + h} ${x + 14},${y + h} ${x},${b.cy}"/>`;
    case 'note': return `<rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="2" stroke-dasharray="4 3"/>`;
    case 'db': { const e = 7; return `<path class="box" d="M${x},${y + e} a${w / 2},${e} 0 0 1 ${w},0 v${h - 2 * e} a${w / 2},${e} 0 0 1 ${-w},0 z"/><path class="box" style="fill:none" d="M${x},${y + e} a${w / 2},${e} 0 0 0 ${w},0"/>`; }
    default: return `<rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>`;
  }
}
function drawFlow(el) {
  const m = parseFlow(srcOf(el));
  const L = layoutFlow(m);
  const id = 'kf' + (++flowN);
  const out = [];
  out.push(`<defs><marker id="${id}a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" style="stroke:var(--s)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`);
  L.groups.forEach((g) => out.push(`<g><rect class="grp" x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="12"/><text class="tl" x="${g.x + 10}" y="${g.y + 14}">${esc(g.label)}</text></g>`));
  L.routes.forEach((r) => {
    const d = r.pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const cls = ['arr', r.e.dash ? 'dash' : '', r.e.bold ? 'bold' : ''].join(' ').trim();
    out.push(`<path class="${cls}" d="${d}" marker-end="url(#${id}a)"${r.e.both ? ` marker-start="url(#${id}a)"` : ''}/>`);
  });
  L.routes.forEach((r) => {
    if (!r.e.label) return;
    const lines = r.e.lines, tw = r.e.tw, th = r.e.th;
    out.push(`<rect class="lbl-bg" x="${r.lx - tw / 2}" y="${r.ly - th / 2}" width="${tw}" height="${th}" rx="4"/>`);
    lines.forEach((t, i) => out.push(`<text class="tl" x="${r.lx}" y="${r.ly + (i - (lines.length - 1) / 2) * 13}" text-anchor="middle" dominant-baseline="central">${esc(t)}</text>`));
  });
  Object.values(L.boxes).forEach((b) => {
    const n = b.n, tone = TONE_CLASS[n.tone] || n.tone;
    const rows = [...n.lines.map((t) => ['th', t, 16]), ...n.subLines.map((t) => ['ts', t, 14])];
    const total = rows.reduce((s, r) => s + r[2], 0);
    let y = b.cy - total / 2 + (n.shape === 'db' ? 4 : 0);   // a cylinder's top curve takes space
    const txt = rows.map(([c, t, lh]) => { const s = `<text class="${c}" x="${b.cx}" y="${y + lh / 2}" text-anchor="middle" dominant-baseline="central">${esc(t)}</text>`; y += lh; return s; }).join('');
    const tip = n.detail.length ? `<title>${esc(n.detail.join('\n'))}</title>` : '';
    out.push(`<g class="${[tone ? 'c-' + tone : '', n.mark ? 'mark-' + n.mark : ''].join(' ').trim()}">${tip}${shape(b)}${txt}</g>`);
  });
  const W = Math.ceil(L.W), H = Math.ceil(L.H);
  const label = el.getAttribute('aria-label') || el.closest('figure')?.querySelector('figcaption')?.textContent || 'Flow diagram';
  el.style.setProperty('--w', W + 'px');
  el.innerHTML = (m.errors.length ? `<div class="k-err">${esc('Flow spec errors:\n' + m.errors.join('\n'))}</div>` : '') +
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label.trim())}" xmlns="http://www.w3.org/2000/svg">${out.join('')}</svg>`;
}

/* ─── Score dots: <span class="k-dots" data-score="3/5"> ─── */
function drawDots(el) {
  const [v, max] = el.dataset.score.split('/').map(Number);
  el.setAttribute('role', 'img'); el.setAttribute('aria-label', `${v} of ${max}`);
  el.innerHTML = Array.from({ length: max }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('') + `<span>${v}/${max}</span>`;
}

/* ─── Model: inputs [data-var], defs script, outputs [data-out], bars [data-bar] ─── */
function runModel(el) {
  const defs = el.querySelector(':scope > script[data-defs]')?.textContent || '';
  const inputs = [...el.querySelectorAll('input[data-var]')];
  const update = () => {
    let vars = {};
    inputs.forEach((i) => { vars[i.dataset.var] = i.valueAsNumber; });
    try { vars = evalDefs(defs, vars); } catch (e) { el.querySelector('.k-err')?.remove(); el.insertAdjacentHTML('afterbegin', `<div class="k-err">${esc(e.message)}</div>`); return; }
    el.querySelectorAll('[data-show]').forEach((o) => { o.textContent = fmt(vars[o.dataset.show], o.dataset.fmt, o.dataset.unit); });
    el.querySelectorAll('[data-out]').forEach((o) => { let v; try { v = evalExpr(o.dataset.out, vars); } catch (e) { o.textContent = '!'; o.title = e.message; return; } o.textContent = fmt(v, o.dataset.fmt, o.dataset.unit); });
    el.querySelectorAll('[data-bar]').forEach((o) => { let v = 0; try { v = evalExpr(o.dataset.bar, vars); } catch {} o.style.setProperty('--v', clamp(Number.isFinite(v) ? v : 0, 0, 100)); });
  };
  inputs.forEach((i) => i.addEventListener('input', update));
  if (!el.querySelector('[data-reset]')) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Reset'; b.dataset.reset = '';
    b.addEventListener('click', () => { inputs.forEach((i) => { i.value = i.defaultValue; }); update(); });
    (el.querySelector('.k-in') || el).append(b);
  }
  update();
}

/* ─── Steps ─── */
function runSteps(el) {
  const steps = [...el.querySelectorAll(':scope > .k-step')]; if (!steps.length) return;
  let k = 0;
  const nav = document.createElement('nav');
  nav.innerHTML = '<button type="button" data-d="-1">Back</button><button type="button" data-d="1">Next</button><span class="k-pos"></span>';
  el.append(nav);
  const show = () => { steps.forEach((s, i) => s.classList.toggle('on', i === k)); nav.querySelector('[data-d="-1"]').disabled = k === 0; nav.querySelector('[data-d="1"]').disabled = k === steps.length - 1; nav.querySelector('.k-pos').textContent = `${k + 1} / ${steps.length}`; };
  nav.addEventListener('click', (e) => { const d = +e.target.dataset?.d; if (d) { k = clamp(k + d, 0, steps.length - 1); show(); } });
  el.tabIndex = 0;
  el.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { k = clamp(k + 1, 0, steps.length - 1); show(); } if (e.key === 'ArrowLeft') { k = clamp(k - 1, 0, steps.length - 1); show(); } });
  show();
}

/* ─── Mermaid, only when the page has a pre.mermaid block ─── */
async function runMermaid() {
  const blocks = document.querySelectorAll('pre.mermaid'); if (!blocks.length) return;
  try {
    const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs');
    const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
    const bg2 = v('--bg2'), p = v('--p'), s = v('--s');
    mermaid.initialize({ startOnLoad: false, theme: 'base', fontFamily: v('--sans'), themeVariables: {
      background: 'transparent', primaryColor: bg2, primaryTextColor: p, primaryBorderColor: s, lineColor: s,
      secondaryColor: v('--bg3'), tertiaryColor: bg2, noteBkgColor: bg2, noteTextColor: p, actorBkg: bg2, actorBorder: s, actorTextColor: p, signalColor: s, signalTextColor: p, fontSize: '14px' } });
    await mermaid.run({ nodes: blocks });
  } catch (e) { blocks.forEach((b) => b.insertAdjacentHTML('beforebegin', `<div class="k-err">Mermaid did not load: ${esc(e.message)}</div>`)); }
}

function init() {
  document.documentElement.classList.remove('no-js');
  document.querySelectorAll('.k-flow').forEach((el) => { try { drawFlow(el); } catch (e) { el.innerHTML = `<div class="k-err">${esc(e.message)}</div>`; } });
  document.querySelectorAll('.k-dots[data-score]').forEach(drawDots);
  document.querySelectorAll('.k-model').forEach(runModel);
  document.querySelectorAll('.k-steps').forEach(runSteps);
  runMermaid();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
