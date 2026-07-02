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
  assert.equal(getChordDifficulty('G7'),       'medium');
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
  'b5': 6,
  '5':  7,
  '#5': 8,
  '6':  9,
  'bb7':9,
  'b7': 10,
  '7':  11,
  'b9': 13 % 12,
  '9':  14 % 12,
  '#9': 15 % 12,
  '13': 21 % 12,
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

/* ────────────────────────────────────────────────────────────────
   Pro difficulty tier + full chord-shape sanity.
   ──────────────────────────────────────────────────────────────── */

test('getChordDifficulty: pro tier catches the extended vocabulary', () => {
  for (const n of ['C6','Cm6','C6/9','Cmaj9','Cm9','Cm(maj7)','Cm7b5',
                   'Cdim7','Caug','C7sus4','C7b5','C7#5','C7b9','C13']) {
    assert.equal(getChordDifficulty(n), 'pro', `${n} should be pro`);
  }
  // ...without stealing lower tiers.
  assert.equal(getChordDifficulty('C7'),    'medium'); // dominant 7 moved down
  assert.equal(getChordDifficulty('C9'),    'hard');
  assert.equal(getChordDifficulty('Cadd9'), 'medium');
});

test('qualitiesForDifficulty: pro extends hard; easy has no dominant 7', () => {
  const easy = qualitiesForDifficulty('easy');
  const hard = qualitiesForDifficulty('hard');
  const pro  = qualitiesForDifficulty('pro');
  assert.ok(!easy.includes('7'));
  assert.ok(qualitiesForDifficulty('medium').includes('7'));
  for (const q of hard) assert.ok(pro.includes(q), `pro missing ${q}`);
  for (const q of ['6','m6','6/9','maj9','m9','m(maj7)','m7b5','dim7','aug','7sus4','7b5','7#5','7b9','13']) {
    assert.ok(pro.includes(q), `pro missing ${q}`);
  }
});

test('chordsForDifficulty: pro pool contains every pro quality and no basic barres', () => {
  const pro = chordsForDifficulty('pro');
  for (const suf of ['6','m6','6/9','maj9','m9','m(maj7)','m7b5','dim7','aug','7sus4','7b5','7#5','7b9','13']) {
    assert.ok(pro.some(c => c.name.endsWith(suf)), `no shape ends with ${suf}`);
  }
  for (const c of pro) assert.ok(!isBasicBarreChord(c), `basic barre leaked into pro: ${c.name}`);
});

// Full-catalog sanity: every shape's interval tags must sound the note the
// tag claims, cover the quality's formula, be playable, and no two chords
// may share the exact same fretboard positions under different names.
test('CHORD_SHAPES: every shape is correct, complete, and playable', () => {
  const PC = { C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11 };
  const IV_SEMI = { '1':0,'2':2,'b3':3,'3':4,'4':5,'b5':6,'5':7,'#5':8,'6':9,'bb7':9,'b7':10,'7':11,'b9':1,'9':2,'#9':3,'11':5,'13':9 };
  const FORMULAS = {
    'major':['1','3','5'], 'minor':['1','b3','5'], '7':['1','3','5','b7'],
    'sus2':['1','2','5'], 'sus4':['1','4','5'], 'add9':['1','3','5','9'],
    'maj7':['1','3','5','7'], 'm7':['1','b3','5','b7'],
    '9':['1','3','5','b7','9'], '7#9':['1','3','5','b7','#9'],
    '6':['1','3','5','6'], 'm6':['1','b3','5','6'], '6/9':['1','3','5','6','9'],
    'maj9':['1','3','5','7','9'], 'm9':['1','b3','5','b7','9'],
    'm(maj7)':['1','b3','5','7'], 'm7b5':['1','b3','b5','b7'],
    'dim7':['1','b3','b5','bb7'], 'aug':['1','3','#5'],
    '7sus4':['1','4','5','b7'], '7b5':['1','3','b5','b7'], '7#5':['1','3','#5','b7'],
    '7b9':['1','3','5','b7','b9'], '13':['1','3','b7','13'],
  };
  // Tones a real-world voicing may omit (the 5th on extended chords).
  const OPTIONAL = { '9':['5'], '7#9':['5'], '7b9':['5'], 'maj9':['5'], 'm9':['5'], '13':['5'], '6/9':['5'] };

  const positionKeys = new Map();
  for (const c of CHORD_SHAPES) {
    const m = c.name.match(/^([A-G][#b]?)\s*(.*)$/);
    assert.ok(m, `${c.name}: unparseable name`);
    const rootPc = PC[m[1]];
    const quality = m[2] || 'major';
    const formula = FORMULAS[quality];
    assert.ok(rootPc != null && formula, `${c.name}: unknown root/quality`);

    const byString = new Set();
    for (const p of c.positions) {
      const semi = IV_SEMI[p.iv];
      assert.ok(semi != null, `${c.name}: unknown iv '${p.iv}'`);
      assert.equal(noteAt(p.s, p.f, 'guitar'), CHROMATIC[(rootPc + semi) % 12],
        `${c.name}: s${p.s} f${p.f} tagged '${p.iv}' sounds wrong`);
      assert.ok(p.f >= 0 && p.f <= 12, `${c.name}: fret ${p.f} out of range`);
      assert.ok(!byString.has(p.s), `${c.name}: two notes on string ${p.s}`);
      byString.add(p.s);
    }

    const have = new Set(c.positions.map(p => p.iv));
    const opt = new Set(OPTIONAL[quality] || []);
    for (const iv of formula) {
      assert.ok(have.has(iv) || opt.has(iv), `${c.name}: missing tone '${iv}'`);
    }
    for (const iv of have) assert.ok(formula.includes(iv), `${c.name}: foreign tone '${iv}'`);

    const fretted = c.positions.map(p => p.f).filter(f => f > 0);
    if (fretted.length) {
      const span = Math.max(...fretted) - Math.min(...fretted);
      assert.ok(span <= 4, `${c.name}: fretted span ${span} is unplayable`);
    }

    const key = c.positions.map(p => `${p.s}-${p.f}`).sort().join('|');
    const prev = positionKeys.get(key);
    assert.ok(!prev || prev === c.name, `ambiguous shape: ${prev} and ${c.name} share positions`);
    positionKeys.set(key, c.name);
  }
});

/* ────────────────────────────────────────────────────────────────
   buildShapeChart — movable shape families for the chord chart.
   ──────────────────────────────────────────────────────────────── */

const { buildShapeChart } = require('./lib.js');

test('buildShapeChart: easy collapses to the CAGED families', () => {
  const chart = buildShapeChart('easy');
  assert.deepEqual(chart.map(g => g.quality), ['major', 'minor']);
  assert.equal(chart[0].shapes.length, 5); // E, A, D, C, G shapes
  assert.equal(chart[1].shapes.length, 3);
});

test('buildShapeChart: shapes are normalized and root-agnostic', () => {
  for (const diff of ['easy', 'medium', 'hard', 'pro']) {
    for (const group of buildShapeChart(diff)) {
      for (const shape of group.shapes) {
        assert.equal(Math.min(...shape.map(p => p.f)), 0,
          `${diff}/${group.quality}: shape not normalized to fret 0`);
        assert.ok(shape.some(p => p.iv === '1'),
          `${diff}/${group.quality}: shape has no root`);
      }
    }
  }
});

test('buildShapeChart: every pool quality appears in its chart', () => {
  const chart = buildShapeChart('pro');
  const qualities = new Set(chart.map(g => g.quality));
  for (const q of qualitiesForDifficulty('pro')) {
    assert.ok(qualities.has(q), `chart missing quality ${q}`);
  }
});

/* ────────────────────────────────────────────────────────────────
   Symmetric chord roots, display spelling, dim triads, new scales.
   ──────────────────────────────────────────────────────────────── */

const { displayChordName, DORIAN_SCALE, MIXOLYDIAN_SCALE, HARMONIC_MINOR_SCALE } = require('./lib.js');

test('chordNameCorrect: symmetric chords accept any chord tone as root', () => {
  // Cdim7 = Eb/F#/A dim7 (incl. enharmonic spellings of those roots)
  for (const alt of ['ebdim7', 'd#dim7', 'f#dim7', 'gbdim7', 'adim7']) {
    assert.ok(chordNameCorrect(alt, 'cdim7'), `${alt} should match cdim7`);
  }
  // Caug = E aug = G# aug
  assert.ok(chordNameCorrect('eaug',  'caug'));
  assert.ok(chordNameCorrect('g#aug', 'caug'));
  assert.ok(chordNameCorrect('abaug', 'caug'));
  // ...but not a root outside the chord.
  assert.ok(!chordNameCorrect('ddim7', 'cdim7'));
  assert.ok(!chordNameCorrect('faug',  'caug'));
  // Non-symmetric qualities are unaffected.
  assert.ok(!chordNameCorrect('em7', 'cm7'));
});

test('displayChordName: respells the root per note style', () => {
  assert.equal(displayChordName('C#7', 'flat'),  'Db7');
  assert.equal(displayChordName('Ab7', 'sharp'), 'G#7');
  assert.equal(displayChordName('Eb major', 'sharp'), 'D# major');
  // 'both' keeps the canonical spelling — no "C#/Db7".
  assert.equal(displayChordName('C#7', 'both'), 'C#7');
  assert.equal(displayChordName('Ab7', 'both'), 'Ab7');
  assert.equal(displayChordName('C major', 'flat'), 'C major');
});

test('findTriads: dim quality uses b3 and b5', () => {
  const triads = findTriads('C', 'dim', [0, 1, 2], 12, 'guitar');
  assert.ok(triads.length > 0);
  for (const t of triads) {
    const notes = t.map(p => noteAt(p.s, p.f, 'guitar')).sort();
    assert.deepEqual(notes, ['C', 'D#', 'F#']);
  }
});

test('scales: dorian, mixolydian, harmonic minor', () => {
  assert.deepEqual(scaleNotes('D', DORIAN_SCALE), ['D','E','F','G','A','B','C']);
  assert.deepEqual(scaleNotes('G', MIXOLYDIAN_SCALE), ['G','A','B','C','D','E','F']);
  assert.deepEqual(scaleNotes('A', HARMONIC_MINOR_SCALE), ['A','B','C','D','E','F','G#']);
});
