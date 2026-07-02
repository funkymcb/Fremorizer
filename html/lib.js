// Fremorizer — pure music-theory + chord-matching helpers.
//
// Loaded in the browser via <script src="/lib.js"> before the React inline
// script, and required directly by html/lib.test.js for unit tests under Node.
//
// Browser: attaches the API to window.Fremorizer (no other globals).
// Node:    module.exports = the same API object.

(function (global) {

/* ═══════════════════════════════════════
   MUSIC THEORY
═══════════════════════════════════════ */
const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const DISPLAY_BOTH   = { 'C#':'C#/Db','D#':'D#/Eb','F#':'F#/Gb','G#':'G#/Ab','A#':'A#/Bb' };
const DISPLAY_FLAT   = { 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb' };
const showNote = (n, style='both') => {
  if (style==='flat')  return DISPLAY_FLAT[n]  || n;
  if (style==='sharp') return n;
  return DISPLAY_BOTH[n] || n;
};

// Top-to-bottom tunings (high → low)
const TUNINGS = {
  guitar: ['E','B','G','D','A','E'],
  bass:   ['G','D','A','E'],
};
const stringsFor = inst => TUNINGS[inst] || TUNINGS.guitar;

// Open-string MIDI numbers, high → low (matches TUNINGS layout). Used for
// audio playback and for finding the lowest sounding note of a voicing.
const OPEN_MIDI = { guitar: [64,59,55,50,45,40], bass: [43,38,33,28] };

function noteAt(si, fret, inst='guitar') {
  const strings = stringsFor(inst);
  const idx = CHROMATIC.indexOf(strings[si]);
  return CHROMATIC[(idx + fret) % 12];
}

function matchNote(input, expected) {
  const FLAT_MAP = {'DB':'C#','EB':'D#','GB':'F#','AB':'G#','BB':'A#'};
  const n = input.trim().toUpperCase().replace('♭','B').replace('/','').replace(' ','');
  return (FLAT_MAP[n] || n) === expected;
}

const MAJOR_SCALE = [0,2,4,5,7,9,11];
const MINOR_SCALE = [0,2,3,5,7,8,10];
const DORIAN_SCALE = [0,2,3,5,7,9,10];
const MIXOLYDIAN_SCALE = [0,2,4,5,7,9,10];
const HARMONIC_MINOR_SCALE = [0,2,3,5,7,8,11];
const PENTATONIC_MAJOR = [0,2,4,7,9];
const PENTATONIC_MINOR = [0,3,5,7,10];

function scaleNotes(root, intervals) {
  const ri = CHROMATIC.indexOf(root);
  return intervals.map(i => CHROMATIC[(ri+i)%12]);
}

/* ═══════════════════════════════════════
   CHORD DATA  (s = display string 0-5)
═══════════════════════════════════════ */
const CHORD_SHAPES = [
  // ── MAJOR ───────────────────────────────────────────────────────
  // E-shape
  { name:'C major', positions:[{s:5,f:8,iv:'1'},{s:4,f:10,iv:'5'},{s:3,f:10,iv:'1'},{s:2,f:9,iv:'3'},{s:1,f:8,iv:'5'},{s:0,f:8,iv:'1'}] },
  { name:'C# major', positions:[{s:5,f:9,iv:'1'},{s:4,f:11,iv:'5'},{s:3,f:11,iv:'1'},{s:2,f:10,iv:'3'},{s:1,f:9,iv:'5'},{s:0,f:9,iv:'1'}] },
  { name:'D major', positions:[{s:5,f:10,iv:'1'},{s:4,f:12,iv:'5'},{s:3,f:12,iv:'1'},{s:2,f:11,iv:'3'},{s:1,f:10,iv:'5'},{s:0,f:10,iv:'1'}] },
  { name:'E major', positions:[{s:5,f:0,iv:'1'},{s:4,f:2,iv:'5'},{s:3,f:2,iv:'1'},{s:2,f:1,iv:'3'},{s:1,f:0,iv:'5'},{s:0,f:0,iv:'1'}] },
  { name:'F major', positions:[{s:5,f:1,iv:'1'},{s:4,f:3,iv:'5'},{s:3,f:3,iv:'1'},{s:2,f:2,iv:'3'},{s:1,f:1,iv:'5'},{s:0,f:1,iv:'1'}] },
  { name:'F# major', positions:[{s:5,f:2,iv:'1'},{s:4,f:4,iv:'5'},{s:3,f:4,iv:'1'},{s:2,f:3,iv:'3'},{s:1,f:2,iv:'5'},{s:0,f:2,iv:'1'}] },
  { name:'G major', positions:[{s:5,f:3,iv:'1'},{s:4,f:5,iv:'5'},{s:3,f:5,iv:'1'},{s:2,f:4,iv:'3'},{s:1,f:3,iv:'5'},{s:0,f:3,iv:'1'}] },
  { name:'Ab major', positions:[{s:5,f:4,iv:'1'},{s:4,f:6,iv:'5'},{s:3,f:6,iv:'1'},{s:2,f:5,iv:'3'},{s:1,f:4,iv:'5'},{s:0,f:4,iv:'1'}] },
  { name:'A major', positions:[{s:5,f:5,iv:'1'},{s:4,f:7,iv:'5'},{s:3,f:7,iv:'1'},{s:2,f:6,iv:'3'},{s:1,f:5,iv:'5'},{s:0,f:5,iv:'1'}] },
  { name:'Bb major', positions:[{s:5,f:6,iv:'1'},{s:4,f:8,iv:'5'},{s:3,f:8,iv:'1'},{s:2,f:7,iv:'3'},{s:1,f:6,iv:'5'},{s:0,f:6,iv:'1'}] },
  { name:'B major', positions:[{s:5,f:7,iv:'1'},{s:4,f:9,iv:'5'},{s:3,f:9,iv:'1'},{s:2,f:8,iv:'3'},{s:1,f:7,iv:'5'},{s:0,f:7,iv:'1'}] },
  // A-shape
  { name:'C major', positions:[{s:4,f:3,iv:'1'},{s:3,f:5,iv:'5'},{s:2,f:5,iv:'1'},{s:1,f:5,iv:'3'},{s:0,f:3,iv:'5'}] },
  { name:'C# major', positions:[{s:4,f:4,iv:'1'},{s:3,f:6,iv:'5'},{s:2,f:6,iv:'1'},{s:1,f:6,iv:'3'},{s:0,f:4,iv:'5'}] },
  { name:'D major', positions:[{s:4,f:5,iv:'1'},{s:3,f:7,iv:'5'},{s:2,f:7,iv:'1'},{s:1,f:7,iv:'3'},{s:0,f:5,iv:'5'}] },
  { name:'Eb major', positions:[{s:4,f:6,iv:'1'},{s:3,f:8,iv:'5'},{s:2,f:8,iv:'1'},{s:1,f:8,iv:'3'},{s:0,f:6,iv:'5'}] },
  { name:'E major', positions:[{s:4,f:7,iv:'1'},{s:3,f:9,iv:'5'},{s:2,f:9,iv:'1'},{s:1,f:9,iv:'3'},{s:0,f:7,iv:'5'}] },
  { name:'F major', positions:[{s:4,f:8,iv:'1'},{s:3,f:10,iv:'5'},{s:2,f:10,iv:'1'},{s:1,f:10,iv:'3'},{s:0,f:8,iv:'5'}] },
  { name:'F# major', positions:[{s:4,f:9,iv:'1'},{s:3,f:11,iv:'5'},{s:2,f:11,iv:'1'},{s:1,f:11,iv:'3'},{s:0,f:9,iv:'5'}] },
  { name:'G major', positions:[{s:4,f:10,iv:'1'},{s:3,f:12,iv:'5'},{s:2,f:12,iv:'1'},{s:1,f:12,iv:'3'},{s:0,f:10,iv:'5'}] },
  { name:'A major', positions:[{s:4,f:0,iv:'1'},{s:3,f:2,iv:'5'},{s:2,f:2,iv:'1'},{s:1,f:2,iv:'3'},{s:0,f:0,iv:'5'}] },
  { name:'Bb major', positions:[{s:4,f:1,iv:'1'},{s:3,f:3,iv:'5'},{s:2,f:3,iv:'1'},{s:1,f:3,iv:'3'},{s:0,f:1,iv:'5'}] },
  { name:'B major', positions:[{s:4,f:2,iv:'1'},{s:3,f:4,iv:'5'},{s:2,f:4,iv:'1'},{s:1,f:4,iv:'3'},{s:0,f:2,iv:'5'}] },
  // D-shape
  { name:'D major', positions:[{s:3,f:0,iv:'1'},{s:2,f:2,iv:'5'},{s:1,f:3,iv:'1'},{s:0,f:2,iv:'3'}] },
  { name:'Eb major', positions:[{s:3,f:1,iv:'1'},{s:2,f:3,iv:'5'},{s:1,f:4,iv:'1'},{s:0,f:3,iv:'3'}] },
  { name:'E major', positions:[{s:3,f:2,iv:'1'},{s:2,f:4,iv:'5'},{s:1,f:5,iv:'1'},{s:0,f:4,iv:'3'}] },
  { name:'F major', positions:[{s:3,f:3,iv:'1'},{s:2,f:5,iv:'5'},{s:1,f:6,iv:'1'},{s:0,f:5,iv:'3'}] },
  { name:'F# major', positions:[{s:3,f:4,iv:'1'},{s:2,f:6,iv:'5'},{s:1,f:7,iv:'1'},{s:0,f:6,iv:'3'}] },
  { name:'G major', positions:[{s:3,f:5,iv:'1'},{s:2,f:7,iv:'5'},{s:1,f:8,iv:'1'},{s:0,f:7,iv:'3'}] },
  { name:'Ab major', positions:[{s:3,f:6,iv:'1'},{s:2,f:8,iv:'5'},{s:1,f:9,iv:'1'},{s:0,f:8,iv:'3'}] },
  { name:'A major', positions:[{s:3,f:7,iv:'1'},{s:2,f:9,iv:'5'},{s:1,f:10,iv:'1'},{s:0,f:9,iv:'3'}] },
  { name:'Bb major', positions:[{s:3,f:8,iv:'1'},{s:2,f:10,iv:'5'},{s:1,f:11,iv:'1'},{s:0,f:10,iv:'3'}] },
  { name:'B major', positions:[{s:3,f:9,iv:'1'},{s:2,f:11,iv:'5'},{s:1,f:12,iv:'1'},{s:0,f:11,iv:'3'}] },
  // C-shape
  { name:'C major', positions:[{s:4,f:3,iv:'1'},{s:3,f:2,iv:'3'},{s:2,f:0,iv:'5'},{s:1,f:1,iv:'1'},{s:0,f:0,iv:'3'}] },
  { name:'C# major', positions:[{s:4,f:4,iv:'1'},{s:3,f:3,iv:'3'},{s:2,f:1,iv:'5'},{s:1,f:2,iv:'1'},{s:0,f:1,iv:'3'}] },
  { name:'D major', positions:[{s:4,f:5,iv:'1'},{s:3,f:4,iv:'3'},{s:2,f:2,iv:'5'},{s:1,f:3,iv:'1'},{s:0,f:2,iv:'3'}] },
  { name:'Eb major', positions:[{s:4,f:6,iv:'1'},{s:3,f:5,iv:'3'},{s:2,f:3,iv:'5'},{s:1,f:4,iv:'1'},{s:0,f:3,iv:'3'}] },
  { name:'E major', positions:[{s:4,f:7,iv:'1'},{s:3,f:6,iv:'3'},{s:2,f:4,iv:'5'},{s:1,f:5,iv:'1'},{s:0,f:4,iv:'3'}] },
  { name:'F major', positions:[{s:4,f:8,iv:'1'},{s:3,f:7,iv:'3'},{s:2,f:5,iv:'5'},{s:1,f:6,iv:'1'},{s:0,f:5,iv:'3'}] },
  { name:'F# major', positions:[{s:4,f:9,iv:'1'},{s:3,f:8,iv:'3'},{s:2,f:6,iv:'5'},{s:1,f:7,iv:'1'},{s:0,f:6,iv:'3'}] },
  { name:'G major', positions:[{s:4,f:10,iv:'1'},{s:3,f:9,iv:'3'},{s:2,f:7,iv:'5'},{s:1,f:8,iv:'1'},{s:0,f:7,iv:'3'}] },
  { name:'Ab major', positions:[{s:4,f:11,iv:'1'},{s:3,f:10,iv:'3'},{s:2,f:8,iv:'5'},{s:1,f:9,iv:'1'},{s:0,f:8,iv:'3'}] },
  // G-shape
  { name:'C major', positions:[{s:5,f:8,iv:'1'},{s:4,f:7,iv:'3'},{s:3,f:5,iv:'5'},{s:2,f:5,iv:'1'},{s:1,f:5,iv:'3'},{s:0,f:8,iv:'1'}] },
  { name:'C# major', positions:[{s:5,f:9,iv:'1'},{s:4,f:8,iv:'3'},{s:3,f:6,iv:'5'},{s:2,f:6,iv:'1'},{s:1,f:6,iv:'3'},{s:0,f:9,iv:'1'}] },
  { name:'D major', positions:[{s:5,f:10,iv:'1'},{s:4,f:9,iv:'3'},{s:3,f:7,iv:'5'},{s:2,f:7,iv:'1'},{s:1,f:7,iv:'3'},{s:0,f:10,iv:'1'}] },
  { name:'Eb major', positions:[{s:5,f:11,iv:'1'},{s:4,f:10,iv:'3'},{s:3,f:8,iv:'5'},{s:2,f:8,iv:'1'},{s:1,f:8,iv:'3'},{s:0,f:11,iv:'1'}] },
  { name:'G major', positions:[{s:5,f:3,iv:'1'},{s:4,f:2,iv:'3'},{s:3,f:0,iv:'5'},{s:2,f:0,iv:'1'},{s:1,f:0,iv:'3'},{s:0,f:3,iv:'1'}] },
  { name:'Ab major', positions:[{s:5,f:4,iv:'1'},{s:4,f:3,iv:'3'},{s:3,f:1,iv:'5'},{s:2,f:1,iv:'1'},{s:1,f:1,iv:'3'},{s:0,f:4,iv:'1'}] },
  { name:'A major', positions:[{s:5,f:5,iv:'1'},{s:4,f:4,iv:'3'},{s:3,f:2,iv:'5'},{s:2,f:2,iv:'1'},{s:1,f:2,iv:'3'},{s:0,f:5,iv:'1'}] },
  { name:'Bb major', positions:[{s:5,f:6,iv:'1'},{s:4,f:5,iv:'3'},{s:3,f:3,iv:'5'},{s:2,f:3,iv:'1'},{s:1,f:3,iv:'3'},{s:0,f:6,iv:'1'}] },
  { name:'B major', positions:[{s:5,f:7,iv:'1'},{s:4,f:6,iv:'3'},{s:3,f:4,iv:'5'},{s:2,f:4,iv:'1'},{s:1,f:4,iv:'3'},{s:0,f:7,iv:'1'}] },
  // ── MINOR ───────────────────────────────────────────────────────
  // E-shape
  { name:'C minor', positions:[{s:5,f:8,iv:'1'},{s:4,f:10,iv:'5'},{s:3,f:10,iv:'1'},{s:2,f:8,iv:'b3'},{s:1,f:8,iv:'5'},{s:0,f:8,iv:'1'}] },
  { name:'C# minor', positions:[{s:5,f:9,iv:'1'},{s:4,f:11,iv:'5'},{s:3,f:11,iv:'1'},{s:2,f:9,iv:'b3'},{s:1,f:9,iv:'5'},{s:0,f:9,iv:'1'}] },
  { name:'D minor', positions:[{s:5,f:10,iv:'1'},{s:4,f:12,iv:'5'},{s:3,f:12,iv:'1'},{s:2,f:10,iv:'b3'},{s:1,f:10,iv:'5'},{s:0,f:10,iv:'1'}] },
  { name:'E minor', positions:[{s:5,f:0,iv:'1'},{s:4,f:2,iv:'5'},{s:3,f:2,iv:'1'},{s:2,f:0,iv:'b3'},{s:1,f:0,iv:'5'},{s:0,f:0,iv:'1'}] },
  { name:'F minor', positions:[{s:5,f:1,iv:'1'},{s:4,f:3,iv:'5'},{s:3,f:3,iv:'1'},{s:2,f:1,iv:'b3'},{s:1,f:1,iv:'5'},{s:0,f:1,iv:'1'}] },
  { name:'F# minor', positions:[{s:5,f:2,iv:'1'},{s:4,f:4,iv:'5'},{s:3,f:4,iv:'1'},{s:2,f:2,iv:'b3'},{s:1,f:2,iv:'5'},{s:0,f:2,iv:'1'}] },
  { name:'G minor', positions:[{s:5,f:3,iv:'1'},{s:4,f:5,iv:'5'},{s:3,f:5,iv:'1'},{s:2,f:3,iv:'b3'},{s:1,f:3,iv:'5'},{s:0,f:3,iv:'1'}] },
  { name:'Ab minor', positions:[{s:5,f:4,iv:'1'},{s:4,f:6,iv:'5'},{s:3,f:6,iv:'1'},{s:2,f:4,iv:'b3'},{s:1,f:4,iv:'5'},{s:0,f:4,iv:'1'}] },
  { name:'A minor', positions:[{s:5,f:5,iv:'1'},{s:4,f:7,iv:'5'},{s:3,f:7,iv:'1'},{s:2,f:5,iv:'b3'},{s:1,f:5,iv:'5'},{s:0,f:5,iv:'1'}] },
  { name:'Bb minor', positions:[{s:5,f:6,iv:'1'},{s:4,f:8,iv:'5'},{s:3,f:8,iv:'1'},{s:2,f:6,iv:'b3'},{s:1,f:6,iv:'5'},{s:0,f:6,iv:'1'}] },
  { name:'B minor', positions:[{s:5,f:7,iv:'1'},{s:4,f:9,iv:'5'},{s:3,f:9,iv:'1'},{s:2,f:7,iv:'b3'},{s:1,f:7,iv:'5'},{s:0,f:7,iv:'1'}] },
  // A-shape
  { name:'C minor', positions:[{s:4,f:3,iv:'1'},{s:3,f:5,iv:'5'},{s:2,f:5,iv:'1'},{s:1,f:4,iv:'b3'},{s:0,f:3,iv:'5'}] },
  { name:'C# minor', positions:[{s:4,f:4,iv:'1'},{s:3,f:6,iv:'5'},{s:2,f:6,iv:'1'},{s:1,f:5,iv:'b3'},{s:0,f:4,iv:'5'}] },
  { name:'D minor', positions:[{s:4,f:5,iv:'1'},{s:3,f:7,iv:'5'},{s:2,f:7,iv:'1'},{s:1,f:6,iv:'b3'},{s:0,f:5,iv:'5'}] },
  { name:'Eb minor', positions:[{s:4,f:6,iv:'1'},{s:3,f:8,iv:'5'},{s:2,f:8,iv:'1'},{s:1,f:7,iv:'b3'},{s:0,f:6,iv:'5'}] },
  { name:'E minor', positions:[{s:4,f:7,iv:'1'},{s:3,f:9,iv:'5'},{s:2,f:9,iv:'1'},{s:1,f:8,iv:'b3'},{s:0,f:7,iv:'5'}] },
  { name:'F minor', positions:[{s:4,f:8,iv:'1'},{s:3,f:10,iv:'5'},{s:2,f:10,iv:'1'},{s:1,f:9,iv:'b3'},{s:0,f:8,iv:'5'}] },
  { name:'F# minor', positions:[{s:4,f:9,iv:'1'},{s:3,f:11,iv:'5'},{s:2,f:11,iv:'1'},{s:1,f:10,iv:'b3'},{s:0,f:9,iv:'5'}] },
  { name:'G minor', positions:[{s:4,f:10,iv:'1'},{s:3,f:12,iv:'5'},{s:2,f:12,iv:'1'},{s:1,f:11,iv:'b3'},{s:0,f:10,iv:'5'}] },
  { name:'A minor', positions:[{s:4,f:0,iv:'1'},{s:3,f:2,iv:'5'},{s:2,f:2,iv:'1'},{s:1,f:1,iv:'b3'},{s:0,f:0,iv:'5'}] },
  { name:'Bb minor', positions:[{s:4,f:1,iv:'1'},{s:3,f:3,iv:'5'},{s:2,f:3,iv:'1'},{s:1,f:2,iv:'b3'},{s:0,f:1,iv:'5'}] },
  { name:'B minor', positions:[{s:4,f:2,iv:'1'},{s:3,f:4,iv:'5'},{s:2,f:4,iv:'1'},{s:1,f:3,iv:'b3'},{s:0,f:2,iv:'5'}] },
  // D-shape
  { name:'D minor', positions:[{s:3,f:0,iv:'1'},{s:2,f:2,iv:'5'},{s:1,f:3,iv:'1'},{s:0,f:1,iv:'b3'}] },
  { name:'Eb minor', positions:[{s:3,f:1,iv:'1'},{s:2,f:3,iv:'5'},{s:1,f:4,iv:'1'},{s:0,f:2,iv:'b3'}] },
  { name:'E minor', positions:[{s:3,f:2,iv:'1'},{s:2,f:4,iv:'5'},{s:1,f:5,iv:'1'},{s:0,f:3,iv:'b3'}] },
  { name:'F minor', positions:[{s:3,f:3,iv:'1'},{s:2,f:5,iv:'5'},{s:1,f:6,iv:'1'},{s:0,f:4,iv:'b3'}] },
  { name:'F# minor', positions:[{s:3,f:4,iv:'1'},{s:2,f:6,iv:'5'},{s:1,f:7,iv:'1'},{s:0,f:5,iv:'b3'}] },
  { name:'G minor', positions:[{s:3,f:5,iv:'1'},{s:2,f:7,iv:'5'},{s:1,f:8,iv:'1'},{s:0,f:6,iv:'b3'}] },
  { name:'Ab minor', positions:[{s:3,f:6,iv:'1'},{s:2,f:8,iv:'5'},{s:1,f:9,iv:'1'},{s:0,f:7,iv:'b3'}] },
  { name:'A minor', positions:[{s:3,f:7,iv:'1'},{s:2,f:9,iv:'5'},{s:1,f:10,iv:'1'},{s:0,f:8,iv:'b3'}] },
  { name:'Bb minor', positions:[{s:3,f:8,iv:'1'},{s:2,f:10,iv:'5'},{s:1,f:11,iv:'1'},{s:0,f:9,iv:'b3'}] },
  { name:'B minor', positions:[{s:3,f:9,iv:'1'},{s:2,f:11,iv:'5'},{s:1,f:12,iv:'1'},{s:0,f:10,iv:'b3'}] },
  // ── DOMINANT 7TH ────────────────────────────────────────────────
  // E-shape
  { name:'C7', positions:[{s:5,f:8,iv:'1'},{s:4,f:10,iv:'5'},{s:3,f:8,iv:'b7'},{s:2,f:9,iv:'3'},{s:1,f:8,iv:'5'},{s:0,f:8,iv:'1'}] },
  { name:'C#7', positions:[{s:5,f:9,iv:'1'},{s:4,f:11,iv:'5'},{s:3,f:9,iv:'b7'},{s:2,f:10,iv:'3'},{s:1,f:9,iv:'5'},{s:0,f:9,iv:'1'}] },
  { name:'D7', positions:[{s:5,f:10,iv:'1'},{s:4,f:12,iv:'5'},{s:3,f:10,iv:'b7'},{s:2,f:11,iv:'3'},{s:1,f:10,iv:'5'},{s:0,f:10,iv:'1'}] },
  { name:'E7', positions:[{s:5,f:0,iv:'1'},{s:4,f:2,iv:'5'},{s:3,f:0,iv:'b7'},{s:2,f:1,iv:'3'},{s:1,f:0,iv:'5'},{s:0,f:0,iv:'1'}] },
  { name:'F7', positions:[{s:5,f:1,iv:'1'},{s:4,f:3,iv:'5'},{s:3,f:1,iv:'b7'},{s:2,f:2,iv:'3'},{s:1,f:1,iv:'5'},{s:0,f:1,iv:'1'}] },
  { name:'F#7', positions:[{s:5,f:2,iv:'1'},{s:4,f:4,iv:'5'},{s:3,f:2,iv:'b7'},{s:2,f:3,iv:'3'},{s:1,f:2,iv:'5'},{s:0,f:2,iv:'1'}] },
  { name:'G7', positions:[{s:5,f:3,iv:'1'},{s:4,f:5,iv:'5'},{s:3,f:3,iv:'b7'},{s:2,f:4,iv:'3'},{s:1,f:3,iv:'5'},{s:0,f:3,iv:'1'}] },
  { name:'Ab7', positions:[{s:5,f:4,iv:'1'},{s:4,f:6,iv:'5'},{s:3,f:4,iv:'b7'},{s:2,f:5,iv:'3'},{s:1,f:4,iv:'5'},{s:0,f:4,iv:'1'}] },
  { name:'A7', positions:[{s:5,f:5,iv:'1'},{s:4,f:7,iv:'5'},{s:3,f:5,iv:'b7'},{s:2,f:6,iv:'3'},{s:1,f:5,iv:'5'},{s:0,f:5,iv:'1'}] },
  { name:'Bb7', positions:[{s:5,f:6,iv:'1'},{s:4,f:8,iv:'5'},{s:3,f:6,iv:'b7'},{s:2,f:7,iv:'3'},{s:1,f:6,iv:'5'},{s:0,f:6,iv:'1'}] },
  { name:'B7', positions:[{s:5,f:7,iv:'1'},{s:4,f:9,iv:'5'},{s:3,f:7,iv:'b7'},{s:2,f:8,iv:'3'},{s:1,f:7,iv:'5'},{s:0,f:7,iv:'1'}] },
  // A-shape
  { name:'C7', positions:[{s:4,f:3,iv:'1'},{s:3,f:5,iv:'5'},{s:2,f:3,iv:'b7'},{s:1,f:5,iv:'3'},{s:0,f:3,iv:'5'}] },
  { name:'C#7', positions:[{s:4,f:4,iv:'1'},{s:3,f:6,iv:'5'},{s:2,f:4,iv:'b7'},{s:1,f:6,iv:'3'},{s:0,f:4,iv:'5'}] },
  { name:'D7', positions:[{s:4,f:5,iv:'1'},{s:3,f:7,iv:'5'},{s:2,f:5,iv:'b7'},{s:1,f:7,iv:'3'},{s:0,f:5,iv:'5'}] },
  { name:'Eb7', positions:[{s:4,f:6,iv:'1'},{s:3,f:8,iv:'5'},{s:2,f:6,iv:'b7'},{s:1,f:8,iv:'3'},{s:0,f:6,iv:'5'}] },
  { name:'E7', positions:[{s:4,f:7,iv:'1'},{s:3,f:9,iv:'5'},{s:2,f:7,iv:'b7'},{s:1,f:9,iv:'3'},{s:0,f:7,iv:'5'}] },
  { name:'F7', positions:[{s:4,f:8,iv:'1'},{s:3,f:10,iv:'5'},{s:2,f:8,iv:'b7'},{s:1,f:10,iv:'3'},{s:0,f:8,iv:'5'}] },
  { name:'F#7', positions:[{s:4,f:9,iv:'1'},{s:3,f:11,iv:'5'},{s:2,f:9,iv:'b7'},{s:1,f:11,iv:'3'},{s:0,f:9,iv:'5'}] },
  { name:'G7', positions:[{s:4,f:10,iv:'1'},{s:3,f:12,iv:'5'},{s:2,f:10,iv:'b7'},{s:1,f:12,iv:'3'},{s:0,f:10,iv:'5'}] },
  { name:'A7', positions:[{s:4,f:0,iv:'1'},{s:3,f:2,iv:'5'},{s:2,f:0,iv:'b7'},{s:1,f:2,iv:'3'},{s:0,f:0,iv:'5'}] },
  { name:'Bb7', positions:[{s:4,f:1,iv:'1'},{s:3,f:3,iv:'5'},{s:2,f:1,iv:'b7'},{s:1,f:3,iv:'3'},{s:0,f:1,iv:'5'}] },
  { name:'B7', positions:[{s:4,f:2,iv:'1'},{s:3,f:4,iv:'5'},{s:2,f:2,iv:'b7'},{s:1,f:4,iv:'3'},{s:0,f:2,iv:'5'}] },
  // D-shape
  { name:'C7', positions:[{s:3,f:10,iv:'1'},{s:2,f:12,iv:'5'},{s:1,f:11,iv:'b7'},{s:0,f:12,iv:'3'}] },
  { name:'D7', positions:[{s:3,f:0,iv:'1'},{s:2,f:2,iv:'5'},{s:1,f:1,iv:'b7'},{s:0,f:2,iv:'3'}] },
  { name:'Eb7', positions:[{s:3,f:1,iv:'1'},{s:2,f:3,iv:'5'},{s:1,f:2,iv:'b7'},{s:0,f:3,iv:'3'}] },
  { name:'E7', positions:[{s:3,f:2,iv:'1'},{s:2,f:4,iv:'5'},{s:1,f:3,iv:'b7'},{s:0,f:4,iv:'3'}] },
  { name:'F7', positions:[{s:3,f:3,iv:'1'},{s:2,f:5,iv:'5'},{s:1,f:4,iv:'b7'},{s:0,f:5,iv:'3'}] },
  { name:'F#7', positions:[{s:3,f:4,iv:'1'},{s:2,f:6,iv:'5'},{s:1,f:5,iv:'b7'},{s:0,f:6,iv:'3'}] },
  { name:'G7', positions:[{s:3,f:5,iv:'1'},{s:2,f:7,iv:'5'},{s:1,f:6,iv:'b7'},{s:0,f:7,iv:'3'}] },
  { name:'Ab7', positions:[{s:3,f:6,iv:'1'},{s:2,f:8,iv:'5'},{s:1,f:7,iv:'b7'},{s:0,f:8,iv:'3'}] },
  { name:'A7', positions:[{s:3,f:7,iv:'1'},{s:2,f:9,iv:'5'},{s:1,f:8,iv:'b7'},{s:0,f:9,iv:'3'}] },
  { name:'Bb7', positions:[{s:3,f:8,iv:'1'},{s:2,f:10,iv:'5'},{s:1,f:9,iv:'b7'},{s:0,f:10,iv:'3'}] },
  { name:'B7', positions:[{s:3,f:9,iv:'1'},{s:2,f:11,iv:'5'},{s:1,f:10,iv:'b7'},{s:0,f:11,iv:'3'}] },
  // ── SUS2 ────────────────────────────────────────────────────────
  // E-shape — only the open voicing; barred up the neck this shape spans
  // 5 frets under a barre, which is not realistically playable.
  { name:'Esus2', positions:[{s:5,f:0,iv:'1'},{s:4,f:2,iv:'5'},{s:3,f:4,iv:'2'},{s:2,f:4,iv:'5'},{s:1,f:0,iv:'5'},{s:0,f:0,iv:'1'}] },
  // A-shape
  { name:'Csus2', positions:[{s:4,f:3,iv:'1'},{s:3,f:5,iv:'5'},{s:2,f:5,iv:'1'},{s:1,f:3,iv:'2'},{s:0,f:3,iv:'5'}] },
  { name:'C#sus2', positions:[{s:4,f:4,iv:'1'},{s:3,f:6,iv:'5'},{s:2,f:6,iv:'1'},{s:1,f:4,iv:'2'},{s:0,f:4,iv:'5'}] },
  { name:'Dsus2', positions:[{s:4,f:5,iv:'1'},{s:3,f:7,iv:'5'},{s:2,f:7,iv:'1'},{s:1,f:5,iv:'2'},{s:0,f:5,iv:'5'}] },
  { name:'Ebsus2', positions:[{s:4,f:6,iv:'1'},{s:3,f:8,iv:'5'},{s:2,f:8,iv:'1'},{s:1,f:6,iv:'2'},{s:0,f:6,iv:'5'}] },
  { name:'Esus2', positions:[{s:4,f:7,iv:'1'},{s:3,f:9,iv:'5'},{s:2,f:9,iv:'1'},{s:1,f:7,iv:'2'},{s:0,f:7,iv:'5'}] },
  { name:'Fsus2', positions:[{s:4,f:8,iv:'1'},{s:3,f:10,iv:'5'},{s:2,f:10,iv:'1'},{s:1,f:8,iv:'2'},{s:0,f:8,iv:'5'}] },
  { name:'F#sus2', positions:[{s:4,f:9,iv:'1'},{s:3,f:11,iv:'5'},{s:2,f:11,iv:'1'},{s:1,f:9,iv:'2'},{s:0,f:9,iv:'5'}] },
  { name:'Gsus2', positions:[{s:4,f:10,iv:'1'},{s:3,f:12,iv:'5'},{s:2,f:12,iv:'1'},{s:1,f:10,iv:'2'},{s:0,f:10,iv:'5'}] },
  { name:'Asus2', positions:[{s:4,f:0,iv:'1'},{s:3,f:2,iv:'5'},{s:2,f:2,iv:'1'},{s:1,f:0,iv:'2'},{s:0,f:0,iv:'5'}] },
  { name:'Bbsus2', positions:[{s:4,f:1,iv:'1'},{s:3,f:3,iv:'5'},{s:2,f:3,iv:'1'},{s:1,f:1,iv:'2'},{s:0,f:1,iv:'5'}] },
  { name:'Bsus2', positions:[{s:4,f:2,iv:'1'},{s:3,f:4,iv:'5'},{s:2,f:4,iv:'1'},{s:1,f:2,iv:'2'},{s:0,f:2,iv:'5'}] },
  // D-shape
  { name:'Dsus2', positions:[{s:3,f:0,iv:'1'},{s:2,f:2,iv:'5'},{s:1,f:3,iv:'1'},{s:0,f:0,iv:'2'}] },
  { name:'Ebsus2', positions:[{s:3,f:1,iv:'1'},{s:2,f:3,iv:'5'},{s:1,f:4,iv:'1'},{s:0,f:1,iv:'2'}] },
  { name:'Esus2', positions:[{s:3,f:2,iv:'1'},{s:2,f:4,iv:'5'},{s:1,f:5,iv:'1'},{s:0,f:2,iv:'2'}] },
  { name:'Fsus2', positions:[{s:3,f:3,iv:'1'},{s:2,f:5,iv:'5'},{s:1,f:6,iv:'1'},{s:0,f:3,iv:'2'}] },
  { name:'F#sus2', positions:[{s:3,f:4,iv:'1'},{s:2,f:6,iv:'5'},{s:1,f:7,iv:'1'},{s:0,f:4,iv:'2'}] },
  { name:'Gsus2', positions:[{s:3,f:5,iv:'1'},{s:2,f:7,iv:'5'},{s:1,f:8,iv:'1'},{s:0,f:5,iv:'2'}] },
  { name:'Absus2', positions:[{s:3,f:6,iv:'1'},{s:2,f:8,iv:'5'},{s:1,f:9,iv:'1'},{s:0,f:6,iv:'2'}] },
  { name:'Asus2', positions:[{s:3,f:7,iv:'1'},{s:2,f:9,iv:'5'},{s:1,f:10,iv:'1'},{s:0,f:7,iv:'2'}] },
  { name:'Bbsus2', positions:[{s:3,f:8,iv:'1'},{s:2,f:10,iv:'5'},{s:1,f:11,iv:'1'},{s:0,f:8,iv:'2'}] },
  { name:'Bsus2', positions:[{s:3,f:9,iv:'1'},{s:2,f:11,iv:'5'},{s:1,f:12,iv:'1'},{s:0,f:9,iv:'2'}] },
  // ── SUS4 ────────────────────────────────────────────────────────
  // E-shape
  { name:'Csus4', positions:[{s:5,f:8,iv:'1'},{s:4,f:10,iv:'5'},{s:3,f:10,iv:'1'},{s:2,f:10,iv:'4'},{s:1,f:8,iv:'5'},{s:0,f:8,iv:'1'}] },
  { name:'C#sus4', positions:[{s:5,f:9,iv:'1'},{s:4,f:11,iv:'5'},{s:3,f:11,iv:'1'},{s:2,f:11,iv:'4'},{s:1,f:9,iv:'5'},{s:0,f:9,iv:'1'}] },
  { name:'Dsus4', positions:[{s:5,f:10,iv:'1'},{s:4,f:12,iv:'5'},{s:3,f:12,iv:'1'},{s:2,f:12,iv:'4'},{s:1,f:10,iv:'5'},{s:0,f:10,iv:'1'}] },
  { name:'Esus4', positions:[{s:5,f:0,iv:'1'},{s:4,f:2,iv:'5'},{s:3,f:2,iv:'1'},{s:2,f:2,iv:'4'},{s:1,f:0,iv:'5'},{s:0,f:0,iv:'1'}] },
  { name:'Fsus4', positions:[{s:5,f:1,iv:'1'},{s:4,f:3,iv:'5'},{s:3,f:3,iv:'1'},{s:2,f:3,iv:'4'},{s:1,f:1,iv:'5'},{s:0,f:1,iv:'1'}] },
  { name:'F#sus4', positions:[{s:5,f:2,iv:'1'},{s:4,f:4,iv:'5'},{s:3,f:4,iv:'1'},{s:2,f:4,iv:'4'},{s:1,f:2,iv:'5'},{s:0,f:2,iv:'1'}] },
  { name:'Gsus4', positions:[{s:5,f:3,iv:'1'},{s:4,f:5,iv:'5'},{s:3,f:5,iv:'1'},{s:2,f:5,iv:'4'},{s:1,f:3,iv:'5'},{s:0,f:3,iv:'1'}] },
  { name:'Absus4', positions:[{s:5,f:4,iv:'1'},{s:4,f:6,iv:'5'},{s:3,f:6,iv:'1'},{s:2,f:6,iv:'4'},{s:1,f:4,iv:'5'},{s:0,f:4,iv:'1'}] },
  { name:'Asus4', positions:[{s:5,f:5,iv:'1'},{s:4,f:7,iv:'5'},{s:3,f:7,iv:'1'},{s:2,f:7,iv:'4'},{s:1,f:5,iv:'5'},{s:0,f:5,iv:'1'}] },
  { name:'Bbsus4', positions:[{s:5,f:6,iv:'1'},{s:4,f:8,iv:'5'},{s:3,f:8,iv:'1'},{s:2,f:8,iv:'4'},{s:1,f:6,iv:'5'},{s:0,f:6,iv:'1'}] },
  { name:'Bsus4', positions:[{s:5,f:7,iv:'1'},{s:4,f:9,iv:'5'},{s:3,f:9,iv:'1'},{s:2,f:9,iv:'4'},{s:1,f:7,iv:'5'},{s:0,f:7,iv:'1'}] },
  // A-shape
  { name:'Csus4', positions:[{s:4,f:3,iv:'1'},{s:3,f:5,iv:'5'},{s:2,f:5,iv:'1'},{s:1,f:6,iv:'4'},{s:0,f:3,iv:'5'}] },
  { name:'C#sus4', positions:[{s:4,f:4,iv:'1'},{s:3,f:6,iv:'5'},{s:2,f:6,iv:'1'},{s:1,f:7,iv:'4'},{s:0,f:4,iv:'5'}] },
  { name:'Dsus4', positions:[{s:4,f:5,iv:'1'},{s:3,f:7,iv:'5'},{s:2,f:7,iv:'1'},{s:1,f:8,iv:'4'},{s:0,f:5,iv:'5'}] },
  { name:'Ebsus4', positions:[{s:4,f:6,iv:'1'},{s:3,f:8,iv:'5'},{s:2,f:8,iv:'1'},{s:1,f:9,iv:'4'},{s:0,f:6,iv:'5'}] },
  { name:'Esus4', positions:[{s:4,f:7,iv:'1'},{s:3,f:9,iv:'5'},{s:2,f:9,iv:'1'},{s:1,f:10,iv:'4'},{s:0,f:7,iv:'5'}] },
  { name:'Fsus4', positions:[{s:4,f:8,iv:'1'},{s:3,f:10,iv:'5'},{s:2,f:10,iv:'1'},{s:1,f:11,iv:'4'},{s:0,f:8,iv:'5'}] },
  { name:'F#sus4', positions:[{s:4,f:9,iv:'1'},{s:3,f:11,iv:'5'},{s:2,f:11,iv:'1'},{s:1,f:12,iv:'4'},{s:0,f:9,iv:'5'}] },
  { name:'Asus4', positions:[{s:4,f:0,iv:'1'},{s:3,f:2,iv:'5'},{s:2,f:2,iv:'1'},{s:1,f:3,iv:'4'},{s:0,f:0,iv:'5'}] },
  { name:'Bbsus4', positions:[{s:4,f:1,iv:'1'},{s:3,f:3,iv:'5'},{s:2,f:3,iv:'1'},{s:1,f:4,iv:'4'},{s:0,f:1,iv:'5'}] },
  { name:'Bsus4', positions:[{s:4,f:2,iv:'1'},{s:3,f:4,iv:'5'},{s:2,f:4,iv:'1'},{s:1,f:5,iv:'4'},{s:0,f:2,iv:'5'}] },
  // D-shape
  { name:'Dsus4', positions:[{s:3,f:0,iv:'1'},{s:2,f:2,iv:'5'},{s:1,f:3,iv:'1'},{s:0,f:3,iv:'4'}] },
  { name:'Ebsus4', positions:[{s:3,f:1,iv:'1'},{s:2,f:3,iv:'5'},{s:1,f:4,iv:'1'},{s:0,f:4,iv:'4'}] },
  { name:'Esus4', positions:[{s:3,f:2,iv:'1'},{s:2,f:4,iv:'5'},{s:1,f:5,iv:'1'},{s:0,f:5,iv:'4'}] },
  { name:'Fsus4', positions:[{s:3,f:3,iv:'1'},{s:2,f:5,iv:'5'},{s:1,f:6,iv:'1'},{s:0,f:6,iv:'4'}] },
  { name:'F#sus4', positions:[{s:3,f:4,iv:'1'},{s:2,f:6,iv:'5'},{s:1,f:7,iv:'1'},{s:0,f:7,iv:'4'}] },
  { name:'Gsus4', positions:[{s:3,f:5,iv:'1'},{s:2,f:7,iv:'5'},{s:1,f:8,iv:'1'},{s:0,f:8,iv:'4'}] },
  { name:'Absus4', positions:[{s:3,f:6,iv:'1'},{s:2,f:8,iv:'5'},{s:1,f:9,iv:'1'},{s:0,f:9,iv:'4'}] },
  { name:'Asus4', positions:[{s:3,f:7,iv:'1'},{s:2,f:9,iv:'5'},{s:1,f:10,iv:'1'},{s:0,f:10,iv:'4'}] },
  { name:'Bbsus4', positions:[{s:3,f:8,iv:'1'},{s:2,f:10,iv:'5'},{s:1,f:11,iv:'1'},{s:0,f:11,iv:'4'}] },
  { name:'Bsus4', positions:[{s:3,f:9,iv:'1'},{s:2,f:11,iv:'5'},{s:1,f:12,iv:'1'},{s:0,f:12,iv:'4'}] },
  // ── ADD9 ────────────────────────────────────────────────────────
  // E-shape
  { name:'Cadd9', positions:[{s:5,f:8,iv:'1'},{s:4,f:10,iv:'5'},{s:3,f:10,iv:'1'},{s:2,f:9,iv:'3'},{s:1,f:8,iv:'5'},{s:0,f:10,iv:'9'}] },
  { name:'C#add9', positions:[{s:5,f:9,iv:'1'},{s:4,f:11,iv:'5'},{s:3,f:11,iv:'1'},{s:2,f:10,iv:'3'},{s:1,f:9,iv:'5'},{s:0,f:11,iv:'9'}] },
  { name:'Dadd9', positions:[{s:5,f:10,iv:'1'},{s:4,f:12,iv:'5'},{s:3,f:12,iv:'1'},{s:2,f:11,iv:'3'},{s:1,f:10,iv:'5'},{s:0,f:12,iv:'9'}] },
  { name:'Eadd9', positions:[{s:5,f:0,iv:'1'},{s:4,f:2,iv:'5'},{s:3,f:2,iv:'1'},{s:2,f:1,iv:'3'},{s:1,f:0,iv:'5'},{s:0,f:2,iv:'9'}] },
  { name:'Fadd9', positions:[{s:5,f:1,iv:'1'},{s:4,f:3,iv:'5'},{s:3,f:3,iv:'1'},{s:2,f:2,iv:'3'},{s:1,f:1,iv:'5'},{s:0,f:3,iv:'9'}] },
  { name:'F#add9', positions:[{s:5,f:2,iv:'1'},{s:4,f:4,iv:'5'},{s:3,f:4,iv:'1'},{s:2,f:3,iv:'3'},{s:1,f:2,iv:'5'},{s:0,f:4,iv:'9'}] },
  { name:'Gadd9', positions:[{s:5,f:3,iv:'1'},{s:4,f:5,iv:'5'},{s:3,f:5,iv:'1'},{s:2,f:4,iv:'3'},{s:1,f:3,iv:'5'},{s:0,f:5,iv:'9'}] },
  { name:'Abadd9', positions:[{s:5,f:4,iv:'1'},{s:4,f:6,iv:'5'},{s:3,f:6,iv:'1'},{s:2,f:5,iv:'3'},{s:1,f:4,iv:'5'},{s:0,f:6,iv:'9'}] },
  { name:'Aadd9', positions:[{s:5,f:5,iv:'1'},{s:4,f:7,iv:'5'},{s:3,f:7,iv:'1'},{s:2,f:6,iv:'3'},{s:1,f:5,iv:'5'},{s:0,f:7,iv:'9'}] },
  { name:'Bbadd9', positions:[{s:5,f:6,iv:'1'},{s:4,f:8,iv:'5'},{s:3,f:8,iv:'1'},{s:2,f:7,iv:'3'},{s:1,f:6,iv:'5'},{s:0,f:8,iv:'9'}] },
  { name:'Badd9', positions:[{s:5,f:7,iv:'1'},{s:4,f:9,iv:'5'},{s:3,f:9,iv:'1'},{s:2,f:8,iv:'3'},{s:1,f:7,iv:'5'},{s:0,f:9,iv:'9'}] },
  // (No D-shape add9: without a 3rd those voicings are identical to the
  // D-shape sus2 entries above — same frets, two names, one accepted answer.)
  // C-shape
  { name:'Cadd9', positions:[{s:4,f:3,iv:'1'},{s:3,f:2,iv:'3'},{s:2,f:0,iv:'5'},{s:1,f:3,iv:'9'},{s:0,f:0,iv:'3'}] },
  { name:'C#add9', positions:[{s:4,f:4,iv:'1'},{s:3,f:3,iv:'3'},{s:2,f:1,iv:'5'},{s:1,f:4,iv:'9'},{s:0,f:1,iv:'3'}] },
  { name:'Dadd9', positions:[{s:4,f:5,iv:'1'},{s:3,f:4,iv:'3'},{s:2,f:2,iv:'5'},{s:1,f:5,iv:'9'},{s:0,f:2,iv:'3'}] },
  { name:'Ebadd9', positions:[{s:4,f:6,iv:'1'},{s:3,f:5,iv:'3'},{s:2,f:3,iv:'5'},{s:1,f:6,iv:'9'},{s:0,f:3,iv:'3'}] },
  { name:'Eadd9', positions:[{s:4,f:7,iv:'1'},{s:3,f:6,iv:'3'},{s:2,f:4,iv:'5'},{s:1,f:7,iv:'9'},{s:0,f:4,iv:'3'}] },
  { name:'Fadd9', positions:[{s:4,f:8,iv:'1'},{s:3,f:7,iv:'3'},{s:2,f:5,iv:'5'},{s:1,f:8,iv:'9'},{s:0,f:5,iv:'3'}] },
  { name:'F#add9', positions:[{s:4,f:9,iv:'1'},{s:3,f:8,iv:'3'},{s:2,f:6,iv:'5'},{s:1,f:9,iv:'9'},{s:0,f:6,iv:'3'}] },
  { name:'Gadd9', positions:[{s:4,f:10,iv:'1'},{s:3,f:9,iv:'3'},{s:2,f:7,iv:'5'},{s:1,f:10,iv:'9'},{s:0,f:7,iv:'3'}] },
  { name:'Abadd9', positions:[{s:4,f:11,iv:'1'},{s:3,f:10,iv:'3'},{s:2,f:8,iv:'5'},{s:1,f:11,iv:'9'},{s:0,f:8,iv:'3'}] },
  // ── MAJ7 ────────────────────────────────────────────────────────
  // E-shape
  { name:'Cmaj7', positions:[{s:5,f:8,iv:'1'},{s:4,f:10,iv:'5'},{s:3,f:9,iv:'7'},{s:2,f:9,iv:'3'},{s:1,f:8,iv:'5'},{s:0,f:8,iv:'1'}] },
  { name:'C#maj7', positions:[{s:5,f:9,iv:'1'},{s:4,f:11,iv:'5'},{s:3,f:10,iv:'7'},{s:2,f:10,iv:'3'},{s:1,f:9,iv:'5'},{s:0,f:9,iv:'1'}] },
  { name:'Dmaj7', positions:[{s:5,f:10,iv:'1'},{s:4,f:12,iv:'5'},{s:3,f:11,iv:'7'},{s:2,f:11,iv:'3'},{s:1,f:10,iv:'5'},{s:0,f:10,iv:'1'}] },
  { name:'Emaj7', positions:[{s:5,f:0,iv:'1'},{s:4,f:2,iv:'5'},{s:3,f:1,iv:'7'},{s:2,f:1,iv:'3'},{s:1,f:0,iv:'5'},{s:0,f:0,iv:'1'}] },
  { name:'Fmaj7', positions:[{s:5,f:1,iv:'1'},{s:4,f:3,iv:'5'},{s:3,f:2,iv:'7'},{s:2,f:2,iv:'3'},{s:1,f:1,iv:'5'},{s:0,f:1,iv:'1'}] },
  { name:'F#maj7', positions:[{s:5,f:2,iv:'1'},{s:4,f:4,iv:'5'},{s:3,f:3,iv:'7'},{s:2,f:3,iv:'3'},{s:1,f:2,iv:'5'},{s:0,f:2,iv:'1'}] },
  { name:'Gmaj7', positions:[{s:5,f:3,iv:'1'},{s:4,f:5,iv:'5'},{s:3,f:4,iv:'7'},{s:2,f:4,iv:'3'},{s:1,f:3,iv:'5'},{s:0,f:3,iv:'1'}] },
  { name:'Abmaj7', positions:[{s:5,f:4,iv:'1'},{s:4,f:6,iv:'5'},{s:3,f:5,iv:'7'},{s:2,f:5,iv:'3'},{s:1,f:4,iv:'5'},{s:0,f:4,iv:'1'}] },
  { name:'Amaj7', positions:[{s:5,f:5,iv:'1'},{s:4,f:7,iv:'5'},{s:3,f:6,iv:'7'},{s:2,f:6,iv:'3'},{s:1,f:5,iv:'5'},{s:0,f:5,iv:'1'}] },
  { name:'Bbmaj7', positions:[{s:5,f:6,iv:'1'},{s:4,f:8,iv:'5'},{s:3,f:7,iv:'7'},{s:2,f:7,iv:'3'},{s:1,f:6,iv:'5'},{s:0,f:6,iv:'1'}] },
  { name:'Bmaj7', positions:[{s:5,f:7,iv:'1'},{s:4,f:9,iv:'5'},{s:3,f:8,iv:'7'},{s:2,f:8,iv:'3'},{s:1,f:7,iv:'5'},{s:0,f:7,iv:'1'}] },
  // A-shape
  { name:'Cmaj7', positions:[{s:4,f:3,iv:'1'},{s:3,f:5,iv:'5'},{s:2,f:4,iv:'7'},{s:1,f:5,iv:'3'},{s:0,f:3,iv:'5'}] },
  { name:'C#maj7', positions:[{s:4,f:4,iv:'1'},{s:3,f:6,iv:'5'},{s:2,f:5,iv:'7'},{s:1,f:6,iv:'3'},{s:0,f:4,iv:'5'}] },
  { name:'Dmaj7', positions:[{s:4,f:5,iv:'1'},{s:3,f:7,iv:'5'},{s:2,f:6,iv:'7'},{s:1,f:7,iv:'3'},{s:0,f:5,iv:'5'}] },
  { name:'Ebmaj7', positions:[{s:4,f:6,iv:'1'},{s:3,f:8,iv:'5'},{s:2,f:7,iv:'7'},{s:1,f:8,iv:'3'},{s:0,f:6,iv:'5'}] },
  { name:'Emaj7', positions:[{s:4,f:7,iv:'1'},{s:3,f:9,iv:'5'},{s:2,f:8,iv:'7'},{s:1,f:9,iv:'3'},{s:0,f:7,iv:'5'}] },
  { name:'Fmaj7', positions:[{s:4,f:8,iv:'1'},{s:3,f:10,iv:'5'},{s:2,f:9,iv:'7'},{s:1,f:10,iv:'3'},{s:0,f:8,iv:'5'}] },
  { name:'F#maj7', positions:[{s:4,f:9,iv:'1'},{s:3,f:11,iv:'5'},{s:2,f:10,iv:'7'},{s:1,f:11,iv:'3'},{s:0,f:9,iv:'5'}] },
  { name:'Gmaj7', positions:[{s:4,f:10,iv:'1'},{s:3,f:12,iv:'5'},{s:2,f:11,iv:'7'},{s:1,f:12,iv:'3'},{s:0,f:10,iv:'5'}] },
  { name:'Amaj7', positions:[{s:4,f:0,iv:'1'},{s:3,f:2,iv:'5'},{s:2,f:1,iv:'7'},{s:1,f:2,iv:'3'},{s:0,f:0,iv:'5'}] },
  { name:'Bbmaj7', positions:[{s:4,f:1,iv:'1'},{s:3,f:3,iv:'5'},{s:2,f:2,iv:'7'},{s:1,f:3,iv:'3'},{s:0,f:1,iv:'5'}] },
  { name:'Bmaj7', positions:[{s:4,f:2,iv:'1'},{s:3,f:4,iv:'5'},{s:2,f:3,iv:'7'},{s:1,f:4,iv:'3'},{s:0,f:2,iv:'5'}] },
  // D-shape
  { name:'Cmaj7', positions:[{s:3,f:10,iv:'1'},{s:2,f:12,iv:'5'},{s:1,f:12,iv:'7'},{s:0,f:12,iv:'3'}] },
  { name:'Dmaj7', positions:[{s:3,f:0,iv:'1'},{s:2,f:2,iv:'5'},{s:1,f:2,iv:'7'},{s:0,f:2,iv:'3'}] },
  { name:'Ebmaj7', positions:[{s:3,f:1,iv:'1'},{s:2,f:3,iv:'5'},{s:1,f:3,iv:'7'},{s:0,f:3,iv:'3'}] },
  { name:'Emaj7', positions:[{s:3,f:2,iv:'1'},{s:2,f:4,iv:'5'},{s:1,f:4,iv:'7'},{s:0,f:4,iv:'3'}] },
  { name:'Fmaj7', positions:[{s:3,f:3,iv:'1'},{s:2,f:5,iv:'5'},{s:1,f:5,iv:'7'},{s:0,f:5,iv:'3'}] },
  { name:'F#maj7', positions:[{s:3,f:4,iv:'1'},{s:2,f:6,iv:'5'},{s:1,f:6,iv:'7'},{s:0,f:6,iv:'3'}] },
  { name:'Gmaj7', positions:[{s:3,f:5,iv:'1'},{s:2,f:7,iv:'5'},{s:1,f:7,iv:'7'},{s:0,f:7,iv:'3'}] },
  { name:'Abmaj7', positions:[{s:3,f:6,iv:'1'},{s:2,f:8,iv:'5'},{s:1,f:8,iv:'7'},{s:0,f:8,iv:'3'}] },
  { name:'Amaj7', positions:[{s:3,f:7,iv:'1'},{s:2,f:9,iv:'5'},{s:1,f:9,iv:'7'},{s:0,f:9,iv:'3'}] },
  { name:'Bbmaj7', positions:[{s:3,f:8,iv:'1'},{s:2,f:10,iv:'5'},{s:1,f:10,iv:'7'},{s:0,f:10,iv:'3'}] },
  { name:'Bmaj7', positions:[{s:3,f:9,iv:'1'},{s:2,f:11,iv:'5'},{s:1,f:11,iv:'7'},{s:0,f:11,iv:'3'}] },
  // ── MINOR 7TH ───────────────────────────────────────────────────
  // E-shape
  { name:'Cm7', positions:[{s:5,f:8,iv:'1'},{s:4,f:10,iv:'5'},{s:3,f:8,iv:'b7'},{s:2,f:8,iv:'b3'},{s:1,f:8,iv:'5'},{s:0,f:8,iv:'1'}] },
  { name:'C#m7', positions:[{s:5,f:9,iv:'1'},{s:4,f:11,iv:'5'},{s:3,f:9,iv:'b7'},{s:2,f:9,iv:'b3'},{s:1,f:9,iv:'5'},{s:0,f:9,iv:'1'}] },
  { name:'Dm7', positions:[{s:5,f:10,iv:'1'},{s:4,f:12,iv:'5'},{s:3,f:10,iv:'b7'},{s:2,f:10,iv:'b3'},{s:1,f:10,iv:'5'},{s:0,f:10,iv:'1'}] },
  { name:'Em7', positions:[{s:5,f:0,iv:'1'},{s:4,f:2,iv:'5'},{s:3,f:0,iv:'b7'},{s:2,f:0,iv:'b3'},{s:1,f:0,iv:'5'},{s:0,f:0,iv:'1'}] },
  { name:'Fm7', positions:[{s:5,f:1,iv:'1'},{s:4,f:3,iv:'5'},{s:3,f:1,iv:'b7'},{s:2,f:1,iv:'b3'},{s:1,f:1,iv:'5'},{s:0,f:1,iv:'1'}] },
  { name:'F#m7', positions:[{s:5,f:2,iv:'1'},{s:4,f:4,iv:'5'},{s:3,f:2,iv:'b7'},{s:2,f:2,iv:'b3'},{s:1,f:2,iv:'5'},{s:0,f:2,iv:'1'}] },
  { name:'Gm7', positions:[{s:5,f:3,iv:'1'},{s:4,f:5,iv:'5'},{s:3,f:3,iv:'b7'},{s:2,f:3,iv:'b3'},{s:1,f:3,iv:'5'},{s:0,f:3,iv:'1'}] },
  { name:'Abm7', positions:[{s:5,f:4,iv:'1'},{s:4,f:6,iv:'5'},{s:3,f:4,iv:'b7'},{s:2,f:4,iv:'b3'},{s:1,f:4,iv:'5'},{s:0,f:4,iv:'1'}] },
  { name:'Am7', positions:[{s:5,f:5,iv:'1'},{s:4,f:7,iv:'5'},{s:3,f:5,iv:'b7'},{s:2,f:5,iv:'b3'},{s:1,f:5,iv:'5'},{s:0,f:5,iv:'1'}] },
  { name:'Bbm7', positions:[{s:5,f:6,iv:'1'},{s:4,f:8,iv:'5'},{s:3,f:6,iv:'b7'},{s:2,f:6,iv:'b3'},{s:1,f:6,iv:'5'},{s:0,f:6,iv:'1'}] },
  { name:'Bm7', positions:[{s:5,f:7,iv:'1'},{s:4,f:9,iv:'5'},{s:3,f:7,iv:'b7'},{s:2,f:7,iv:'b3'},{s:1,f:7,iv:'5'},{s:0,f:7,iv:'1'}] },
  // A-shape
  { name:'Cm7', positions:[{s:4,f:3,iv:'1'},{s:3,f:5,iv:'5'},{s:2,f:3,iv:'b7'},{s:1,f:4,iv:'b3'},{s:0,f:3,iv:'5'}] },
  { name:'C#m7', positions:[{s:4,f:4,iv:'1'},{s:3,f:6,iv:'5'},{s:2,f:4,iv:'b7'},{s:1,f:5,iv:'b3'},{s:0,f:4,iv:'5'}] },
  { name:'Dm7', positions:[{s:4,f:5,iv:'1'},{s:3,f:7,iv:'5'},{s:2,f:5,iv:'b7'},{s:1,f:6,iv:'b3'},{s:0,f:5,iv:'5'}] },
  { name:'Ebm7', positions:[{s:4,f:6,iv:'1'},{s:3,f:8,iv:'5'},{s:2,f:6,iv:'b7'},{s:1,f:7,iv:'b3'},{s:0,f:6,iv:'5'}] },
  { name:'Em7', positions:[{s:4,f:7,iv:'1'},{s:3,f:9,iv:'5'},{s:2,f:7,iv:'b7'},{s:1,f:8,iv:'b3'},{s:0,f:7,iv:'5'}] },
  { name:'Fm7', positions:[{s:4,f:8,iv:'1'},{s:3,f:10,iv:'5'},{s:2,f:8,iv:'b7'},{s:1,f:9,iv:'b3'},{s:0,f:8,iv:'5'}] },
  { name:'F#m7', positions:[{s:4,f:9,iv:'1'},{s:3,f:11,iv:'5'},{s:2,f:9,iv:'b7'},{s:1,f:10,iv:'b3'},{s:0,f:9,iv:'5'}] },
  { name:'Gm7', positions:[{s:4,f:10,iv:'1'},{s:3,f:12,iv:'5'},{s:2,f:10,iv:'b7'},{s:1,f:11,iv:'b3'},{s:0,f:10,iv:'5'}] },
  { name:'Am7', positions:[{s:4,f:0,iv:'1'},{s:3,f:2,iv:'5'},{s:2,f:0,iv:'b7'},{s:1,f:1,iv:'b3'},{s:0,f:0,iv:'5'}] },
  { name:'Bbm7', positions:[{s:4,f:1,iv:'1'},{s:3,f:3,iv:'5'},{s:2,f:1,iv:'b7'},{s:1,f:2,iv:'b3'},{s:0,f:1,iv:'5'}] },
  { name:'Bm7', positions:[{s:4,f:2,iv:'1'},{s:3,f:4,iv:'5'},{s:2,f:2,iv:'b7'},{s:1,f:3,iv:'b3'},{s:0,f:2,iv:'5'}] },
  // D-shape
  { name:'Cm7', positions:[{s:3,f:10,iv:'1'},{s:2,f:12,iv:'5'},{s:1,f:11,iv:'b7'},{s:0,f:11,iv:'b3'}] },
  { name:'Dm7', positions:[{s:3,f:0,iv:'1'},{s:2,f:2,iv:'5'},{s:1,f:1,iv:'b7'},{s:0,f:1,iv:'b3'}] },
  { name:'Ebm7', positions:[{s:3,f:1,iv:'1'},{s:2,f:3,iv:'5'},{s:1,f:2,iv:'b7'},{s:0,f:2,iv:'b3'}] },
  { name:'Em7', positions:[{s:3,f:2,iv:'1'},{s:2,f:4,iv:'5'},{s:1,f:3,iv:'b7'},{s:0,f:3,iv:'b3'}] },
  { name:'Fm7', positions:[{s:3,f:3,iv:'1'},{s:2,f:5,iv:'5'},{s:1,f:4,iv:'b7'},{s:0,f:4,iv:'b3'}] },
  { name:'F#m7', positions:[{s:3,f:4,iv:'1'},{s:2,f:6,iv:'5'},{s:1,f:5,iv:'b7'},{s:0,f:5,iv:'b3'}] },
  { name:'Gm7', positions:[{s:3,f:5,iv:'1'},{s:2,f:7,iv:'5'},{s:1,f:6,iv:'b7'},{s:0,f:6,iv:'b3'}] },
  { name:'Abm7', positions:[{s:3,f:6,iv:'1'},{s:2,f:8,iv:'5'},{s:1,f:7,iv:'b7'},{s:0,f:7,iv:'b3'}] },
  { name:'Am7', positions:[{s:3,f:7,iv:'1'},{s:2,f:9,iv:'5'},{s:1,f:8,iv:'b7'},{s:0,f:8,iv:'b3'}] },
  { name:'Bbm7', positions:[{s:3,f:8,iv:'1'},{s:2,f:10,iv:'5'},{s:1,f:9,iv:'b7'},{s:0,f:9,iv:'b3'}] },
  { name:'Bm7', positions:[{s:3,f:9,iv:'1'},{s:2,f:11,iv:'5'},{s:1,f:10,iv:'b7'},{s:0,f:10,iv:'b3'}] },
  // ── 9TH ─────────────────────────────────────────────────────────
  // E-shape
  { name:'C9', positions:[{s:5,f:8,iv:'1'},{s:4,f:10,iv:'5'},{s:3,f:8,iv:'b7'},{s:2,f:9,iv:'3'},{s:1,f:8,iv:'5'},{s:0,f:10,iv:'9'}] },
  { name:'C#9', positions:[{s:5,f:9,iv:'1'},{s:4,f:11,iv:'5'},{s:3,f:9,iv:'b7'},{s:2,f:10,iv:'3'},{s:1,f:9,iv:'5'},{s:0,f:11,iv:'9'}] },
  { name:'D9', positions:[{s:5,f:10,iv:'1'},{s:4,f:12,iv:'5'},{s:3,f:10,iv:'b7'},{s:2,f:11,iv:'3'},{s:1,f:10,iv:'5'},{s:0,f:12,iv:'9'}] },
  { name:'E9', positions:[{s:5,f:0,iv:'1'},{s:4,f:2,iv:'5'},{s:3,f:0,iv:'b7'},{s:2,f:1,iv:'3'},{s:1,f:0,iv:'5'},{s:0,f:2,iv:'9'}] },
  { name:'F9', positions:[{s:5,f:1,iv:'1'},{s:4,f:3,iv:'5'},{s:3,f:1,iv:'b7'},{s:2,f:2,iv:'3'},{s:1,f:1,iv:'5'},{s:0,f:3,iv:'9'}] },
  { name:'F#9', positions:[{s:5,f:2,iv:'1'},{s:4,f:4,iv:'5'},{s:3,f:2,iv:'b7'},{s:2,f:3,iv:'3'},{s:1,f:2,iv:'5'},{s:0,f:4,iv:'9'}] },
  { name:'G9', positions:[{s:5,f:3,iv:'1'},{s:4,f:5,iv:'5'},{s:3,f:3,iv:'b7'},{s:2,f:4,iv:'3'},{s:1,f:3,iv:'5'},{s:0,f:5,iv:'9'}] },
  { name:'Ab9', positions:[{s:5,f:4,iv:'1'},{s:4,f:6,iv:'5'},{s:3,f:4,iv:'b7'},{s:2,f:5,iv:'3'},{s:1,f:4,iv:'5'},{s:0,f:6,iv:'9'}] },
  { name:'A9', positions:[{s:5,f:5,iv:'1'},{s:4,f:7,iv:'5'},{s:3,f:5,iv:'b7'},{s:2,f:6,iv:'3'},{s:1,f:5,iv:'5'},{s:0,f:7,iv:'9'}] },
  { name:'Bb9', positions:[{s:5,f:6,iv:'1'},{s:4,f:8,iv:'5'},{s:3,f:6,iv:'b7'},{s:2,f:7,iv:'3'},{s:1,f:6,iv:'5'},{s:0,f:8,iv:'9'}] },
  { name:'B9', positions:[{s:5,f:7,iv:'1'},{s:4,f:9,iv:'5'},{s:3,f:7,iv:'b7'},{s:2,f:8,iv:'3'},{s:1,f:7,iv:'5'},{s:0,f:9,iv:'9'}] },
  // A-shape
  { name:'Bb9', positions:[{s:4,f:1,iv:'1'},{s:3,f:0,iv:'3'},{s:2,f:1,iv:'b7'},{s:1,f:1,iv:'9'},{s:0,f:1,iv:'5'}] },
  { name:'B9', positions:[{s:4,f:2,iv:'1'},{s:3,f:1,iv:'3'},{s:2,f:2,iv:'b7'},{s:1,f:2,iv:'9'},{s:0,f:2,iv:'5'}] },
  { name:'C9', positions:[{s:4,f:3,iv:'1'},{s:3,f:2,iv:'3'},{s:2,f:3,iv:'b7'},{s:1,f:3,iv:'9'},{s:0,f:3,iv:'5'}] },
  { name:'C#9', positions:[{s:4,f:4,iv:'1'},{s:3,f:3,iv:'3'},{s:2,f:4,iv:'b7'},{s:1,f:4,iv:'9'},{s:0,f:4,iv:'5'}] },
  { name:'D9', positions:[{s:4,f:5,iv:'1'},{s:3,f:4,iv:'3'},{s:2,f:5,iv:'b7'},{s:1,f:5,iv:'9'},{s:0,f:5,iv:'5'}] },
  { name:'Eb9', positions:[{s:4,f:6,iv:'1'},{s:3,f:5,iv:'3'},{s:2,f:6,iv:'b7'},{s:1,f:6,iv:'9'},{s:0,f:6,iv:'5'}] },
  { name:'E9', positions:[{s:4,f:7,iv:'1'},{s:3,f:6,iv:'3'},{s:2,f:7,iv:'b7'},{s:1,f:7,iv:'9'},{s:0,f:7,iv:'5'}] },
  { name:'F9', positions:[{s:4,f:8,iv:'1'},{s:3,f:7,iv:'3'},{s:2,f:8,iv:'b7'},{s:1,f:8,iv:'9'},{s:0,f:8,iv:'5'}] },
  { name:'F#9', positions:[{s:4,f:9,iv:'1'},{s:3,f:8,iv:'3'},{s:2,f:9,iv:'b7'},{s:1,f:9,iv:'9'},{s:0,f:9,iv:'5'}] },
  { name:'G9', positions:[{s:4,f:10,iv:'1'},{s:3,f:9,iv:'3'},{s:2,f:10,iv:'b7'},{s:1,f:10,iv:'9'},{s:0,f:10,iv:'5'}] },
  { name:'Ab9', positions:[{s:4,f:11,iv:'1'},{s:3,f:10,iv:'3'},{s:2,f:11,iv:'b7'},{s:1,f:11,iv:'9'},{s:0,f:11,iv:'5'}] },
  { name:'A9', positions:[{s:4,f:12,iv:'1'},{s:3,f:11,iv:'3'},{s:2,f:12,iv:'b7'},{s:1,f:12,iv:'9'},{s:0,f:12,iv:'5'}] },
  // ── 7#9 ─────────────────────────────────────────────────────────
  // E-shape
  { name:'C7#9', positions:[{s:5,f:8,iv:'1'},{s:4,f:10,iv:'5'},{s:3,f:8,iv:'b7'},{s:2,f:9,iv:'3'},{s:1,f:8,iv:'5'},{s:0,f:11,iv:'#9'}] },
  { name:'C#7#9', positions:[{s:5,f:9,iv:'1'},{s:4,f:11,iv:'5'},{s:3,f:9,iv:'b7'},{s:2,f:10,iv:'3'},{s:1,f:9,iv:'5'},{s:0,f:12,iv:'#9'}] },
  { name:'E7#9', positions:[{s:5,f:0,iv:'1'},{s:4,f:2,iv:'5'},{s:3,f:0,iv:'b7'},{s:2,f:1,iv:'3'},{s:1,f:0,iv:'5'},{s:0,f:3,iv:'#9'}] },
  { name:'F7#9', positions:[{s:5,f:1,iv:'1'},{s:4,f:3,iv:'5'},{s:3,f:1,iv:'b7'},{s:2,f:2,iv:'3'},{s:1,f:1,iv:'5'},{s:0,f:4,iv:'#9'}] },
  { name:'F#7#9', positions:[{s:5,f:2,iv:'1'},{s:4,f:4,iv:'5'},{s:3,f:2,iv:'b7'},{s:2,f:3,iv:'3'},{s:1,f:2,iv:'5'},{s:0,f:5,iv:'#9'}] },
  { name:'G7#9', positions:[{s:5,f:3,iv:'1'},{s:4,f:5,iv:'5'},{s:3,f:3,iv:'b7'},{s:2,f:4,iv:'3'},{s:1,f:3,iv:'5'},{s:0,f:6,iv:'#9'}] },
  { name:'Ab7#9', positions:[{s:5,f:4,iv:'1'},{s:4,f:6,iv:'5'},{s:3,f:4,iv:'b7'},{s:2,f:5,iv:'3'},{s:1,f:4,iv:'5'},{s:0,f:7,iv:'#9'}] },
  { name:'A7#9', positions:[{s:5,f:5,iv:'1'},{s:4,f:7,iv:'5'},{s:3,f:5,iv:'b7'},{s:2,f:6,iv:'3'},{s:1,f:5,iv:'5'},{s:0,f:8,iv:'#9'}] },
  { name:'Bb7#9', positions:[{s:5,f:6,iv:'1'},{s:4,f:8,iv:'5'},{s:3,f:6,iv:'b7'},{s:2,f:7,iv:'3'},{s:1,f:6,iv:'5'},{s:0,f:9,iv:'#9'}] },
  { name:'B7#9', positions:[{s:5,f:7,iv:'1'},{s:4,f:9,iv:'5'},{s:3,f:7,iv:'b7'},{s:2,f:8,iv:'3'},{s:1,f:7,iv:'5'},{s:0,f:10,iv:'#9'}] },
  // compact-shape
  { name:'C7#9', positions:[{s:4,f:3,iv:'1'},{s:3,f:2,iv:'3'},{s:2,f:3,iv:'b7'},{s:1,f:4,iv:'#9'}] },
  { name:'C#7#9', positions:[{s:4,f:4,iv:'1'},{s:3,f:3,iv:'3'},{s:2,f:4,iv:'b7'},{s:1,f:5,iv:'#9'}] },
  { name:'D7#9', positions:[{s:4,f:5,iv:'1'},{s:3,f:4,iv:'3'},{s:2,f:5,iv:'b7'},{s:1,f:6,iv:'#9'}] },
  { name:'Eb7#9', positions:[{s:4,f:6,iv:'1'},{s:3,f:5,iv:'3'},{s:2,f:6,iv:'b7'},{s:1,f:7,iv:'#9'}] },
  { name:'E7#9', positions:[{s:4,f:7,iv:'1'},{s:3,f:6,iv:'3'},{s:2,f:7,iv:'b7'},{s:1,f:8,iv:'#9'}] },
  { name:'F7#9', positions:[{s:4,f:8,iv:'1'},{s:3,f:7,iv:'3'},{s:2,f:8,iv:'b7'},{s:1,f:9,iv:'#9'}] },
  { name:'F#7#9', positions:[{s:4,f:9,iv:'1'},{s:3,f:8,iv:'3'},{s:2,f:9,iv:'b7'},{s:1,f:10,iv:'#9'}] },
  { name:'G7#9', positions:[{s:4,f:10,iv:'1'},{s:3,f:9,iv:'3'},{s:2,f:10,iv:'b7'},{s:1,f:11,iv:'#9'}] },
  { name:'Ab7#9', positions:[{s:4,f:11,iv:'1'},{s:3,f:10,iv:'3'},{s:2,f:11,iv:'b7'},{s:1,f:12,iv:'#9'}] },
  { name:'Bb7#9', positions:[{s:4,f:1,iv:'1'},{s:3,f:0,iv:'3'},{s:2,f:1,iv:'b7'},{s:1,f:2,iv:'#9'}] },
  { name:'B7#9', positions:[{s:4,f:2,iv:'1'},{s:3,f:1,iv:'3'},{s:2,f:2,iv:'b7'},{s:1,f:3,iv:'#9'}] },
];

/* ── PRO-TIER SHAPES ────────────────────────────────────────────────
   Generated from movable templates so every root gets the same trusted
   voicing. `off` entries are [string, fretOffset, interval] relative to the
   root fret on `rootS`; a chord is emitted for every root whose frets all
   land within 0..12. All voicings are standard grips (drop-2 / CAGED-derived)
   with a fretted span ≤ 3. Extended chords omit the 5th where that is the
   common guitar voicing (9ths/13ths). */
const PRO_ROOT_NAME = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const PRO_TEMPLATES = [
  // Sixths
  { suf:'6',       rootS:4, off:[[4,0,'1'],[3,2,'5'],[2,2,'1'],[1,2,'3'],[0,2,'6']] },        // x-R-R+2-R+2-R+2-R+2 (C6 = x35555)
  { suf:'6',       rootS:3, off:[[3,0,'1'],[2,2,'5'],[1,0,'6'],[0,2,'3']] },                  // xx-R-R+2-R-R+2 (D6 = xx0202)
  { suf:'m6',      rootS:4, off:[[4,0,'1'],[3,2,'5'],[2,2,'1'],[1,1,'b3'],[0,2,'6']] },       // Am6 = x02212
  { suf:'m6',      rootS:3, off:[[3,0,'1'],[2,2,'5'],[1,0,'6'],[0,1,'b3']] },                 // Dm6 = xx0201
  { suf:'6/9',     rootS:4, off:[[4,0,'1'],[3,-1,'3'],[2,-1,'6'],[1,0,'9'],[0,0,'5']] },      // C6/9 = x32233
  // Extended
  { suf:'maj9',    rootS:4, off:[[4,0,'1'],[3,-1,'3'],[2,1,'7'],[1,0,'9']] },                 // Cmaj9 = x324x x
  { suf:'m9',      rootS:4, off:[[4,0,'1'],[3,-2,'b3'],[2,0,'b7'],[1,0,'9'],[0,0,'5']] },     // Cm9 = x31333
  { suf:'13',      rootS:5, off:[[5,0,'1'],[3,0,'b7'],[2,1,'3'],[1,2,'13']] },                // F13 = 1x122x
  // Minor-major
  { suf:'m(maj7)', rootS:4, off:[[4,0,'1'],[3,2,'5'],[2,1,'7'],[1,1,'b3']] },                 // Am(maj7) = x0211x
  // Diminished / half-diminished / augmented
  { suf:'m7b5',    rootS:4, off:[[4,0,'1'],[3,1,'b5'],[2,0,'b7'],[1,1,'b3']] },               // Bm7b5 = x2323x
  { suf:'m7b5',    rootS:5, off:[[5,0,'1'],[3,0,'b7'],[2,0,'b3'],[1,-1,'b5']] },              // F#m7b5 = 2x221x
  { suf:'dim7',    rootS:4, off:[[4,0,'1'],[3,1,'b5'],[2,-1,'bb7'],[1,1,'b3']] },             // Bdim7 = x2313x
  { suf:'dim7',    rootS:3, off:[[3,0,'1'],[2,1,'b5'],[1,0,'bb7'],[0,1,'b3']] },              // Edim7 = xx2323
  { suf:'aug',     rootS:4, off:[[4,0,'1'],[3,-1,'3'],[2,-2,'#5'],[1,-2,'1']] },              // Caug = x3211x
  { suf:'aug',     rootS:5, off:[[5,0,'1'],[3,2,'1'],[2,1,'3'],[1,1,'#5']] },                 // Faug = 1x322x
  // Dominant colors
  { suf:'7sus4',   rootS:5, off:[[5,0,'1'],[4,2,'5'],[3,0,'b7'],[2,2,'4'],[1,0,'5'],[0,0,'1']] }, // F7sus4 = 131311
  { suf:'7sus4',   rootS:4, off:[[4,0,'1'],[3,2,'5'],[2,0,'b7'],[1,3,'4']] },                 // A7sus4 = x0203x
  { suf:'7b5',     rootS:5, off:[[5,0,'1'],[3,0,'b7'],[2,1,'3'],[1,-1,'b5']] },               // C7b5 = 8x897x
  { suf:'7#5',     rootS:5, off:[[5,0,'1'],[3,0,'b7'],[2,1,'3'],[1,1,'#5']] },                // C7#5 = 8x899x
  { suf:'7b9',     rootS:4, off:[[4,0,'1'],[3,-1,'3'],[2,0,'b7'],[1,-1,'b9']] },              // C7b9 = x3232x
];
{
  const OPEN_PC = [4, 11, 7, 2, 9, 4]; // E B G D A E, top → bottom
  for (const t of PRO_TEMPLATES) {
    for (let pc = 0; pc < 12; pc++) {
      const base = (pc - OPEN_PC[t.rootS] + 12) % 12;
      for (const R of [base, base + 12]) {
        if (t.off.some(([, d]) => R + d < 0 || R + d > 12)) continue;
        CHORD_SHAPES.push({
          name: PRO_ROOT_NAME[pc] + t.suf,
          positions: t.off.map(([s, d, iv]) => ({ s, f: R + d, iv })),
        });
        break;
      }
    }
  }
}

const CHORD_GOAL = 20;

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

/* ═══════════════════════════════════════
   CHORD DIFFICULTY + QUALITY HELPERS
═══════════════════════════════════════ */
const CHORD_QUALITIES_EASY   = ['major', 'minor'];
const CHORD_QUALITIES_MEDIUM = ['major', 'minor', '7', 'sus2', 'sus4', 'add9'];
const CHORD_QUALITIES_HARD   = ['major', 'minor', '7', 'sus2', 'sus4', 'add9', 'maj7', 'm7', '9', '7#9'];
const CHORD_QUALITIES_PRO    = [...CHORD_QUALITIES_HARD,
  '6', 'm6', '6/9', 'maj9', 'm9', 'm(maj7)', 'm7b5', 'dim7', 'aug',
  '7sus4', '7b5', '7#5', '7b9', '13'];

function getChordDifficulty(name) {
  const n = name.toLowerCase();
  // Pro — extended/altered vocabulary
  if (/(m7b5|dim7|aug|m\(maj7\)|7sus4|7b5|7#5|7b9|13|maj9|m9|6\/9)$/.test(n)) return 'pro';
  if (/6$/.test(n))          return 'pro';   // 6 and m6
  if (/7#9$/.test(n))        return 'hard';
  if (/maj7$/.test(n))       return 'hard';
  if (/m7$/.test(n))         return 'hard';
  if (/(?<!add)9$/.test(n))  return 'hard';  // plain 9 (maj9/m9 are pro)
  if (/7$/.test(n))          return 'medium';// dominant 7th (maj7/m7 returned above)
  if (/sus[24]$/.test(n))    return 'medium';
  if (/add9$/.test(n))       return 'medium';
  return 'easy';
}

const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2, pro: 3 };

function isBasicBarreChord(chord) {
  const n = chord.name.toLowerCase();
  if (!n.endsWith(' major') && !n.endsWith(' minor')) return false;
  const ps = chord.positions;
  if (ps.length < 5) return false;
  if (ps.some(p => p.f === 0)) return false;
  const sorted = [...ps].sort((a, b) => b.s - a.s);
  return sorted[0].iv === '1' && sorted[1].iv === '5';
}

function chordsForDifficulty(diff) {
  const rank = DIFFICULTY_RANK[diff] ?? 0;
  return CHORD_SHAPES.filter(c => {
    if (DIFFICULTY_RANK[getChordDifficulty(c.name)] > rank) return false;
    if ((diff === 'hard' || diff === 'pro') && isBasicBarreChord(c)) return false;
    return true;
  });
}

function qualitiesForDifficulty(diff) {
  if (diff === 'pro') return CHORD_QUALITIES_PRO;
  if (diff === 'hard') return CHORD_QUALITIES_HARD;
  if (diff === 'medium') return CHORD_QUALITIES_MEDIUM;
  return CHORD_QUALITIES_EASY;
}

// buildShapeChart: the movable shape families behind a difficulty's chord
// pool, root-agnostic. Concrete chords collapse into one entry per distinct
// interval pattern (an E-shape F major and an E-shape B major are the same
// family); positions are normalized so the shape's lowest fret is 0. Used by
// the chord-chart overlay, which shows interval layouts rather than chords.
function buildShapeChart(diff) {
  const groups = new Map(); // quality -> Map(signature -> normalized positions)
  for (const c of chordsForDifficulty(diff)) {
    const m = c.name.match(/^[A-G][#b]?\s*(.*)$/);
    const q = (m && m[1]) || 'major';
    const minF = Math.min(...c.positions.map(p => p.f));
    const norm = c.positions.map(p => ({ s: p.s, f: p.f - minF, iv: p.iv }));
    const sig = norm.map(p => `${p.s}:${p.f}:${p.iv}`).sort().join('|');
    if (!groups.has(q)) groups.set(q, new Map());
    if (!groups.get(q).has(sig)) groups.get(q).set(sig, norm);
  }
  return qualitiesForDifficulty(diff)
    .filter(q => groups.has(q))
    .map(q => ({ quality: q, shapes: [...groups.get(q).values()] }));
}

/* ═══════════════════════════════════════
   FRET-SET HELPERS (Mode 2)
═══════════════════════════════════════ */
const FRET_SETS_MODE2 = [[1,3],[4,6],[7,9],[10,12]];

function notesInSet(fretSet, nStrings, instrument) {
  const seen = new Set();
  for(let s=0;s<nStrings;s++) for(let f=fretSet[0];f<=fretSet[1];f++) seen.add(noteAt(s,f,instrument));
  return shuffleArr([...seen]);
}

function positionsOfNote(note, fretSet, nStrings, instrument) {
  const positions = [];
  for(let s=0;s<nStrings;s++) for(let f=fretSet[0];f<=fretSet[1];f++)
    if(noteAt(s,f,instrument)===note) positions.push(`${s}-${f}`);
  return positions;
}

/* ═══════════════════════════════════════
   INTERVAL + CHORD-NAME MATCHING
═══════════════════════════════════════ */
const IV_ORDER = ['1','2','b3','3','4','b5','5','#5','6','bb7','b7','7','b9','9','#9','13'];
const IV_LABEL = {
  '1':  'root note (1)',
  '2':  'major second (2)',
  'b3': 'minor third (b3)',
  '3':  'major third (3)',
  '4':  'perfect fourth (4)',
  'b5': 'flat five (b5)',
  '5':  'perfect fifth (5)',
  '#5': 'sharp five (#5)',
  '6':  'major sixth (6)',
  'bb7':'diminished seventh (bb7)',
  'b7': 'minor seventh (b7)',
  '7':  'major seventh (7)',
  'b9': 'flat nine (b9)',
  '9':  'ninth (9)',
  '#9': 'sharp nine (#9)',
  '13': 'thirteenth (13)',
};

function buildChordIntervals(chord) {
  const seen = new Set();
  const result = [];
  for (const sym of IV_ORDER) {
    const pos = chord.positions.find(p => p.iv === sym);
    if (pos && !seen.has(sym)) {
      seen.add(sym);
      result.push({ symbol: sym, note: noteAt(pos.s, pos.f) });
    }
  }
  return result;
}

// ── chord name matching helpers ───────────────────────────────────────────────
const CHORD_ENHARMONIC = {
  'c#':'db','db':'c#','d#':'eb','eb':'d#',
  'f#':'gb','gb':'f#','g#':'ab','ab':'g#',
  'a#':'bb','bb':'a#',
};

function expandChordInput(s) {
  return s.replace(/maj$/, ' major').replace(/min$/, ' minor')
    .replace(/(?<!aj)(?<!di)m(?!aj|7|9|in)/, ' minor')
    .trim().replace(/\s+/g,' ');
}

function normalizeChordName(s) {
  return s.trim().toLowerCase().replace(/[()]/g,'').replace(/\s+/g,' ');
}

function matchesChordName(input, cname) {
  const ni = normalizeChordName(input);
  const nc = normalizeChordName(cname);
  const exp = normalizeChordName(expandChordInput(input));
  if (ni === nc || exp === nc) return true;
  if (nc.endsWith(' major')) {
    const root = nc.replace(' major', '');
    if (ni === root || exp === root) return true;
  }
  return false;
}

function nameOrEnharmonicMatches(norm, name) {
  if (matchesChordName(norm, name)) return true;
  const rootMatch = name.match(/^([a-g][#b]?)/);
  const nameRoot  = rootMatch?.[1];
  const ehRoot    = nameRoot && CHORD_ENHARMONIC[nameRoot];
  const ehName    = ehRoot ? ehRoot + name.slice(nameRoot.length) : null;
  return !!(ehName && matchesChordName(norm, ehName));
}

// Symmetric chords divide the octave evenly, so every chord tone is an
// equally valid root: Cdim7 = Ebdim7 = F#dim7 = Adim7, Caug = Eaug = G#aug.
const SYMMETRIC_ROOT_STEPS = { dim7: [3, 6, 9], aug: [4, 8] };
const LOWER_FLAT_TO_SHARP = { db:'C#', eb:'D#', gb:'F#', ab:'G#', bb:'A#' };

function chordNameCorrect(norm, name) {
  if (nameOrEnharmonicMatches(norm, name)) return true;
  const sym = name.match(/^([a-g][#b]?)(dim7|aug)$/);
  if (!sym) return false;
  const idx = CHROMATIC.indexOf(
    LOWER_FLAT_TO_SHARP[sym[1]] || sym[1][0].toUpperCase() + sym[1].slice(1));
  if (idx < 0) return false;
  return SYMMETRIC_ROOT_STEPS[sym[2]].some(step =>
    nameOrEnharmonicMatches(norm, (CHROMATIC[(idx + step) % 12] + sym[2]).toLowerCase()));
}

// displayChordName: respell a chord name's root for the user's note-style
// preference ('sharp' → C#7, 'flat' → Db7). The 'both' style keeps the
// name's canonical spelling — "C#/Db7" would read like a slash chord.
const SHARP_TO_FLAT_ROOT = { 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb' };
const FLAT_TO_SHARP_ROOT = { 'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#' };
function displayChordName(name, style = 'both') {
  const m = name.match(/^([A-G][#b]?)(.*)$/);
  if (!m) return name;
  let root = m[1];
  if (style === 'sharp')     root = FLAT_TO_SHARP_ROOT[root] || root;
  else if (style === 'flat') root = SHARP_TO_FLAT_ROOT[root] || root;
  return root + m[2];
}

/* ═══════════════════════════════════════
   TRIADS (Mode 4: Find Triads)
═══════════════════════════════════════ */

// Maximum fret distance between the lowest and highest fretted/open note
// inside a single triad voicing. 4 covers the standard closed-voicing shapes
// and the open-string voicings without admitting unplayable stretches.
const TRIAD_MAX_SPAN = 4;

// triadStringSets: contiguous 3-string windows, top (highest pitch) to bottom.
// Guitar (6 strings) → 4 sets; bass (4 strings) → 2 sets.
function triadStringSets(nStrings) {
  const sets = [];
  for (let i = 0; i + 2 < nStrings; i++) sets.push([i, i+1, i+2]);
  return sets;
}

// findTriads: every distinct major/minor triad voicing for `root + quality` on
// the given 3-string set, with each chord tone on exactly one string and a
// fret span ≤ TRIAD_MAX_SPAN. Used by Mode 4 to score a player's clicks.
function findTriads(root, quality, stringSet, totalFrets, instrument) {
  const intervals = { major: [0, 4, 7], minor: [0, 3, 7], dim: [0, 3, 6] }[quality] || [0, 4, 7];
  const rootIdx = CHROMATIC.indexOf(root);
  if (rootIdx < 0 || !stringSet || stringSet.length !== 3) return [];
  const chordNotes = intervals.map(i => CHROMATIC[(rootIdx + i) % 12]);

  // For each string in the set, list every fret playing one of the 3 chord
  // tones, tagged with which tone it is (0=root, 1=3rd/b3, 2=5th).
  const perString = stringSet.map(s => {
    const positions = [];
    for (let f = 0; f <= totalFrets; f++) {
      const idx = chordNotes.indexOf(noteAt(s, f, instrument));
      if (idx >= 0) positions.push({ f, noteIdx: idx });
    }
    return positions;
  });

  const triads = [];
  for (const p0 of perString[0]) {
    for (const p1 of perString[1]) {
      if (p1.noteIdx === p0.noteIdx) continue;
      for (const p2 of perString[2]) {
        if (p2.noteIdx === p0.noteIdx || p2.noteIdx === p1.noteIdx) continue;
        const lo = Math.min(p0.f, p1.f, p2.f);
        const hi = Math.max(p0.f, p1.f, p2.f);
        if (hi - lo > TRIAD_MAX_SPAN) continue;
        triads.push([
          { s: stringSet[0], f: p0.f },
          { s: stringSet[1], f: p1.f },
          { s: stringSet[2], f: p2.f },
        ]);
      }
    }
  }
  return triads;
}

// Canonical key for a triad — order-independent, used to compare triads as sets.
function triadKey(positions) {
  return positions.map(p => `${p.s}-${p.f}`).sort().join('|');
}

/* ═══════════════════════════════════════
   CHORD IDENTIFICATION (Free Learning)
   Pitch-class-set based: names every chord whose tones exactly match the
   revealed notes — any voicing, any position, any instrument. A chord with a
   7th (or higher extension) also matches with its 5th omitted, since that is
   how such chords are commonly voiced. Because all 12 roots are tried, every
   alternative name for the same notes falls out automatically (C6 = Am7,
   dim7's four names, Csus2 = Gsus4, …).
═══════════════════════════════════════ */

// Degree token → [semitones from root, human-readable label]
const DEGREE = {
  '1':  [0,  'root'],
  'b2': [1,  'flat 2nd'],   'b9': [1,  'flat 9th'],
  '2':  [2,  '2nd'],        '9':  [2,  '9th'],
  'b3': [3,  'minor 3rd'],  '#9': [3,  'sharp 9th'],
  '3':  [4,  'major 3rd'],
  '4':  [5,  '4th'],        '11': [5,  '11th'],
  'b5': [6,  'flat 5th'],   '#11':[6,  'sharp 11th'],
  '5':  [7,  'perfect 5th'],
  '#5': [8,  'sharp 5th'],  'b13':[8,  'flat 13th'],
  '6':  [9,  '6th'],        '13': [9,  '13th'],  'bb7':[9, 'dim 7th'],
  'b7': [10, 'minor 7th'],
  '7':  [11, 'major 7th'],
};

// Ordered roughly most → least common; the order breaks ties when several
// names describe the same set of notes. `suf` is appended to the root name.
const CHORD_FORMULAS = [
  // Triads
  { suf: ' major',    deg: ['1','3','5'] },
  { suf: ' minor',    deg: ['1','b3','5'] },
  { suf: ' dim',      deg: ['1','b3','b5'] },
  { suf: ' aug',      deg: ['1','3','#5'] },
  { suf: ' sus2',     deg: ['1','2','5'] },
  { suf: ' sus4',     deg: ['1','4','5'] },
  { suf: '(b5)',      deg: ['1','3','b5'] },
  // Power chord
  { suf: '5',         deg: ['1','5'] },
  // Sixths & sevenths
  { suf: '7',         deg: ['1','3','5','b7'] },
  { suf: 'maj7',      deg: ['1','3','5','7'] },
  { suf: 'm7',        deg: ['1','b3','5','b7'] },
  { suf: '6',         deg: ['1','3','5','6'] },
  { suf: 'm6',        deg: ['1','b3','5','6'] },
  { suf: 'm(maj7)',   deg: ['1','b3','5','7'] },
  { suf: 'm7b5',      deg: ['1','b3','b5','b7'] },
  { suf: 'dim7',      deg: ['1','b3','b5','bb7'] },
  { suf: 'dim(maj7)', deg: ['1','b3','b5','7'] },
  { suf: '7sus4',     deg: ['1','4','5','b7'] },
  { suf: '7sus2',     deg: ['1','2','5','b7'] },
  { suf: '7b5',       deg: ['1','3','b5','b7'] },
  { suf: '7#5',       deg: ['1','3','#5','b7'] },
  { suf: 'maj7b5',    deg: ['1','3','b5','7'] },
  { suf: 'maj7#5',    deg: ['1','3','#5','7'] },
  // Added-tone chords
  { suf: 'add9',      deg: ['1','9','3','5'] },
  { suf: 'madd9',     deg: ['1','9','b3','5'] },
  { suf: 'add11',     deg: ['1','3','11','5'] },
  { suf: 'madd11',    deg: ['1','b3','11','5'] },
  // Ninths
  { suf: '9',         deg: ['1','9','3','5','b7'] },
  { suf: 'maj9',      deg: ['1','9','3','5','7'] },
  { suf: 'm9',        deg: ['1','9','b3','5','b7'] },
  { suf: 'm(maj9)',   deg: ['1','9','b3','5','7'] },
  { suf: '6/9',       deg: ['1','9','3','5','6'] },
  { suf: 'm6/9',      deg: ['1','9','b3','5','6'] },
  { suf: '7b9',       deg: ['1','b9','3','5','b7'] },
  { suf: '7#9',       deg: ['1','#9','3','5','b7'] },
  { suf: '9sus4',     deg: ['1','9','4','5','b7'] },
  { suf: '9b5',       deg: ['1','9','3','b5','b7'] },
  { suf: '9#5',       deg: ['1','9','3','#5','b7'] },
  { suf: '7#11',      deg: ['1','3','#11','5','b7'] },
  { suf: 'maj7#11',   deg: ['1','3','#11','5','7'] },
  { suf: '7b13',      deg: ['1','3','5','b13','b7'] },
  // Elevenths & thirteenths (13ths omit the 11th, as commonly voiced)
  { suf: '11',        deg: ['1','9','3','11','5','b7'] },
  { suf: 'm11',       deg: ['1','9','b3','11','5','b7'] },
  { suf: 'maj11',     deg: ['1','9','3','11','5','7'] },
  { suf: '13',        deg: ['1','9','3','5','13','b7'] },
  { suf: 'm13',       deg: ['1','9','b3','5','13','b7'] },
  { suf: 'maj13',     deg: ['1','9','3','5','13','7'] },
];

// identifyChords: name the chord(s) formed by a set of pitch classes (0-11).
// Returns every matching interpretation, best first. Each match:
//   { root, suf, no5, bass, tones: [{ note, label }] }
// `bassPc` (optional) is the pitch class of the lowest sounding note; when it
// differs from a match's root the match carries it as a slash bass.
function identifyChords(pcs, bassPc = null) {
  const set = pcs instanceof Set ? pcs : new Set(pcs);
  if (set.size < 2) return [];
  const out = [];
  for (let root = 0; root < 12; root++) {
    for (let fi = 0; fi < CHORD_FORMULAS.length; fi++) {
      const f = CHORD_FORMULAS[fi];
      const steps = f.deg.map(d => DEGREE[d]);
      const matchesSteps = st =>
        set.size === st.length && st.every(([semi]) => set.has((root + semi) % 12));
      let no5 = false;
      let matched = matchesSteps(steps);
      // 7th/extended chords are commonly voiced without their 5th
      const hasSeventh = steps.some(([s]) => s === 10 || s === 11);
      if (!matched && hasSeventh && f.deg.includes('5')) {
        const reduced = steps.filter(([s]) => s !== 7);
        if (matchesSteps(reduced)) { matched = true; no5 = true; }
      }
      if (!matched) continue;
      const found = no5 ? steps.filter(([s]) => s !== 7) : steps;
      const slash = bassPc != null && bassPc !== root;
      out.push({
        root: CHROMATIC[root],
        suf: f.suf,
        no5,
        bass: slash ? CHROMATIC[bassPc] : null,
        tones: found.map(([semi, label]) => ({ note: CHROMATIC[(root + semi) % 12], label })),
        _rank: (no5 ? 1000 : 0) + (slash ? 100 : 0) + fi,
      });
    }
  }
  out.sort((a, b) => a._rank - b._rank);
  for (const m of out) delete m._rank;
  return out;
}

const api = {
  CHROMATIC, DISPLAY_BOTH, DISPLAY_FLAT, showNote,
  TUNINGS, stringsFor, noteAt, matchNote, OPEN_MIDI,
  MAJOR_SCALE, MINOR_SCALE, DORIAN_SCALE, MIXOLYDIAN_SCALE, HARMONIC_MINOR_SCALE,
  PENTATONIC_MAJOR, PENTATONIC_MINOR, scaleNotes,
  CHORD_SHAPES, CHORD_GOAL, shuffleArr,
  CHORD_QUALITIES_EASY, CHORD_QUALITIES_MEDIUM, CHORD_QUALITIES_HARD, CHORD_QUALITIES_PRO,
  getChordDifficulty, DIFFICULTY_RANK, isBasicBarreChord,
  chordsForDifficulty, qualitiesForDifficulty, buildShapeChart,
  FRET_SETS_MODE2, notesInSet, positionsOfNote,
  IV_ORDER, IV_LABEL, buildChordIntervals,
  CHORD_ENHARMONIC, expandChordInput, normalizeChordName,
  matchesChordName, chordNameCorrect, displayChordName,
  TRIAD_MAX_SPAN, triadStringSets, findTriads, triadKey,
  CHORD_FORMULAS, identifyChords,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  global.Fremorizer = api;
}

})(typeof window !== 'undefined' ? window : globalThis);
