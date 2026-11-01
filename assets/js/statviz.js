/* statviz.js — small SVG chart kit for the Statistics track.
   Rules (from the site's dataviz method): one y-axis, thin marks, hairline solid grid, 2px lines,
   4px rounded bar ends, 2px surface gaps/rings, legend for >= 2 series, hover tooltips, and a
   data-table view for every chart. Colours come from CSS custom properties (--viz-*), so the
   light/dark theme switch needs no re-render. */
(function (global) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var V = {};

  /* ---------------- helpers ---------------- */
  function svgEl(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function htmlEl(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  V.fmt = function (v, d) {
    if (v === null || v === undefined || !isFinite(v)) return "—";
    var a = Math.abs(v);
    if (d === undefined) d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
    if (a < 0.5 * Math.pow(10, -d)) v = 0;                 // no "-0.000"
    return Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  V.compact = function (v) {
    var a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toFixed(a >= 1e10 ? 0 : 1).replace(/\.0$/, "") + "B";
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
    if (a === 0) return "0";
    if (a < 0.01) return v.toExponential(0);
    return String(Math.round(v * 1000) / 1000);
  };
  function niceStep(span, count) {
    var raw = span / Math.max(1, count), mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
    return (r >= 5 ? 10 : r >= 2 ? 5 : r >= 1 ? 2 : 1) * mag;
  }
  function niceTicks(lo, hi, count) {
    if (lo === hi) { lo -= 1; hi += 1; }
    var step = niceStep(hi - lo, count || 5), start = Math.ceil(lo / step - 1e-9) * step, out = [];
    for (var v = start; v <= hi + step * 1e-9; v += step) out.push(Math.round(v / step) * step);
    return out;
  }
  function niceDomain(lo, hi, count) {
    if (lo === hi) { lo -= 1; hi += 1; }
    var step = niceStep(hi - lo, count || 5);
    return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
  }
  function linear(d0, d1, r0, r1) {
    var f = function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
    f.invert = function (p) { return d0 + (p - r0) / (r1 - r0) * (d1 - d0); };
    f.domain = [d0, d1]; return f;
  }
  function logScale(d0, d1, r0, r1) {
    var l0 = Math.log10(d0), l1 = Math.log10(d1);
    var f = function (v) { return r0 + (Math.log10(Math.max(v, d0)) - l0) / (l1 - l0) * (r1 - r0); };
    f.invert = function (p) { return Math.pow(10, l0 + (p - r0) / (r1 - r0) * (l1 - l0)); };
    f.domain = [d0, d1]; f.log = true; return f;
  }
  function logTicks(d0, d1) {
    var out = [], a = Math.floor(Math.log10(d0)), b = Math.ceil(Math.log10(d1));
    for (var e = a; e <= b; e++) { var v = Math.pow(10, e); if (v >= d0 * 0.999 && v <= d1 * 1.001) out.push(v); }
    return out;
  }
  function timeTicks(t0, t1) {
    var y0 = new Date(t0).getUTCFullYear(), y1 = new Date(t1).getUTCFullYear(), span = y1 - y0;
    var step = span > 60 ? 10 : span > 30 ? 5 : span > 12 ? 2 : 1, out = [];
    if (span < 2) {                       // months
      var d = new Date(Date.UTC(y0, new Date(t0).getUTCMonth(), 1));
      while (d.getTime() <= t1) { if (d.getTime() >= t0) out.push(d.getTime()); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 1)); }
      return { ticks: out, fmt: function (t) { var x = new Date(t); return x.toLocaleString("en-US", { month: "short", timeZone: "UTC" }) + " " + x.getUTCFullYear(); } };
    }
    for (var y = Math.ceil(y0 / step) * step; y <= y1; y += step) { var tt = Date.UTC(y, 0, 1); if (tt >= t0 && tt <= t1) out.push(tt); }
    return { ticks: out, fmt: function (t) { return String(new Date(t).getUTCFullYear()); } };
  }
  V.toTime = function (s) {                // "YYYY-MM-DD" or "YYYY-MM" -> ms (UTC)
    var p = String(s).split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
  };
  V.dateStr = function (t, monthOnly) {
    var d = new Date(t), m = String(d.getUTCMonth() + 1).padStart(2, "0");
    return monthOnly ? d.getUTCFullYear() + "-" + m : d.getUTCFullYear() + "-" + m + "-" + String(d.getUTCDate()).padStart(2, "0");
  };

  /* ---------------- frame: wrapper, legend, svg, tooltip, table ---------------- */
  function frame(el, opts) {
    if (typeof el === "string") el = document.getElementById(el);
    el.innerHTML = "";
    el.classList.add("viz");
    var legend = null;
    if (opts.legend && opts.legend.length >= 2) {
      legend = htmlEl("div", "viz-legend");
      opts.legend.forEach(function (it) {
        var item = htmlEl("span", "viz-legend-item");
        var sw = htmlEl("span", "viz-swatch " + (it.kind === "line" ? "line" : "box"));
        sw.style.setProperty("--sw", "var(--viz-" + (it.slot || "s1") + ")");
        item.appendChild(sw); item.appendChild(document.createTextNode(it.name));
        legend.appendChild(item);
      });
      el.appendChild(legend);
    }
    var plot = htmlEl("div", "viz-plot");
    el.appendChild(plot);
    var width = Math.max(280, plot.clientWidth || el.clientWidth || 640), height = opts.height || 300;
    var m = { top: opts.marginTop || (opts.yLabel || opts.kind === "hist" ? 30 : 14), right: opts.marginRight || 18, bottom: opts.xLabel ? 50 : 32, left: opts.marginLeft || 56 };
    var svg = svgEl("svg", { viewBox: "0 0 " + width + " " + height, width: "100%", height: height, role: "img",
                             "aria-label": opts.ariaLabel || opts.title || "chart", "class": "viz-svg" }, plot);
    var tip = htmlEl("div", "viz-tip"); tip.setAttribute("role", "status"); plot.appendChild(tip);
    return { el: el, plot: plot, svg: svg, tip: tip, w: width, h: height, m: m,
             iw: width - m.left - m.right, ih: height - m.top - m.bottom };
  }
  function showTip(f, html, px, py) {
    f.tip.innerHTML = html; f.tip.classList.add("on");
    var tw = f.tip.offsetWidth, th = f.tip.offsetHeight, pw = f.plot.clientWidth;
    var scale = pw / f.w, x = px * scale + 14, y = py * scale - th - 10;
    if (x + tw > pw) x = px * scale - tw - 14;
    if (y < 0) y = py * scale + 14;
    f.tip.style.left = Math.max(0, x) + "px"; f.tip.style.top = y + "px";
  }
  function hideTip(f) { f.tip.classList.remove("on"); }
  function svgPoint(f, evt) {
    var r = f.svg.getBoundingClientRect(), cx = evt.touches ? evt.touches[0].clientX : evt.clientX,
        cy = evt.touches ? evt.touches[0].clientY : evt.clientY;
    return { x: (cx - r.left) * f.w / r.width, y: (cy - r.top) * f.h / r.height };
  }
  function addTable(el, headers, rows, caption) {
    var d = htmlEl("details", "viz-table");
    var s = htmlEl("summary", null, "Data table" + (rows.length > 400 ? " (first 400 of " + rows.length.toLocaleString() + " rows)" : ""));
    d.appendChild(s);
    var wrap = htmlEl("div", "viz-table-wrap"), t = htmlEl("table");
    if (caption) { var c = htmlEl("caption", null, caption); t.appendChild(c); }
    var thead = htmlEl("thead"), tr = htmlEl("tr");
    headers.forEach(function (h) { tr.appendChild(htmlEl("th", null, h)); }); thead.appendChild(tr); t.appendChild(thead);
    var tb = htmlEl("tbody");
    rows.slice(0, 400).forEach(function (r) {
      var row = htmlEl("tr"); r.forEach(function (c) { row.appendChild(htmlEl("td", null, c)); }); tb.appendChild(row);
    });
    t.appendChild(tb); wrap.appendChild(t); d.appendChild(wrap); el.appendChild(d);
  }
  function axes(f, xs, ys, o) {
    var g = svgEl("g", { "class": "viz-axes" }, f.svg), m = f.m;
    (o.yTicks || []).forEach(function (v) {
      var y = ys(v);
      svgEl("line", { x1: m.left, x2: m.left + f.iw, y1: y, y2: y, "class": "viz-grid" }, g);
      svgEl("text", { x: m.left - 8, y: y + 4, "class": "viz-tick", "text-anchor": "end" }, g).textContent = (o.yFmt || V.compact)(v);
    });
    (o.xTicks || []).forEach(function (v) {
      var x = xs(v);
      if (o.xGrid) svgEl("line", { x1: x, x2: x, y1: m.top, y2: m.top + f.ih, "class": "viz-grid" }, g);
      svgEl("line", { x1: x, x2: x, y1: m.top + f.ih, y2: m.top + f.ih + 4, "class": "viz-axis" }, g);
      svgEl("text", { x: x, y: m.top + f.ih + 18, "class": "viz-tick", "text-anchor": "middle" }, g).textContent = (o.xFmt || V.compact)(v);
    });
    svgEl("line", { x1: m.left, x2: m.left + f.iw, y1: m.top + f.ih, y2: m.top + f.ih, "class": "viz-axis" }, g);
    if (o.xLabel) {
      var cx = m.left + f.iw / 2, xl = svgEl("text", { x: cx, y: f.h - 8, "class": "viz-label", "text-anchor": "middle" }, g);
      xl.textContent = o.xLabel;
      // a long label on a narrow (phone) chart: shrink it to fit inside the chart instead of spilling past its edges
      var room = 2 * Math.min(cx, f.w - cx) - 8, len = xl.getComputedTextLength();
      if (len > room) xl.style.fontSize = (parseFloat(getComputedStyle(xl).fontSize) * room / len).toFixed(1) + "px";
    }
    if (o.yLabel) svgEl("text", { x: m.left, y: m.top - 2, "class": "viz-label", "text-anchor": "start", dy: "-0.2em" }, g).textContent = o.yLabel;
  }
  function roundedTopBar(x, y, w, h, r) {   // rounded data-end at the top, square at baseline
    r = Math.min(r, w / 2, Math.abs(h));
    if (h <= 0) return "";
    return "M" + x + "," + (y + h) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y +
           "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h) + "Z";
  }
  function roundedRightBar(x, y, w, h, r) {
    r = Math.min(r, h / 2, Math.abs(w));
    if (w <= 0) return "";
    return "M" + x + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) +
           "V" + (y + h - r) + "Q" + (x + w) + "," + (y + h) + " " + (x + w - r) + "," + (y + h) + "H" + x + "Z";
  }
  function onResize(el, fn) {
    var last = el.clientWidth, t;
    window.addEventListener("resize", function () {
      clearTimeout(t); t = setTimeout(function () { if (Math.abs(el.clientWidth - last) > 30) { last = el.clientWidth; fn(); } }, 200);
    });
  }

  /* ---------------- histogram ---------------- */
  V.histogram = function (el, values, o) {
    o = o || {};
    var draw = function () {
      var vals = values.filter(function (v) { return v !== null && isFinite(v) && (!o.log || v > 0); });
      var tv = o.log ? vals.map(function (v) { return Math.log10(v); }) : vals;
      var lo = o.domain ? (o.log ? Math.log10(o.domain[0]) : o.domain[0]) : Math.min.apply(null, tv),
          hi = o.domain ? (o.log ? Math.log10(o.domain[1]) : o.domain[1]) : Math.max.apply(null, tv);
      var bins = Stats.histogram(tv, o.bins || 30, lo, hi), n = vals.length;
      var f = frame(el, Object.assign({ kind: "hist" }, o)), ymax = Math.max.apply(null, bins.map(function (b) { return o.density ? b.count / n / (b.x1 - b.x0) : b.count; }));
      if (o.curve) { for (var i = 0; i <= 100; i++) { var xv = lo + (hi - lo) * i / 100; ymax = Math.max(ymax, o.curve(xv)); } }
      var yd = niceDomain(0, ymax, 4), xs = linear(lo, hi, f.m.left, f.m.left + f.iw), ys = linear(0, yd[1], f.m.top + f.ih, f.m.top);
      var xt = o.log ? logTicks(Math.pow(10, lo), Math.pow(10, hi)).map(function (v) { return Math.log10(v); }) : niceTicks(lo, hi, 6);
      axes(f, xs, ys, { yTicks: niceTicks(0, yd[1], 4), xTicks: xt, xLabel: o.xLabel, yLabel: o.yLabel || (o.density ? "Density" : "Count"),
                        xFmt: o.log ? function (v) { return V.compact(Math.pow(10, v)); } : o.xFmt, yFmt: o.density ? function (v) { return v === 0 ? "0" : Math.abs(v) >= 0.01 ? V.fmt(v, 3) : Number(v.toPrecision(2)).toExponential(); } : undefined });
      var g = svgEl("g", {}, f.svg), bw = (xs(bins[0].x1) - xs(bins[0].x0));
      bins.forEach(function (b) {
        var gap = bw > 8 ? 2 : bw > 4 ? 1 : 0.4;
        var val = o.density ? b.count / n / (b.x1 - b.x0) : b.count, y = ys(val), x = xs(b.x0) + gap / 2;
        var hl = o.highlight && o.highlight(b, o.log);
        var p = svgEl("path", { d: roundedTopBar(x, y, Math.max(0.6, bw - gap), f.m.top + f.ih - y, bw > 8 ? 4 : 1),
                                "class": "viz-bar " + (hl ? "viz-fill-s2" : "viz-fill-" + (o.slot || "s1")), tabindex: val > 0 ? 0 : -1 }, g);
        var a0 = o.log ? Math.pow(10, b.x0) : b.x0, a1 = o.log ? Math.pow(10, b.x1) : b.x1;
        var html = "<b>" + V.fmt(a0, o.binDigits) + " – " + V.fmt(a1, o.binDigits) + "</b>" + (o.unit ? " " + esc(o.unit) : "") +
                   "<br>" + b.count.toLocaleString() + " of " + n.toLocaleString() + " (" + V.fmt(100 * b.count / n, 1) + "%)";
        var hit = svgEl("rect", { x: xs(b.x0), y: f.m.top, width: bw, height: f.ih, "class": "viz-hit" }, g);
        [hit, p].forEach(function (t) {
          t.addEventListener("mousemove", function (e) { var pt = svgPoint(f, e); showTip(f, html, pt.x, pt.y); });
          t.addEventListener("mouseleave", function () { hideTip(f); });
        });
        p.addEventListener("focus", function () { showTip(f, html, x + bw / 2, y); }); p.addEventListener("blur", function () { hideTip(f); });
      });
      if (o.curve) {
        var d = ""; for (var k = 0; k <= 200; k++) { var xv2 = lo + (hi - lo) * k / 200; d += (k ? "L" : "M") + xs(xv2) + "," + ys(o.curve(xv2)); }
        svgEl("path", { d: d, "class": "viz-line viz-stroke-s2" }, f.svg);
      }
      (o.markers || []).forEach(function (mk) {
        var xv3 = o.log ? Math.log10(mk.x) : mk.x; if (xv3 < lo || xv3 > hi) return;
        var x2 = xs(xv3);
        svgEl("line", { x1: x2, x2: x2, y1: f.m.top, y2: f.m.top + f.ih, "class": "viz-ref" }, f.svg);
        svgEl("text", { x: x2 + 4, y: f.m.top + 12 + (mk.row || 0) * 14, "class": "viz-annot" }, f.svg).textContent = mk.label;
      });
      addTable(f.el, ["Bin from", "Bin to", "Count", "Share"], bins.map(function (b) {
        var a0 = o.log ? Math.pow(10, b.x0) : b.x0, a1 = o.log ? Math.pow(10, b.x1) : b.x1;
        return [V.fmt(a0, o.binDigits), V.fmt(a1, o.binDigits), b.count.toLocaleString(), V.fmt(100 * b.count / n, 1) + "%"];
      }));
    };
    draw(); onResize(typeof el === "string" ? document.getElementById(el) : el, draw);
  };

  /* ---------------- line chart (time or linear x) ---------------- */
  V.line = function (el, series, o) {
    o = o || {};
    var draw = function () {
      var f = frame(el, Object.assign({ legend: series.map(function (s) { return { name: s.name, slot: s.slot, kind: "line" }; }) }, o));
      var xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
      series.forEach(function (s) { s.x.forEach(function (v, i) { if (s.y[i] === null || !isFinite(s.y[i])) return; xmin = Math.min(xmin, v); xmax = Math.max(xmax, v); ymin = Math.min(ymin, s.y[i]); ymax = Math.max(ymax, s.y[i]); }); });
      if (o.yZero) ymin = Math.min(0, ymin);
      if (o.yDomain) { ymin = o.yDomain[0]; ymax = o.yDomain[1]; }
      var yd = o.yDomain || niceDomain(ymin, ymax, 5), xs = linear(xmin, xmax, f.m.left, f.m.left + f.iw), ys = linear(yd[0], yd[1], f.m.top + f.ih, f.m.top);
      var tt = o.xType === "time" ? timeTicks(xmin, xmax) : { ticks: niceTicks(xmin, xmax, 6), fmt: o.xFmt };
      axes(f, xs, ys, { yTicks: niceTicks(yd[0], yd[1], 5), xTicks: tt.ticks, xFmt: tt.fmt, xLabel: o.xLabel, yLabel: o.yLabel, yFmt: o.yFmt });
      (o.bands || []).forEach(function (b) {
        svgEl("rect", { x: xs(b.from), y: f.m.top, width: Math.max(1, xs(b.to) - xs(b.from)), height: f.ih, "class": "viz-band" }, f.svg);
        if (b.label) svgEl("text", { x: xs(b.from) + 4, y: f.m.top + 12, "class": "viz-annot" }, f.svg).textContent = b.label;
      });
      if (o.zeroLine && yd[0] < 0 && yd[1] > 0) svgEl("line", { x1: f.m.left, x2: f.m.left + f.iw, y1: ys(0), y2: ys(0), "class": "viz-axis" }, f.svg);
      series.forEach(function (s) {
        var d = "", pen = false;
        s.x.forEach(function (v, i) {
          var yv = s.y[i]; if (yv === null || !isFinite(yv)) { pen = false; return; }
          d += (pen ? "L" : "M") + xs(v).toFixed(1) + "," + ys(yv).toFixed(1); pen = true;
        });
        if (o.area && series.length === 1) {
          svgEl("path", { d: d + "L" + xs(s.x[s.x.length - 1]) + "," + ys(Math.max(yd[0], 0)) + "L" + xs(s.x[0]) + "," + ys(Math.max(yd[0], 0)) + "Z", "class": "viz-area viz-fill-" + (s.slot || "s1") }, f.svg);
        }
        svgEl("path", { d: d, "class": "viz-line viz-stroke-" + (s.slot || "s1") + (s.thin ? " thin" : "") }, f.svg);
      });
      (o.hlines || []).forEach(function (h) {
        svgEl("line", { x1: f.m.left, x2: f.m.left + f.iw, y1: ys(h.y), y2: ys(h.y), "class": "viz-ref" }, f.svg);
        if (h.label) svgEl("text", { x: f.m.left + f.iw - 4, y: ys(h.y) - 5, "class": "viz-annot", "text-anchor": "end" }, f.svg).textContent = h.label;
      });
      (o.annotations || []).forEach(function (a) {
        var ax = xs(a.x), ay = ys(a.y);
        svgEl("circle", { cx: ax, cy: ay, r: 4, "class": "viz-dot viz-fill-" + (a.slot || "s1") }, f.svg);
        svgEl("text", { x: ax + (a.dx || 8), y: ay + (a.dy || -8), "class": "viz-annot", "text-anchor": a.anchor || "start" }, f.svg).textContent = a.label;
      });
      // crosshair + tooltip
      var cross = svgEl("line", { y1: f.m.top, y2: f.m.top + f.ih, "class": "viz-cross" }, f.svg);
      var dots = series.map(function (s) { return svgEl("circle", { r: 4, "class": "viz-dot viz-fill-" + (s.slot || "s1"), visibility: "hidden" }, f.svg); });
      var hit = svgEl("rect", { x: f.m.left, y: f.m.top, width: f.iw, height: f.ih, "class": "viz-hit", tabindex: 0 }, f.svg);
      var base = series[0].x, cur = 0;
      var nearest = function (xv) { var lo = 0, hi = base.length - 1; while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (base[mid] < xv) lo = mid; else hi = mid; } return Math.abs(base[lo] - xv) < Math.abs(base[hi] - xv) ? lo : hi; };
      var show = function (i) {
        cur = i; var xv = base[i], x = xs(xv);
        cross.setAttribute("x1", x); cross.setAttribute("x2", x); cross.style.visibility = "visible";
        var html = "<b>" + (o.xType === "time" ? V.dateStr(xv, o.monthly) : V.fmt(xv)) + "</b>";
        series.forEach(function (s, k) {
          var j = s.x === base ? i : nearestIn(s.x, xv), yv = s.y[j];
          if (yv === null || !isFinite(yv)) { dots[k].setAttribute("visibility", "hidden"); return; }
          dots[k].setAttribute("cx", xs(s.x[j])); dots[k].setAttribute("cy", ys(yv)); dots[k].setAttribute("visibility", "visible");
          html += "<br><span class='viz-key' style='--sw:var(--viz-" + (s.slot || "s1") + ")'></span>" + esc(s.name) + ": <b>" + (o.valueFmt || V.fmt)(yv) + "</b>" + (o.unit ? " " + esc(o.unit) : "");
        });
        showTip(f, html, x, ys(series[0].y[i] !== null && isFinite(series[0].y[i]) ? series[0].y[i] : yd[1]));
      };
      function nearestIn(arr, xv) { var lo = 0, hi = arr.length - 1; while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (arr[mid] < xv) lo = mid; else hi = mid; } return Math.abs(arr[lo] - xv) < Math.abs(arr[hi] - xv) ? lo : hi; }
      var hideAll = function () { hideTip(f); cross.style.visibility = "hidden"; dots.forEach(function (d) { d.setAttribute("visibility", "hidden"); }); };
      hit.addEventListener("mousemove", function (e) { show(nearest(xs.invert(svgPoint(f, e).x))); });
      hit.addEventListener("touchmove", function (e) { show(nearest(xs.invert(svgPoint(f, e).x))); }, { passive: true });
      hit.addEventListener("mouseleave", hideAll); hit.addEventListener("blur", hideAll);
      hit.addEventListener("keydown", function (e) {
        var step = Math.max(1, Math.round(base.length / 100));
        if (e.key === "ArrowRight") { e.preventDefault(); show(Math.min(base.length - 1, cur + step)); }
        if (e.key === "ArrowLeft") { e.preventDefault(); show(Math.max(0, cur - step)); }
      });
      var headers = [o.xType === "time" ? "Date" : (o.xLabel || "x")].concat(series.map(function (s) { return s.name; }));
      addTable(f.el, headers, base.map(function (xv, i) {
        return [o.xType === "time" ? V.dateStr(xv, o.monthly) : V.fmt(xv)].concat(series.map(function (s) { var j = s.x === base ? i : nearestIn(s.x, xv); return V.fmt(s.y[j]); }));
      }));
    };
    draw(); onResize(typeof el === "string" ? document.getElementById(el) : el, draw);
  };

  /* ---------------- scatter ---------------- */
  V.scatter = function (el, pts, o) {
    o = o || {};
    var draw = function () {
      var groups = o.groups || [{ name: o.name || "", slot: "s1", idx: pts.x.map(function (_, i) { return i; }) }];
      var f = frame(el, Object.assign({ legend: groups.length > 1 ? groups.map(function (g) { return { name: g.name, slot: g.slot }; }) : null }, o));
      var X = pts.x, Y = pts.y, good = X.map(function (_, i) { return isFinite(X[i]) && isFinite(Y[i]) && (!o.xLog || X[i] > 0) && (!o.yLog || Y[i] > 0); });
      var xv = X.filter(function (_, i) { return good[i]; }), yv = Y.filter(function (_, i) { return good[i]; });
      var xd = o.xDomain || (o.xLog ? [Math.min.apply(null, xv), Math.max.apply(null, xv)] : niceDomain(Math.min.apply(null, xv), Math.max.apply(null, xv), 5));
      var yd = o.yDomain || (o.yLog ? [Math.min.apply(null, yv), Math.max.apply(null, yv)] : niceDomain(Math.min.apply(null, yv), Math.max.apply(null, yv), 5));
      var xs = o.xLog ? logScale(xd[0], xd[1], f.m.left, f.m.left + f.iw) : linear(xd[0], xd[1], f.m.left, f.m.left + f.iw);
      var ys = o.yLog ? logScale(yd[0], yd[1], f.m.top + f.ih, f.m.top) : linear(yd[0], yd[1], f.m.top + f.ih, f.m.top);
      axes(f, xs, ys, { yTicks: o.yLog ? logTicks(yd[0], yd[1]) : niceTicks(yd[0], yd[1], 5), xTicks: o.xLog ? logTicks(xd[0], xd[1]) : niceTicks(xd[0], xd[1], 6),
                        xLabel: o.xLabel, yLabel: o.yLabel, xGrid: false, xFmt: o.xFmt, yFmt: o.yFmt });
      if (o.zeroLine) svgEl("line", { x1: f.m.left, x2: f.m.left + f.iw, y1: ys(0), y2: ys(0), "class": "viz-axis" }, f.svg);
      if (o.band) {                          // prediction / confidence band: fn(x) -> [lo, hi]
        var up = "", dn = "";
        for (var i = 0; i <= 60; i++) { var x0 = xd[0] + (xd[1] - xd[0]) * i / 60, b = o.band(x0); up += (i ? "L" : "M") + xs(x0) + "," + ys(b[1]); dn = "L" + xs(x0) + "," + ys(b[0]) + dn; }
        svgEl("path", { d: up + dn + "Z", "class": "viz-band-fill" }, f.svg);
      }
      var r = o.r || 3.5, pointG = svgEl("g", {}, f.svg);
      groups.forEach(function (g) {
        g.idx.forEach(function (i) { if (!good[i]) return; svgEl("circle", { cx: xs(X[i]), cy: ys(Y[i]), r: r, "class": "viz-dot viz-fill-" + g.slot + (o.faint ? " faint" : "") }, pointG); });
      });
      if (o.fit) {
        var fx0 = xd[0], fx1 = xd[1];
        svgEl("line", { x1: xs(fx0), y1: ys(o.fit.b0 + o.fit.b1 * fx0), x2: xs(fx1), y2: ys(o.fit.b0 + o.fit.b1 * fx1), "class": "viz-line viz-stroke-s2" }, f.svg);
      }
      (o.labels || []).forEach(function (L) {
        var i = L.i; if (!good[i]) return;
        svgEl("text", { x: xs(X[i]) + 7, y: ys(Y[i]) - 6, "class": "viz-annot" }, f.svg).textContent = L.text;
      });
      var hl = svgEl("circle", { r: r + 3, "class": "viz-hover-ring", visibility: "hidden" }, f.svg);
      var hit = svgEl("rect", { x: f.m.left, y: f.m.top, width: f.iw, height: f.ih, "class": "viz-hit", tabindex: 0 }, f.svg);
      hit.addEventListener("mousemove", function (e) {
        var p = svgPoint(f, e), best = -1, bd = 26 * 26;
        for (var i = 0; i < X.length; i++) { if (!good[i]) continue; var dx = xs(X[i]) - p.x, dy = ys(Y[i]) - p.y, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i; } }
        if (best < 0) { hideTip(f); hl.setAttribute("visibility", "hidden"); return; }
        hl.setAttribute("cx", xs(X[best])); hl.setAttribute("cy", ys(Y[best])); hl.setAttribute("visibility", "visible");
        showTip(f, (pts.label ? "<b>" + esc(pts.label[best]) + "</b><br>" : "") + esc(o.xName || o.xLabel || "x") + ": " + V.fmt(X[best], o.xDigits) +
                   "<br>" + esc(o.yName || o.yLabel || "y") + ": " + V.fmt(Y[best], o.yDigits), xs(X[best]), ys(Y[best]));
      });
      hit.addEventListener("mouseleave", function () { hideTip(f); hl.setAttribute("visibility", "hidden"); });
      addTable(f.el, (pts.label ? ["Label"] : []).concat([o.xName || o.xLabel || "x", o.yName || o.yLabel || "y"]),
               X.map(function (_, i) { return (pts.label ? [pts.label[i]] : []).concat([V.fmt(X[i], o.xDigits), V.fmt(Y[i], o.yDigits)]); }));
    };
    draw(); onResize(typeof el === "string" ? document.getElementById(el) : el, draw);
  };

  /* ---------------- horizontal bars ---------------- */
  V.bars = function (el, items, o) {
    o = o || {};
    var draw = function () {
      var rowH = o.rowH || 30, h = items.length * rowH + 14 + (o.xLabel ? 50 : 32) + 4;
      var maxLabel = Math.max.apply(null, items.map(function (it) { return String(it.label).length; }));
      var f = frame(el, Object.assign({}, o, { height: h, marginLeft: Math.min(220, 14 + maxLabel * 7), marginRight: 60 }));
      var vmax = o.max || Math.max.apply(null, items.map(function (it) { return it.value; }));
      var xd = niceDomain(0, vmax, 5), xs = linear(0, xd[1], f.m.left, f.m.left + f.iw);
      axes(f, xs, null, { xTicks: niceTicks(0, xd[1], 5), xGrid: true, xLabel: o.xLabel, xFmt: o.xFmt });
      var bh = Math.min(24, rowH - 8);
      items.forEach(function (it, k) {
        var y = f.m.top + k * rowH + (rowH - bh) / 2, w = xs(it.value) - f.m.left;
        svgEl("text", { x: f.m.left - 8, y: y + bh / 2 + 4, "class": "viz-tick", "text-anchor": "end" }, f.svg).textContent = it.label;
        var p = svgEl("path", { d: roundedRightBar(f.m.left, y, Math.max(1, w), bh, 4), "class": "viz-bar viz-fill-" + (it.slot || o.slot || "s1"), tabindex: 0 }, f.svg);
        svgEl("text", { x: f.m.left + w + 6, y: y + bh / 2 + 4, "class": "viz-value" }, f.svg).textContent = (o.valueFmt || V.fmt)(it.value);
        var html = "<b>" + esc(it.label) + "</b><br>" + (o.valueFmt || V.fmt)(it.value) + (o.unit ? " " + esc(o.unit) : "") + (it.note ? "<br>" + esc(it.note) : "");
        p.addEventListener("mousemove", function (e) { var pt = svgPoint(f, e); showTip(f, html, pt.x, pt.y); });
        p.addEventListener("mouseleave", function () { hideTip(f); });
        p.addEventListener("focus", function () { showTip(f, html, f.m.left + w, y); }); p.addEventListener("blur", function () { hideTip(f); });
      });
      (o.refs || []).forEach(function (r, k) {
        var rx = xs(r.x);
        svgEl("line", { x1: rx, x2: rx, y1: f.m.top - 4, y2: f.m.top + f.ih, "class": "viz-ref strong" }, f.svg);
        svgEl("text", { x: rx + 4, y: f.m.top - 6 + k * 0, "class": "viz-annot", dy: k ? "-1.1em" : 0 }, f.svg).textContent = r.label;
      });
      addTable(f.el, [o.labelName || "Category", o.valueName || "Value"], items.map(function (it) { return [it.label, (o.valueFmt || V.fmt)(it.value)]; }));
    };
    draw(); onResize(typeof el === "string" ? document.getElementById(el) : el, draw);
  };

  /* ---------------- 100% stacked horizontal bars ---------------- */
  V.stacked100 = function (el, rows, keys, o) {
    o = o || {};
    var draw = function () {
      var rowH = 38, h = rows.length * rowH + 14 + (o.xLabel ? 50 : 32);
      var maxLabel = Math.max.apply(null, rows.map(function (r) { return String(r.label).length; }));
      var f = frame(el, Object.assign({}, o, { height: h, marginLeft: 14 + maxLabel * 7, legend: keys.map(function (k) { return { name: k.name, slot: k.slot }; }) }));
      var xs = linear(0, 1, f.m.left, f.m.left + f.iw);
      axes(f, xs, null, { xTicks: [0, 0.25, 0.5, 0.75, 1], xGrid: true, xFmt: function (v) { return Math.round(v * 100) + "%"; }, xLabel: o.xLabel });
      rows.forEach(function (r, k) {
        var tot = keys.reduce(function (s, kk) { return s + (r.parts[kk.key] || 0); }, 0), acc = 0, y = f.m.top + k * rowH + 7, bh = 24;
        svgEl("text", { x: f.m.left - 8, y: y + bh / 2 + 4, "class": "viz-tick", "text-anchor": "end" }, f.svg).textContent = r.label;
        keys.forEach(function (kk, j) {
          var v = r.parts[kk.key] || 0, w = xs(v / tot) - f.m.left, x = xs(acc / tot);
          acc += v; if (w <= 0) return;
          var rect = svgEl("rect", { x: x + (j ? 1 : 0), y: y, width: Math.max(0.5, w - (j ? 2 : 1)), height: bh, rx: 0, "class": "viz-bar viz-fill-" + kk.slot, tabindex: 0 }, f.svg);
          var share = v / tot, html = "<b>" + esc(r.label) + " · " + esc(kk.name) + "</b><br>" + v.toLocaleString() + " of " + tot.toLocaleString() + " (" + V.fmt(100 * share, 1) + "%)";
          if (w > 40) svgEl("text", { x: x + w / 2, y: y + bh / 2 + 4, "class": "viz-inbar" + (kk.slot === "s3" || kk.slot === "s4" ? " on-light" : ""), "text-anchor": "middle" }, f.svg).textContent = Math.round(100 * share) + "%";
          rect.addEventListener("mousemove", function (e) { var pt = svgPoint(f, e); showTip(f, html, pt.x, pt.y); });
          rect.addEventListener("mouseleave", function () { hideTip(f); });
          rect.addEventListener("focus", function () { showTip(f, html, x + w / 2, y); }); rect.addEventListener("blur", function () { hideTip(f); });
        });
      });
      addTable(f.el, [o.rowName || "Group"].concat(keys.map(function (k) { return k.name; })).concat(["Total"]), rows.map(function (r) {
        var tot = keys.reduce(function (s, kk) { return s + (r.parts[kk.key] || 0); }, 0);
        return [r.label].concat(keys.map(function (k) { return (r.parts[k.key] || 0) + " (" + V.fmt(100 * (r.parts[k.key] || 0) / tot, 1) + "%)"; })).concat([String(tot)]);
      }));
    };
    draw(); onResize(typeof el === "string" ? document.getElementById(el) : el, draw);
  };

  /* ---------------- box plots (horizontal) ---------------- */
  V.box = function (el, groups, o) {
    o = o || {};
    var draw = function () {
      var rowH = 46, h = groups.length * rowH + 14 + (o.xLabel ? 50 : 32);
      var maxLabel = Math.max.apply(null, groups.map(function (g) { return String(g.name).length; }));
      var f = frame(el, Object.assign({}, o, { height: h, marginLeft: 14 + maxLabel * 7 }));
      var stats5 = groups.map(function (g) {
        var s = Stats.sorted(Stats.clean(g.values)), five = Stats.five(s), lf = five.q1 - 1.5 * five.iqr, uf = five.q3 + 1.5 * five.iqr;
        var inside = s.filter(function (v) { return v >= lf && v <= uf; });
        return { g: g, five: five, lo: inside[0], hi: inside[inside.length - 1], out: s.filter(function (v) { return v < lf || v > uf; }) };
      });
      var all = []; stats5.forEach(function (s) { all.push(s.five.min, s.five.max); });
      var xd = o.domain || niceDomain(Math.min.apply(null, all), Math.max.apply(null, all), 6), xs = linear(xd[0], xd[1], f.m.left, f.m.left + f.iw);
      axes(f, xs, null, { xTicks: niceTicks(xd[0], xd[1], 6), xGrid: true, xLabel: o.xLabel, xFmt: o.xFmt });
      if (o.zeroLine && xd[0] < 0) svgEl("line", { x1: xs(0), x2: xs(0), y1: f.m.top, y2: f.m.top + f.ih, "class": "viz-axis" }, f.svg);
      stats5.forEach(function (s, k) {
        var cy = f.m.top + k * rowH + rowH / 2, bh = 22, slot = s.g.slot || o.slot || "s1", fv = s.five;
        svgEl("text", { x: f.m.left - 8, y: cy + 4, "class": "viz-tick", "text-anchor": "end" }, f.svg).textContent = s.g.name;
        svgEl("line", { x1: xs(s.lo), x2: xs(fv.q1), y1: cy, y2: cy, "class": "viz-whisker" }, f.svg);
        svgEl("line", { x1: xs(fv.q3), x2: xs(s.hi), y1: cy, y2: cy, "class": "viz-whisker" }, f.svg);
        [s.lo, s.hi].forEach(function (v) { svgEl("line", { x1: xs(v), x2: xs(v), y1: cy - 6, y2: cy + 6, "class": "viz-whisker" }, f.svg); });
        var box = svgEl("rect", { x: xs(fv.q1), y: cy - bh / 2, width: Math.max(1, xs(fv.q3) - xs(fv.q1)), height: bh, rx: 4, "class": "viz-box viz-fill-" + slot, tabindex: 0 }, f.svg);
        svgEl("line", { x1: xs(fv.median), x2: xs(fv.median), y1: cy - bh / 2, y2: cy + bh / 2, "class": "viz-median" }, f.svg);
        if (o.showMean) svgEl("circle", { cx: xs(fv.mean), cy: cy, r: 4, "class": "viz-mean-dot" }, f.svg);
        var clipped = 0;
        s.out.forEach(function (v) {
          if (v < xd[0] || v > xd[1]) { clipped++; return; }
          svgEl("circle", { cx: xs(v), cy: cy, r: 3, "class": "viz-outlier viz-stroke-" + slot }, f.svg);
        });
        if (clipped) svgEl("text", { x: f.m.left + f.iw, y: cy - bh / 2 - 3, "class": "viz-annot", "text-anchor": "end" }, f.svg).textContent = "+" + clipped + " beyond axis";
        var html = "<b>" + esc(s.g.name) + "</b> (n = " + fv.n + ")<br>min " + V.fmt(fv.min) + " · Q1 " + V.fmt(fv.q1) + "<br>median <b>" + V.fmt(fv.median) +
                   "</b> · Q3 " + V.fmt(fv.q3) + "<br>max " + V.fmt(fv.max) + " · mean " + V.fmt(fv.mean) + "<br>" + s.out.length + " potential outlier(s)";
        var hit = svgEl("rect", { x: f.m.left, y: cy - rowH / 2, width: f.iw, height: rowH, "class": "viz-hit" }, f.svg);
        hit.addEventListener("mousemove", function (e) { var pt = svgPoint(f, e); showTip(f, html, pt.x, pt.y); });
        hit.addEventListener("mouseleave", function () { hideTip(f); });
        box.addEventListener("focus", function () { showTip(f, html, xs(fv.q3), cy - bh / 2); }); box.addEventListener("blur", function () { hideTip(f); });
      });
      addTable(f.el, ["Group", "n", "Min", "Q1", "Median", "Q3", "Max", "Mean", "SD"], stats5.map(function (s) {
        var v = s.five; return [s.g.name, String(v.n), V.fmt(v.min), V.fmt(v.q1), V.fmt(v.median), V.fmt(v.q3), V.fmt(v.max), V.fmt(v.mean), V.fmt(v.sd)];
      }));
    };
    draw(); onResize(typeof el === "string" ? document.getElementById(el) : el, draw);
  };

  /* ---------------- density curve with shaded areas ---------------- */
  V.curve = function (el, o) {
    var draw = function () {
      var f = frame(el, Object.assign({ height: 240, legend: o.curves && o.curves.length > 1 ? o.curves.map(function (c) { return { name: c.name, slot: c.slot, kind: "line" }; }) : null }, o));
      var curves = o.curves || [{ fn: o.fn, slot: "s1" }], a = o.domain[0], b = o.domain[1], N = 240, ymax = 0;
      curves.forEach(function (c) { for (var i = 0; i <= N; i++) { var v = c.fn(a + (b - a) * i / N); if (isFinite(v)) ymax = Math.max(ymax, v); } });
      ymax = o.yMax || ymax * 1.08;
      var xs = linear(a, b, f.m.left, f.m.left + f.iw), ys = linear(0, ymax, f.m.top + f.ih, f.m.top);
      axes(f, xs, ys, { xTicks: o.xTicks || niceTicks(a, b, 8), xLabel: o.xLabel, yTicks: o.hideY ? [] : niceTicks(0, ymax, 3), yFmt: function (v) { return V.fmt(v, 2); }, xFmt: o.xFmt });
      (o.shade || []).forEach(function (s) {
        var c = curves[s.curve || 0], lo = Math.max(a, s.from), hi = Math.min(b, s.to); if (hi <= lo) return;
        var d = "M" + xs(lo) + "," + ys(0);
        for (var i = 0; i <= 120; i++) { var x = lo + (hi - lo) * i / 120; d += "L" + xs(x) + "," + ys(Math.min(ymax, c.fn(x))); }
        d += "L" + xs(hi) + "," + ys(0) + "Z";
        svgEl("path", { d: d, "class": "viz-shade viz-fill-" + (s.slot || "s2") }, f.svg);
      });
      curves.forEach(function (c) {
        var d = ""; for (var i = 0; i <= N; i++) { var x = a + (b - a) * i / N, v = Math.min(ymax, c.fn(x)); if (!isFinite(v)) continue; d += (d ? "L" : "M") + xs(x).toFixed(1) + "," + ys(v).toFixed(1); }
        svgEl("path", { d: d, "class": "viz-line viz-stroke-" + (c.slot || "s1") }, f.svg);
      });
      (o.markers || []).forEach(function (mk, k) {
        if (mk.x < a || mk.x > b) return;
        svgEl("line", { x1: xs(mk.x), x2: xs(mk.x), y1: f.m.top, y2: f.m.top + f.ih, "class": mk.strong ? "viz-ref strong" : "viz-ref" }, f.svg);
        svgEl("text", { x: xs(mk.x) + (mk.left ? -4 : 4), y: f.m.top + 12 + (mk.row || 0) * 14, "class": "viz-annot", "text-anchor": mk.left ? "end" : "start" }, f.svg).textContent = mk.label;
      });
      if (o.note) { var p = htmlEl("p", "viz-note"); p.innerHTML = o.note; f.el.appendChild(p); }
    };
    draw(); onResize(typeof el === "string" ? document.getElementById(el) : el, draw);
  };

  /* ---------------- discrete distribution (columns) ---------------- */
  V.pmf = function (el, items, o) {
    o = o || {};
    var draw = function () {
      var f = frame(el, Object.assign({ height: 240 }, o)), n = items.length;
      var ymax = Math.max.apply(null, items.map(function (i) { return Math.max(i.p, i.q || 0); }));
      var yd = niceDomain(0, ymax, 4), x0 = f.m.left, step = f.iw / n, ys = linear(0, yd[1], f.m.top + f.ih, f.m.top);
      axes(f, function () { return 0; }, ys, { yTicks: niceTicks(0, yd[1], 4), xLabel: o.xLabel, yLabel: o.yLabel || "Probability", yFmt: o.yFmt || function (v) { return V.fmt(v, 2); } });
      var bw = Math.min(24, step - 2);
      items.forEach(function (it, i) {
        var cx = x0 + step * (i + 0.5), y = ys(it.p), hl = o.highlight && o.highlight(it.k);
        var p = svgEl("path", { d: roundedTopBar(cx - bw / 2, y, bw, f.m.top + f.ih - y, 4), "class": "viz-bar viz-fill-" + (hl ? "s2" : "s1"), tabindex: 0 }, f.svg);
        if (it.q !== undefined) svgEl("circle", { cx: cx, cy: ys(it.q), r: 4, "class": "viz-dot viz-fill-s3" }, f.svg);
        if (n <= 30 || i % Math.ceil(n / 15) === 0) svgEl("text", { x: cx, y: f.m.top + f.ih + 18, "class": "viz-tick", "text-anchor": "middle" }, f.svg).textContent = it.k;
        var html = "<b>" + esc(o.kName || "k") + " = " + it.k + "</b><br>" + esc(o.pName || "P") + " = " + V.fmt(it.p, 4) + (it.q !== undefined ? "<br>" + esc(o.qName || "Model") + " = " + V.fmt(it.q, 4) : "");
        var hit = svgEl("rect", { x: cx - step / 2, y: f.m.top, width: step, height: f.ih, "class": "viz-hit" }, f.svg);
        [hit, p].forEach(function (t) { t.addEventListener("mousemove", function (e) { var pt = svgPoint(f, e); showTip(f, html, pt.x, pt.y); }); t.addEventListener("mouseleave", function () { hideTip(f); }); });
        p.addEventListener("focus", function () { showTip(f, html, cx, y); }); p.addEventListener("blur", function () { hideTip(f); });
      });
      if (o.legendItems) {
        var lg = htmlEl("div", "viz-legend"); o.legendItems.forEach(function (it) { var s = htmlEl("span", "viz-legend-item"), sw = htmlEl("span", "viz-swatch " + (it.kind || "box")); sw.style.setProperty("--sw", "var(--viz-" + it.slot + ")"); s.appendChild(sw); s.appendChild(document.createTextNode(it.name)); lg.appendChild(s); });
        f.el.insertBefore(lg, f.plot);
      }
      addTable(f.el, [o.kName || "k", o.pName || "P"].concat(items[0].q !== undefined ? [o.qName || "Model"] : []), items.map(function (it) { return [String(it.k), V.fmt(it.p, 4)].concat(it.q !== undefined ? [V.fmt(it.q, 4)] : []); }));
    };
    draw(); onResize(typeof el === "string" ? document.getElementById(el) : el, draw);
  };

  /* ---------------- normal Q-Q plot ---------------- */
  V.qq = function (el, values, o) {
    o = o || {};
    var s = Stats.sorted(Stats.clean(values)), n = s.length, m = Stats.mean(s), sd = Stats.sd(s);
    var thin = n > 1500 ? Math.ceil(n / 1500) : 1, X = [], Y = [];
    for (var i = 0; i < n; i += thin) { X.push(Stats.normal.ppf((i + 0.5) / n)); Y.push((s[i] - m) / sd); }
    if ((n - 1) % thin) { X.push(Stats.normal.ppf((n - 0.5) / n)); Y.push((s[n - 1] - m) / sd); }
    var lim = Math.max(4, Math.ceil(Math.max(Math.abs(Y[0]), Math.abs(Y[Y.length - 1]), Math.abs(X[0]))));
    V.scatter(el, { x: X, y: Y }, Object.assign({ xLabel: "Normal score (theoretical z)", yLabel: "Observed z-score", xName: "Normal score", yName: "Observed z",
      xDomain: [-Math.ceil(Math.abs(X[0])), Math.ceil(Math.abs(X[0]))], yDomain: [-lim, lim], fit: { b0: 0, b1: 1 }, r: 3, xDigits: 2, yDigits: 2 }, o));
  };

  /* ---------------- bind results numbers into prose ---------------- */
  V.bindResults = function (root) {
    var R = (global.STATDATA || {}).results; if (!R) return;
    (root || document).querySelectorAll("[data-r]").forEach(function (n) {
      var path = n.getAttribute("data-r").split("."), v = R;
      for (var i = 0; i < path.length && v !== undefined && v !== null; i++) v = v[path[i]];
      if (v === undefined || v === null) return;
      var kind = n.getAttribute("data-f") || "", d = n.getAttribute("data-d");
      d = d === null ? undefined : +d;
      var out;
      if (kind === "pct") out = V.fmt(v * 100, d === undefined ? 1 : d) + "%";
      else if (kind === "p") out = Stats.fmtP(v);
      else if (kind === "int") out = Math.round(v).toLocaleString("en-US");
      else if (kind === "raw") out = String(v);
      else out = V.fmt(v, d);
      n.textContent = out;
    });
  };

  global.Viz = V;
})(window);
