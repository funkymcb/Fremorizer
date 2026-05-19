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
  // E-shape
  { name:'Csus2', positions:[{s:5,f:8,iv:'1'},{s:4,f:10,iv:'5'},{s:3,f:12,iv:'2'},{s:2,f:12,iv:'5'},{s:1,f:8,iv:'5'},{s:0,f:8,iv:'1'}] },
  { name:'Esus2', positions:[{s:5,f:0,iv:'1'},{s:4,f:2,iv:'5'},{s:3,f:4,iv:'2'},{s:2,f:4,iv:'5'},{s:1,f:0,iv:'5'},{s:0,f:0,iv:'1'}] },
  { name:'Fsus2', positions:[{s:5,f:1,iv:'1'},{s:4,f:3,iv:'5'},{s:3,f:5,iv:'2'},{s:2,f:5,iv:'5'},{s:1,f:1,iv:'5'},{s:0,f:1,iv:'1'}] },
  { name:'F#sus2', positions:[{s:5,f:2,iv:'1'},{s:4,f:4,iv:'5'},{s:3,f:6,iv:'2'},{s:2,f:6,iv:'5'},{s:1,f:2,iv:'5'},{s:0,f:2,iv:'1'}] },
  { name:'Gsus2', positions:[{s:5,f:3,iv:'1'},{s:4,f:5,iv:'5'},{s:3,f:7,iv:'2'},{s:2,f:7,iv:'5'},{s:1,f:3,iv:'5'},{s:0,f:3,iv:'1'}] },
  { name:'Absus2', positions:[{s:5,f:4,iv:'1'},{s:4,f:6,iv:'5'},{s:3,f:8,iv:'2'},{s:2,f:8,iv:'5'},{s:1,f:4,iv:'5'},{s:0,f:4,iv:'1'}] },
  { name:'Asus2', positions:[{s:5,f:5,iv:'1'},{s:4,f:7,iv:'5'},{s:3,f:9,iv:'2'},{s:2,f:9,iv:'5'},{s:1,f:5,iv:'5'},{s:0,f:5,iv:'1'}] },
  { name:'Bbsus2', positions:[{s:5,f:6,iv:'1'},{s:4,f:8,iv:'5'},{s:3,f:10,iv:'2'},{s:2,f:10,iv:'5'},{s:1,f:6,iv:'5'},{s:0,f:6,iv:'1'}] },
  { name:'Bsus2', positions:[{s:5,f:7,iv:'1'},{s:4,f:9,iv:'5'},{s:3,f:11,iv:'2'},{s:2,f:11,iv:'5'},{s:1,f:7,iv:'5'},{s:0,f:7,iv:'1'}] },
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
  // D-shape
  { name:'Dadd9', positions:[{s:3,f:0,iv:'1'},{s:2,f:2,iv:'5'},{s:1,f:3,iv:'1'},{s:0,f:0,iv:'9'}] },
  { name:'Ebadd9', positions:[{s:3,f:1,iv:'1'},{s:2,f:3,iv:'5'},{s:1,f:4,iv:'1'},{s:0,f:1,iv:'9'}] },
  { name:'Eadd9', positions:[{s:3,f:2,iv:'1'},{s:2,f:4,iv:'5'},{s:1,f:5,iv:'1'},{s:0,f:2,iv:'9'}] },
  { name:'Fadd9', positions:[{s:3,f:3,iv:'1'},{s:2,f:5,iv:'5'},{s:1,f:6,iv:'1'},{s:0,f:3,iv:'9'}] },
  { name:'F#add9', positions:[{s:3,f:4,iv:'1'},{s:2,f:6,iv:'5'},{s:1,f:7,iv:'1'},{s:0,f:4,iv:'9'}] },
  { name:'Gadd9', positions:[{s:3,f:5,iv:'1'},{s:2,f:7,iv:'5'},{s:1,f:8,iv:'1'},{s:0,f:5,iv:'9'}] },
  { name:'Abadd9', positions:[{s:3,f:6,iv:'1'},{s:2,f:8,iv:'5'},{s:1,f:9,iv:'1'},{s:0,f:6,iv:'9'}] },
  { name:'Aadd9', positions:[{s:3,f:7,iv:'1'},{s:2,f:9,iv:'5'},{s:1,f:10,iv:'1'},{s:0,f:7,iv:'9'}] },
  { name:'Bbadd9', positions:[{s:3,f:8,iv:'1'},{s:2,f:10,iv:'5'},{s:1,f:11,iv:'1'},{s:0,f:8,iv:'9'}] },
  { name:'Badd9', positions:[{s:3,f:9,iv:'1'},{s:2,f:11,iv:'5'},{s:1,f:12,iv:'1'},{s:0,f:9,iv:'9'}] },
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
const CHORD_QUALITIES_EASY   = ['major', 'minor', '7'];
const CHORD_QUALITIES_MEDIUM = ['major', 'minor', '7', 'sus2', 'sus4', 'add9'];
const CHORD_QUALITIES_HARD   = ['major', 'minor', '7', 'sus2', 'sus4', 'add9', 'maj7', 'm7', '9', '7#9'];

function getChordDifficulty(name) {
  const n = name.toLowerCase();
  if (/7#9$/.test(n))   return 'hard';
  if (/maj7$/.test(n))  return 'hard';
  if (/m7$/.test(n))    return 'hard';
  if (/(?<!add)9$/.test(n))  return 'hard';
  if (/sus[24]$/.test(n))    return 'medium';
  if (/add9$/.test(n))       return 'medium';
  return 'easy';
}

const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2, pro: 2 };

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
  if (diff === 'hard' || diff === 'pro') return CHORD_QUALITIES_HARD;
  if (diff === 'medium') return CHORD_QUALITIES_MEDIUM;
  return CHORD_QUALITIES_EASY;
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
const IV_ORDER = ['1','2','b3','3','4','5','b7','7','9','#9'];
const IV_LABEL = {
  '1':  'root note (1)',
  '2':  'major second (2)',
  'b3': 'minor third (b3)',
  '3':  'major third (3)',
  '4':  'perfect fourth (4)',
  '5':  'perfect fifth (5)',
  'b7': 'minor seventh (b7)',
  '7':  'major seventh (7)',
  '9':  'ninth (9)',
  '#9': 'sharp nine (#9)',
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

function chordNameCorrect(norm, name) {
  if (matchesChordName(norm, name)) return true;
  const rootMatch = name.match(/^([a-g][#b]?)/);
  const nameRoot  = rootMatch?.[1];
  const ehRoot    = nameRoot && CHORD_ENHARMONIC[nameRoot];
  const ehName    = ehRoot ? ehRoot + name.slice(nameRoot.length) : null;
  return !!(ehName && matchesChordName(norm, ehName));
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
  const intervals = quality === 'minor' ? [0, 3, 7] : [0, 4, 7];
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

const api = {
  CHROMATIC, DISPLAY_BOTH, DISPLAY_FLAT, showNote,
  TUNINGS, stringsFor, noteAt, matchNote,
  MAJOR_SCALE, MINOR_SCALE, PENTATONIC_MAJOR, PENTATONIC_MINOR, scaleNotes,
  CHORD_SHAPES, CHORD_GOAL, shuffleArr,
  CHORD_QUALITIES_EASY, CHORD_QUALITIES_MEDIUM, CHORD_QUALITIES_HARD,
  getChordDifficulty, DIFFICULTY_RANK, isBasicBarreChord,
  chordsForDifficulty, qualitiesForDifficulty,
  FRET_SETS_MODE2, notesInSet, positionsOfNote,
  IV_ORDER, IV_LABEL, buildChordIntervals,
  CHORD_ENHARMONIC, expandChordInput, normalizeChordName,
  matchesChordName, chordNameCorrect,
  TRIAD_MAX_SPAN, triadStringSets, findTriads, triadKey,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  global.Fremorizer = api;
}

})(typeof window !== 'undefined' ? window : globalThis);
