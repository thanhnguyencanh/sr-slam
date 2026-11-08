// SR-SLAM project page: headline numbers, results explorer (Tables 6, 7, 9), ablation (Table 10), runtime (Table 12),
// real-world drift (Table 13), YouTube facade. No dependencies.
(function () {
  "use strict";
  var D = window.SRSLAM;
  if (!D) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, attrs, html) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var OURS = "SR-SLAM";

  var tip = el("div", { class: "tip", role: "tooltip", hidden: "" });
  document.body.appendChild(tip);
  var hideTip = function () { tip.hidden = true; };
  window.addEventListener("scroll", hideTip, { passive: true });
  function hover(node, html) {
    var show = function () {
      tip.innerHTML = html; tip.hidden = false;
      var r = node.getBoundingClientRect();
      tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 12, Math.max(12, r.left)) + "px";
      tip.style.top = (r.bottom + 8 + tip.offsetHeight > window.innerHeight ? r.top - tip.offsetHeight - 8 : r.bottom + 8) + "px";
    };
    node.addEventListener("mouseenter", show); node.addEventListener("focus", show);
    node.addEventListener("mouseleave", hideTip); node.addEventListener("blur", hideTip);
  }
  function bars(box, items, dg, unit, keepOrder) {
    box.innerHTML = "";
    if (!keepOrder) items = items.slice().sort(function (a, b) { return a.v - b.v; });
    var max = Math.max.apply(null, items.map(function (x) { return x.v; })) || 1;
    items.forEach(function (x, i) {
      var row = el("div", { class: "bar-row" + (x.ours ? " ours" : ""), tabindex: "0" },
        '<span class="bar-name">' + esc(x.name) + '</span><span class="bar-track"><span class="bar" style="width:' + Math.max(0.6, 100 * x.v / max).toFixed(1) + '%"></span></span><span class="bar-val">' + x.v.toFixed(dg) + "</span>");
      hover(row, "<strong>" + esc(x.name) + "</strong>: " + x.v.toFixed(dg) + " " + unit + (!keepOrder && i === 0 ? " · lowest" : "") + (x.note ? "<br>" + esc(x.note) : ""));
      box.appendChild(row);
    });
    return items;
  }
  function chips(container, opts, get, set) {
    container.innerHTML = "";
    opts.forEach(function (o) {
      var b = el("button", { type: "button", class: "chip", "aria-pressed": String(get() === o[0]) }, esc(o[1]));
      b.addEventListener("click", function () { set(o[0]); });
      container.appendChild(b);
    });
  }
  function verdict(node, row, methods, dg, unit, lowerWord) {
    var vals = methods.filter(function (m) { return row[m] !== null; });
    var best = vals.filter(function (m) { return m !== OURS; }).sort(function (a, b) { return row[a] - row[b]; })[0];
    var ours = row[OURS], good = ours <= row[best];
    node.innerHTML = good ? "SR-SLAM is " + lowerWord + " here: " + ours.toFixed(dg) + " " + unit + " (next: " + esc(best) + " " + row[best].toFixed(dg) + ")." :
      "A baseline is lower here: <strong>" + esc(best) + "</strong> " + row[best].toFixed(dg) + " vs SR-SLAM " + ours.toFixed(dg) + " " + unit + ".";
    node.className = "verdict " + (good ? "is-good" : "is-other");
  }

  // ---- headline (computed from the tables) ----
  var tum = D.tum.rows, seqs = Object.keys(tum.ate);
  var lowestTrpe = seqs.filter(function (s) { return D.tum.methods.every(function (m) { return tum.trpe[s][m] === null || tum.trpe[s][OURS] <= tum.trpe[s][m]; }); }).length;
  var maxRed = Math.max.apply(null, seqs.map(function (s) { return 100 * (1 - tum.ate[s][OURS] / tum.ate[s]["ORB-SLAM3"]); }));
  var tracked = function (m) { return Object.keys(D.ol.rows).filter(function (s) { return D.ol.rows[s][m] !== null; }).length; };
  var nOl = Object.keys(D.ol.rows).length;
  [[lowestTrpe + " / " + seqs.length, "TUM sequences with the lowest translational drift among ORB-SLAM3-based methods"],
   ["−" + Math.round(maxRed) + "%", "largest ATE reduction over ORB-SLAM3 on TUM dynamic sequences"],
   [tracked(OURS) + " / " + nOl, "OpenLORIS sequences tracked (SG-SLAM: " + tracked("SG-SLAM") + " / " + nOl + ")"],
   ["≈ " + Math.round(1 / D.runtime[OURS]) + " FPS", "runtime, slower than the other systems compared (Table 12)"]].forEach(function (h) {
    $("#headline").appendChild(el("div", {}, "<dt>" + esc(h[0]) + "</dt><dd>" + esc(h[1]) + "</dd>"));
  });

  // ---- results explorer ----
  var BENCH = {
    "TUM RGB-D": { note: "ORB-SLAM3-based dynamic SLAM methods (Table 6)", methods: D.tum.methods, metrics: [["ate", "ATE"], ["trpe", "T.RPE"], ["rrpe", "R.RPE"]],
      rows: function (k) { return D.tum.rows[k]; }, unit: function (k) { return D.tum.unit[k]; }, missing: "not reported" },
    "BONN": { note: "nine dynamic sequences (Table 7)", methods: D.bonn.methods, metrics: [["ate", "ATE"]], rows: function () { return D.bonn.rows; }, unit: function () { return "m"; }, missing: "not reported" },
    "OpenLORIS": { note: "eight real service-robot sequences (Table 9)", methods: D.ol.methods, metrics: [["ate", "ATE"]], rows: function () { return D.ol.rows; }, unit: function () { return "m"; }, missing: "tracking failed" }
  };
  var bench = "TUM RGB-D", metric = "ate", seq = null;
  Object.keys(BENCH).forEach(function (b) {
    var t = el("button", { type: "button", class: "tab", role: "tab", "data-b": b }, esc(b));
    t.addEventListener("click", function () { bench = b; metric = "ate"; seq = null; draw(); });
    $("#bench-tabs").appendChild(t);
  });
  function draw() {
    var B = BENCH[bench], rows = B.rows(metric), unit = B.unit(metric), names = Object.keys(rows);
    if (!seq || !rows[seq]) seq = rows.Average ? "Average" : names[0];
    var dg = unit === "°" ? 3 : 4;
    $("#bench-tabs").querySelectorAll(".tab").forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.b === bench)); });
    chips($("#metric-tabs"), B.metrics, function () { return metric; }, function (v) { metric = v; draw(); });
    chips($("#seq-tabs"), names.map(function (s) { return [s, s]; }), function () { return seq; }, function (v) { seq = v; draw(); });
    var row = rows[seq];
    var missing = B.methods.filter(function (m) { return row[m] === null; });
    bars($("#res-chart .bars"), B.methods.filter(function (m) { return row[m] !== null; }).map(function (m) { return { name: m, v: row[m], ours: m === OURS }; }), dg, unit);
    $("#res-title").textContent = (metric === "ate" ? "ATE" : metric === "trpe" ? "Translational RPE" : "Rotational RPE") + " RMSE · " + bench + " · " + seq;
    $("#res-sub").textContent = unit + " · lower is better · " + B.note + (missing.length ? " · " + B.missing + ": " + missing.join(", ") : "");
    verdict($("#res-verdict"), row, B.methods, dg, unit, "lowest");
    $("#res-table").innerHTML = "<caption>RMSE (" + esc(unit) + "). Best per row in bold; – " + esc(B.missing) + ".</caption><thead><tr><th>Sequence</th>" +
      B.methods.map(function (m) { return "<th>" + esc(m) + "</th>"; }).join("") + "</tr></thead><tbody>" + names.map(function (s) {
        var r = rows[s], vals = B.methods.map(function (m) { return r[m]; }).filter(function (v) { return v !== null; }), mn = Math.min.apply(null, vals);
        return '<tr class="' + (s === "Average" ? "group" : "") + '"><td>' + esc(s) + "</td>" + B.methods.map(function (m) {
          var v = r[m]; if (v === null) return '<td class="numc">–</td>';
          return '<td class="numc">' + (v === mn ? "<strong>" + v.toFixed(dg) + "</strong>" : v.toFixed(dg)) + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody>";
  }
  draw();

  // ---- ablation (Table 10, the paper's column order) ----
  var LABEL = { "ORB-SLAM3": "ORB-SLAM3", "SP": "SP", "SP+D": "SP + D", "SP+B": "SP + B", "SR-SLAM": "SR-SLAM (full)" };
  var abl = "Average";
  function drawAbl() {
    var rows = D.ablation.rows;
    chips($("#abl-tabs"), Object.keys(rows).map(function (s) { return [s, s]; }), function () { return abl; }, function (v) { abl = v; drawAbl(); });
    var r = rows[abl];
    $("#abl-title").textContent = "Ablation · ATE RMSE · " + abl;
    bars($("#abl-chart .bars"), D.ablation.variants.map(function (k) { return { name: LABEL[k], v: r[k], ours: k === OURS }; }), 4, "m", true);
    var best = D.ablation.variants.slice().sort(function (a, b) { return r[a] - r[b]; })[0];
    $("#abl-note").textContent = best === OURS ? "The full system has the lowest error here." :
      "Here " + LABEL[best] + " is lower (" + r[best].toFixed(4) + " m vs " + r[OURS].toFixed(4) + " m for the full system).";
  }
  drawAbl();

  // ---- runtime (Table 12) ----
  bars($("#rt-chart .bars"), D.ol.methods.map(function (m) { return { name: m, v: D.runtime[m], ours: m === OURS, note: "≈ " + (1 / D.runtime[m]).toFixed(1) + " FPS" }; }), 4, "s / frame", true);

  // ---- real-world drift (Table 13) ----
  var sc = "long", dm = "max3d";
  function drawDrift() {
    chips($("#drift-tabs"), D.drift.scenes.map(function (s) { return [s, s + (D.drift.dynamic.indexOf(s) >= 0 ? "" : " (no dynamics)")]; }), function () { return sc; }, function (v) { sc = v; drawDrift(); });
    chips($("#drift-metric"), [["max3d", "Max 3D drift"], ["rms", "RMS drift"], ["std", "STD"]], function () { return dm; }, function (v) { dm = v; drawDrift(); });
    var row = {}; D.ol.methods.forEach(function (m) { row[m] = D.drift.rows[sc][m][dm]; });
    bars($("#drift-chart .bars"), D.ol.methods.map(function (m) { return { name: m, v: row[m], ours: m === OURS }; }), 1, "mm");
    $("#drift-title").textContent = "Fixed-camera drift · " + sc + " · " + (dm === "max3d" ? "maximum 3D drift" : dm === "rms" ? "RMS drift" : "standard deviation");
    verdict($("#drift-verdict"), row, D.ol.methods, 1, "mm", "lowest");
  }
  drawDrift();

  // ---- YouTube facade ----
  var yt = $("#yt");
  yt.querySelector("button").addEventListener("click", function () {
    yt.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + yt.dataset.id + '?autoplay=1&rel=0" title="SR-SLAM video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
  });

  var links = document.querySelectorAll(".toc a");
  if ("IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) links.forEach(function (l) { l.classList.toggle("on", l.getAttribute("href") === "#" + e.target.id); }); });
    }, { rootMargin: "-40% 0px -55% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { so.observe(s); });
  }
  var copy = $("#copy-bib");
  copy.addEventListener("click", function () {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText($("#bibtex").textContent).then(function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy"; }, 1600); }, function () {});
  });
})();
