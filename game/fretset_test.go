package game

import (
	"testing"
)

// ── MoveCursor ────────────────────────────────────────────────────────────────

func TestFretSetMoveCursorStringWrapping(t *testing.T) {
	g := NewFretSetGame(newTestGuitar(), true)
	numStrings := len(g.inst.Strings)

	// Move up past string 0 → wraps to last string.
	g.cursorString = 0
	g.MoveCursor(-1, 0)
	if g.cursorString != numStrings-1 {
		t.Errorf("MoveCursor(-1,0) from string 0: got %d, want %d", g.cursorString, numStrings-1)
	}

	// Move down past last string → wraps to string 0.
	g.cursorString = numStrings - 1
	g.MoveCursor(1, 0)
	if g.cursorString != 0 {
		t.Errorf("MoveCursor(+1,0) from last string: got %d, want 0", g.cursorString)
	}
}

func TestFretSetMoveCursorFretWrapping(t *testing.T) {
	g := NewFretSetGame(newTestGuitar(), true)
	// Sequential mode: fretStart=1, fretEnd=3, window width=3.

	// At fretStart, move left → wraps to fretEnd.
	g.cursorFret = g.fretStart
	g.MoveCursor(0, -1)
	if g.cursorFret != g.fretEnd {
		t.Errorf("MoveCursor(0,-1) from fretStart: got %d, want %d (fretEnd)", g.cursorFret, g.fretEnd)
	}

	// At fretEnd, move right → wraps to fretStart.
	g.cursorFret = g.fretEnd
	g.MoveCursor(0, 1)
	if g.cursorFret != g.fretStart {
		t.Errorf("MoveCursor(0,+1) from fretEnd: got %d, want %d (fretStart)", g.cursorFret, g.fretStart)
	}
}

// ── IsComplete ────────────────────────────────────────────────────────────────

func TestFretSetIsCompleteNotMarked(t *testing.T) {
	g := NewFretSetGame(newTestGuitar(), true)
	if g.IsComplete() {
		t.Error("IsComplete() should be false before any marks")
	}
}

func TestFretSetIsCompleteCorrectMarks(t *testing.T) {
	g := NewFretSetGame(newTestGuitar(), true)

	// Mark all positions of the target note within the fret set.
	for si := range g.inst.Strings {
		for f := g.fretStart; f <= g.fretEnd; f++ {
			if g.inst.Strings[si].Notes[f].Name == g.targetNote {
				g.ToggleMark(si, f)
			}
		}
	}
	if !g.IsComplete() {
		t.Error("IsComplete() should be true when all target positions are correctly marked")
	}
}

func TestFretSetIsCompleteWrongMark(t *testing.T) {
	g := NewFretSetGame(newTestGuitar(), true)

	// Mark all correct positions.
	for si := range g.inst.Strings {
		for f := g.fretStart; f <= g.fretEnd; f++ {
			if g.inst.Strings[si].Notes[f].Name == g.targetNote {
				g.ToggleMark(si, f)
			}
		}
	}

	// Additionally mark one wrong position.
	marked := false
	for si := range g.inst.Strings {
		if marked {
			break
		}
		for f := g.fretStart; f <= g.fretEnd; f++ {
			if g.inst.Strings[si].Notes[f].Name != g.targetNote && !g.inst.Strings[si].Notes[f].Solved {
				g.ToggleMark(si, f)
				marked = true
				break
			}
		}
	}
	if !marked {
		t.Skip("no non-target position available in fret set to test wrong mark")
	}

	if g.IsComplete() {
		t.Error("IsComplete() should be false when a wrong position is marked")
	}
}

// ── HintInfo ──────────────────────────────────────────────────────────────────

func TestFretSetHintInfoEmpty(t *testing.T) {
	g := NewFretSetGame(newTestGuitar(), true)
	c, w := g.HintInfo()
	if c != 0 || w != 0 {
		t.Errorf("HintInfo() before any marks = (%d, %d), want (0, 0)", c, w)
	}
}

func TestFretSetHintInfoCounting(t *testing.T) {
	g := NewFretSetGame(newTestGuitar(), true)

	var correctSI, correctF, wrongSI, wrongF int
	foundCorrect, foundWrong := false, false
	for si := range g.inst.Strings {
		for f := g.fretStart; f <= g.fretEnd; f++ {
			n := g.inst.Strings[si].Notes[f]
			if n.Name == g.targetNote && !foundCorrect {
				correctSI, correctF = si, f
				foundCorrect = true
			} else if n.Name != g.targetNote && !foundWrong {
				wrongSI, wrongF = si, f
				foundWrong = true
			}
		}
	}
	if !foundCorrect || !foundWrong {
		t.Skip("fret set has no mixed notes to test hint counting")
	}

	g.ToggleMark(correctSI, correctF)
	g.ToggleMark(wrongSI, wrongF)

	c, w := g.HintInfo()
	if c != 1 || w != 1 {
		t.Errorf("HintInfo() = (%d, %d), want (1, 1)", c, w)
	}
}

// ── ToggleMark bounds ─────────────────────────────────────────────────────────

func TestToggleMarkOutOfBounds(t *testing.T) {
	g := NewFretSetGame(newTestGuitar(), true)

	// Fret outside fret set — should be a no-op (no panic).
	g.ToggleMark(0, 0)                             // fret 0 (open string, below fretStart=1)
	g.ToggleMark(0, g.inst.Frets+1)                // fret beyond fretboard
	g.ToggleMark(-1, g.fretStart)                  // negative string index
	g.ToggleMark(len(g.inst.Strings), g.fretStart) // string index out of range
}

// ── Progress ──────────────────────────────────────────────────────────────────

func TestFretSetProgress(t *testing.T) {
	g := NewFretSetGame(newTestGuitar(), true)
	setC, setT, boardC, boardT := g.Progress()

	if setT == 0 {
		t.Error("setTotal should be > 0")
	}
	if boardT == 0 {
		t.Error("boardTotal should be > 0")
	}
	if setC != 0 || boardC != 0 {
		t.Errorf("progress at start: got (%d/%d, %d/%d), want all zeros", setC, setT, boardC, boardT)
	}
	if setT > boardT {
		t.Errorf("setTotal (%d) should not exceed boardTotal (%d)", setT, boardT)
	}
}
