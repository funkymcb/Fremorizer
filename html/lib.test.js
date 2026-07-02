// Run: `node --test html/lib.test.js`
// Focus: chord-name matching + the music-theory helpers it depends on.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  noteAt, matchNote, scaleNotes, stringsFor, showNote,
  CHROMATIC, CHORD_SHAPES,
  normalizeChordName, expandChordInput, matchesChordName, chordNameCorrect,
  getChordDifficulty, isBasicBarreChord, chordsForDifficulty, qualitiesForDifficulty,
  buildChordIntervals,
  triadStringSets, findTriads, triadKey, TRIAD_MAX_SPAN,
  identifyChords,
} = require('./lib.js');

/* ────────────────────────────────────────────────────────────────
   Music theory primitives — anchor tests for the tuning code.
   ──────────────────────────────────────────────────────────────── */

test('noteAt: guitar standard tuning (high E to low E, top to bottom)', () => {
  // Open strings on a 6-string guitar.
  assert.equal(noteAt(0, 0, 'guitar'), 'E'); // high E
  assert.equal(noteAt(1, 0, 'guitar'), 'B');
  assert.equal(noteAt(2, 0, 'guitar'), 'G');
  assert.equal(noteAt(3, 0, 'guitar'), 'D');
  assert.equal(noteAt(4, 0, 'guitar'), 'A');
  assert.equal(noteAt(5, 0, 'guitar'), 'E'); // low E
});

test('noteAt: bass standard tuning is G/D/A/E (top to bottom)', () => {
  assert.equal(noteAt(0, 0, 'bass'), 'G');
  assert.equal(noteAt(1, 0, 'bass'), 'D');
  assert.equal(noteAt(2, 0, 'bass'), 'A');
  assert.equal(noteAt(3, 0, 'bass'), 'E');
});

test('noteAt: fret math wraps the chromatic scale', () => {
  // Low E + 12 frets = E one octave up.
  assert.equal(noteAt(5, 12, 'guitar'), 'E');
  // A string + 3 frets = C.
  assert.equal(noteAt(4, 3, 'guitar'), 'C');
  // High E + 5 frets = A.
  assert.equal(noteAt(0, 5, 'guitar'), 'A');
});

test('noteAt: defaults to guitar when instrument is omitted or unknown', () => {
  assert.equal(noteAt(5, 0), 'E');
  assert.equal(noteAt(5, 0, 'banjo'), 'E');
});

test('stringsFor: unknown instruments fall back to guitar', () => {
  assert.deepEqual(stringsFor('ukulele'), stringsFor('guitar'));
});

test('matchNote: accepts sharps, flats, and unicode flat', () => {
  assert.ok(matchNote('C#', 'C#'));
  assert.ok(matchNote('Db', 'C#'));
  assert.ok(matchNote('db', 'C#'));
  assert.ok(matchNote('D♭', 'C#'));
  assert.ok(matchNote(' c#  ', 'C#'));
  assert.ok(!matchNote('D', 'C#'));
});

test('scaleNotes: major scale from C is the natural notes', () => {
  assert.deepEqual(
    scaleNotes('C', [0,2,4,5,7,9,11]),
    ['C','D','E','F','G','A','B'],
  );
});

test('showNote: respects flat/sharp/both styles', () => {
  assert.equal(showNote('C#', 'sharp'), 'C#');
  assert.equal(showNote('C#', 'flat'),  'Db');
  assert.equal(showNote('C#', 'both'),  'C#/Db');
  assert.equal(showNote('C',  'flat'),  'C');
});

/* ────────────────────────────────────────────────────────────────
   Chord-name matching — the main reason this lib exists.
   normalizeChordName / expandChordInput / matchesChordName /
   chordNameCorrect form a pipeline; test each layer plus the end-
   to-end behaviour the game relies on.
   ──────────────────────────────────────────────────────────────── */

test('normalizeChordName: lowercases, trims, strips parens, collapses whitespace', () => {
  assert.equal(normalizeChordName('  C Major  '), 'c major');
  assert.equal(normalizeChordName('A (minor)'),    'a minor');
  assert.equal(normalizeChordName('F#   m7'),      'f# m7');
});

test('expandChordInput: maj/min suffixes expand to full words', () => {
  assert.equal(expandChordInput('Cmaj'), 'C major');
  assert.equal(expandChordInput('Amin'), 'A minor');
});

test('expandChordInput: bare lowercase m expands to minor', () => {
  // Cm → C minor
  assert.equal(expandChordInput('Cm'), 'C minor');
  // F#m → F# minor
  assert.equal(expandChordInput('F#m'), 'F# minor');
});

test('expandChordInput: does NOT expand m inside maj, m7, or minor', () => {
  // Cmaj7 must NOT pick up the inner m as "minor".
  assert.equal(expandChordInput('Cmaj7'), 'Cmaj7');
  // Cm7 keeps the m7 token intact.
  assert.equal(expandChordInput('Cm7'), 'Cm7');
  // Already-expanded names pass through.
  assert.equal(expandChordInput('C minor'), 'C minor');
});

test('matchesChordName: exact match after normalization', () => {
  assert.ok(matchesChordName('C major', 'C major'));
  assert.ok(matchesChordName(' c MAJOR ', 'C major'));
});

test('matchesChordName: short forms expand to canonical names', () => {
  assert.ok(matchesChordName('Cmaj', 'C major'));
  assert.ok(matchesChordName('cm',   'C minor'));
  assert.ok(matchesChordName('Amin', 'A minor'));
});

test('matchesChordName: bare root counts as major', () => {
  // The game accepts "C" as shorthand for "C major" — this is the rule
  // that lets players type just the root for major chords.
  assert.ok(matchesChordName('C',  'C major'));
  assert.ok(matchesChordName('f#', 'F# major'));
  // Bare root should NOT match a minor chord.
  assert.ok(!matchesChordName('C', 'C minor'));
});

test('matchesChordName: wrong chord quality fails', () => {
  assert.ok(!matchesChordName('C major', 'C minor'));
  assert.ok(!matchesChordName('Cm',      'C major'));
});

test('chordNameCorrect: accepts enharmonic equivalents', () => {
  // Game lowercases the canonical name before calling chordNameCorrect,
  // matching the contract in ChordGame.handleNaming.
  assert.ok(chordNameCorrect('db major', 'c# major'));
  assert.ok(chordNameCorrect('c# major', 'db major'));
  assert.ok(chordNameCorrect('eb minor', 'd# minor'));
  assert.ok(chordNameCorrect('bb',       'a# major'));
});

test('chordNameCorrect: enharmonic mapping also works for suffixed chords', () => {
  assert.ok(chordNameCorrect('dbm7',   'c#m7'));
  assert.ok(chordNameCorrect('ebmaj7', 'd#maj7'));
});

test('chordNameCorrect: rejects unrelated chord names', () => {
  assert.ok(!chordNameCorrect('d major', 'c major'));
  assert.ok(!chordNameCorrect('c minor', 'c major'));
});

/* ────────────────────────────────────────────────────────────────
   Difficulty + filtering
   ──────────────────────────────────────────────────────────────── */

test('getChordDifficulty: classifies chord names by suffix', () => {
  assert.equal(getChordDifficulty('C major'),  'easy');
  assert.equal(getChordDifficulty('A minor'),  'easy');
  assert.equal(getChordDifficulty('G7'),       'easy');
  assert.equal(getChordDifficulty('Csus2'),    'medium');
  assert.equal(getChordDifficulty('Dsus4'),    'medium');
  assert.equal(getChordDifficulty('Cadd9'),    'medium');
  assert.equal(getChordDifficulty('Cmaj7'),    'hard');
  assert.equal(getChordDifficulty('Cm7'),      'hard');
  assert.equal(getChordDifficulty('C9'),       'hard');
  assert.equal(getChordDifficulty('C7#9'),     'hard');
});

test('getChordDifficulty: add9 is medium, plain 9 is hard (lookbehind works)', () => {
  // The (?<!add)9$ rule distinguishes "add9" (medium) from "9" (hard).
  assert.equal(getChordDifficulty('Cadd9'), 'medium');
  assert.equal(getChordDifficulty('C9'),    'hard');
});

test('chordsForDifficulty: easy filter excludes anything past easy', () => {
  const easy = chordsForDifficulty('easy');
  assert.ok(easy.length > 0);
  for (const c of easy) {
    assert.equal(getChordDifficulty(c.name), 'easy', `${c.name} should be easy`);
  }
});

test('chordsForDifficulty: hard excludes basic barre majors/minors', () => {
  const hard = chordsForDifficulty('hard');
  // No basic barre chord should appear in the hard pool.
  for (const c of hard) {
    assert.ok(!isBasicBarreChord(c), `basic barre chord leaked into hard pool: ${c.name}`);
  }
});

test('qualitiesForDifficulty: each difficulty extends the previous', () => {
  const easy   = qualitiesForDifficulty('easy');
  const medium = qualitiesForDifficulty('medium');
  const hard   = qualitiesForDifficulty('hard');
  for (const q of easy)   assert.ok(medium.includes(q), `medium missing ${q}`);
  for (const q of medium) assert.ok(hard.includes(q),   `hard missing ${q}`);
});

/* ────────────────────────────────────────────────────────────────
   Interval extraction
   ──────────────────────────────────────────────────────────────── */

test('buildChordIntervals: returns root/3rd/5th notes for C major (E-shape)', () => {
  const cMajor = CHORD_SHAPES.find(c => c.name === 'C major' && c.positions.length === 6);
  const ivs = buildChordIntervals(cMajor);
  const byIv = Object.fromEntries(ivs.map(i => [i.symbol, i.note]));
  assert.equal(byIv['1'], 'C');
  assert.equal(byIv['3'], 'E');
  assert.equal(byIv['5'], 'G');
});

test('buildChordIntervals: minor chords have b3 instead of 3', () => {
  const aMinor = CHORD_SHAPES.find(c => c.name === 'A minor');
  const ivs = buildChordIntervals(aMinor);
  const symbols = ivs.map(i => i.symbol);
  assert.ok(symbols.includes('b3'));
  assert.ok(!symbols.includes('3'));
});

test('buildChordIntervals: deduplicates symbols, preserving IV_ORDER', () => {
  // Every chord with a 6-note positions list has duplicate roots/fifths;
  // buildChordIntervals should yield each interval once.
  const cMajor = CHORD_SHAPES.find(c => c.name === 'C major' && c.positions.length === 6);
  const symbols = buildChordIntervals(cMajor).map(i => i.symbol);
  assert.equal(new Set(symbols).size, symbols.length);
});

/* ────────────────────────────────────────────────────────────────
   CHORD_SHAPES data integrity — every position's note must match
   the interval it claims to be, given the chord's root.
   ──────────────────────────────────────────────────────────────── */

// Semitone offsets for every interval symbol used in CHORD_SHAPES.
const INTERVAL_SEMITONES = {
  '1':  0,
  '2':  2,
  'b3': 3,
  '3':  4,
  '4':  5,
  '5':  7,
  'b7': 10,
  '7':  11,
  '9':  14 % 12,
  '#9': 15 % 12,
};

function rootOf(name) {
  const m = name.match(/^([A-G][#b]?)/);
  return m ? m[1] : null;
}

test('CHORD_SHAPES integrity: every position matches its claimed interval', () => {
  for (const chord of CHORD_SHAPES) {
    const root = rootOf(chord.name);
    assert.ok(root, `could not parse root from ${chord.name}`);
    const rootIdx = CHROMATIC.indexOf(root.replace('Db','C#').replace('Eb','D#').replace('Gb','F#').replace('Ab','G#').replace('Bb','A#'));
    assert.ok(rootIdx >= 0, `unknown root ${root} in ${chord.name}`);
    for (const p of chord.positions) {
      const expectedSemitone = INTERVAL_SEMITONES[p.iv];
      assert.notEqual(expectedSemitone, undefined, `unknown interval ${p.iv} in ${chord.name}`);
      const actualNote = noteAt(p.s, p.f, 'guitar');
      const expectedNote = CHROMATIC[(rootIdx + expectedSemitone) % 12];
      assert.equal(
        actualNote, expectedNote,
        `${chord.name}: position s=${p.s} f=${p.f} claims ${p.iv} but produces ${actualNote}, expected ${expectedNote}`,
      );
    }
  }
});

test('CHORD_SHAPES: every shape has a root (interval "1") on some string', () => {
  for (const chord of CHORD_SHAPES) {
    const hasRoot = chord.positions.some(p => p.iv === '1');
    assert.ok(hasRoot, `${chord.name} has no root position`);
  }
});

/* ────────────────────────────────────────────────────────────────
   Triad enumeration (Mode 4)
   ──────────────────────────────────────────────────────────────── */

test('triadStringSets: 6 strings → 4 contiguous sets, 4 strings → 2 sets', () => {
  assert.deepEqual(triadStringSets(6), [[0,1,2],[1,2,3],[2,3,4],[3,4,5]]);
  assert.deepEqual(triadStringSets(4), [[0,1,2],[1,2,3]]);
  assert.deepEqual(triadStringSets(3), [[0,1,2]]);
  assert.deepEqual(triadStringSets(2), []);
});

test('findTriads: each triad uses each chord tone exactly once', () => {
  // C major on E/B/G strings — every voicing must contain one C, one E, one G.
  const triads = findTriads('C', 'major', [0,1,2], 12, 'guitar');
  assert.ok(triads.length > 0);
  for (const t of triads) {
    const notes = t.map(p => noteAt(p.s, p.f, 'guitar')).sort();
    assert.deepEqual(notes, ['C','E','G'], `triad ${JSON.stringify(t)} produced ${notes}`);
  }
});

test('findTriads: minor uses b3 (e.g., A minor → A/C/E, not A/C#/E)', () => {
  const triads = findTriads('A', 'minor', [0,1,2], 12, 'guitar');
  assert.ok(triads.length > 0);
  for (const t of triads) {
    const notes = t.map(p => noteAt(p.s, p.f, 'guitar')).sort();
    assert.deepEqual(notes, ['A','C','E']);
  }
});

test('findTriads: every voicing fits inside TRIAD_MAX_SPAN', () => {
  // Sample a handful of chord+stringset combinations.
  for (const root of ['C','F#','A','Eb']) {
    for (const quality of ['major','minor']) {
      for (const set of triadStringSets(6)) {
        const triads = findTriads(root, quality, set, 12, 'guitar');
        for (const t of triads) {
          const frets = t.map(p => p.f);
          const span = Math.max(...frets) - Math.min(...frets);
          assert.ok(span <= TRIAD_MAX_SPAN,
            `${root} ${quality} on [${set}] has span ${span}: ${JSON.stringify(t)}`);
        }
      }
    }
  }
});

test('findTriads: contains the canonical C major open voicing on E-B-G', () => {
  // E@0 (high E open), C@1 (B fret 1), G@0 (G open) — second inversion.
  const triads = findTriads('C', 'major', [0,1,2], 12, 'guitar');
  const want = triadKey([{s:0,f:0},{s:1,f:1},{s:2,f:0}]);
  assert.ok(triads.some(t => triadKey(t) === want),
    `expected E0/C1/G0 voicing in: ${JSON.stringify(triads)}`);
});

test('findTriads: 3 triads per chord per E-B-G stringset within 12 frets', () => {
  // Sanity check on the closed-voicing inversion count. A major/minor triad on
  // 3 contiguous strings with a 4-fret span produces 3 inversions in a 12-fret
  // window. If this number changes, the mode-4 stringset target (5/set) needs
  // a corresponding chord-queue tweak.
  assert.equal(findTriads('C', 'major', [0,1,2], 12, 'guitar').length, 3);
  assert.equal(findTriads('D', 'minor', [0,1,2], 12, 'guitar').length, 3);
  assert.equal(findTriads('G', 'major', [3,4,5], 12, 'guitar').length, 3);
});

test('findTriads: bass tuning produces playable triads on its 2 stringsets', () => {
  for (const set of triadStringSets(4)) {
    const triads = findTriads('C', 'major', set, 12, 'bass');
    assert.ok(triads.length >= 1, `bass C major on [${set}] returned 0 triads`);
    for (const t of triads) {
      const notes = t.map(p => noteAt(p.s, p.f, 'bass')).sort();
      assert.deepEqual(notes, ['C','E','G']);
    }
  }
});

test('findTriads: unknown root or malformed stringset returns empty', () => {
  assert.deepEqual(findTriads('H', 'major', [0,1,2], 12, 'guitar'), []);
  assert.deepEqual(findTriads('C', 'major', [0,1], 12, 'guitar'), []);
  assert.deepEqual(findTriads('C', 'major', null, 12, 'guitar'), []);
});

test('triadKey: order-independent set identity', () => {
  const a = [{s:0,f:0},{s:1,f:1},{s:2,f:0}];
  const b = [{s:2,f:0},{s:0,f:0},{s:1,f:1}];
  assert.equal(triadKey(a), triadKey(b));
});

/* ────────────────────────────────────────────────────────────────
   identifyChords — pitch-class-set chord naming (Free Learning).
   ──────────────────────────────────────────────────────────────── */

// Helper: note names → Set of pitch classes.
const pcs = (...notes) => new Set(notes.map(n => CHROMATIC.indexOf(n)));
const names = ms => ms.map(m => m.root + m.suf + (m.no5 ? ' (no 5th)' : ''));

test('identifyChords: bare triads match in any voicing', () => {
  assert.deepEqual(names(identifyChords(pcs('C','E','G'))), ['C major']);
  assert.deepEqual(names(identifyChords(pcs('G','C','E'))), ['C major']); // order-free
  assert.deepEqual(names(identifyChords(pcs('A','C','E'))), ['A minor']);
  assert.deepEqual(names(identifyChords(pcs('B','D','F'))), ['B dim']);
});

test('identifyChords: power chord (2 notes)', () => {
  assert.deepEqual(names(identifyChords(pcs('C','G'))), ['C5']);
  assert.deepEqual(names(identifyChords(pcs('C','F'))), ['F5']); // inverted fifth
});

test('identifyChords: alternative names for the same notes', () => {
  // C6 and Am7 are the same four pitch classes.
  const m = names(identifyChords(pcs('C','E','G','A')));
  assert.ok(m.includes('C6'), `expected C6 in ${m}`);
  assert.ok(m.includes('Am7'), `expected Am7 in ${m}`);
});

test('identifyChords: symmetric chords list every root', () => {
  const dim7 = names(identifyChords(pcs('C','D#','F#','A')));
  for (const n of ['Cdim7','D#dim7','F#dim7','Adim7']) {
    assert.ok(dim7.includes(n), `expected ${n} in ${dim7}`);
  }
  const aug = names(identifyChords(pcs('C','E','G#')));
  for (const n of ['C aug','E aug','G# aug']) {
    assert.ok(aug.includes(n), `expected ${n} in ${aug}`);
  }
});

test('identifyChords: sus2/sus4 duality', () => {
  const m = names(identifyChords(pcs('C','D','G')));
  assert.ok(m.includes('C sus2'), `expected C sus2 in ${m}`);
  assert.ok(m.includes('G sus4'), `expected G sus4 in ${m}`);
});

test('identifyChords: sevenths and extensions match without their 5th', () => {
  assert.deepEqual(names(identifyChords(pcs('C','E','A#'))), ['C7 (no 5th)']);
  const maj9no5 = names(identifyChords(pcs('C','D','E','B')));
  assert.ok(maj9no5.includes('Cmaj9 (no 5th)'), `got ${maj9no5}`);
  // ...but a full match always outranks a no-5th reading.
  const m = identifyChords(pcs('A','C','E'));
  assert.equal(m[0].root + m[0].suf, 'A minor');
});

test('identifyChords: extended chords', () => {
  assert.ok(names(identifyChords(pcs('C','E','G','A#','D'))).includes('C9'));
  assert.ok(names(identifyChords(pcs('C','E','G','A#','D#'))).includes('C7#9'));
  assert.ok(names(identifyChords(pcs('C','D','E','G','A'))).includes('C6/9'));
  assert.ok(names(identifyChords(pcs('C','E','G','A#','D','A'))).includes('C13'));
});

test('identifyChords: slash bass on inversions', () => {
  const E = CHROMATIC.indexOf('E');
  const m = identifyChords(pcs('C','E','G'), E);
  assert.equal(m[0].root, 'C');
  assert.equal(m[0].bass, 'E'); // first inversion → C/E
  // Root-position: no slash.
  const m2 = identifyChords(pcs('C','E','G'), CHROMATIC.indexOf('C'));
  assert.equal(m2[0].bass, null);
});

test('identifyChords: root-position reading ranks above slash reading', () => {
  // {C,E,G,A} with A in the bass: Am7 (root position) before C6/A.
  const m = identifyChords(pcs('C','E','G','A'), CHROMATIC.indexOf('A'));
  assert.equal(m[0].root + m[0].suf, 'Am7');
  assert.equal(m[0].bass, null);
});

test('identifyChords: tones carry labels and note names', () => {
  const m = identifyChords(pcs('C','E','G'))[0];
  assert.deepEqual(m.tones, [
    { note: 'C', label: 'root' },
    { note: 'E', label: 'major 3rd' },
    { note: 'G', label: 'perfect 5th' },
  ]);
});

test('identifyChords: fewer than 2 pitch classes → nothing', () => {
  assert.deepEqual(identifyChords(pcs('C')), []);
  assert.deepEqual(identifyChords(pcs()), []);
});
