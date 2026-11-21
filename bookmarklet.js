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

  // Same syllable counter as the studio engine: vowel groups with a hiatus
  // bonus for ia and ua and a small exception lexicon.
  var SYLLABLE_EXCEPTIONS = {
    australian: 4, business: 2, chocolate: 2, evening: 2, every: 2,
    money: 2, honey: 2, monkey: 2, poem: 2, quiet: 2, science: 2,
    being: 2, create: 2, idea: 3, area: 3, real: 2, recipe: 3
  };

  function countSyllables(rawWord) {
    var word = String(rawWord || "").toLowerCase().replace(/[^a-z]/g, "");
    if (!word) return 0;
    if (Object.prototype.hasOwnProperty.call(SYLLABLE_EXCEPTIONS, word)) {
      return SYLLABLE_EXCEPTIONS[word];
    }
    if (word.length <= 2) return 1;
    var groups = word.match(/[aeiouy]+/g);
    if (!groups) return 1;
    var count = groups.length;
    var hiatus = word.match(/(?<![cst])ia|(?<![cs])ua/g);
    if (hiatus) count += hiatus.length;
    if (/e$/.test(word) && !/le$/.test(word) && count > 1) count -= 1;
    return Math.max(count, 1);
  }

  // Same sentence splitter as the studio engine: decimals, abbreviations,
  // initials and dotted acronyms do not end a sentence.
  function splitSentences(text) {
    if (!text) return [];
    var t = String(text);
    t = t.replace(/(\d)\.(\d)/g, "$1\u0001$2");
    t = t.replace(/\b(?:[A-Za-z]\.){2,}/g, function (m) { return m.replace(/\./g, "\u0001"); });
    t = t.replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|approx|Inc|Dept|Ave)\.\s/g, "$1\u0001 ");
    t = t.replace(/\b([A-Z])\.\s/g, "$1\u0001 ");
    var parts = t.split(/(?<=[.!?])\s+|\n+/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var restored = parts[i].replace(/\u0001/g, ".").trim();
      if (restored && /[A-Za-z0-9]/.test(restored)) out.push(restored);
    }
    return out;
  }

  // Same word tokenizer as the studio engine: hyphens split compounds,
  // accented letters stay inside words, digits count.
  function wordTokensOf(text) {
    if (!text) return [];
    var t = String(text).replace(/[-]/g, " ");
    var matches = t.match(/[\p{L}\p{N}'\u2019]+/gu);
    return matches ? matches : [];
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

    var sentences = Math.max(1, splitSentences(text).length);

    var wordTokens = wordTokensOf(text).map(function (w) { return w.toLowerCase(); });
    if (!wordTokens.length) {
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
    var words = wordTokens.length;

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
