package instrument

import "testing"

func TestCalculateNoteName(t *testing.T) {
	tests := []struct {
		openNote string
		fret     int
		want     string
	}{
		// Open string = open note itself
		{"E", 0, "E"},
		{"A", 0, "A"},
		{"C", 0, "C"},
		// Standard chromatic sequence from E
		{"E", 1, "F"},
		{"E", 2, "F#/Gb"},
		{"E", 3, "G"},
		{"E", 4, "G#/Ab"},
		{"E", 5, "A"},
		{"E", 11, "D#/Eb"},
		// Octave wraps back to the same note
		{"E", 12, "E"},
		{"A", 12, "A"},
		// Semitone arithmetic
		{"B", 1, "C"}, // B→C crosses no sharp
		{"G", 2, "A"}, // G + 2 = A
		{"A", 2, "B"}, // A + 2 = B
		{"D", 2, "E"}, // D + 2 = E
		// Case-insensitive input
		{"e", 1, "F"},
		{"a", 2, "B"},
	}
	for _, tt := range tests {
		got, err := calculateNoteName(tt.openNote, tt.fret)
		if err != nil {
			t.Errorf("calculateNoteName(%q, %d): unexpected error: %v", tt.openNote, tt.fret, err)
			continue
		}
		if got != tt.want {
			t.Errorf("calculateNoteName(%q, %d) = %q, want %q", tt.openNote, tt.fret, got, tt.want)
		}
	}
}

func TestCalculateNoteNameInvalidInput(t *testing.T) {
	_, err := calculateNoteName("X", 0)
	if err == nil {
		t.Error("calculateNoteName(\"X\", 0): expected error for invalid note")
	}
	_, err = calculateNoteName("", 0)
	if err == nil {
		t.Error("calculateNoteName(\"\", 0): expected error for empty note")
	}
}

func TestNoteToSemitone(t *testing.T) {
	tests := []struct {
		name string
		want int
	}{
		{"C", 0},
		{"C#/Db", 1},
		{"D", 2},
		{"D#/Eb", 3},
		{"E", 4},
		{"F", 5},
		{"F#/Gb", 6},
		{"G", 7},
		{"G#/Ab", 8},
		{"A", 9},
		{"A#/Bb", 10},
		{"B", 11},
		// Aliases
		{"C#", 1},
		{"Db", 1},
		{"F#", 6},
		{"Bb", 10},
	}
	for _, tt := range tests {
		got := NoteToSemitone(tt.name)
		if got != tt.want {
			t.Errorf("NoteToSemitone(%q) = %d, want %d", tt.name, got, tt.want)
		}
	}
}

func TestNoteToSemitoneChromatic(t *testing.T) {
	// Verify all 12 notes produce distinct semitone values 0-11.
	notes := NoteNames()
	seen := make(map[int]string, 12)
	for _, n := range notes {
		s := NoteToSemitone(n)
		if prev, dup := seen[s]; dup {
			t.Errorf("semitone %d assigned to both %q and %q", s, prev, n)
		}
		seen[s] = n
	}
	if len(seen) != 12 {
		t.Errorf("expected 12 unique semitones, got %d", len(seen))
	}
}

func TestIsValidNote(t *testing.T) {
	valid := []string{
		"C", "c", "C#", "c#", "Db", "db",
		"D", "D#", "Eb", "E", "F", "F#", "Gb",
		"G", "G#", "Ab", "A", "A#", "Bb", "B",
	}
	for _, n := range valid {
		if !IsValidNote(n) {
			t.Errorf("IsValidNote(%q) = false, want true", n)
		}
	}

	invalid := []string{"", "H", "X", "C##", "EE", "  ", "CB"}
	for _, n := range invalid {
		if IsValidNote(n) {
			t.Errorf("IsValidNote(%q) = true, want false", n)
		}
	}
}

func TestNoteMatches(t *testing.T) {
	tests := []struct {
		noteName string
		answer   string
		want     bool
	}{
		// Exact match, various cases
		{"C", "C", true},
		{"C", "c", true},
		{"E", "E", true},
		// Enharmonic equivalents
		{"C#/Db", "C#", true},
		{"C#/Db", "c#", true},
		{"C#/Db", "Db", true},
		{"C#/Db", "db", true},
		// Non-matching enharmonics
		{"C#/Db", "D", false},
		{"C#/Db", "C", false},
		// Empty answer
		{"G", "", false},
		// Single-char note mismatch
		{"G", "G#", false},
		{"A", "B", false},
	}
	for _, tt := range tests {
		got := NoteMatches(tt.noteName, tt.answer)
		if got != tt.want {
			t.Errorf("NoteMatches(%q, %q) = %v, want %v", tt.noteName, tt.answer, got, tt.want)
		}
	}
}
