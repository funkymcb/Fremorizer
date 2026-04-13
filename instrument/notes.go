package instrument

import (
	"fmt"
	"strings"
)

type Note struct {
	Name           string
	Hidden         bool
	ToBeDetermined bool
	Marked         bool // mode 2: player marked this position
	Revealed       bool // mode 1: show after answer
	Correct        bool // mode 1: was the answer correct
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

// NoteMatches checks if an answer matches a note name (handles sharps/flats).
func NoteMatches(noteName, answer string) bool {
	if answer == "" {
		return false
	}
	answer = strings.ToLower(strings.TrimSpace(answer))
	// canonical name like "C#/Db" -> ["c#", "db"]
	parts := strings.Split(strings.ToLower(noteName), "/")
	for _, part := range parts {
		if part == answer {
			return true
		}
	}
	return false
}
