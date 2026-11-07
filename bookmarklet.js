/**
 * PlainPage Live Readability & Jargon Inspector Bookmarklet
 * Repository: https://github.com/draarivpatel-ui/plainpage
 * Live Studio: https://aariv.me/plainpage/
 *
 * Usage as a browser bookmarklet URL:
 * javascript:(function(){var s=document.createElement('script');s.src='https://aariv.me/plainpage/bookmarklet.js';document.body.appendChild(s);})();
 */
(function (root) {
  "use strict";

  var JARGON_MAP = {
    utilize: "use",
    utilization: "use",
    facilitate: "help",
    endeavor: "try",
    commence: "start",
    terminate: "end",
    subsequent: "later",
    prior: "earlier",
    approximately: "about",
    nevertheless: "still",
    consequently: "so",
    furthermore: "also",
    demonstrate: "show",
    implement: "carry out",
    modification: "change",
    remuneration: "pay",
    accompany: "go with",
    ascertain: "find out",
    disseminate: "share",
    methodology: "method",
    necessitate: "need",
    objective: "goal",
    procure: "get",
    proliferate: "spread",
    stipulate: "require",
    substantiate: "prove"
  };

  function countSyllables(word) {
    var clean = String(word || "").toLowerCase().replace(/[^a-z]/g, "");
    if (!clean) return 0;
    if (clean.length <= 3) return 1;
    clean = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
    clean = clean.replace(/^y/, "");
    var matches = clean.match(/[aeiouy]{1,2}/g);
    return matches ? Math.max(1, matches.length) : 1;
  }

  function analyzeSelection(rawText) {
    var text = String(rawText || "").trim();
    if (!text) {
      return {
        words: 0,
        sentences: 0,
        syllables: 0,
        complexWords: 0,
        fleschEase: 0,
        kincaidGrade: 0,
        gunningFog: 0,
        smogGrade: 0,
        jargonHits: []
      };
    }

    var sentenceParts = text
      .replace(/([.!?]+)\s+/g, "$1|")
      .split("|")
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    var sentences = Math.max(1, sentenceParts.length);

    var wordTokens = text
      .toLowerCase()
      .match(/[a-z]+(?:'[a-z]+)?/g) || [];
    var words = Math.max(1, wordTokens.length);

    var syllables = 0;
    var complexWords = 0;
    var jargonCounts = {};

    for (var i = 0; i < wordTokens.length; i++) {
      var w = wordTokens[i];
      var syl = countSyllables(w);
      syllables += syl;
      if (syl >= 3) {
        complexWords += 1;
      }
      if (Object.prototype.hasOwnProperty.call(JARGON_MAP, w)) {
        jargonCounts[w] = (jargonCounts[w] || 0) + 1;
      }
    }

    var wps = words / sentences;
    var spw = syllables / words;
    var fleschEase = Number((206.835 - 1.015 * wps - 84.6 * spw).toFixed(1));
    var kincaidGrade = Number((0.39 * wps + 11.8 * spw - 15.59).toFixed(1));
    var gunningFog = Number((0.4 * (wps + 100 * (complexWords / words))).toFixed(1));
    var smogGrade = Number((1.043 * Math.sqrt(complexWords * (30 / sentences)) + 3.1291).toFixed(1));

    var jargonHits = Object.keys(jargonCounts).map(function (term) {
      return {
        term: term,
        replacement: JARGON_MAP[term],
        count: jargonCounts[term]
      };
    });

    return {
      words: wordTokens.length,
      sentences: sentences,
      syllables: syllables,
      complexWords: complexWords,
      fleschEase: fleschEase,
      kincaidGrade: kincaidGrade,
      gunningFog: gunningFog,
      smogGrade: smogGrade,
      jargonHits: jargonHits
    };
  }

  function renderOverlay(report, sourceLabel) {
    if (typeof document === "undefined") return null;
    var existing = document.getElementById("plainpage-hacklet-card");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    var card = document.createElement("aside");
    card.id = "plainpage-hacklet-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "PlainPage Readability Bookmarklet");
    card.style.cssText = [
      "position:fixed",
      "top:18px",
      "right:18px",
      "width:340px",
      "max-width:92vw",
      "background:#fbf8f1",
      "color:#1c1917",
      "border:2px solid #1c1917",
      "box-shadow:0 12px 28px rgba(28,25,23,0.22)",
      "font-family:Georgia,'Iowan Old Style',serif",
      "padding:16px",
      "z-index:2147483647",
      "line-height:1.4"
    ].join(";");

    var header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #1c1917;padding-bottom:8px;margin-bottom:10px;";

    var title = document.createElement("strong");
    title.style.cssText = "font-size:16px;letter-spacing:0.02em;";
    title.textContent = "PlainPage Bookmarklet";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Close";
    closeBtn.style.cssText = "background:#1c1917;color:#fbf8f1;border:none;padding:3px 8px;font-size:12px;cursor:pointer;font-family:monospace;";
    closeBtn.onclick = function () {
      if (card.parentNode) card.parentNode.removeChild(card);
    };

    header.appendChild(title);
    header.appendChild(closeBtn);
    card.appendChild(header);

    var meta = document.createElement("div");
    meta.style.cssText = "font-family:monospace;font-size:11px;color:#57534e;margin-bottom:10px;";
    meta.textContent = sourceLabel + " | " + report.words + " words, " + report.sentences + " sentences";
    card.appendChild(meta);

    var grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;";

    var metrics = [
      ["Flesch Ease", String(report.fleschEase)],
      ["Kincaid Grade", "Grade " + String(report.kincaidGrade)],
      ["Gunning Fog", String(report.gunningFog)],
      ["SMOG Index", "Grade " + String(report.smogGrade)]
    ];

    for (var i = 0; i < metrics.length; i++) {
      var box = document.createElement("div");
      box.style.cssText = "border:1px solid #d6d0c4;padding:8px;background:#f4efe4;";
      var lbl = document.createElement("div");
      lbl.style.cssText = "font-family:monospace;font-size:10px;color:#57534e;";
      lbl.textContent = metrics[i][0];
      var val = document.createElement("div");
      val.style.cssText = "font-size:18px;font-weight:bold;color:#b45309;margin-top:2px;";
      val.textContent = metrics[i][1];
      box.appendChild(lbl);
      box.appendChild(val);
      grid.appendChild(box);
    }
    card.appendChild(grid);

    var jargonBox = document.createElement("div");
    jargonBox.style.cssText = "border-top:1px solid #d6d0c4;padding-top:8px;font-size:12px;";
    if (report.jargonHits.length === 0) {
      jargonBox.textContent = "Jargon radar: 0 complex institutional terms flagged.";
    } else {
      var jTitle = document.createElement("div");
      jTitle.style.cssText = "font-weight:bold;margin-bottom:4px;";
      jTitle.textContent = "Suggested plain swaps (" + report.jargonHits.length + "):";
      jargonBox.appendChild(jTitle);
      for (var j = 0; j < Math.min(4, report.jargonHits.length); j++) {
        var hit = report.jargonHits[j];
        var row = document.createElement("div");
        row.style.cssText = "font-family:monospace;font-size:11px;";
        row.textContent = hit.term + " -> " + hit.replacement + " (" + hit.count + "x)";
        jargonBox.appendChild(row);
      }
    }
    card.appendChild(jargonBox);

    document.body.appendChild(card);
    return card;
  }

  function runBookmarklet() {
    if (typeof window === "undefined" || typeof document === "undefined") return null;
    var sel = window.getSelection ? String(window.getSelection()).trim() : "";
    var sourceLabel = "Selected text";
    if (!sel) {
      var rootEl = document.querySelector("article, main") || document.body;
      sel = rootEl ? String(rootEl.innerText || "").trim() : "";
      sourceLabel = "Page content";
    }
    var report = analyzeSelection(sel);
    renderOverlay(report, sourceLabel);
    return report;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      countSyllables: countSyllables,
      analyzeSelection: analyzeSelection,
      runBookmarklet: runBookmarklet
    };
  } else {
    root.PlainPageBookmarklet = {
      countSyllables: countSyllables,
      analyzeSelection: analyzeSelection,
      runBookmarklet: runBookmarklet
    };
    runBookmarklet();
  }
})(typeof window !== "undefined" ? window : globalThis);
