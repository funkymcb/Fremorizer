package instruments

import (
	"fmt"
	"strings"
)

type Guitar struct {
	Tuning []string
	Frets  int
}

func NewGuitar(tuning []string, frets int) *Guitar {
	// Guitar should have between 6 and 8 strings
	if len(tuning) < 6 || len(tuning) > 8 {
		panic("tuning must have between 4 and 8 strings")
	}

	// Frets should be between 12 and 24
	if frets < 12 || frets > 24 {
		panic("frets must be between 12 and 24")
	}

	return &Guitar{
		Tuning: tuning,
		Frets:  frets,
	}
}

func (g *Guitar) Render() string {
	markers := renderMarkers(g.Frets)
	strs := renderStrings(g.Tuning, g.Frets)

	fretboard := strings.Builder{}
	fretboard.WriteString(fmt.Sprintf("Guitar, tuning: %v, frets: %d\n", g.Tuning, g.Frets))
	fretboard.WriteString(markers + "\n")
	fretboard.WriteString(strs + "\n")
	return fretboard.String()
}

func renderMarkers(fret int) string {
	markers := map[int]struct{}{
		1: {}, 3: {}, 5: {}, 7: {}, 9: {},
		12: {}, 15: {}, 17: {}, 19: {}, 21: {}, 24: {},
	}

	var m string
	for i := 1; i <= fret; i++ {
		if _, ok := markers[i]; ok {
			m += fmt.Sprintf("     %d", i)
		} else {
			if i < 12 {
				m += "      "
			} else {
				m += "     "
			}
		}
	}

	return m
}

func renderStrings(tuning []string, frets int) string {
	var sb strings.Builder
	for i := len(tuning) - 1; i >= 0; i-- {
		sb.WriteString(fmt.Sprintf("%s |", tuning[i]))
		for range frets {
			sb.WriteString("-----|")
		}
		sb.WriteString("\n")
	}

	return sb.String()
}
