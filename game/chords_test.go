package game

import (
	"strings"
	"testing"

	"github.com/funkymcb/fremorizer/instrument"
)

func newTestGuitar() *instrument.Instrument {
	inst, _ := instrument.NewGuitar(instrument.DefaultGuitarTuning(6), 12)
	return inst
}

// ── parseChordInput ───────────────────────────────────────────────────────────

func TestParseChordInput(t *testing.T) {
	tests := []struct {
		input     string
		wantRoot  string
		wantMinor bool
		wantOK    bool
	}{
		// Plain major note names
		{"G", "G", false, true},
		{"C", "C", false, true},
		{"E", "E", false, true},
		// Accidentals
		{"C#", "C#", false, true},
		{"Bb", "Bb", false, true},
		{"F#", "F#", false, true},
		{"Ab", "Ab", false, true},
		// Explicit major suffixes
		{"GMaj", "G", false, true},
		{"Gmajor", "G", false, true},
		{"Cmaj", "C", false, true},
		// Minor suffixes
		{"Gm", "G", true, true},
		{"gm", "g", true, true},
		{"C#m", "C#", true, true},
		{"Bbm", "Bb", true, true},
		{"Bmin", "B", true, true},
		{"Bbmin", "Bb", true, true},
		{"Eminor", "E", true, true},
		// Explicit capital-M major
		{"GM", "G", false, true},
		{"C#M", "C#", false, true},
		// Invalid inputs
		{"", "", false, false},
		{"Xm", "", false, false},  // X is not a valid note
		{"123", "", false, false}, // completely invalid
		{"Hm", "", false, false},  // H is not a note
	}
	for _, tt := range tests {
		root, minor, ok := parseChordInput(tt.input)
		if ok != tt.wantOK {
			t.Errorf("parseChordInput(%q): ok = %v, want %v", tt.input, ok, tt.wantOK)
			continue
		}
		if !ok {
			continue
		}
		if minor != tt.wantMinor {
			t.Errorf("parseChordInput(%q): minor = %v, want %v", tt.input, minor, tt.wantMinor)
		}
		if root != tt.wantRoot {
			t.Errorf("parseChordInput(%q): root = %q, want %q", tt.input, root, tt.wantRoot)
		}
	}
}

// ── ChordsGame construction ───────────────────────────────────────────────────

func TestNewChordsGameDefaults(t *testing.T) {
	inst := newTestGuitar()
	g := NewChordsGame(inst, 0, "") // 0 chordsRequired → default 20, "" difficulty → "easy"
	if g.chordsRequired != 20 {
		t.Errorf("chordsRequired = %d, want 20", g.chordsRequired)
	}
	if g.difficulty != "easy" {
		t.Errorf("difficulty = %q, want easy", g.difficulty)
	}
}

func TestChordsGameProgress(t *testing.T) {
	g := NewChordsGame(newTestGuitar(), 5, "easy")
	done, total := g.Progress()
	if done != 0 || total != 5 {
		t.Errorf("Progress() = (%d, %d), want (0, 5)", done, total)
	}
}

func TestChordsGameIsGameOverAtStart(t *testing.T) {
	g := NewChordsGame(newTestGuitar(), 3, "easy")
	if g.IsGameOver() {
		t.Error("game should not be over at start")
	}
}

// ── ChordDisplayName ──────────────────────────────────────────────────────────

func TestChordDisplayNameMajorNoTrailingM(t *testing.T) {
	g := NewChordsGame(newTestGuitar(), 1, "easy")
	for range 20 { // run several random chords to increase coverage
		name := g.ChordDisplayName()
		if name == "" {
			t.Fatal("ChordDisplayName() returned empty string")
		}
		if g.isMajor && strings.HasSuffix(name, "m") {
			t.Errorf("major chord %q should not end with 'm'", name)
		}
		if !g.isMajor && !strings.HasSuffix(name, "m") {
			t.Errorf("minor chord %q should end with 'm'", name)
		}
		// Force a new chord for variety by completing the game phase
		g.pickNewChord()
	}
}

// ── easy mode phase flow ──────────────────────────────────────────────────────

func TestEasyModeFullPhaseFlow(t *testing.T) {
	g := NewChordsGame(newTestGuitar(), 1, "easy")

	if g.Phase() != ChordPhaseNaming {
		t.Fatalf("expected ChordPhaseNaming at start, got %d", g.Phase())
	}

	// Wrong answer stays in naming phase.
	if g.CheckAnswer("XXXXXXXX") {
		t.Error("garbage answer should not be accepted in naming phase")
	}
	if g.Phase() != ChordPhaseNaming {
		t.Error("phase should not advance after wrong answer")
	}

	// Correct chord name → advance to intervals.
	root := strings.Split(g.rootNote, "/")[0]
	suffix := ""
	if !g.isMajor {
		suffix = "m"
	}
	if !g.CheckAnswer(root + suffix) {
		t.Fatalf("correct chord name %q not accepted", root+suffix)
	}
	_ = g.Next()

	if g.Phase() != ChordPhaseIntervals {
		t.Fatalf("expected ChordPhaseIntervals after naming, got %d", g.Phase())
	}

	// Answer all interval prompts in easy mode.
	for g.Phase() == ChordPhaseIntervals {
		if g.currentIdx >= len(g.intervals) {
			t.Fatal("currentIdx out of range")
		}
		noteName := strings.Split(g.intervals[g.currentIdx].noteName, "/")[0]
		if !g.CheckAnswer(noteName) {
			t.Fatalf("correct interval answer %q not accepted", noteName)
		}
		_ = g.Next()
	}

	if g.Phase() != ChordPhaseComplete {
		t.Fatalf("expected ChordPhaseComplete, got %d", g.Phase())
	}

	_ = g.Next()
	if !g.IsGameOver() {
		t.Error("expected game over after 1 chord with chordsRequired=1")
	}
}

// ── IsMarkingComplete ─────────────────────────────────────────────────────────

func TestIsMarkingComplete(t *testing.T) {
	inst := newTestGuitar()
	g := &ChordsGame{inst: inst, chordsRequired: 1, difficulty: "medium"}

	// Set up a minimal chord: two notes, only "1" is the current target.
	inst.Strings[0].Notes[5].Interval = "1"
	inst.Strings[1].Notes[5].Interval = "5"
	g.intervals = []chordInterval{{symbol: "1", humanName: "root", noteName: "A"}}
	g.currentIdx = 0
	g.marking = true

	// Nothing marked → incomplete.
	if g.IsMarkingComplete() {
		t.Error("should not be complete when nothing is marked")
	}

	// Only wrong note marked → incomplete.
	inst.Strings[1].Notes[5].Marked = true
	if g.IsMarkingComplete() {
		t.Error("should not be complete with only a wrong mark")
	}

	// Both correct and wrong marked → incomplete.
	inst.Strings[0].Notes[5].Marked = true
	if g.IsMarkingComplete() {
		t.Error("should not be complete when a wrong mark is also present")
	}

	// Remove wrong mark → only correct marked → complete.
	inst.Strings[1].Notes[5].Marked = false
	if !g.IsMarkingComplete() {
		t.Error("should be complete when only the correct note is marked")
	}
}

// ── MarkingHintInfo ───────────────────────────────────────────────────────────

func TestMarkingHintInfo(t *testing.T) {
	inst := newTestGuitar()
	g := &ChordsGame{inst: inst, chordsRequired: 1, difficulty: "medium"}

	inst.Strings[0].Notes[3].Interval = "1"
	inst.Strings[1].Notes[3].Interval = "5"
	g.intervals = []chordInterval{{symbol: "1", humanName: "root", noteName: "G"}}
	g.currentIdx = 0
	g.marking = true

	c, w := g.MarkingHintInfo()
	if c != 0 || w != 0 {
		t.Errorf("initial hint: got (%d, %d), want (0, 0)", c, w)
	}

	inst.Strings[0].Notes[3].Marked = true // correct
	inst.Strings[1].Notes[3].Marked = true // wrong
	c, w = g.MarkingHintInfo()
	if c != 1 || w != 1 {
		t.Errorf("hint after marks: got (%d, %d), want (1, 1)", c, w)
	}
}
