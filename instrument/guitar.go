package instrument

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

func NewGuitar(tuning []string, frets int) (*Guitar, error) {
	// Guitar should have between 6 and 8 strings
	numStrings := len(tuning)
	if numStrings < 6 || numStrings > 8 {
		return nil, fmt.Errorf("tuning must have between 6 and 8 strings, got %d", numStrings)
	}

	// Frets should be between 12 and 24
	if frets < 12 || frets > 24 {
		return nil, fmt.Errorf("frets must be between 12 and 24. input: %d", frets)
	}

	guitarStrings, err := initGuitarStrings(tuning, frets)
	if err != nil {
		return nil, fmt.Errorf("error initializing guitar strings: %v", err)
	}

	return &Guitar{
		Tuning:  tuning,
		Frets:   frets,
		Strings: guitarStrings,
	}, nil
}

// Render returns a string representation of the guitar, including its tuning, fret markers, and strings with their notes.
func (g *Guitar) Render() string {
	markers := renderMarkers(g.Frets)
	strs := renderStrings(g.Strings)

	fretboard := strings.Builder{}
	fretboard.WriteString(fmt.Sprintf("Guitar; tuning: %v, frets: %d\n", g.Tuning, g.Frets))
	fretboard.WriteString(markers + "\n") // TODO: make marker position configurable (top or bottom of fretboard)
	fretboard.WriteString(strs + "\n")
	return fretboard.String()
}

// createGuitarStrings creates a list of GuitarString objects based on the tuning and number of frets.
func initGuitarStrings(tuning []string, frets int) ([]GuitarString, error) {
	strs := make([]GuitarString, len(tuning))
	for i, openNote := range tuning {
		rev := len(tuning) - 1 - i // reverse the index to start from the lowest string (common tab convention)

		notes := make([]Note, frets+1) // +1 for the open string
		for fret := 0; fret <= frets; fret++ {
			noteName, err := calculateNoteName(openNote, fret)
			if err != nil {
				return nil, fmt.Errorf("error calculating note name for string %d, fret %d: %v", rev+1, fret, err)
			}
			notes[fret] = Note{
				Name:     noteName,
				Hidden:   true,
				Demanded: false,
			}
		}
		strs[rev] = GuitarString{Notes: notes}
	}

	return strs, nil
}
