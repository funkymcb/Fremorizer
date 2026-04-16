package instrument

import (
	"fmt"
	"strings"
)

type Note struct {
	Name           string
	ToBeDetermined bool
	Marked         bool   // mode 2: player marked this position
	Solved         bool   // mode 2/3: correctly found, shown in green
	Revealed       bool   // mode 1: show after answer
	Correct        bool   // mode 1: was the answer correct
	WasMissed      bool   // mode 1: note was previously guessed wrong, show red (?)
	Interval       string // mode 3: chord interval label ("1","3","5","b3"), empty if not in chord
	Muted          bool   // mode 3: this string is muted/not played (only meaningful on Notes[0])
	ShowName       bool   // mode 4: free learning — display note name in green
}

var noteOrder = []string{
	"C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B",
}

var noteIndexMap = map[string]int{
	"C": 0, "C#/Db": 1, "D": 2, "D#/Eb": 3, "E": 4, "F": 5,
	"F#/Gb": 6, "G": 7, "G#/Ab": 8, "A": 9, "A#/Bb": 10, "B": 11,
	// aliases for input
	"C#": 1, "Db": 1, "D#": 3, "Eb": 3, "F#": 6, "Gb": 6,
	"G#": 8, "Ab": 8, "A#": 10, "Bb": 10,
}

func calculateNoteName(openNote string, fret int) (string, error) {
	openNote = strings.ToUpper(openNote)
	// normalize input like "C#" to canonical name
	idx, ok := noteIndexMap[openNote]
	if !ok {
		return "", fmt.Errorf("invalid note name: %s", openNote)
	}
	return noteOrder[(idx+fret)%12], nil
}

// NoteToSemitone returns the pitch class (0–11) for a canonical note name.
func NoteToSemitone(name string) int {
	if idx, ok := noteIndexMap[name]; ok {
		return idx
	}
	// Handle dual names like "C#/Db" — use the first part.
	parts := strings.Split(name, "/")
	if idx, ok := noteIndexMap[parts[0]]; ok {
		return idx
	}
	return 0
}

// IsValidNote returns true if the input is a recognised note name.
// Accepts natural notes ("C", "c"), sharps ("C#", "c#"), and flat aliases
// ("Db", "db", "Bb", "bb") — matching is case-insensitive.
func IsValidNote(input string) bool {
	input = strings.TrimSpace(input)
	if input == "" {
		return false
	}
	// Single/multi-char uppercase (handles "C" → "C", "C#" → "C#").
	if _, ok := noteIndexMap[strings.ToUpper(input)]; ok {
		return true
	}
	// Title-case (handles flat aliases stored as "Db", "Bb" in the map:
	// "db" and "DB" both normalise to "Db").
	if len(input) == 2 {
		title := strings.ToUpper(input[:1]) + strings.ToLower(input[1:])
		_, ok := noteIndexMap[title]
		return ok
	}
	return false
}

// NoteMatches checks if an answer matches a note name (handles sharps/flats).
func NoteMatches(noteName, answer string) bool {
	if answer == "" {
		return false
	}
	answer = strings.ToLower(strings.TrimSpace(answer))
	// canonical name like "C#/Db" -> ["c#", "db"]
	parts := strings.SplitSeq(strings.ToLower(noteName), "/")
	for part := range parts {
		if part == answer {
			return true
		}
	}
	return false
}
