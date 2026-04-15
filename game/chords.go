package game

import (
	"fmt"
	"math/rand"
	"strings"

	"github.com/funkymcb/fremorizer/instrument"
)

// Chord game phases.
const (
	ChordPhaseNaming    = 0 // player identifies the chord name
	ChordPhaseIntervals = 1 // player identifies each interval note one by one
	ChordPhaseComplete  = 2 // all intervals solved; press Enter for next chord
)

// noteSpec describes a single string's contribution to a CAGED chord shape.
// interval: "1"=root, "3"=major 3rd, "b3"=minor 3rd, "5"=perfect 5th, "x"=muted/don't play.
// fretOffset: semitone offset from the root fret on the root string.
type noteSpec struct {
	fretOffset int
	interval   string
}

// cagedShape defines one of the 10 CAGED shapes (5 major + 5 minor).
// notes[i] corresponds to Strings[i] in the Instrument (index 0 = high E for 6-string guitar).
type cagedShape struct {
	name       string // "E", "A", "G", "C", "D"
	isMajor    bool
	rootString int // display index of the root string (0=high E, 5=low E for 6-string)
	notes      [6]noteSpec
}

// allCAGEDShapes returns the 10 CAGED shapes for 6-string standard-tuning guitar.
// String indices: 0=high E, 1=B, 2=G, 3=D, 4=A, 5=low E.
func allCAGEDShapes() []cagedShape {
	return []cagedShape{
		// ── Major shapes ────────────────────────────────────────────────────────
		{
			name: "E", isMajor: true, rootString: 5,
			notes: [6]noteSpec{
				{0, "1"}, // high E
				{0, "5"}, // B
				{1, "3"}, // G
				{2, "1"}, // D
				{2, "5"}, // A
				{0, "1"}, // low E  ← root
			},
		},
		{
			name: "A", isMajor: true, rootString: 4,
			notes: [6]noteSpec{
				{0, "5"}, // high E
				{2, "3"}, // B
				{2, "1"}, // G
				{2, "5"}, // D
				{0, "1"}, // A  ← root
				{0, "x"}, // low E  muted
			},
		},
		{
			name: "G", isMajor: true, rootString: 5,
			notes: [6]noteSpec{
				{0, "1"},  // high E
				{-3, "3"}, // B
				{-3, "1"}, // G
				{-3, "5"}, // D
				{-1, "3"}, // A
				{0, "1"},  // low E  ← root
			},
		},
		{
			name: "C", isMajor: true, rootString: 4,
			notes: [6]noteSpec{
				{-3, "3"}, // high E
				{-2, "1"}, // B
				{-3, "5"}, // G
				{-1, "3"}, // D
				{0, "1"},  // A  ← root
				{0, "x"},  // low E  muted
			},
		},
		{
			name: "D", isMajor: true, rootString: 3,
			notes: [6]noteSpec{
				{2, "3"}, // high E
				{3, "1"}, // B
				{2, "5"}, // G
				{0, "1"}, // D  ← root
				{0, "x"}, // A  muted
				{0, "x"}, // low E  muted
			},
		},

		// ── Minor shapes ────────────────────────────────────────────────────────
		{
			name: "E", isMajor: false, rootString: 5,
			notes: [6]noteSpec{
				{0, "1"},  // high E
				{0, "5"},  // B
				{0, "b3"}, // G  (one fret lower than major's +1)
				{2, "1"},  // D
				{2, "5"},  // A
				{0, "1"},  // low E  ← root
			},
		},
		{
			name: "A", isMajor: false, rootString: 4,
			notes: [6]noteSpec{
				{0, "5"},  // high E
				{1, "b3"}, // B  (one fret lower than major's +2)
				{2, "1"},  // G
				{2, "5"},  // D
				{0, "1"},  // A  ← root
				{0, "x"},  // low E  muted
			},
		},
		{
			name: "G", isMajor: false, rootString: 5,
			notes: [6]noteSpec{
				{0, "1"},   // high E
				{0, "5"},   // B  (different from major's -3)
				{-3, "1"},  // G
				{-3, "5"},  // D
				{-2, "b3"}, // A
				{0, "1"},   // low E  ← root
			},
		},
		{
			name: "C", isMajor: false, rootString: 4,
			notes: [6]noteSpec{
				{0, "x"},   // high E  muted
				{-2, "1"},  // B
				{-3, "5"},  // G
				{-2, "b3"}, // D
				{0, "1"},   // A  ← root
				{0, "x"},   // low E  muted
			},
		},
		{
			name: "D", isMajor: false, rootString: 3,
			notes: [6]noteSpec{
				{1, "b3"}, // high E  (one fret lower than major's +2)
				{3, "1"},  // B
				{2, "5"},  // G
				{0, "1"},  // D  ← root
				{0, "x"},  // A  muted
				{0, "x"},  // low E  muted
			},
		},
	}
}

// chordInterval tracks one interval prompt within the chord identification game.
type chordInterval struct {
	symbol    string // "1", "3", "b3", "5"
	humanName string // human-readable name for the prompt
	noteName  string // canonical note name (e.g., "G" or "C#/Db")
	solved    bool
}

// ChordsGame implements Game for chord-identification mode (mode 3).
type ChordsGame struct {
	inst            *instrument.Instrument
	rootNote        string          // canonical name, e.g., "G" or "C#/Db"
	isMajor         bool
	intervals       []chordInterval // [root, third/b3, fifth]
	currentIdx      int
	phase           int // ChordPhaseNaming / ChordPhaseIntervals / ChordPhaseComplete
	chordsCompleted int
	chordsRequired  int
	difficulty      string // "easy", "medium"
	marking         bool   // medium: cursor-marking sub-phase within ChordPhaseIntervals
	cursorString    int
	cursorFret      int
}

// NewChordsGame creates a chord game for the given instrument (must be 6-string guitar).
func NewChordsGame(inst *instrument.Instrument, chordsRequired int, difficulty string) *ChordsGame {
	if chordsRequired < 1 {
		chordsRequired = 20
	}
	if difficulty == "" {
		difficulty = "easy"
	}
	g := &ChordsGame{inst: inst, chordsRequired: chordsRequired, difficulty: difficulty}
	g.pickNewChord()
	return g
}

// Progress returns the number of chords completed and the total required.
func (g *ChordsGame) Progress() (int, int) { return g.chordsCompleted, g.chordsRequired }

// IsGameOver returns true when all required chords have been completed.
func (g *ChordsGame) IsGameOver() bool { return g.chordsCompleted >= g.chordsRequired }

// ── Game interface ─────────────────────────────────────────────────────────────

func (g *ChordsGame) GetInstrument() *instrument.Instrument { return g.inst }

// CheckAnswer validates the current input based on the active phase.
func (g *ChordsGame) CheckAnswer(answer string) bool {
	answer = strings.TrimSpace(answer)
	switch g.phase {
	case ChordPhaseNaming:
		root, minor, ok := parseChordInput(answer)
		if !ok {
			return false
		}
		return instrument.NoteMatches(g.rootNote, root) && minor == !g.isMajor
	case ChordPhaseIntervals:
		if g.currentIdx >= len(g.intervals) {
			return false
		}
		return instrument.NoteMatches(g.intervals[g.currentIdx].noteName, answer)
	}
	return false
}

// Next advances the game state after a correct answer.
func (g *ChordsGame) Next() error {
	switch g.phase {
	case ChordPhaseNaming:
		g.phase = ChordPhaseIntervals
	case ChordPhaseIntervals:
		if g.difficulty == "medium" {
			if !g.marking {
				// Player just named the interval note — auto-solve open string (fret 0) position.
				iv := &g.intervals[g.currentIdx]
				iv.solved = true
				g.solveIntervalFret0(iv.symbol)
				// If there are fret1+ positions, enter marking sub-phase.
				if g.hasMarkablePositions(iv.symbol) {
					g.marking = true
					g.initCursorForMarking()
					return nil
				}
				// No fret1+ positions — advance interval immediately.
				g.currentIdx++
				if g.currentIdx >= len(g.intervals) {
					g.phase = ChordPhaseComplete
				}
			} else {
				// Player finished marking — solve fret1+ positions and advance.
				iv := g.intervals[g.currentIdx]
				g.solveIntervalFret1Plus(iv.symbol)
				g.clearAllMarks()
				g.marking = false
				g.currentIdx++
				if g.currentIdx >= len(g.intervals) {
					g.phase = ChordPhaseComplete
				}
			}
		} else {
			// Easy mode.
			if g.currentIdx < len(g.intervals) {
				iv := &g.intervals[g.currentIdx]
				iv.solved = true
				g.solveInterval(iv.symbol)
			}
			g.currentIdx++
			if g.currentIdx >= len(g.intervals) {
				g.phase = ChordPhaseComplete
			}
		}
	case ChordPhaseComplete:
		g.chordsCompleted++
		if !g.IsGameOver() {
			g.pickNewChord()
		}
	}
	return nil
}

// ── ChordsGame-specific accessors ─────────────────────────────────────────────

// Phase returns the current game phase constant.
func (g *ChordsGame) Phase() int { return g.phase }

// Difficulty returns the difficulty setting ("easy", "medium").
func (g *ChordsGame) Difficulty() string { return g.difficulty }

// IsMarking returns true when the player is in the cursor-marking sub-phase (medium only).
func (g *ChordsGame) IsMarking() bool { return g.marking }

// GetCursor returns the current cursor position (string index, fret index).
func (g *ChordsGame) GetCursor() (int, int) { return g.cursorString, g.cursorFret }

// MoveCursor moves the cursor by (ds strings, df frets), wrapping at boundaries.
func (g *ChordsGame) MoveCursor(ds, df int) {
	n := len(g.inst.Strings)
	g.cursorString = ((g.cursorString+ds)%n + n) % n
	maxFret := g.inst.Frets
	fret := g.cursorFret + df
	if fret < 1 {
		fret = maxFret
	}
	if fret > maxFret {
		fret = 1
	}
	g.cursorFret = fret
}

// ToggleMark toggles the Marked state of a fret1+ position (medium marking phase).
func (g *ChordsGame) ToggleMark(si, fi int) {
	if fi < 1 || fi >= len(g.inst.Strings[0].Notes) {
		return
	}
	if si < 0 || si >= len(g.inst.Strings) {
		return
	}
	note := &g.inst.Strings[si].Notes[fi]
	if note.Solved {
		return
	}
	note.Marked = !note.Marked
}

// IsMarkingComplete returns true when all fret1+ positions of the current interval
// are marked and no other fret1+ positions are marked.
func (g *ChordsGame) IsMarkingComplete() bool {
	if g.currentIdx >= len(g.intervals) {
		return false
	}
	symbol := g.intervals[g.currentIdx].symbol
	for _, s := range g.inst.Strings {
		for fi := 1; fi < len(s.Notes); fi++ {
			n := s.Notes[fi]
			if n.Solved {
				continue
			}
			isTarget := n.Interval == symbol
			if isTarget != n.Marked {
				return false
			}
		}
	}
	return true
}

// ChordDisplayName returns the chord name the player must identify (e.g., "Gm", "C#").
func (g *ChordsGame) ChordDisplayName() string {
	root := strings.Split(g.rootNote, "/")[0]
	if g.isMajor {
		return root
	}
	return root + "m"
}

// CurrentIntervalPrompt returns the prompt string for the current interval, or "".
func (g *ChordsGame) CurrentIntervalPrompt() string {
	if g.phase != ChordPhaseIntervals || g.marking || g.currentIdx >= len(g.intervals) {
		return ""
	}
	return fmt.Sprintf("What is the %s?", g.intervals[g.currentIdx].humanName)
}

// MarkingHintInfo returns the number of correctly and incorrectly marked fret1+ positions
// for the current interval.
func (g *ChordsGame) MarkingHintInfo() (correct, wrong int) {
	if g.currentIdx >= len(g.intervals) {
		return
	}
	symbol := g.intervals[g.currentIdx].symbol
	for _, s := range g.inst.Strings {
		for fi := 1; fi < len(s.Notes); fi++ {
			n := s.Notes[fi]
			if !n.Marked {
				continue
			}
			if n.Interval == symbol {
				correct++
			} else {
				wrong++
			}
		}
	}
	return
}

// CurrentMarkingPrompt returns the marking instruction for the current interval (medium only).
func (g *ChordsGame) CurrentMarkingPrompt() string {
	if !g.marking || g.currentIdx >= len(g.intervals) {
		return ""
	}
	return fmt.Sprintf("Mark all %s positions on the fretboard.", g.intervals[g.currentIdx].humanName)
}

// ── internal helpers ──────────────────────────────────────────────────────────

func (g *ChordsGame) pickNewChord() {
	g.clearChord()

	shapes := allCAGEDShapes()
	rand.Shuffle(len(shapes), func(i, j int) { shapes[i], shapes[j] = shapes[j], shapes[i] })

	for _, shape := range shapes {
		if g.tryApplyShape(shape) {
			return
		}
	}
}

func (g *ChordsGame) tryApplyShape(shape cagedShape) bool {
	if len(g.inst.Strings) < 6 {
		return false
	}

	// Compute valid root fret range so every non-muted string fret is in [0, inst.Frets].
	minRoot, maxRoot := 0, g.inst.Frets
	for _, spec := range shape.notes {
		if spec.interval == "x" {
			continue
		}
		if -spec.fretOffset > minRoot {
			minRoot = -spec.fretOffset
		}
		upper := g.inst.Frets - spec.fretOffset
		if upper < maxRoot {
			maxRoot = upper
		}
	}
	if maxRoot < minRoot {
		return false
	}

	rootFret := minRoot
	if maxRoot > minRoot {
		rootFret = minRoot + rand.Intn(maxRoot-minRoot+1)
	}

	// Apply shape: set Interval on the appropriate Note, Muted on Notes[0] for "x" strings.
	for strIdx, spec := range shape.notes {
		if spec.interval == "x" {
			g.inst.Strings[strIdx].Notes[0].Muted = true
			continue
		}
		fret := rootFret + spec.fretOffset
		g.inst.Strings[strIdx].Notes[fret].Interval = spec.interval
	}

	// Record root note and build interval prompts.
	g.rootNote = g.inst.Strings[shape.rootString].Notes[rootFret].Name
	g.isMajor = shape.isMajor

	thirdSym, thirdHuman := "3", "major third (3)"
	if !shape.isMajor {
		thirdSym, thirdHuman = "b3", "minor third (b3)"
	}

	g.intervals = []chordInterval{
		{symbol: "1", humanName: "root (1)", noteName: g.findIntervalNote("1")},
		{symbol: thirdSym, humanName: thirdHuman, noteName: g.findIntervalNote(thirdSym)},
		{symbol: "5", humanName: "perfect fifth (5)", noteName: g.findIntervalNote("5")},
	}
	g.currentIdx = 0
	g.phase = ChordPhaseNaming
	return true
}

// findIntervalNote returns the canonical note name for the first position carrying that interval.
func (g *ChordsGame) findIntervalNote(interval string) string {
	for _, s := range g.inst.Strings {
		for _, n := range s.Notes {
			if n.Interval == interval {
				return n.Name
			}
		}
	}
	return ""
}

// solveInterval marks all fret positions carrying interval as Solved.
func (g *ChordsGame) solveInterval(interval string) {
	for si := range g.inst.Strings {
		for fi := range g.inst.Strings[si].Notes {
			if g.inst.Strings[si].Notes[fi].Interval == interval {
				g.inst.Strings[si].Notes[fi].Solved = true
			}
		}
	}
}

// clearChord resets all chord-related Note fields on the instrument.
func (g *ChordsGame) clearChord() {
	for si := range g.inst.Strings {
		for fi := range g.inst.Strings[si].Notes {
			g.inst.Strings[si].Notes[fi].Interval = ""
			g.inst.Strings[si].Notes[fi].Solved = false
			g.inst.Strings[si].Notes[fi].Muted = false
			g.inst.Strings[si].Notes[fi].Marked = false
		}
	}
	g.marking = false
}

// solveIntervalFret0 marks fret-0 (open string) positions for the given interval as Solved.
func (g *ChordsGame) solveIntervalFret0(symbol string) {
	for si := range g.inst.Strings {
		if g.inst.Strings[si].Notes[0].Interval == symbol {
			g.inst.Strings[si].Notes[0].Solved = true
		}
	}
}

// solveIntervalFret1Plus marks fret 1+ positions for the given interval as Solved.
func (g *ChordsGame) solveIntervalFret1Plus(symbol string) {
	for si := range g.inst.Strings {
		for fi := 1; fi < len(g.inst.Strings[si].Notes); fi++ {
			if g.inst.Strings[si].Notes[fi].Interval == symbol {
				g.inst.Strings[si].Notes[fi].Solved = true
				g.inst.Strings[si].Notes[fi].Marked = false
			}
		}
	}
}

// hasMarkablePositions returns true if any unsolved fret1+ position carries the given interval.
func (g *ChordsGame) hasMarkablePositions(symbol string) bool {
	for _, s := range g.inst.Strings {
		for fi := 1; fi < len(s.Notes); fi++ {
			if s.Notes[fi].Interval == symbol && !s.Notes[fi].Solved {
				return true
			}
		}
	}
	return false
}

// clearAllMarks removes all player marks from the instrument.
func (g *ChordsGame) clearAllMarks() {
	for si := range g.inst.Strings {
		for fi := range g.inst.Strings[si].Notes {
			g.inst.Strings[si].Notes[fi].Marked = false
		}
	}
}

// initCursorForMarking places the cursor on the high E string (index 0) at the
// lowest fret where any chord note appears.
func (g *ChordsGame) initCursorForMarking() {
	minFret := g.inst.Frets + 1
	for _, s := range g.inst.Strings {
		for fi := 1; fi < len(s.Notes); fi++ {
			if s.Notes[fi].Interval != "" && fi < minFret {
				minFret = fi
			}
		}
	}
	g.cursorString = 0
	if minFret <= g.inst.Frets {
		g.cursorFret = minFret
	} else {
		g.cursorFret = 1
	}
}

// parseChordInput parses a user-entered chord name like "Gm", "C#", "Bbmin".
// Returns the root note string (may have sharps/flats), whether it is minor, and ok.
func parseChordInput(input string) (root string, minor bool, ok bool) {
	if input == "" {
		return root, minor, ok
	}
	lower := strings.ToLower(input)

	// Check longest suffixes first.
	switch {
	case strings.HasSuffix(lower, "minor"):
		root, minor, ok = input[:len(input)-5], true, true
	case strings.HasSuffix(lower, "min"):
		root, minor, ok = input[:len(input)-3], true, true
	case strings.HasSuffix(lower, "major"):
		root, ok = input[:len(input)-5], true
	case strings.HasSuffix(lower, "maj"):
		root, ok = input[:len(input)-3], true
	default:
		// Single trailing "m" for minor — only if what's left is a valid note.
		if len(lower) > 1 && lower[len(lower)-1] == 'm' {
			candidate := input[:len(input)-1]
			if instrument.IsValidNote(candidate) {
				root, minor, ok = candidate, true, true
				return root, minor, ok
			}
		}
		// Trailing capital "M" for explicit major.
		if len(input) > 1 && input[len(input)-1] == 'M' {
			candidate := input[:len(input)-1]
			if instrument.IsValidNote(candidate) {
				root, ok = candidate, true
				return root, minor, ok
			}
		}
		// Plain note name (major).
		root = input
		ok = instrument.IsValidNote(root)
	}
	if ok && root != "" {
		ok = instrument.IsValidNote(root)
	}
	return root, minor, ok
}
