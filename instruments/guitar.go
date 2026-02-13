package instruments

import (
	"fmt"
	"strings"
)

type Guitar struct {
	Tuning  []string
	Frets   int
	Strings []GuitarString
}

type GuitarString struct {
	Notes []Note
}

type Note struct {
	Name   string
	Hidden bool
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

func NewGuitar(tuning []string, frets int) *Guitar {
	// Guitar should have between 6 and 8 strings
	if len(tuning) < 6 || len(tuning) > 8 {
		panic("tuning must have between 6 and 8 strings")
	}

	// Frets should be between 12 and 24
	if frets < 12 || frets > 24 {
		panic("frets must be between 12 and 24")
	}

	guitarStrings := initGuitarStrings(tuning, frets)

	return &Guitar{
		Tuning:  tuning,
		Frets:   frets,
		Strings: guitarStrings,
	}
}

// createGuitarStrings creates a list of GuitarString objects based on the tuning and number of frets.
func initGuitarStrings(tuning []string, frets int) []GuitarString {
	strs := make([]GuitarString, len(tuning))
	for stringIndex, openNote := range tuning {
		notes := make([]Note, frets+1) // +1 for the open string
		for fret := 0; fret <= frets; fret++ {
			noteName, err := calculateNoteName(openNote, fret)
			if err != nil {
				panic(fmt.Sprintf("error calculating note name for string %d, fret %d: %v", stringIndex+1, fret, err))
			}
			notes[fret] = Note{
				Name:   noteName,
				Hidden: true,
			}
		}
		strs[stringIndex] = GuitarString{Notes: notes}
	}

	// reverse the strings so that the lowest E is at the bottom (common tab convention)
	for i, j := 0, len(strs)-1; i < j; i, j = i+1, j-1 {
		strs[i], strs[j] = strs[j], strs[i]
	}

	return strs
}

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
