package instrument

import (
	"strings"
	"testing"
)

// ── constructor validation ────────────────────────────────────────────────────

func TestNewGuitarStringCount(t *testing.T) {
	for _, n := range []int{6, 7, 8} {
		g, err := NewGuitar(DefaultGuitarTuning(n), 12)
		if err != nil {
			t.Errorf("NewGuitar(%d strings): unexpected error: %v", n, err)
			continue
		}
		if len(g.Strings) != n {
			t.Errorf("NewGuitar(%d strings): got %d strings", n, len(g.Strings))
		}
	}
	for _, bad := range []int{1, 4, 5, 9} {
		tuning := make([]string, bad)
		for i := range tuning {
			tuning[i] = "E"
		}
		if _, err := NewGuitar(tuning, 12); err == nil {
			t.Errorf("NewGuitar(%d strings): expected error", bad)
		}
	}
}

func TestNewBassStringCount(t *testing.T) {
	for _, n := range []int{4, 5, 6} {
		_, err := NewBass(DefaultBassTuning(n), 12)
		if err != nil {
			t.Errorf("NewBass(%d strings): unexpected error: %v", n, err)
		}
	}
	for _, bad := range []int{1, 3, 7} {
		tuning := make([]string, bad)
		for i := range tuning {
			tuning[i] = "E"
		}
		if _, err := NewBass(tuning, 12); err == nil {
			t.Errorf("NewBass(%d strings): expected error", bad)
		}
	}
}

func TestNewUkuleleStringCount(t *testing.T) {
	_, err := NewUkulele(DefaultUkuleleTuning(), 12)
	if err != nil {
		t.Fatalf("NewUkulele: unexpected error: %v", err)
	}
	for _, bad := range []int{3, 5} {
		tuning := make([]string, bad)
		for i := range tuning {
			tuning[i] = "G"
		}
		if _, err := NewUkulele(tuning, 12); err == nil {
			t.Errorf("NewUkulele(%d strings): expected error", bad)
		}
	}
}

func TestFretCountValidation(t *testing.T) {
	tuning := DefaultGuitarTuning(6)
	for _, frets := range []int{12, 18, 24} {
		if _, err := NewGuitar(tuning, frets); err != nil {
			t.Errorf("NewGuitar with %d frets: unexpected error: %v", frets, err)
		}
	}
	for _, bad := range []int{0, 11, 25, 100} {
		if _, err := NewGuitar(tuning, bad); err == nil {
			t.Errorf("NewGuitar with %d frets: expected error", bad)
		}
	}
}

// ── note layout ───────────────────────────────────────────────────────────────

// Standard guitar tuning (low→high): E A D G B E
// After reversal in initStrings:
//   Strings[0] = high E, Strings[5] = low E

func TestStandardGuitarNoteLayout(t *testing.T) {
	g, err := NewGuitar(DefaultGuitarTuning(6), 12)
	if err != nil {
		t.Fatal(err)
	}
	tests := []struct {
		desc   string
		si, fi int
		want   string
	}{
		{"high E open", 0, 0, "E"},
		{"high E fret 1", 0, 1, "F"},
		{"high E fret 2", 0, 2, "F#/Gb"},
		{"high E fret 12 (octave)", 0, 12, "E"},
		{"B string open", 1, 0, "B"},
		{"B string fret 1", 1, 1, "C"},
		{"G string open", 2, 0, "G"},
		{"D string open", 3, 0, "D"},
		{"A string open", 4, 0, "A"},
		{"A string fret 2", 4, 2, "B"},
		{"low E open", 5, 0, "E"},
		{"low E fret 5", 5, 5, "A"},
	}
	for _, tt := range tests {
		got := g.Strings[tt.si].Notes[tt.fi].Name
		if got != tt.want {
			t.Errorf("%s: got %q, want %q", tt.desc, got, tt.want)
		}
	}
}

func TestNotesSliceLength(t *testing.T) {
	frets := 15
	g, err := NewGuitar(DefaultGuitarTuning(6), frets)
	if err != nil {
		t.Fatal(err)
	}
	for si, s := range g.Strings {
		// Notes[0] = open string, Notes[1..frets] = fretted positions
		if len(s.Notes) != frets+1 {
			t.Errorf("string %d: got %d notes, want %d", si, len(s.Notes), frets+1)
		}
	}
}

// ── default tunings ───────────────────────────────────────────────────────────

func TestDefaultGuitarTuning(t *testing.T) {
	if t6 := DefaultGuitarTuning(6); len(t6) != 6 {
		t.Errorf("6-string length: got %d", len(t6))
	}
	t7 := DefaultGuitarTuning(7)
	if len(t7) != 7 {
		t.Errorf("7-string length: got %d", len(t7))
	}
	if t7[0] != "B" {
		t.Errorf("7-string lowest string: got %q, want B", t7[0])
	}
	t8 := DefaultGuitarTuning(8)
	if len(t8) != 8 {
		t.Errorf("8-string length: got %d", len(t8))
	}
	if t8[0] != "F#" {
		t.Errorf("8-string lowest string: got %q, want F#", t8[0])
	}
}

func TestDefaultBassTuning(t *testing.T) {
	if t4 := DefaultBassTuning(4); len(t4) != 4 {
		t.Errorf("4-string bass length: got %d", len(t4))
	}
	if t5 := DefaultBassTuning(5); len(t5) != 5 {
		t.Errorf("5-string bass length: got %d", len(t5))
	}
}

func TestDefaultUkuleleTuning(t *testing.T) {
	u := DefaultUkuleleTuning()
	if len(u) != 4 {
		t.Errorf("ukulele tuning length: got %d, want 4", len(u))
	}
}

// ── NoteNames ─────────────────────────────────────────────────────────────────

func TestNoteNamesCount(t *testing.T) {
	names := NoteNames()
	if len(names) != 12 {
		t.Errorf("NoteNames length = %d, want 12", len(names))
	}
	if names[0] != "C" {
		t.Errorf("first note = %q, want C", names[0])
	}
}

func TestNoteNamesReturnsCopy(t *testing.T) {
	names := NoteNames()
	names[0] = "X"
	if NoteNames()[0] != "C" {
		t.Error("NoteNames() returned a reference to the internal slice")
	}
}

// ── RebuildInstrument ─────────────────────────────────────────────────────────

func TestRebuildInstrument(t *testing.T) {
	g, _ := NewGuitar(DefaultGuitarTuning(6), 12)
	g2, err := RebuildInstrument(g)
	if err != nil {
		t.Fatalf("RebuildInstrument: %v", err)
	}
	if g2.Type != g.Type || g2.Frets != g.Frets {
		t.Errorf("rebuilt instrument type/frets differ")
	}
	if strings.Join(g2.Tuning, ",") != strings.Join(g.Tuning, ",") {
		t.Errorf("rebuilt instrument tuning differs")
	}
}

func TestRebuildInstrumentUnknownType(t *testing.T) {
	_, err := RebuildInstrument(&Instrument{Type: "banjo", Tuning: []string{"G"}, Frets: 12})
	if err == nil {
		t.Error("RebuildInstrument(banjo): expected error for unknown type")
	}
}
