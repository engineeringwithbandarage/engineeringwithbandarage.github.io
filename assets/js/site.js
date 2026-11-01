/* Engineering With Bandarage — shared page behaviour.
   Builds the top bar, sidebar, breadcrumbs, on-page TOC and prev/next from window.SITE (nav.js),
   highlights code blocks, adds copy buttons, search and the light/dark toggle.
   Pages declare who they are on <body>:
     data-kind="landing" | "track" | "tutorial" | "chapter"
     data-track="dbt"  data-tutorial="core-architecture"  data-chapter="01-big-picture.html"
   and where the site root is on <html data-root="../../">. */

(function () {
  "use strict";

  var SITE = window.SITE || { name: "", tracks: [] };
  var html = document.documentElement;
  var body = document.body;
  var ROOT = html.getAttribute("data-root") || "";
  var page = {
    kind: body.dataset.kind || "landing",
    track: body.dataset.track,
    tutorial: body.dataset.tutorial,
    chapter: body.dataset.chapter
  };

  /* ---------- small helpers ---------- */
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") n.className = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function slugify(s) { return s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60); }
  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
  }
  var ICON = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    home: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/></svg>',
    tracks: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>',
    expertise: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
    linkedin: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    tip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg>',
    danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
    deep: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/></svg>',
    lab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6L4 19a2 2 0 0 0 1.7 3h12.6a2 2 0 0 0 1.7-3L14 9V3"/></svg>'
  };

  /* ---------- lookup in the site map ---------- */
  function findTrack(id) { return SITE.tracks.filter(function (t) { return t.id === id; })[0]; }
  function findTutorial(id) {
    for (var i = 0; i < SITE.tracks.length; i++) {
      var t = SITE.tracks[i].tutorials.filter(function (u) { return u.id === id; })[0];
      if (t) return { track: SITE.tracks[i], tutorial: t };
    }
    return null;
  }
  function chapterNum(tut, ch) {
    if (ch.num) return ch.num;
    var n = 0;
    for (var i = 0; i < tut.chapters.length; i++) { if (!tut.chapters[i].num) n++; if (tut.chapters[i] === ch) break; }
    return String(n).padStart(2, "0");
  }

  /* ---------- theme ---------- */
  function currentTheme() {
    var set = html.getAttribute("data-theme");
    if (set) return set;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  /* ---------- top bar ---------- */
  function buildTopbar() {
    var menuBtn = el("button", { class: "icon-btn menu-btn", "aria-label": "Open navigation", html: ICON.menu });
    menuBtn.addEventListener("click", function () { body.classList.toggle("nav-open"); });

    var themeBtn = el("button", { class: "icon-btn theme-btn", "aria-label": "Toggle light or dark theme" });
    function paintThemeBtn() { themeBtn.innerHTML = currentTheme() === "dark" ? ICON.sun : ICON.moon; }
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      html.setAttribute("data-theme", next);
      store("ewb-theme", next);
      paintThemeBtn();
    });
    paintThemeBtn();

    var bar = el("header", { class: "topbar" }, [
      page.kind === "chapter" || page.kind === "tutorial" ? menuBtn : null,
      el("a", { class: "brand", href: ROOT + "index.html", html:
        '<span class="brand-mark">EB</span><span class="brand-name"><span>' + esc(SITE.name) + "</span></span>" }),
      el("div", { class: "topbar-spacer" }),
      buildNav(),
      buildSearch(),
      themeBtn
    ]);
    body.insertBefore(bar, body.firstChild);
    body.insertBefore(el("a", { class: "skip-link", href: "#main", text: "Skip to content" }), body.firstChild);
  }

  /* ---------- main navigation: Home · Tracks ▾ · Expertise · Contact ---------- */
  var TRACK_ORDER = ["datawarehousing", "dbt", "bi", "snowflake", "architecture", "statistics", "ai", "power-electronics", "dba", "uv", "ai-logistics", "linux"];
  ICON.mail = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/></svg>';
  var LINKEDIN = "https://www.linkedin.com/in/sameeradatabee/";
  var CONTACT = "contact/index.html";   // the contact form page, relative to the site root
  function currentTrackId() {
    if (page.track) return page.track;
    var found = page.tutorial && findTutorial(page.tutorial);
    return found ? found.track.id : null;
  }
  function navLink(text, icon, href, current, extra, newTab) {
    var a = el("a", { class: "nav-link" + (extra ? " " + extra : "") + (current ? " current" : ""), href: href, title: text,
      html: icon + "<span>" + esc(text) + "</span>" });
    if (current) a.setAttribute("aria-current", "page");
    if (newTab) { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }
  function buildNav() {
    var here = currentTrackId();
    // same order as the tiles on the home page; any track not listed goes last
    var tracks = TRACK_ORDER.map(findTrack).filter(Boolean);
    SITE.tracks.forEach(function (t) { if (tracks.indexOf(t) === -1) tracks.push(t); });

    var menu = el("div", { class: "nav-menu", id: "nav-tracks" });
    tracks.forEach(function (t, i) {
      var n = t.tutorials.length;
      var a = el("a", { href: ROOT + t.path, class: t.id === here ? "current" : "", html:
        '<span class="nm">' + String(i + 1).padStart(2, "0") + "</span><span><b>" + esc(t.title) + "</b><small>" +
        n + (n === 1 ? " tutorial" : " tutorials") + "</small></span>" });
      if (t.id === here) a.setAttribute("aria-current", "page");
      menu.appendChild(a);
    });
    menu.appendChild(el("a", { class: "all", href: ROOT + "index.html#tracks", html: "<span>How the tracks fit together</span><span>→</span>" }));

    var toggle = el("button", { type: "button", class: "nav-link nav-drop" + (here ? " current" : ""),
      "aria-expanded": "false", "aria-controls": "nav-tracks", html: ICON.tracks + "<span>Tracks</span>" + ICON.chev });
    var item = el("div", { class: "nav-item" }, [toggle, menu]);
    function setOpen(open) {
      menu.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    toggle.addEventListener("click", function () { setOpen(!menu.classList.contains("open")); });
    document.addEventListener("click", function (e) { if (!item.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("open")) { setOpen(false); toggle.focus(); }
    });

    return el("nav", { class: "mainnav", "aria-label": "Main" }, [
      navLink("Home", ICON.home, ROOT + "index.html", page.kind === "landing", "opt"),
      item,
      navLink("Expertise", ICON.expertise, ROOT + "index.html#expertise", false, "opt"),
      navLink("LinkedIn", ICON.linkedin, LINKEDIN, false, "opt", true),
      navLink("Contact Me", ICON.mail, ROOT + CONTACT, body.getAttribute("data-page") === "contact", "opt")
    ]);
  }

  /* ---------- search over the site map ---------- */
  function searchIndex() {
    var items = [];
    SITE.tracks.forEach(function (tr) {
      tr.tutorials.forEach(function (tu) {
        items.push({ title: tu.title, where: tr.title + " · Tutorial", href: ROOT + tu.path + "index.html", text: tu.title });
        tu.chapters.forEach(function (ch) {
          items.push({
            title: chapterNum(tu, ch) + " · " + ch.title + (ch.ready ? "" : " (coming soon)"),
            where: tu.short || tu.title,
            href: ch.ready ? ROOT + tu.path + ch.file : ROOT + tu.path + "index.html",
            text: ch.title + " " + (ch.desc || "")
          });
        });
      });
    });
    return items;
  }
  function buildSearch() {
    var idx = searchIndex();
    var input = el("input", { type: "search", placeholder: "Search tutorials…", "aria-label": "Search tutorials", autocomplete: "off" });
    var results = el("div", { class: "search-results", role: "listbox" });
    var wrap = el("div", { class: "search" }, [el("span", { html: ICON.search }), input, results]);
    var active = -1;
    function render() {
      var q = input.value.trim().toLowerCase();
      results.innerHTML = "";
      active = -1;
      if (!q) { results.classList.remove("open"); return; }
      var words = q.split(/\s+/);
      var hits = idx.filter(function (it) {
        var t = it.text.toLowerCase();
        return words.every(function (w) { return t.indexOf(w) !== -1; });
      }).slice(0, 12);
      if (!hits.length) results.appendChild(el("div", { class: "empty", text: "No matches" }));
      hits.forEach(function (h) {
        results.appendChild(el("a", { href: h.href, html: esc(h.title) + "<small>" + esc(h.where) + "</small>" }));
      });
      results.classList.add("open");
    }
    input.addEventListener("input", render);
    input.addEventListener("keydown", function (e) {
      var links = results.querySelectorAll("a");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!links.length) return;
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
        links.forEach(function (a, i) { a.classList.toggle("active", i === active); });
      } else if (e.key === "Enter" && links.length) {
        window.location.href = links[Math.max(active, 0)].getAttribute("href");
      } else if (e.key === "Escape") {
        input.value = ""; render(); input.blur();
      }
    });
    document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) results.classList.remove("open"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault(); input.focus();
      }
    });
    return wrap;
  }

  /* ---------- sidebar ---------- */
  function buildSidebar() {
    var side = document.getElementById("sidebar");
    var found = page.tutorial && findTutorial(page.tutorial);
    if (!side || !found) return;
    var tut = found.tutorial, base = ROOT + tut.path;
    side.setAttribute("aria-label", tut.title + " chapters");
    side.appendChild(el("a", { class: "tut-title", href: base + "index.html", text: tut.title }));

    var currentPart = null, list = null;
    tut.chapters.forEach(function (ch) {
      if (ch.part !== currentPart || !list) {
        currentPart = ch.part;
        if (ch.part) side.appendChild(el("h4", { text: ch.part }));
        list = el("ol");
        side.appendChild(list);
      }
      var num = el("span", { class: "num", text: chapterNum(tut, ch) });
      var item;
      if (ch.ready) {
        item = el("a", { href: base + ch.file }, [num, el("span", { text: ch.title })]);
        if (ch.file === page.chapter) item.setAttribute("aria-current", "page");
      } else {
        item = el("span", { title: "Coming soon" }, [num, el("span", { text: ch.title }), el("span", { class: "soon", text: "soon" })]);
      }
      list.appendChild(el("li", null, [item]));
    });

    var others = found.track.tutorials.filter(function (t) { return t.id !== tut.id; });
    if (others.length) {
      var box = el("div", { class: "other-tuts" }, [el("h4", { text: "More in " + found.track.title })]);
      var ol = el("ol");
      others.forEach(function (o) { ol.appendChild(el("li", null, [el("a", { href: ROOT + o.path + "index.html", text: o.title })])); });
      box.appendChild(ol);
      side.appendChild(box);
    }
    side.addEventListener("click", function (e) { if (e.target.closest("a")) body.classList.remove("nav-open"); });
  }

  /* ---------- breadcrumbs + pager ---------- */
  function buildBreadcrumbs() {
    var doc = document.querySelector(".doc");
    if (!doc || page.kind === "landing") return;
    var crumbs = [{ t: "Home", h: ROOT + "index.html" }];
    var tr = page.track && findTrack(page.track);
    var found = page.tutorial && findTutorial(page.tutorial);
    if (found) tr = found.track;
    if (tr && page.kind !== "track") crumbs.push({ t: tr.title, h: ROOT + tr.path });
    if (found && page.kind === "chapter") crumbs.push({ t: found.tutorial.short || found.tutorial.title, h: ROOT + found.tutorial.path + "index.html" });
    var nav = el("nav", { class: "breadcrumbs", "aria-label": "Breadcrumb" });
    crumbs.forEach(function (c, i) {
      if (i) nav.appendChild(el("span", { "aria-hidden": "true", text: "/" }));
      nav.appendChild(el("a", { href: c.h, text: c.t }));
    });
    doc.insertBefore(nav, doc.firstChild);
  }
  function buildPager() {
    var doc = document.querySelector(".doc");
    var found = page.tutorial && findTutorial(page.tutorial);
    if (!doc || !found || page.kind !== "chapter") return;
    var tut = found.tutorial, base = ROOT + tut.path;
    var ready = tut.chapters.filter(function (c) { return c.ready; });
    var i = ready.map(function (c) { return c.file; }).indexOf(page.chapter);
    var prev = ready[i - 1], next = ready[i + 1];
    var pager = el("nav", { class: "pager", "aria-label": "Chapter navigation" });
    pager.appendChild(prev
      ? el("a", { class: "prev", href: base + prev.file, html: "<small>← Previous</small>" + esc(prev.title) })
      : el("a", { class: "prev", href: base + "index.html", html: "<small>← Back to</small>Tutorial overview" }));
    if (next) pager.appendChild(el("a", { class: "next", href: base + next.file, html: "<small>Next →</small>" + esc(next.title) }));
    else {
      var upcoming = tut.chapters[tut.chapters.indexOf(ready[i]) + 1];
      pager.appendChild(el("a", { class: "next", href: base + "index.html",
        html: "<small>" + (upcoming ? "Coming next" : "Finished") + "</small>" + esc(upcoming ? upcoming.title : "Tutorial overview") }));
    }
    doc.appendChild(pager);
  }

  /* ---------- headings, on-page TOC ---------- */
  function buildToc() {
    var doc = document.querySelector(".doc");
    if (!doc) return;
    var heads = doc.querySelectorAll("h2, h3");
    var used = {};
    heads.forEach(function (h) {
      if (!h.id) {
        var id = slugify(h.textContent) || "section";
        while (used[id] || document.getElementById(id)) id += "-x";
        h.id = id;
      }
      used[h.id] = true;
      h.setAttribute("data-label", h.textContent.trim());
      h.appendChild(el("a", { class: "anchor", href: "#" + h.id, "aria-label": "Link to this section", text: "#" }));
    });
    var toc = document.getElementById("toc");
    if (!toc || !heads.length) return;
    toc.appendChild(el("h5", { text: "On this page" }));
    var links = [];
    heads.forEach(function (h) {
      if (h.closest("details, .takeaways")) return;
      var a = el("a", { href: "#" + h.id, class: h.tagName === "H3" ? "h3" : "", text: h.getAttribute("data-label") });
      toc.appendChild(a);
      links.push({ a: a, h: h });
    });
    if (!("IntersectionObserver" in window)) return;
    var obs = new IntersectionObserver(function () {
      var top = null;
      links.forEach(function (l) { if (l.h.getBoundingClientRect().top < 140) top = l; });
      links.forEach(function (l) { l.a.classList.toggle("active", l === (top || links[0])); });
    }, { rootMargin: "0px 0px -60% 0px", threshold: [0, 1] });
    links.forEach(function (l) { obs.observe(l.h); });
  }

  /* ---------- callout icons ---------- */
  function decorateCallouts() {
    document.querySelectorAll(".callout").forEach(function (c) {
      var t = c.querySelector(".callout-title");
      if (!t) return;
      var kind = ["tip", "warn", "danger", "deep", "lab"].filter(function (k) { return c.classList.contains(k); })[0];
      if (kind && ICON[kind]) t.insertAdjacentHTML("afterbegin", ICON[kind]);
    });
  }

  /* ---------- syntax highlighting ---------- */
  var SQL_KW = "select|from|where|and|or|not|as|with|join|left|right|inner|outer|full|cross|on|using|group|by|order|having|limit|offset|union|all|distinct|case|when|then|else|end|is|null|in|exists|between|like|ilike|insert|into|values|update|set|delete|merge|matched|create|replace|table|view|sequence|schema|index|if|drop|alter|add|column|primary|key|default|begin|commit|rollback|transaction|returning|over|partition|rows|range|unbounded|preceding|following|current|row|true|false|asc|desc|nulls|first|last|cast|interval|lateral|grant|usage|to|temporary|temp|cascade|distinct|of|recursive|filter|within";
  var JINJA_KW = "if|elif|else|endif|for|endfor|in|macro|endmacro|set|endset|do|call|endcall|return|not|and|or|is|true|false|none|True|False|None|test|endtest|materialization|endmaterialization|snapshot|endsnapshot|filter|endfilter|raw|endraw|import|from|with|as|block|endblock|loop|break|continue";
  var PY_KW = "def|class|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|import|from|as|with|try|except|finally|raise|yield|lambda|pass|break|continue|global|nonlocal|assert|async|await|self";
  var LANGS = {
    jinjaInner: { flags: "g", rules: [
      ["string", /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/],
      ["keyword", new RegExp("\\b(?:" + JINJA_KW + ")\\b")],
      ["func", /\b[a-zA-Z_]\w*(?=\()/],
      ["number", /\b\d+(?:\.\d+)?\b/]
    ] },
    sql: { flags: "gi", rules: [
      ["jinja-comment", /\{#[\s\S]*?#\}/],
      ["jinja", /\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/],
      ["comment", /--[^\n]*|\/\*[\s\S]*?\*\//],
      ["string", /'(?:[^']|'')*'/],
      ["keyword", new RegExp("\\b(?:" + SQL_KW + ")\\b")],
      ["func", /\b[a-z_]\w*(?=\()/],
      ["number", /\b\d+(?:\.\d+)?\b/]
    ] },
    yaml: { flags: "gm", rules: [
      ["jinja-comment", /\{#[\s\S]*?#\}/],
      ["jinja", /\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/],
      ["comment", /(?:^|[ \t])#[^\n]*/],
      ["key", /^[ \t]*(?:- )?[\w.+\-"']+(?=[ \t]*:(?:[ \t]|$))/],
      ["string", /"(?:[^"\\\n]|\\.)*"|'[^'\n]*'/],
      ["keyword", /\b(?:true|false|null|yes|no)\b/],
      ["number", /\b\d+(?:\.\d+)?\b/]
    ] },
    python: { flags: "g", rules: [
      ["comment", /#[^\n]*/],
      ["string", /[rfbu]?"""[\s\S]*?"""|[rfbu]?'''[\s\S]*?'''|[rfbu]?"(?:[^"\\\n]|\\.)*"|[rfbu]?'(?:[^'\\\n]|\\.)*'/],
      ["func", /@[\w.]+/],
      ["keyword", new RegExp("\\b(?:" + PY_KW + ")\\b")],
      ["func", /\b[a-zA-Z_]\w*(?=\()/],
      ["number", /\b\d+(?:\.\d+)?\b/]
    ] },
    bash: { flags: "gm", rules: [
      ["prompt", /^\$ /],
      ["comment", /(?:^|[ \t])#[^\n]*/],
      ["string", /"(?:[^"\\]|\\.)*"|'[^']*'/],
      ["flag", /\B--?[a-zA-Z][\w-]*/],
      ["keyword", /\b(?:dbt|docker|exec|cd|export|pip|python|airflow|git|cat|ls|uv|uvx|curl|source)\b/]
    ] },
    toml: { flags: "gm", rules: [
      ["comment", /(?:^|[ \t])#[^\n]*/],
      ["keyword", /^[ \t]*\[\[?[^\]\n]+\]\]?/],
      ["key", /^[ \t]*[\w.\-"]+(?=[ \t]*=)/],
      ["string", /"""[\s\S]*?"""|"(?:[^"\\\n]|\\.)*"|'[^'\n]*'/],
      ["keyword", /\b(?:true|false)\b/],
      ["number", /\b\d+(?:\.\d+)?\b/]
    ] },
    dockerfile: { flags: "gm", rules: [
      ["comment", /^[ \t]*#[^\n]*/],
      ["keyword", /^[ \t]*(?:FROM|RUN|COPY|ADD|ENV|ARG|WORKDIR|CMD|ENTRYPOINT|EXPOSE|USER|LABEL|AS)\b|\bAS\b/],
      ["string", /"(?:[^"\\\n]|\\.)*"/],
      ["flag", /\B--?[a-zA-Z][\w-]*/]
    ] },
    dax: { flags: "g", rules: [
      ["comment", /\/\/[^\n]*|--[^\n]*|\/\*[\s\S]*?\*\//],
      ["string", /"(?:[^"]|"")*"/],
      ["key", /'(?:[^'\n]|'')*'|\[[^\]\n]+\]/],
      ["keyword", /\b(?:VAR|RETURN|TRUE|FALSE|IN|NOT|DEFINE|EVALUATE|MEASURE|ORDER|BY|ASC|DESC)\b/],
      ["func", /\b[A-Za-z][A-Za-z0-9.]*(?=\s*\()/],
      ["number", /\b\d+(?:\.\d+)?\b/]
    ] },
    m: { flags: "g", rules: [
      ["comment", /\/\/[^\n]*|\/\*[\s\S]*?\*\//],
      ["key", /#"(?:[^"]|"")*"/],
      ["string", /"(?:[^"]|"")*"/],
      ["keyword", /\b(?:let|in|each|if|then|else|true|false|null|type|and|or|not|as|is|try|otherwise)\b/],
      ["func", /\b[A-Za-z_][\w]*(?:\.[A-Za-z_]\w*)*(?=\s*\()/],
      ["number", /\b\d+(?:\.\d+)?\b/]
    ] },
    json: { flags: "g", rules: [
      ["key", /"(?:[^"\\\n]|\\.)*"(?=\s*:)/],
      ["string", /"(?:[^"\\\n]|\\.)*"/],
      ["keyword", /\b(?:true|false|null)\b/],
      ["number", /-?\b\d+(?:\.\d+)?\b/]
    ] }
  };
  LANGS.powerquery = LANGS.m;
  LANGS.jinja = LANGS.sql;
  LANGS.yml = LANGS.yaml;
  LANGS.py = LANGS.python;
  LANGS.shell = LANGS.bash;
  LANGS.powershell = LANGS.bash;
  LANGS.docker = LANGS.dockerfile;

  function highlight(src, lang) {
    var def = LANGS[lang];
    if (!def) return esc(src);
    var re = new RegExp(def.rules.map(function (r) { return "(" + r[1].source + ")"; }).join("|"), def.flags);
    var out = "", last = 0, m;
    while ((m = re.exec(src))) {
      if (m[0] === "") { re.lastIndex++; continue; }
      var k = 1;
      while (m[k] === undefined) k++;
      var cls = def.rules[k - 1][0];
      out += esc(src.slice(last, m.index));
      var inner = cls === "jinja" ? highlight(m[0], "jinjaInner") : esc(m[0]);
      out += '<span class="tok-' + cls + '">' + inner + "</span>";
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last));
  }

  function decorateCode() {
    document.querySelectorAll("pre.code").forEach(function (pre) {
      var code = pre.querySelector("code") || pre;
      var raw = code.textContent.replace(/^\n/, "").replace(/\s+$/, "");
      var lang = (pre.dataset.lang || "text").toLowerCase();
      code.innerHTML = highlight(raw, lang);

      var copy = el("button", { class: "copy-btn", type: "button", text: "Copy" });
      copy.addEventListener("click", function () {
        var text = raw.replace(/^\$ /gm, "");
        var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy"; }, 1400); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
        else {
          var ta = el("textarea"); ta.value = text; body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); done(); } catch (e) {}
          body.removeChild(ta);
        }
      });
      var head = el("div", { class: "codeblock-head" }, [
        pre.dataset.title ? el("span", { text: pre.dataset.title }) : null,
        el("span", { class: "lang", text: pre.dataset.label || lang }),
        copy
      ]);
      var wrap = el("div", { class: "codeblock" });
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(head);
      wrap.appendChild(pre);
    });
  }

  /* command tables (table.cmds): a small Copy button beside the command in each row's first cell */
  function decorateCommandTables() {
    document.querySelectorAll("table.cmds td:first-child > code:first-child").forEach(function (code) {
      var btn = el("button", { class: "cmd-copy", type: "button", text: "Copy", title: "Copy this command", "aria-label": "Copy command: " + code.textContent });
      btn.addEventListener("click", function () {
        var text = code.textContent;
        var done = function () { btn.textContent = "Copied"; btn.classList.add("done"); setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1400); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
        else {
          var ta = el("textarea"); ta.value = text; body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); done(); } catch (e) {}
          body.removeChild(ta);
        }
      });
      code.parentNode.appendChild(btn);
    });
  }

  function wrapTables() {
    document.querySelectorAll(".doc table").forEach(function (t) {
      if (t.parentNode.classList.contains("table-wrap")) return;
      var w = el("div", { class: "table-wrap" });
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    });
  }

  /* ---------- overview pages: chapter lists and progress, generated from the site map ---------- */
  function buildChapterLists() {
    document.querySelectorAll("[data-chapter-list]").forEach(function (box) {
      var found = findTutorial(box.getAttribute("data-chapter-list"));
      if (!found) return;
      var tut = found.tutorial, base = ROOT + tut.path, part = null;
      var ul = el("ul", { class: "chapter-list" });
      tut.chapters.forEach(function (ch) {
        if (ch.part && ch.part !== part) { part = ch.part; ul.appendChild(el("li", { class: "part", text: ch.part })); }
        var inner = [
          el("span", { class: "num", text: chapterNum(tut, ch) }),
          el("span", { class: "t", html: esc(ch.title) + '<span class="d">' + esc(ch.desc || "") + "</span>" }),
          el("span", { class: "status" + (ch.ready ? " ready" : ""), text: ch.ready ? "Read →" : "Coming soon" })
        ];
        ul.appendChild(el("li", null, [ch.ready ? el("a", { href: base + ch.file }, inner) : el("div", { class: "item" }, inner)]));
      });
      box.appendChild(ul);
    });
  }
  function fillProgress() {
    document.querySelectorAll("[data-progress]").forEach(function (n) {
      var found = findTutorial(n.getAttribute("data-progress"));
      if (!found) return;
      var ch = found.tutorial.chapters, ready = ch.filter(function (c) { return c.ready; }).length;
      n.innerHTML = '<div class="progress"><span style="width:' + Math.round(ready / ch.length * 100) + '%"></span></div>' +
        esc(ready + " of " + ch.length + " chapters published");
    });
  }

  /* ---------- maths: typeset .tex (inline) and .texd (display) with KaTeX, loaded on demand ---------- */
  var KATEX = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/";
  function renderMath() {
    var nodes = document.querySelectorAll(".tex, .texd");
    if (!nodes.length) return;
    function typeset() {
      nodes.forEach(function (n) {
        if (n.getAttribute("data-tex-done")) return;
        var src = n.getAttribute("data-tex") || n.textContent;
        n.setAttribute("data-tex", src);
        try {
          window.katex.render(src, n, { displayMode: n.classList.contains("texd"), throwOnError: false, strict: "ignore" });
          n.setAttribute("data-tex-done", "1");
        } catch (e) { /* leave the TeX source visible */ }
      });
    }
    if (window.katex) { typeset(); return; }
    // integrity pins the exact files the site was tested with; a changed CDN file is refused
    var css = document.createElement("link");
    css.rel = "stylesheet"; css.href = KATEX + "katex.min.css";
    css.integrity = "sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV"; css.crossOrigin = "anonymous";
    document.head.appendChild(css);
    var js = document.createElement("script");
    js.src = KATEX + "katex.min.js"; js.onload = typeset;
    js.integrity = "sha384-XjKyOOlGwcjNTAIQHIpgOno0Hl1YQqzUOEleOLALmuqehneUG+vnGctmUb0ZY0l8"; js.crossOrigin = "anonymous";
    document.head.appendChild(js);
  }
  /* ---------- full-screen toggle for architecture diagrams ---------- */
  function fullscreenDiagrams() {
    document.querySelectorAll("figure.arch").forEach(function (fig) {
      var bar = fig.querySelector(".arch-bar");
      if (!bar || !fig.requestFullscreen) return;
      var btn = el("button", { class: "btn-sm fs-btn", type: "button", text: "⤢ Full screen" });
      btn.addEventListener("click", function () {
        if (document.fullscreenElement === fig) document.exitFullscreen();
        else fig.requestFullscreen().catch(function () {});
      });
      document.addEventListener("fullscreenchange", function () {
        btn.textContent = document.fullscreenElement === fig ? "✕ Exit full screen" : "⤢ Full screen";
      });
      bar.appendChild(btn);
    });
  }
  /* ---------- dark text on hard-coded light boxes (readable in both themes) ---------- */
  function contrastDiagramText() {
    function light(c) {
      var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || "");
      return m && (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) > 170;
    }
    document.querySelectorAll("figure.diagram svg, figure.arch svg").forEach(function (svg) {
      var boxes = [];
      svg.querySelectorAll("rect, ellipse, circle, polygon, path").forEach(function (s) {
        // only fills fixed in the markup; themed classes already flip with the theme
        var fixed = s.style.fill || (s.getAttribute("fill") && !s.getAttribute("class"));
        if (!fixed || !light(getComputedStyle(s).fill)) return;
        var r = s.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) boxes.push(r);
      });
      if (!boxes.length) return;
      svg.querySelectorAll("text").forEach(function (t) {
        var b = t.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
        var inside = boxes.some(function (r) { return x > r.left && x < r.right && y > r.top && y < r.bottom; });
        if (inside) t.classList.add("d-on-light");
      });
    });
  }
  /* ---------- zoom in / out (and drag to pan) for every diagram ---------- */
  function zoomDiagrams() {
    var STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];
    // at 100%, never shrink a drawing below this share of its drawn size, so its text stays readable;
    // narrower screens scroll sideways instead. Architecture maps also keep their 900px CSS minimum.
    var READABLE = { diagram: 0.86, arch: 0.75 };
    document.querySelectorAll("figure.arch, figure.diagram").forEach(function (fig) {
      var target = fig.querySelector(":scope > .arch-scroll > svg, :scope > .arch-scroll > img, :scope > svg, :scope > img");
      if (!target) return;
      var vb = target.viewBox && target.viewBox.baseVal;
      var min = vb && vb.width ? Math.round(vb.width * READABLE[fig.classList.contains("arch") ? "arch" : "diagram"]) : 0;
      var readable = min > (fig.classList.contains("arch") ? 900 : 0) ? min + "px" : "";
      var scroller = target.parentElement;
      if (scroller === fig) {                        // figure.diagram: wrap the drawing in a scroll box
        scroller = el("div", { class: "zoom-scroll" });
        fig.insertBefore(scroller, target);
        scroller.appendChild(target);
      }
      scroller.classList.add("zoomable");
      var i = STEPS.indexOf(1), base = 0;
      var out = el("button", { class: "btn-sm", type: "button", text: "−", title: "Zoom out", "aria-label": "Zoom out" });
      var pct = el("button", { class: "btn-sm zoom-pct", type: "button", text: "100%", title: "Reset zoom" });
      var inn = el("button", { class: "btn-sm", type: "button", text: "+", title: "Zoom in", "aria-label": "Zoom in" });
      var ctl = el("span", { class: "zoom-ctl" });
      ctl.appendChild(out); ctl.appendChild(pct); ctl.appendChild(inn);

      function apply() {
        var z = STEPS[i];
        pct.textContent = Math.round(z * 100) + "%";
        out.disabled = i === 0; inn.disabled = i === STEPS.length - 1;
        scroller.classList.toggle("zoomed", z !== 1);
        if (z === 1) {
          target.style.width = target.style.maxWidth = target.style.maxHeight = "";
          target.style.minWidth = readable;
        } else {
          target.style.minWidth = "0"; target.style.maxWidth = "none"; target.style.maxHeight = "none";
          target.style.width = Math.round(base * z) + "px";
        }
        fig.classList.toggle("pannable", scroller.scrollWidth > scroller.clientWidth + 2);
      }
      function step(d) {
        var n = Math.max(0, Math.min(STEPS.length - 1, i + d));
        if (n === i) return;
        if (STEPS[i] === 1) base = target.getBoundingClientRect().width;   // measure the 100% size
        var cx = scroller.scrollLeft + scroller.clientWidth / 2, cy = scroller.scrollTop + scroller.clientHeight / 2;
        var ratio = STEPS[n] / STEPS[i];
        i = n; apply();
        scroller.scrollLeft = cx * ratio - scroller.clientWidth / 2;       // keep the centre in view
        scroller.scrollTop = cy * ratio - scroller.clientHeight / 2;
      }
      out.addEventListener("click", function () { step(-1); });
      inn.addEventListener("click", function () { step(1); });
      pct.addEventListener("click", function () { i = STEPS.indexOf(1); apply(); });
      document.addEventListener("fullscreenchange", function () { i = STEPS.indexOf(1); apply(); });

      var drag = null;                                // drag to pan while zoomed
      scroller.addEventListener("pointerdown", function (e) {
        if (!scroller.classList.contains("zoomed") || e.button !== 0) return;
        drag = { x: e.clientX, y: e.clientY, l: scroller.scrollLeft, t: scroller.scrollTop };
        scroller.setPointerCapture(e.pointerId); scroller.classList.add("panning");
      });
      scroller.addEventListener("pointermove", function (e) {
        if (!drag) return;
        scroller.scrollLeft = drag.l - (e.clientX - drag.x);
        scroller.scrollTop = drag.t - (e.clientY - drag.y);
      });
      function end() { drag = null; scroller.classList.remove("panning"); }
      scroller.addEventListener("pointerup", end);
      scroller.addEventListener("pointercancel", end);

      var bar = fig.querySelector(":scope > .arch-bar");
      if (bar) bar.appendChild(ctl);
      else {
        var zb = el("div", { class: "zoom-bar" });
        zb.appendChild(el("span", { class: "pan-hint", text: "Swipe sideways to see it all ↔" }));
        zb.appendChild(ctl);
        fig.insertBefore(zb, fig.firstChild);
      }
      window.addEventListener("resize", function () { fig.classList.toggle("pannable", scroller.scrollWidth > scroller.clientWidth + 2); });
      apply();
    });
  }
  window.EWB = window.EWB || {};
  window.EWB.renderMath = renderMath;           // pages may call it after adding maths dynamically

  /* "© 2026 Sameera Bandarage…", becoming "© 2026–2027 …" in later years without an edit */
  function copyright() {
    var first = 2026, now = new Date().getFullYear();
    var years = now > first ? first + "–" + now : String(first);
    return '<span class="copyright">© ' + years + " Sameera Bandarage. All rights reserved.</span>";
  }
  function footer() {
    if (document.querySelector(".site-footer")) return;
    var f = el("footer", { class: "site-footer", html: esc(SITE.name) + " · " + esc(SITE.tagline) +
      '<a class="footer-contact" href="' + ROOT + CONTACT + '">Contact me</a>' + copyright() });
    var main = document.querySelector("main.content");
    (main || body).appendChild(f);
  }

  buildTopbar();
  buildSidebar();
  buildBreadcrumbs();
  buildChapterLists();
  fillProgress();
  decorateCallouts();
  decorateCode();
  decorateCommandTables();
  wrapTables();
  buildToc();
  buildPager();
  renderMath();
  contrastDiagramText();
  zoomDiagrams();
  fullscreenDiagrams();
  footer();
})();
