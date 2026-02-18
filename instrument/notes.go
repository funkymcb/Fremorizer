package instrument

import (
	"fmt"
	"strings"
)

type Note struct {
	Name     string
	Hidden   bool
	Demanded bool
}

// TODO: add toggle for sharps/flats and update note names accordingly
var noteIndex = map[string]int{
	"C":     0,
	"C#/Db": 1,
	"D":     2,
	"D#/Eb": 3,
	"E":     4,
	"F":     5,
	"F#/Gb": 6,
	"G":     7,
	"G#/Ab": 8,
	"A":     9,
	"A#/Bb": 10,
	"B":     11,
}

// calculateNoteName takes an open note and a fret number and returns the note name at that fret.
func calculateNoteName(openNote string, fret int) (string, error) {
	openNote = strings.ToUpper(openNote)

	index, ok := noteIndex[openNote]
	if !ok {
		return "", fmt.Errorf("invalid note name: %s", openNote)
	}

	// Calculate the note index for the given fret, wrapping around using modulo 12 (the number of semitones in an octave)
	resultIndex := (index + fret) % 12

	// maintain reverse mapping of noteIndex to get the note name from the index
	reverse := make(map[int]string)
	for k, v := range noteIndex {
		reverse[v] = k
	}

	return reverse[resultIndex], nil
}
