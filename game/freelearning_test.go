package game

import (
	"strings"
	"testing"
)

// ── MoveCursor ────────────────────────────────────────────────────────────────

func TestFreeLearningMoveCursorStringWrapping(t *testing.T) {
	g := NewFreeLearningGame(newTestGuitar())
	n := len(g.inst.Strings)

	// From string 0, moving up wraps to last string.
	g.cursorString = 0
	g.MoveCursor(-1, 0)
	if g.cursorString != n-1 {
		t.Errorf("MoveCursor(-1,0) from string 0: got %d, want %d", g.cursorString, n-1)
	}

	// From last string, moving down wraps to string 0.
	g.cursorString = n - 1
	g.MoveCursor(1, 0)
	if g.cursorString != 0 {
		t.Errorf("MoveCursor(+1,0) from last string: got %d, want 0", g.cursorString)
	}
}

func TestFreeLearningMoveCursorFretWrapping(t *testing.T) {
	g := NewFreeLearningGame(newTestGuitar())

	// From fret 1, moving left wraps to maxFret.
	g.cursorFret = 1
	g.MoveCursor(0, -1)
	if g.cursorFret != g.inst.Frets {
		t.Errorf("MoveCursor(0,-1) from fret 1: got %d, want %d", g.cursorFret, g.inst.Frets)
	}

	// From maxFret, moving right wraps to fret 1.
	g.cursorFret = g.inst.Frets
	g.MoveCursor(0, 1)
	if g.cursorFret != 1 {
		t.Errorf("MoveCursor(0,+1) from maxFret: got %d, want 1", g.cursorFret)
	}
}

func TestFreeLearningCursorStartPosition(t *testing.T) {
	inst := newTestGuitar()
	g := NewFreeLearningGame(inst)
	s, f := g.GetCursor()
	// Cursor starts on the last string (low E, highest index) at fret 1.
	if s != len(inst.Strings)-1 {
		t.Errorf("initial cursor string: got %d, want %d (low E)", s, len(inst.Strings)-1)
	}
	if f != 1 {
		t.Errorf("initial cursor fret: got %d, want 1", f)
	}
}

// ── RevealNote toggle ─────────────────────────────────────────────────────────

func TestRevealNoteToggle(t *testing.T) {
	g := NewFreeLearningGame(newTestGuitar())
	s, f := g.GetCursor()

	if g.inst.Strings[s].Notes[f].ShowName {
		t.Fatal("ShowName should be false before reveal")
	}

	g.RevealNote()
	if !g.inst.Strings[s].Notes[f].ShowName {
		t.Error("ShowName should be true after first RevealNote")
	}
	if g.GetMessage() == "" {
		t.Error("message should be set after reveal")
	}

	// Second call hides it again.
	g.RevealNote()
	if g.inst.Strings[s].Notes[f].ShowName {
		t.Error("ShowName should be false after second RevealNote (toggle)")
	}
	if g.GetMessage() != "" {
		t.Error("message should be cleared after hiding")
	}
}

// ── RevealString toggle ───────────────────────────────────────────────────────

func TestRevealStringToggle(t *testing.T) {
	g := NewFreeLearningGame(newTestGuitar())
	si, _ := g.GetCursor()

	// First call: all hidden → show all.
	g.RevealString()
	for fi := 1; fi < len(g.inst.Strings[si].Notes); fi++ {
		if !g.inst.Strings[si].Notes[fi].ShowName {
			t.Errorf("fret %d on string %d should be shown after RevealString", fi, si)
		}
	}

	// Second call: all shown → hide all.
	g.RevealString()
	for fi := 1; fi < len(g.inst.Strings[si].Notes); fi++ {
		if g.inst.Strings[si].Notes[fi].ShowName {
			t.Errorf("fret %d on string %d should be hidden after second RevealString", fi, si)
		}
	}
}

func TestRevealStringPartiallyHiddenShowsAll(t *testing.T) {
	g := NewFreeLearningGame(newTestGuitar())
	si, _ := g.GetCursor()

	// Show only the first note manually.
	g.inst.Strings[si].Notes[1].ShowName = true

	// RevealString should show all (because some are still hidden).
	g.RevealString()
	for fi := 1; fi < len(g.inst.Strings[si].Notes); fi++ {
		if !g.inst.Strings[si].Notes[fi].ShowName {
			t.Errorf("fret %d should be shown when RevealString called with partial reveal", fi)
		}
	}
}

// ── RevealFret toggle ─────────────────────────────────────────────────────────

func TestRevealFretToggle(t *testing.T) {
	g := NewFreeLearningGame(newTestGuitar())
	_, cf := g.GetCursor()

	// First call: all hidden → show all strings at this fret.
	g.RevealFret()
	for si := range g.inst.Strings {
		if !g.inst.Strings[si].Notes[cf].ShowName {
			t.Errorf("string %d fret %d should be shown after RevealFret", si, cf)
		}
	}

	// Second call: all shown → hide all.
	g.RevealFret()
	for si := range g.inst.Strings {
		if g.inst.Strings[si].Notes[cf].ShowName {
			t.Errorf("string %d fret %d should be hidden after second RevealFret", si, cf)
		}
	}
}

// ── RevealScale ───────────────────────────────────────────────────────────────

func TestRevealScaleMajorRootIsAlwaysRevealed(t *testing.T) {
	g := NewFreeLearningGame(newTestGuitar())
	cs, cf := g.GetCursor()

	g.RevealScale(false) // major

	// The note at the cursor is the root — it must be in the major scale (interval 0).
	if !g.inst.Strings[cs].Notes[cf].ShowName {
		t.Error("root note at cursor should be revealed by RevealScale(major)")
	}
}

func TestRevealScaleMinorRootIsAlwaysRevealed(t *testing.T) {
	g := NewFreeLearningGame(newTestGuitar())
	cs, cf := g.GetCursor()

	g.RevealScale(true) // minor

	if !g.inst.Strings[cs].Notes[cf].ShowName {
		t.Error("root note at cursor should be revealed by RevealScale(minor)")
	}
}

func TestRevealScaleToggle(t *testing.T) {
	g := NewFreeLearningGame(newTestGuitar())

	g.RevealScale(false) // major — show
	msg1 := g.GetMessage()
	if msg1 == "" {
		t.Error("message should be set after revealing scale")
	}
	if !strings.Contains(msg1, "major") {
		t.Errorf("message %q should mention 'major'", msg1)
	}

	g.RevealScale(false) // major — hide (toggle)
	msg2 := g.GetMessage()
	if !strings.Contains(msg2, "hidden") {
		t.Errorf("message %q should mention 'hidden' after toggle-off", msg2)
	}
}

func TestRevealScaleMinorMessage(t *testing.T) {
	g := NewFreeLearningGame(newTestGuitar())
	g.RevealScale(true)
	msg := g.GetMessage()
	if !strings.Contains(msg, "minor") {
		t.Errorf("minor scale message %q should mention 'minor'", msg)
	}
}

// ── ClearAll ──────────────────────────────────────────────────────────────────

func TestClearAll(t *testing.T) {
	g := NewFreeLearningGame(newTestGuitar())

	// Reveal some notes.
	g.RevealString()
	g.RevealFret()

	g.ClearAll()

	if g.GetMessage() != "" {
		t.Error("message should be empty after ClearAll")
	}
	for si := range g.inst.Strings {
		for fi := range g.inst.Strings[si].Notes {
			if g.inst.Strings[si].Notes[fi].ShowName {
				t.Errorf("string %d fret %d still shown after ClearAll", si, fi)
			}
		}
	}
}
