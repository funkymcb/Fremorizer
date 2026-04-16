package game

import (
	"testing"
)

func TestSingleNoteGameCheckAnswer(t *testing.T) {
	g := NewSingleNoteGame(newTestGuitar())
	name := g.CurrentNoteName()

	// Correct answer (first part of canonical name).
	parts := splitSlash(name)
	if !g.CheckAnswer(parts[0]) {
		t.Errorf("CheckAnswer(%q) = false for current note %q", parts[0], name)
	}

	// Enharmonic equivalent also accepted.
	if len(parts) > 1 && !g.CheckAnswer(parts[1]) {
		t.Errorf("CheckAnswer(%q) = false for enharmonic of %q", parts[1], name)
	}

	// Wrong note rejected.
	wrong := "XXXXXXXX"
	if g.CheckAnswer(wrong) {
		t.Errorf("CheckAnswer(%q) should return false", wrong)
	}
}

func TestSingleNoteGameIsGameOverAtStart(t *testing.T) {
	g := NewSingleNoteGame(newTestGuitar())
	if g.IsGameOver() {
		t.Error("game should not be over at start")
	}
}

func TestSingleNoteGameProgress(t *testing.T) {
	g := NewSingleNoteGame(newTestGuitar())
	correct, total := g.Progress()
	if correct != 0 {
		t.Errorf("Progress().correct = %d at start, want 0", correct)
	}
	if total == 0 {
		t.Error("Progress().total should be > 0")
	}
}

func TestSingleNoteGameRevealAndNext(t *testing.T) {
	g := NewSingleNoteGame(newTestGuitar())
	si, fi := g.cur.s, g.cur.n

	g.RevealNote(true)
	n := g.inst.Strings[si].Notes[fi]
	if !n.Revealed || !n.Correct {
		t.Error("RevealNote(true) should set Revealed=true and Correct=true")
	}

	_ = g.Next()
	// After Next, ToBeDetermined on the old note is cleared.
	if g.inst.Strings[si].Notes[fi].ToBeDetermined {
		t.Error("ToBeDetermined should be cleared after Next()")
	}
}

func TestSingleNoteGameRevealIncorrect(t *testing.T) {
	g := NewSingleNoteGame(newTestGuitar())
	si, fi := g.cur.s, g.cur.n

	g.RevealNote(false)
	n := g.inst.Strings[si].Notes[fi]
	if !n.WasMissed {
		t.Error("RevealNote(false) should set WasMissed=true")
	}
	if len(g.retryQueue) != 1 {
		t.Errorf("retryQueue length = %d, want 1 after a miss", len(g.retryQueue))
	}
}

// splitSlash splits a canonical note name like "C#/Db" into ["C#", "Db"].
func splitSlash(name string) []string {
	for i, c := range name {
		if c == '/' {
			return []string{name[:i], name[i+1:]}
		}
	}
	return []string{name}
}
