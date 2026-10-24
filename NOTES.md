# PlainPage Notes

PlainPage is a plain language studio for educators and community groups. Paste any text and get a readability report from five published formulas with the arithmetic shown, a jargon radar over an editable term list, a deterministic rewrite bench with a before and after diff, and an audience dial that rejudges every score against a chosen grade band. Everything runs client side in one static page, with no network and no dependencies.

## What Was Built

- `index.html`, the whole studio. A masthead, a text stage with two built in sample documents, four tabbed panels, and a colophon citing the formulas.
- `js/engine.js`, the pure engine. Sentence and word tokenization with protected abbreviations and decimals, the syllable counter, all five formulas, grade conversions, jargon matching, the three rewrite transforms, a word level diff, and the dial verdicts. No DOM access, which is what makes it testable.
- `js/data.js`, the fixtures. The Dale-Chall familiar word fixture (796 tokens with plain inflection matching), the starter jargon list (96 lines with plain alternatives), the rewrite dictionary (44 conservative swaps), the two samples, and the standard band tables.
- `js/app.js`, the wiring. ARIA tabs with arrow key navigation, live recomputation on a 160 millisecond debounce, localStorage persistence for the term list, clipboard copy with a fallback, and all rendering through textContent so pasted text is never treated as markup.
- `tests/readability.test.js` and `tests/tools.test.js`, the suite described below.
- `css/style.css`, the design system. Warm paper canvas, ink text, one copper accent, oversized serif numerals for scores, monospace arithmetic lines, a ruled paper textarea, and a double rule masthead in the humane editorial voice.

The four panels work as one loop. The Readability Report explains the text. The Jargon Radar names the vocabulary suspects and lets you edit the list. The Rewrite Bench changes what can be changed safely and shows the diff with rescored numbers. The Audience Dial turns all of it into a verdict for the reader you named.

Two samples ship in the page so it opens with real material. The District Notice scores Reading Ease 12.8 and grade 14.8. The Plain Letter scores Reading Ease 97.8 and grade 2.4. Loading both is the fastest way to feel what the tool measures.

## The Formulas and Their Sources

- Flesch Reading Ease, Flesch 1948. 206.835 minus 1.015 times words per sentence minus 84.6 times syllables per word.
- Flesch-Kincaid Grade Level, Kincaid, Fishburne, Rogers and Chissom 1975. 0.39 times words per sentence plus 11.8 times syllables per word minus 15.59.
- Gunning Fog, Gunning 1952. 0.4 times the sum of words per sentence and 100 times the share of words with three or more syllables.
- SMOG, McLaughlin 1969. Texts under 30 sentences use the published complete formula, 1.0430 times the square root of 30 times polysyllables over sentences plus 3.1291. Texts of 30 or more sentences use classic grading, 3 plus the square root of polysyllables in the first, middle, and last ten sentences.
- Dale-Chall, Dale and Chall 1948. 0.1579 times the percent of words outside the familiar list plus 0.0496 times words per sentence, plus 3.6365 when unfamiliar words exceed five percent.

The published anchor used in the tests is the widely reproduced worked example "The Australian platypus is seemingly a hybrid mammal." It evaluates here to a Reading Ease of 18.9 and a Kincaid grade of 12.6, with 8 words, 17 syllables, and 3 complex words. The other formulas are tested against their published arithmetic on constructed inputs whose counts were derived by hand, so every expected number in the tests is independent of the code.

## Tests

Run them with `npm test` or `node --test tests/`. Node 18 or newer, no install step.

- 55 tests, all passing.
- 138 assertions at runtime, counted by instrumenting the assert module. That is 120 assert statements in the two files, with the syllable table loop running its check 19 times.
- Total wall time is about 40 milliseconds on the development machine. No network, no timers beyond the run itself, nothing outside `tests/` and `js/` is touched.

Coverage by area. Each readability formula has its own test group, the syllable counter has 19 fixed words, jargon detection has seven groups covering counts, examples, case, boundaries, phrases, sorting, and clean text, and the transforms have groups for word swaps, phrase swaps, deletions with tidying, middle most splitting, untouched short text, no split point sentences, while clause hints, passive detection with and without agents, irregular participles, lookalike rejections, four diff shapes, and the dial verdicts at three bands. A determinism test confirms the same text always produces an identical report.

## Honest Caveats

- The syllable counter is the classic vowel group method with two documented repairs, a hiatus bonus for ia and ua pairs and a 19 word exception lexicon. It agrees with dictionary hyphenation on common words but will miscount unusual spellings. Every counter without a full pronunciation dictionary has this limit, and the page says the arithmetic anyway so readers can see what fed the score.
- The Dale-Chall fixture is a curated subset of about 796 familiar words, including days, months, and number words, with plain inflection matching for plurals, ed, ing, and ly. It is not the verbatim 769 word list from 1948. Words outside the subset count as difficult, so Dale-Chall runs slightly conservative on texts that use everyday words the fixture lacks.
- SMOG on short texts is the standard short text adaptation, an estimate. Full sampling only begins at 30 sentences.
- The Gunning Fog counts any word of three or more syllables as complex, without proper noun or compound exceptions, matching the simplest published form of the index.
- Passive voice detection is lexical, not grammatical. It uses a be verb plus participle pattern, a small irregular participle list, and a lookalike blacklist so "was only seven" does not fire. It will miss unusual constructions and flag some adjectival uses, which is why the bench presents hints and suggestions rather than silent rewrites.
- The bench splits long sentences only at and, but, so, and semicolons, so both halves stay grammatical. Long sentences without those markers are flagged with hints instead of force split. The dictionary holds 44 high confidence swaps on purpose, because a machine edit should never need an apology.
- The interface was verified by code review, a scripted cross check of all 50 element ids and selectors between `app.js` and `index.html`, and the engine test suite. No browser session was used during this build, so the tab keyboard pattern and responsive layout follow the WAI ARIA authoring practices and were not exercised in a live browser.
- Dial verdicts are deliberately binary, pass or needs work, judged against the top of the chosen band. A text easier than the target always passes.

## Design Decisions

- Warm paper canvas, ink text, one copper accent used only where it earns attention, the hero score, active tab, focus rings, needs work chips, and added diff words.
- Display and body text use system serif stacks (Iowan Old Style, Palatino, Georgia), and the arithmetic lines use monospace, so the page ships zero webfonts and works fully offline.
- Motion is one settle animation when scores update, and nothing else. The page rests at idle by decision, since a workbench should feel calm between actions. The animation is disabled under prefers-reduced-motion.
- Layout is a single 44rem measure with hairline rules, a double rule masthead and colophon, and grids that collapse cleanly to a 320 pixel phone with `overflow-x: clip` on the root.
- All copy avoids em dashes, en dashes, emoji, and all caps kickers, per the project rules.

## Deploy

Copy the folder to a GitHub repository and enable GitHub Pages from the root, or drop it on any static host. There is nothing to build and nothing to install.

## Devpost Bullets

1. Real formulas, visible arithmetic. Every score comes from the published Flesch, Flesch-Kincaid, Gunning Fog, SMOG, and Dale-Chall formulas, with the numbers plugged in printed under each result, so educators can check the math instead of trusting a black box.
2. A rewrite bench that respects the author. Deterministic transforms only, splitting long sentences at fair conjunctions, swapping a conservative 44 entry dictionary, and flagging passive voice with hints instead of silently rewriting meaning, with a word level diff and rescored numbers so the change is always visible.
3. Offline by design. One static page, zero dependencies, zero network calls, nothing leaves the browser, and a jargon list that each community edits and owns, saved in their own browser.
4. Tested like a library, not a demo. 55 tests and 138 assertions in node:test cover each formula against published worked examples, the syllable counter, jargon detection, and every rewrite transform, all in about 40 milliseconds.
5. The audience dial turns numbers into decisions. Pick the band you write for, grades 4 and 5 through college, and every formula converts to a grade with a pass or needs work verdict, ending the ritual of reading a score nobody knows how to act on.

## Author

Aariv Patel. PlainPage is a Code for Humanity project.

## Refinement Pass 2026-10-24

- Wiring proof. New `scripts/dom-smoke.js` loads the real markup into a minimal DOM stub, runs the three shipped scripts in order, and drives every panel flow (tabs, samples, jargon apply and reset, bench run, clipboard copy, dial verdicts, clear). 25 checks pass, so the init path and each interaction execute without throwing. The HTML has no duplicate ids and every id app.js references resolves.
- Fixed. The term list textarea was styled by the selector `.jargon-list textarea`, which matched nothing because the class lives on the hits list, not on a container of the textarea. The rule now targets `#jargon-list`, restoring the intended monospace face, tighter line height, and unruled background for the term editor.
- Fixed. The footer now uses the `.colophon-inner` wrapper the stylesheet already defined, matching the masthead composition: the double rule stays full width while the copy holds the 52 rem measure.
- Removed. The unused `.dial-grade-unit` rule.
- Accessibility. The bench output box carried `aria-label` without a role, so the name was inert; it now has `role="region"`. Label associations, the arrow key tab model, and the live regions were rechecked. Contrast computed from the tokens: the lowest pair is copper on paper at 4.54 to 1, still above the 4.5 floor, and every other pair clears 6 to 1.
- Meta. Open Graph title, description, and type were already present, the theme color matches the paper token, and the favicon is an inline SVG. No changes needed.
- Motion and copy. Reduced motion was already honored and the only animation is the one shot settle, so there is nothing to pause on hidden tabs. No em or en dashes, no emoji, no uppercase kickers.
- Tests: 55 before the pass, 55 after, all passing. Smoke: 25 checks.
