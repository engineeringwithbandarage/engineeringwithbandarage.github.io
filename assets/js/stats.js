/* stats.js — small, dependency-free statistics library for the Statistics track.
   Descriptive measures, seeded RNG, distributions (normal, t, chi-square, F, binomial, Poisson),
   inference helpers and simple regression.  Quantiles use the "linear" (type 7) rule, the same as
   numpy.percentile and PostgreSQL percentile_cont, so numbers match the server-side analysis. */
(function (global) {
  "use strict";
  var S = {};

  /* ---------------- descriptive ---------------- */
  S.clean = function (a) { return a.filter(function (v) { return v !== null && v !== undefined && isFinite(v); }); };
  S.sum = function (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; };
  S.mean = function (a) { return a.length ? S.sum(a) / a.length : NaN; };
  S.variance = function (a, ddof) {
    ddof = ddof === undefined ? 1 : ddof;
    var m = S.mean(a), s = 0;
    for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m);
    return s / (a.length - ddof);
  };
  S.sd = function (a, ddof) { return Math.sqrt(S.variance(a, ddof)); };
  S.sorted = function (a) { return a.slice().sort(function (x, y) { return x - y; }); };
  S.quantile = function (sortedArr, p) {
    var n = sortedArr.length; if (!n) return NaN;
    var h = (n - 1) * p, lo = Math.floor(h), hi = Math.ceil(h);
    return sortedArr[lo] + (h - lo) * (sortedArr[hi] - sortedArr[lo]);
  };
  S.median = function (a) { return S.quantile(S.sorted(a), 0.5); };
  S.five = function (a) {
    var s = S.sorted(S.clean(a)), q1 = S.quantile(s, 0.25), q3 = S.quantile(s, 0.75);
    return { n: s.length, min: s[0], q1: q1, median: S.quantile(s, 0.5), q3: q3, max: s[s.length - 1],
             mean: S.mean(s), sd: S.sd(s), iqr: q3 - q1 };
  };
  S.trimmedMean = function (a, prop) {
    var s = S.sorted(a), k = Math.floor(s.length * prop);
    return S.mean(s.slice(k, s.length - k));
  };
  S.skew = function (a) {                 // biased (Fisher-Pearson), as scipy.stats.skew default
    var m = S.mean(a), n = a.length, m2 = 0, m3 = 0;
    for (var i = 0; i < n; i++) { var d = a[i] - m; m2 += d * d; m3 += d * d * d; }
    m2 /= n; m3 /= n; return m3 / Math.pow(m2, 1.5);
  };
  S.kurtosis = function (a) {             // excess, biased (scipy default)
    var m = S.mean(a), n = a.length, m2 = 0, m4 = 0;
    for (var i = 0; i < n; i++) { var d = a[i] - m; m2 += d * d; m4 += d * d * d * d; }
    m2 /= n; m4 /= n; return m4 / (m2 * m2) - 3;
  };
  S.zscores = function (a) { var m = S.mean(a), s = S.sd(a); return a.map(function (v) { return (v - m) / s; }); };
  S.fences = function (a) { var f = S.five(a); return { lower: f.q1 - 1.5 * f.iqr, upper: f.q3 + 1.5 * f.iqr }; };
  S.diff = function (a) { var o = []; for (var i = 1; i < a.length; i++) o.push(a[i] - a[i - 1]); return o; };
  S.logReturns = function (prices, scale) {
    scale = scale || 100; var o = [];
    for (var i = 1; i < prices.length; i++) o.push(Math.log(prices[i] / prices[i - 1]) * scale);
    return o;
  };
  S.corr = function (x, y) {
    var mx = S.mean(x), my = S.mean(y), sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < x.length; i++) { var dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    return sxy / Math.sqrt(sxx * syy);
  };
  S.histogram = function (a, bins, lo, hi) {
    lo = lo === undefined ? Math.min.apply(null, a) : lo; hi = hi === undefined ? Math.max.apply(null, a) : hi;
    var w = (hi - lo) / bins || 1, counts = new Array(bins).fill(0);
    a.forEach(function (v) { var k = Math.floor((v - lo) / w); if (k === bins) k--; if (k >= 0 && k < bins) counts[k]++; });
    return counts.map(function (c, i) { return { x0: lo + i * w, x1: lo + (i + 1) * w, count: c }; });
  };

  /* ---------------- random numbers (seeded) ---------------- */
  S.rng = function (seed) {               // mulberry32
    var t = seed >>> 0;
    var r = function () {
      t += 0x6D2B79F5; var x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    r.int = function (n) { return Math.floor(r() * n); };
    r.normal = function () { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    r.sample = function (a, n, replace) {
      if (replace) { var o = []; for (var i = 0; i < n; i++) o.push(a[r.int(a.length)]); return o; }
      var c = a.slice(); for (var j = c.length - 1; j > 0; j--) { var k = r.int(j + 1), tmp = c[j]; c[j] = c[k]; c[k] = tmp; }
      return c.slice(0, n);
    };
    r.shuffle = function (a) { for (var j = a.length - 1; j > 0; j--) { var k = r.int(j + 1), tmp = a[j]; a[j] = a[k]; a[k] = tmp; } return a; };
    return r;
  };

  /* ---------------- special functions ---------------- */
  var LG = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
            12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  S.lnGamma = function (z) {
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - S.lnGamma(1 - z);
    z -= 1; var x = 0.99999999999980993;
    for (var i = 0; i < 8; i++) x += LG[i] / (z + i + 1);
    var t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  };
  S.lnChoose = function (n, k) { return S.lnGamma(n + 1) - S.lnGamma(k + 1) - S.lnGamma(n - k + 1); };
  S.choose = function (n, k) { return Math.round(Math.exp(S.lnChoose(n, k))); };
  S.factorial = function (n) { var f = 1; for (var i = 2; i <= n; i++) f *= i; return f; };

  function betacf(a, b, x) {
    var MAXIT = 300, EPS = 3e-16, FPMIN = 1e-300, qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; var h = d;
    for (var m = 1; m <= MAXIT; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; var del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  S.ibeta = function (x, a, b) {          // regularized incomplete beta I_x(a,b)
    if (x <= 0) return 0; if (x >= 1) return 1;
    var bt = Math.exp(S.lnGamma(a + b) - S.lnGamma(a) - S.lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  };
  S.gammainc = function (a, x) {          // regularized lower incomplete gamma P(a,x)
    if (x <= 0) return 0;
    if (x < a + 1) {
      var ap = a, sum = 1 / a, del = sum;
      for (var n = 0; n < 500; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; }
      return sum * Math.exp(-x + a * Math.log(x) - S.lnGamma(a));
    }
    var b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
    for (var i = 1; i < 500; i++) {
      var an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; var del2 = d * c; h *= del2;
      if (Math.abs(del2 - 1) < 1e-15) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - S.lnGamma(a)) * h;
  };
  S.erf = function (x) {                  // series / continued fraction via gammainc, ~1e-14
    var v = S.gammainc(0.5, x * x); return x >= 0 ? v : -v;
  };

  function invert(cdf, p, lo, hi) {       // monotone cdf inversion by bisection
    for (var i = 0; i < 200; i++) { var mid = (lo + hi) / 2; if (cdf(mid) < p) lo = mid; else hi = mid; if (hi - lo < 1e-12 * Math.max(1, Math.abs(mid))) break; }
    return (lo + hi) / 2;
  }

  /* ---------------- distributions ---------------- */
  S.normal = {
    pdf: function (x, m, s) { m = m || 0; s = s || 1; var z = (x - m) / s; return Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * Math.PI)); },
    cdf: function (x, m, s) { m = m || 0; s = s || 1; return 0.5 * (1 + S.erf((x - m) / (s * Math.SQRT2))); },
    ppf: function (p, m, s) {             // Acklam's rational approximation + one Newton step
      m = m || 0; s = s || 1;
      if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
      var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00],
          b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01],
          c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00],
          d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00], q, r, x;
      if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
      else if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
      else { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
      var e = S.normal.cdf(x) - p; x = x - e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2) / (1 + x * e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2) / 2);
      return m + s * x;
    }
  };
  S.t = {
    pdf: function (x, df) { return Math.exp(S.lnGamma((df + 1) / 2) - S.lnGamma(df / 2)) / Math.sqrt(df * Math.PI) * Math.pow(1 + x * x / df, -(df + 1) / 2); },
    cdf: function (x, df) { var ib = S.ibeta(df / (df + x * x), df / 2, 0.5); return x >= 0 ? 1 - 0.5 * ib : 0.5 * ib; },
    ppf: function (p, df) { return invert(function (x) { return S.t.cdf(x, df); }, p, -1e4, 1e4); }
  };
  S.chi2 = {
    pdf: function (x, k) { return x <= 0 ? 0 : Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.log(2) - S.lnGamma(k / 2)); },
    cdf: function (x, k) { return x <= 0 ? 0 : S.gammainc(k / 2, x / 2); },
    ppf: function (p, k) { return invert(function (x) { return S.chi2.cdf(x, k); }, p, 0, 1e5); }
  };
  S.f = {
    pdf: function (x, d1, d2) {
      if (x <= 0) return 0;
      return Math.exp(0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) - Math.log(x)
                      - (S.lnGamma(d1 / 2) + S.lnGamma(d2 / 2) - S.lnGamma((d1 + d2) / 2)));
    },
    cdf: function (x, d1, d2) { return x <= 0 ? 0 : S.ibeta(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2); },
    ppf: function (p, d1, d2) { return invert(function (x) { return S.f.cdf(x, d1, d2); }, p, 0, 1e5); }
  };
  S.binom = {
    pmf: function (k, n, p) { if (k < 0 || k > n) return 0; return Math.exp(S.lnChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p)); },
    cdf: function (k, n, p) { var s = 0; for (var i = 0; i <= k; i++) s += S.binom.pmf(i, n, p); return Math.min(1, s); }
  };
  S.poisson = {
    pmf: function (k, lam) { return k < 0 ? 0 : Math.exp(k * Math.log(lam) - lam - S.lnGamma(k + 1)); },
    cdf: function (k, lam) { var s = 0; for (var i = 0; i <= k; i++) s += S.poisson.pmf(i, lam); return Math.min(1, s); }
  };
  S.beta = {
    pdf: function (x, a, b) { if (x <= 0 || x >= 1) return 0; return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - (S.lnGamma(a) + S.lnGamma(b) - S.lnGamma(a + b))); },
    cdf: function (x, a, b) { return S.ibeta(x, a, b); },
    ppf: function (p, a, b) { return invert(function (x) { return S.ibeta(x, a, b); }, p, 0, 1); }
  };

  /* ---------------- inference helpers ---------------- */
  S.tInterval = function (a, conf) {
    var n = a.length, m = S.mean(a), se = S.sd(a) / Math.sqrt(n), tc = S.t.ppf(1 - (1 - conf) / 2, n - 1);
    return { n: n, mean: m, se: se, t: tc, lo: m - tc * se, hi: m + tc * se };
  };
  S.tTest1 = function (a, mu0) {
    var n = a.length, m = S.mean(a), se = S.sd(a) / Math.sqrt(n), t = (m - mu0) / se;
    return { n: n, mean: m, t: t, df: n - 1, p: 2 * (1 - S.t.cdf(Math.abs(t), n - 1)) };
  };
  S.welch = function (a, b) {
    var va = S.variance(a) / a.length, vb = S.variance(b) / b.length, t = (S.mean(a) - S.mean(b)) / Math.sqrt(va + vb),
        df = (va + vb) * (va + vb) / (va * va / (a.length - 1) + vb * vb / (b.length - 1));
    return { t: t, df: df, p: 2 * (1 - S.t.cdf(Math.abs(t), df)) };
  };
  S.propInterval = function (x, n, conf) {
    var z = S.normal.ppf(1 - (1 - conf) / 2), p = x / n, se = Math.sqrt(p * (1 - p) / n);
    return { p: p, lo: p - z * se, hi: p + z * se, z: z, se: se };
  };

  /* ---------------- simple linear regression ---------------- */
  S.linreg = function (x, y) {
    var n = x.length, mx = S.mean(x), my = S.mean(y), sxx = 0, sxy = 0, sst = 0;
    for (var i = 0; i < n; i++) { sxx += (x[i] - mx) * (x[i] - mx); sxy += (x[i] - mx) * (y[i] - my); sst += (y[i] - my) * (y[i] - my); }
    var b1 = sxy / sxx, b0 = my - b1 * mx, sse = 0, res = [];
    for (var j = 0; j < n; j++) { var e = y[j] - (b0 + b1 * x[j]); res.push(e); sse += e * e; }
    var se = Math.sqrt(sse / (n - 2)), seb1 = se / Math.sqrt(sxx);
    return { n: n, b0: b0, b1: b1, r2: 1 - sse / sst, sse: sse, ssr: sst - sse, sst: sst, se: se, seB1: seb1, t: b1 / seb1,
             mx: mx, sxx: sxx, residuals: res,
             predict: function (x0, conf) {
               var tc = S.t.ppf(1 - (1 - (conf || 0.95)) / 2, n - 2), fit = b0 + b1 * x0,
                   hm = se * Math.sqrt(1 / n + (x0 - mx) * (x0 - mx) / sxx), hp = se * Math.sqrt(1 + 1 / n + (x0 - mx) * (x0 - mx) / sxx);
               return { fit: fit, ciLo: fit - tc * hm, ciHi: fit + tc * hm, piLo: fit - tc * hp, piHi: fit + tc * hp };
             } };
  };

  /* ---------------- formatting ---------------- */
  S.fmt = function (v, d) {
    if (v === null || v === undefined || !isFinite(v)) return "—";
    d = d === undefined ? 2 : d;
    return Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  S.fmtP = function (p) {
    if (p === null || p === undefined || !isFinite(p)) return "—";
    if (p < 0.0001) return "< 0.0001";
    return p.toFixed(4);
  };

  global.Stats = S;
})(window);
