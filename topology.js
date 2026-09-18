/* 2-2 連接圖 繪圖引擎（通常不需修改，設定請改 topology-config.js） */
(function () {
  'use strict';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var PAD_X = 90, PAD_Y = 70;
  var ICON_R = 34;                              // 線段在圖示外圍截斷的半徑
  var BOX = { l: 58, r: 58, t: 36, b: 68 };     // 節點（圖示+文字）佔用範圍
  var FONT = 11, LINE_H = 15;

  function el(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function textWidth(s) {
    var w = 0;
    for (var i = 0; i < s.length; i++) w += s.charCodeAt(i) > 0x2E80 ? FONT + 1 : FONT * 0.6;
    return w;
  }

  var CSS = [
    '.topo-wrap{margin:14px 0;background:#15202b;border-radius:10px;padding:12px 12px 4px;color:#d6dbe1}',
    '.topo-bar{display:flex;flex-wrap:wrap;gap:16px;align-items:center;font-size:.85rem;color:#9aa5b1;padding:2px 6px 8px}',
    '.topo-bar label{display:inline-flex;gap:6px;align-items:center;cursor:pointer;color:#d6dbe1}',
    '.topo-bar button{background:none;border:1px solid #3a4856;color:#d6dbe1;border-radius:5px;padding:3px 10px;cursor:pointer;font-size:.82rem}',
    '.topo-bar button:hover{border-color:#ffb547}',
    '.topo-scroll{overflow-x:auto}',
    '.topo-svg{display:block;width:100%;min-width:760px;height:auto;user-select:none}',
    '.topo-svg .t-link{fill:none;stroke:#b3bac2;stroke-width:1.6;opacity:.55;transition:opacity .2s,stroke .2s}',
    '.topo-svg .t-link.mgmt{stroke-dasharray:4 4;opacity:.2}',
    '.topo-svg.hide-mgmt .t-link.mgmt{display:none}',
    '.topo-svg.has-active .t-link{opacity:.06}',
    '.topo-svg .t-link.on{stroke:#ffb547;stroke-width:2.6;opacity:1;filter:url(#topo-glow);stroke-dasharray:10 6;animation:topo-flow 1s linear infinite}',
    '.topo-svg.hide-mgmt .t-link.mgmt.on{display:inline}',
    '@keyframes topo-flow{to{stroke-dashoffset:-16}}',
    '@media (prefers-reduced-motion:reduce){.topo-svg .t-link.on{animation:none;stroke-dasharray:none}}',
    '.topo-svg .t-node{cursor:pointer;transition:opacity .2s}',
    '.topo-svg .t-node:focus{outline:none}',
    '.topo-svg .t-node:focus-visible .t-plate{stroke:#ffb547;stroke-width:2}',
    '.topo-svg .t-plate{fill:#1f2d3a;stroke:#3a4856;stroke-width:1.2}',
    '.topo-svg .t-ic{fill:none;stroke:#c9d1d9;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}',
    '.topo-svg .t-ic-fill{fill:#c9d1d9}',
    '.topo-svg .t-led{fill:#5fd38d}',
    '.topo-svg .t-name{fill:#eef1f4;font-size:13px;font-weight:600;text-anchor:middle}',
    '.topo-svg .t-sub{fill:#8795a3;font-size:11px;text-anchor:middle}',
    '.topo-svg.has-active .t-node{opacity:.28}',
    '.topo-svg.has-active .t-node.peer{opacity:1}',
    '.topo-svg.has-active .t-node.sel{opacity:1}',
    '.topo-svg .t-node.sel .t-plate{stroke:#ffb547;stroke-width:2.4;filter:url(#topo-glow)}',
    '.topo-svg .t-node.peer .t-plate{stroke:#ffb547;stroke-width:1.4}',
    '.topo-svg .t-pill rect{fill:#0f1720;stroke:#ffb547;stroke-width:1}',
    '.topo-svg .t-pill text{fill:#ffe2b0;font-size:' + FONT + 'px;text-anchor:middle;dominant-baseline:central}',
    '.topo-svg .t-pill.src rect{stroke:#5b6b7a}',
    '.topo-svg .t-pill.src text{fill:#9aa5b1}',
    '.topo-list{font-size:.85rem;padding:6px 6px 10px;color:#c9d1d9;line-height:1.7}',
    '.topo-list b{color:#ffb547;font-weight:600}',
    '.topo-list table{border-collapse:collapse;margin-top:4px;background:transparent!important;width:auto!important}',
    '.topo-list th,.topo-list td{padding:2px 14px 2px 0!important;border:none!important;background:transparent!important;color:#c9d1d9!important;font-weight:400!important;white-space:nowrap}',
    '.topo-list th{color:#8795a3!important}',
    '.topo-list tr,.topo-list tr:hover,.topo-list tbody tr:nth-child(even){background:transparent!important}'
  ].join('\n');

  /* ---------- 圖示 ---------- */
  function drawIcon(g, type) {
    el('rect', { class: 't-plate', x: -30, y: -30, width: 60, height: 60, rx: 12 }, g);
    var P = function (d) { return el('path', { class: 't-ic', d: d }, g); };
    if (type === 'cloud') {
      P('M-14 8h26a9 9 0 0 0 0-18a13 13 0 0 0-25-3a10 10 0 0 0-1 21z');
    } else if (type === 'network') {
      P('M-5-17h10v8h-10zM-17 9h10v8h-10zM7 9h10v8h-10zM0-9v9M-12 9v-9h24v9');
    } else if (type === 'db') {
      P('M-13-12a13 5 0 1 0 26 0a13 5 0 1 0-26 0M-13-12v24a13 5 0 0 0 26 0v-24M-13 0a13 5 0 0 0 26 0');
    } else if (type === 'cache') {
      P('M4-16l-14 18h10l-4 14l14-18h-10z');
    } else if (type === 'storage') {
      P('M-15-14h30v8h-30zM-15-3h30v8h-30zM-15 8h30v8h-30z');
      el('circle', { class: 't-led', cx: 10, cy: -10, r: 1.8 }, g);
      el('circle', { class: 't-led', cx: 10, cy: 1, r: 1.8 }, g);
      el('circle', { class: 't-led', cx: 10, cy: 12, r: 1.8 }, g);
    } else if (type === 'gpu') {
      P('M-16-11h32v22h-32zM-16 15v-4M16 15v-4M-10 11v5M-4 11v5M2 11v5M8 11v5');
      el('circle', { class: 't-ic', cx: -5, cy: 0, r: 6 }, g);
      el('circle', { class: 't-ic', cx: 9, cy: 0, r: 3 }, g);
    } else if (type === 'windows') {
      ['-15,-13,13,12', '1,-13,14,12', '-15,1,13,12', '1,1,14,12'].forEach(function (s) {
        var a = s.split(',');
        el('rect', { class: 't-ic-fill', x: a[0], y: a[1], width: a[2], height: a[3], rx: 1 }, g);
      });
    } else { // server
      P('M-14-17h28v10h-28zM-14-4h28v10h-28zM-14 9h28v10h-28zM-9-12h8M-9 1h8M-9 14h8');
      el('circle', { class: 't-led', cx: 9, cy: -12, r: 1.8 }, g);
      el('circle', { class: 't-led', cx: 9, cy: 1, r: 1.8 }, g);
      el('circle', { class: 't-led', cx: 9, cy: 14, r: 1.8 }, g);
    }
  }

  /* ---------- 幾何 ---------- */
  function quad(a, c, b, t) {
    var u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  }
  function samplePath(a, c, b, n) {
    var pts = [], len = 0;
    for (var i = 0; i <= n; i++) {
      var p = quad(a, c, b, i / n);
      if (i) len += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
      p.s = len; pts.push(p);
    }
    return pts;
  }
  function pointAt(pts, s) {  // s：從起點起算的距離
    var total = pts[pts.length - 1].s;
    s = Math.max(0, Math.min(total, s));
    for (var i = 1; i < pts.length; i++) {
      if (pts[i].s >= s) {
        var k = (s - pts[i - 1].s) / ((pts[i].s - pts[i - 1].s) || 1);
        return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k };
      }
    }
    return pts[pts.length - 1];
  }
  function distToBox(p, n) {
    var dx = Math.max(n.x - BOX.l - p.x, 0, p.x - (n.x + BOX.r));
    var dy = Math.max(n.y - BOX.t - p.y, 0, p.y - (n.y + BOX.b));
    return Math.hypot(dx, dy);
  }
  function overlap(a, b) {
    return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  }
  function boxesHit(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  /* ---------- 主程式 ---------- */
  function build(C) {
    var host = document.querySelector(C.container);
    if (!host) { console.error('[topology] 找不到容器', C.container); return; }
    var cellW = C.cellW || 190, cellH = C.cellH || 160;
    var defFrom = C.defaultFromPort == null ? 'any' : C.defaultFromPort;

    if (!document.getElementById('topo-style')) {
      var st = document.createElement('style'); st.id = 'topo-style'; st.textContent = CSS;
      document.head.appendChild(st);
    }

    // 節點
    var nodes = {}, list = [], maxX = 0, maxY = 0, seen = {};
    C.nodes.forEach(function (n) {
      if (nodes[n.id]) { console.warn('[topology] 節點 id 重複:', n.id); return; }
      var key = n.col + ',' + n.row;
      if (seen[key]) console.warn('[topology] ' + n.id + ' 與 ' + seen[key] + ' 位置相同，會重疊');
      seen[key] = n.id;
      var o = Object.assign({}, n, { x: PAD_X + n.col * cellW, y: PAD_Y + n.row * cellH });
      nodes[n.id] = o; list.push(o);
      maxX = Math.max(maxX, o.x); maxY = Math.max(maxY, o.y);
    });
    list.forEach(function (a) {
      list.forEach(function (b) {
        if (a.id < b.id && Math.abs(a.x - b.x) < BOX.l + BOX.r + 8 && Math.abs(a.y - b.y) < BOX.t + BOX.b + 8)
          console.warn('[topology] ' + a.id + ' 與 ' + b.id + ' 距離太近，可能重疊');
      });
    });
    var servers = list.filter(function (n) { return !n.external; });

    // 展開 '*'
    var flat = [];
    C.links.forEach(function (l) {
      var froms = l.from === '*' ? servers.map(function (n) { return n.id; }) : [l.from];
      var tos = l.to === '*' ? servers.map(function (n) { return n.id; }) : [l.to];
      froms.forEach(function (f) {
        tos.forEach(function (t) {
          if (f === t) return;
          if (!nodes[f] || !nodes[t]) { console.warn('[topology] 連線節點不存在:', f, '→', t); return; }
          flat.push(Object.assign({}, l, { from: f, to: t }));
        });
      });
    });

    // 合併同一對節點
    var groups = {}, gList = [];
    flat.forEach(function (l) {
      var a = l.from < l.to ? l.from : l.to, b = a === l.from ? l.to : l.from, key = a + '|' + b;
      var g = groups[key];
      if (!g) { g = groups[key] = { a: a, b: b, items: [], labels: {}, ab: false, ba: false }; g.labels[a] = []; g.labels[b] = []; gList.push(g); }
      g.items.push(l);
      if (l.from === a) g.ab = true; else g.ba = true;
      var tl = [l.port, l.service].filter(Boolean).join(' · ');
      if (g.labels[l.to].indexOf(tl) < 0) g.labels[l.to].push(tl);
      var fl = l.fromPort != null ? l.fromPort : defFrom;
      if (fl && g.labels[l.from].indexOf(fl) < 0) g.labels[l.from].push(fl);
      g.labels[l.to].isTarget = true;
    });
    gList.forEach(function (g) {
      g.mgmt = g.items.every(function (l) { return l.group === 'mgmt'; });
      // 目的端 label 放前面、來源端(any) 放最後
      [g.a, g.b].forEach(function (id) {
        var arr = g.labels[id];
        var src = g.items.filter(function (l) { return l.from === id; }).map(function (l) { return l.fromPort != null ? l.fromPort : defFrom; });
        g.labels[id] = arr.filter(function (t) { return src.indexOf(t) < 0; }).concat(arr.filter(function (t) { return src.indexOf(t) >= 0; }));
        g.labels[id].srcOnly = g.items.every(function (l) { return l.to !== id; });
      });

      // 找一條不穿過其他節點的曲線
      var A = nodes[g.a], B = nodes[g.b];
      var dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
      var nx = -dy / L, ny = dx / L, mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      var best = null;
      [0, 30, -30, 55, -55, 80, -80, 110, -110, 145, -145, 185, -185, 230, -230, 280, -280].some(function (off) {
        var c = { x: mx + nx * off * 2, y: my + ny * off * 2 };  // 二次曲線中點偏移 = off
        var pts = samplePath(A, c, B, 48), clear = Infinity;
        pts.forEach(function (p) {
          list.forEach(function (n) {
            if (n.id === g.a || n.id === g.b) return;
            clear = Math.min(clear, distToBox(p, n));
          });
        });
        if (!best || clear > best.clear) best = { c: c, pts: pts, clear: clear };
        return clear >= 10;
      });
      g.pts = best.pts;
      if (best.clear < 10) console.warn('[topology] 連線 ' + g.a + '–' + g.b + ' 無法完全避開其他節點，請調整位置');
    });

    // DOM
    var W = maxX + PAD_X, H = maxY + PAD_Y + 20;
    host.innerHTML = '';
    var wrap = document.createElement('div'); wrap.className = 'topo-wrap';
    var bar = document.createElement('div'); bar.className = 'topo-bar';
    bar.innerHTML = '<span>點選伺服器以顯示其連線與 port</span>' +
      '<label><input type="checkbox" class="topo-mgmt" checked> 顯示管理連線（虛線）</label>' +
      '<button type="button" class="topo-reset">清除選取</button>';
    var sc = document.createElement('div'); sc.className = 'topo-scroll';
    var info = document.createElement('div'); info.className = 'topo-list';
    wrap.appendChild(bar); wrap.appendChild(sc); wrap.appendChild(info); host.appendChild(wrap);

    var svg = el('svg', { class: 'topo-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': '伺服器連接圖' }, sc);
    var defs = el('defs', {}, svg);
    // 用 userSpaceOnUse：垂直/水平直線的外框寬或高為 0，若用預設的 objectBoundingBox，套上發光濾鏡後整條線會消失
    var f = el('filter', { id: 'topo-glow', filterUnits: 'userSpaceOnUse', x: -W, y: -H, width: W * 3, height: H * 3 }, defs);
    el('feGaussianBlur', { stdDeviation: 3, result: 'b' }, f);
    var fm = el('feMerge', {}, f); el('feMergeNode', { in: 'b' }, fm); el('feMergeNode', { in: 'SourceGraphic' }, fm);
    [['topo-arr', '#b3bac2'], ['topo-arr-on', '#ffb547']].forEach(function (m) {
      var mk = el('marker', { id: m[0], viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0 0L10 5L0 10z', fill: m[1] }, mk);
    });
    var bg = el('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent' }, svg);
    var gLinks = el('g', {}, svg), gNodes = el('g', {}, svg), gPills = el('g', {}, svg);

    gList.forEach(function (g) {
      var total = g.pts[g.pts.length - 1].s, d = '';
      for (var s = ICON_R; s <= total - ICON_R + 0.01; s += 6) {
        var p = pointAt(g.pts, Math.min(s, total - ICON_R));
        d += (d ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
      }
      var e = pointAt(g.pts, total - ICON_R);
      d += 'L' + e.x.toFixed(1) + ' ' + e.y.toFixed(1);
      g.el = el('path', { class: 't-link' + (g.mgmt ? ' mgmt' : ''), d: d }, gLinks);
      g.setArrows = function (on) {
        var id = on ? 'url(#topo-arr-on)' : 'url(#topo-arr)';
        g.el.setAttribute('marker-end', g.ab ? id : '');
        g.el.setAttribute('marker-start', g.ba ? id : '');
      };
      g.setArrows(false);
    });

    list.forEach(function (n) {
      var g = el('g', { class: 't-node', transform: 'translate(' + n.x + ',' + n.y + ')', tabindex: 0, role: 'button', 'aria-label': n.label }, gNodes);
      el('title', {}, g).textContent = n.label + (n.ip ? '  ' + n.ip : '');
      drawIcon(g, n.icon);
      el('text', { class: 't-name', y: 47 }, g).textContent = n.label;
      if (n.sub) el('text', { class: 't-sub', y: 62 }, g).textContent = n.sub;
      g.addEventListener('click', function (ev) { ev.stopPropagation(); select(active === n.id ? null : n.id); });
      g.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(active === n.id ? null : n.id); }
        if (ev.key === 'Escape') select(null);
      });
      n.el = g;
    });

    var active = null;
    function drawPills(sel) {
      gPills.innerHTML = '';
      var placed = list.map(function (n) {  // 先把節點範圍當成障礙物
        return { x: n.x - BOX.l, y: n.y - BOX.t, w: BOX.l + BOX.r, h: BOX.t + BOX.b };
      });
      var todo = [];
      sel.forEach(function (g) {
        [g.a, g.b].forEach(function (id) {
          if (g.labels[id].length) todo.push({ g: g, id: id, lines: g.labels[id], src: g.labels[id].srcOnly });
        });
      });
      todo.sort(function (p, q) { return p.src - q.src; }); // 目的端 port 優先卡位
      var srcSeen = {};
      todo = todo.filter(function (t) {  // 同一節點上相同的來源端文字只標一次，避免擠成一團
        if (!t.src) return true;
        var k = t.id + '|' + t.lines.join('/');
        if (srcSeen[k]) return false;
        return (srcSeen[k] = true);
      });
      todo.forEach(function (t) {
        var total = t.g.pts[t.g.pts.length - 1].s, fromA = t.id === t.g.a;
        var w = Math.max.apply(null, t.lines.map(textWidth)) + 14, h = t.lines.length * LINE_H + 6;
        var best = null, loose = null, maxD = Math.max(62, total - 44);
        for (var dist = 58; dist <= maxD; dist += 4) {
          var p0 = pointAt(t.g.pts, fromA ? dist : total - dist);
          var p1 = pointAt(t.g.pts, fromA ? dist + 2 : total - dist - 2);
          var tx = p1.x - p0.x, ty = p1.y - p0.y, tl = Math.hypot(tx, ty) || 1;
          var nx = -ty / tl, ny = tx / tl;
          [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6].forEach(function (k) {
            var off = k * (h / 2 + 5);
            var b2 = { x: p0.x + nx * off - w / 2, y: p0.y + ny * off - h / 2, w: w, h: h };
            var cost = dist + Math.abs(off) * 1.6;
            if (best && cost >= best.cost) return;
            var ov = placed.reduce(function (sum, b) { return sum + overlap(b2, b); }, 0);
            if (b2.x < 2 || b2.y < 2 || b2.x + w > W - 2 || b2.y + h > H - 2) ov += 1e6; // 不可超出圖框
            if (ov > 0) { if (!loose || ov < loose.ov) loose = { box: b2, ov: ov }; return; }
            best = { box: b2, cost: cost };
          });
        }
        if (!best) best = loose;
        var box = best.box;
        placed.push(box);
        var pg = el('g', { class: 't-pill' + (t.src ? ' src' : '') }, gPills);
        el('rect', { x: box.x, y: box.y, width: w, height: h, rx: 4 }, pg);
        t.lines.forEach(function (s, i) {
          el('text', { x: box.x + w / 2, y: box.y + 3 + LINE_H / 2 + i * LINE_H }, pg).textContent = s;
        });
      });
    }

    function renderInfo(id) {
      if (!id) { info.innerHTML = ''; return; }
      var n = nodes[id], rows = '', esc = function (s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); };
      flat.forEach(function (l) {
        if (l.from !== id && l.to !== id) return;
        if (l.group === 'mgmt' && !showMgmt.checked) return;
        rows += '<tr><td>' + (l.from === id ? '出站' : '入站') + '</td><td>' + esc(nodes[l.from].label) + ' → ' + esc(nodes[l.to].label) +
          '</td><td>' + esc(l.port) + '</td><td>' + esc(l.service) + '</td></tr>';
      });
      info.innerHTML = '<b>' + esc(n.label) + '</b>' + (n.ip ? '　' + esc(n.ip) : '') +
        '<table data-search="off" data-sortable="off"><thead><tr><th>方向</th><th>連線</th><th>port</th><th>服務</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function select(id) {
      active = id;
      svg.classList.toggle('has-active', !!id);
      var sel = [];
      gList.forEach(function (g) {
        var on = !!id && (g.a === id || g.b === id) && !(g.mgmt && !showMgmt.checked);
        g.el.classList.toggle('on', on);
        g.setArrows(on);
        if (on) { sel.push(g); gLinks.appendChild(g.el); }
      });
      list.forEach(function (n) {
        n.el.classList.toggle('sel', n.id === id);
        n.el.classList.toggle('peer', sel.some(function (g) { return n.id !== id && (g.a === n.id || g.b === n.id); }));
      });
      drawPills(sel);
      renderInfo(id);
    }

    var showMgmt = bar.querySelector('.topo-mgmt');
    showMgmt.addEventListener('change', function () {
      svg.classList.toggle('hide-mgmt', !showMgmt.checked);
      select(active);
    });
    bar.querySelector('.topo-reset').addEventListener('click', function () { select(null); });
    bg.addEventListener('click', function () { select(null); });

    return { select: select, groups: gList, nodes: nodes };
  }

  function init() {
    if (!window.TOPOLOGY_CONFIG) { console.error('[topology] 未載入 topology-config.js'); return; }
    window.topology = build(window.TOPOLOGY_CONFIG);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
