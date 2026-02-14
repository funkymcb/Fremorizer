package instruments

import (
	"fmt"
	"strings"
)

// TODO: Render should render an instrument based on its type (guitar, bass, ukulele, etc.) and not just a guitar.
// Maybe we can have a Renderable interface that each instrument implements and then the model can call the Render method on the instrument it contains.
func (g *Guitar) Render() string {
	markers := renderMarkers(g.Frets)
	strs := renderStrings(g.Strings)

	fretboard := strings.Builder{}
	fretboard.WriteString(fmt.Sprintf("Guitar; tuning: %v, frets: %d\n", g.Tuning, g.Frets))
	fretboard.WriteString(markers + "\n") // TODO: make marker position configurable (top or bottom of fretboard)
	fretboard.WriteString(strs + "\n")
	return fretboard.String()
}

// renderMarkers returns a string with fret markers like on regular guitars.
// Markers are typically on frets 1, 3, 5, 7, 9, 12, 15, 17, 19, 21, and 24.
func renderMarkers(fret int) string {
	var m string
	for i := 1; i <= fret; i++ {
		switch i {
		case 1, 3, 5, 7, 9, 15, 17, 19, 24:
			m += fmt.Sprintf("     %d", i)
		case 12, 21:
			// correction for 2 consecutive non marker frets (13, 14 and 22, 23)
			m += fmt.Sprintf("     %d ", i)
		default:
			if i < 11 {
				// wider spacing for single digit frets
				m += "      "
			} else {
				// shorter spacing for 2 digit frets
				m += "     "
			}
		}
	}

	return m
}

// renderStrings returns a string representation of the guitar strings and their notes.
func renderStrings(strs []GuitarString) string {
	var sb strings.Builder
	for _, s := range strs {
		// open string
		if s.Notes[0].Name != "" {
			sb.WriteString(fmt.Sprintf("%s ", s.Notes[0].Name))
		} else {
			sb.WriteString("   ")
		}

		for fretIndex, note := range s.Notes {
			if fretIndex == 0 {
				continue // skip the open string since we already rendered it
			}

			if note.Hidden {
				sb.WriteString("|-----")
				continue
			}

			// check if its natural note or sharp/flat and render accordingly
			if len(note.Name) == 1 {
				sb.WriteString(fmt.Sprintf("|--%s--", note.Name))
			} else {
				sb.WriteString(fmt.Sprintf("|%s", note.Name))
			}

		}
		sb.WriteString("|\n")
	}

	return sb.String()
}
