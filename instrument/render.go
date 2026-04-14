package instrument

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

var (
	styleGreen  = lipgloss.NewStyle().Foreground(lipgloss.Color("2")).Bold(true)
	styleRed    = lipgloss.NewStyle().Foreground(lipgloss.Color("1")).Bold(true)
	styleBlue   = lipgloss.NewStyle().Foreground(lipgloss.Color("4"))
	styleCursor = lipgloss.NewStyle().Background(lipgloss.Color("5")).Foreground(lipgloss.Color("15")).Bold(true)
	styleMarked = lipgloss.NewStyle().Foreground(lipgloss.Color("3")).Bold(true)
)

// RenderOpts controls how the fretboard is rendered.
type RenderOpts struct {
	Blink        int  // 0 or 1 for blinking animation
	FretSetMode  bool // mode 2: highlight a fret set
	FretSetStart int  // first fret of the highlighted set (1-indexed)
	FretSetEnd   int  // last fret of highlighted set (inclusive)
	CursorString int  // mode 2: cursor row (0-indexed, from top of display)
	CursorFret   int  // mode 2: cursor fret (0-indexed absolute, 0 = open string)
}

// Render returns an ASCII art representation of the fretboard.
func Render(inst *Instrument, opts RenderOpts) string {
	var sb strings.Builder

	header := fmt.Sprintf("%s | tuning: %s | frets: %d",
		inst.Type, strings.Join(inst.Tuning, "-"), inst.Frets)
	sb.WriteString(header + "\n")
	sb.WriteString(renderMarkers(inst.Frets, opts) + "\n")
	sb.WriteString(renderStrings(inst.Strings, opts))

	return sb.String()
}

func renderMarkers(frets int, opts RenderOpts) string {
	var sb strings.Builder
	sb.WriteString("  ") // align with string name prefix (2 chars, same as open-note label)

	markerFrets := map[int]bool{
		1: true, 3: true, 5: true, 7: true, 9: true,
		12: true, 15: true, 17: true, 19: true, 21: true, 24: true,
	}

	for i := 1; i <= frets; i++ {
		var cell string
		if markerFrets[i] {
			// center the number within the 5-dash content area of a 6-char cell (|-----)
			s := fmt.Sprintf("%d", i)
			left := 1 + (5-len(s))/2
			right := 6 - len(s) - left
			cell = strings.Repeat(" ", left) + s + strings.Repeat(" ", right)
		} else {
			cell = "      " // 6 spaces — one per fret cell char
		}

		if opts.FretSetMode && i >= opts.FretSetStart && i <= opts.FretSetEnd {
			sb.WriteString(styleBlue.Render(cell))
		} else {
			sb.WriteString(cell)
		}

		// gap after fret set
		if opts.FretSetMode && i == opts.FretSetEnd {
			sb.WriteString("  ")
		}
	}
	return sb.String()
}

func renderStrings(strs []InstrumentString, opts RenderOpts) string {
	var sb strings.Builder

	for strIdx, s := range strs {
		// open string note name (left label)
		openName := s.Notes[0].Name
		if len(openName) == 1 {
			sb.WriteString(fmt.Sprintf("%s ", openName))
		} else {
			// for sharps/flats just show the first part
			sb.WriteString(fmt.Sprintf("%s", strings.Split(openName, "/")[0]))
		}

		for fretIdx, note := range s.Notes {
			if fretIdx == 0 {
				continue // open string already rendered as label
			}

			isCursor := opts.FretSetMode &&
				strIdx == opts.CursorString &&
				fretIdx == opts.CursorFret

			cell := renderCell(note, opts.Blink, isCursor)

			if opts.FretSetMode && fretIdx >= opts.FretSetStart && fretIdx <= opts.FretSetEnd {
				// fret set frets: render in blue unless overridden by cursor/mark
				if !isCursor && !note.Marked {
					cell = styleBlue.Render(cell)
				}
			}

			sb.WriteString(cell)

			// visual gap after fret set
			if opts.FretSetMode && fretIdx == opts.FretSetEnd {
				sb.WriteString("  ")
			}
		}
		sb.WriteString("|\n")
	}

	return sb.String()
}

func renderCell(note Note, blink int, isCursor bool) string {
	if note.ToBeDetermined {
		if note.Revealed {
			// just-revealed: show note name in correct color before advancing
			label := noteCellLabel(note.Name)
			if note.Correct {
				return "|" + styleGreen.Render(label)
			}
			return "|" + styleRed.Render(label)
		}
		// unanswered: blink
		if blink == 0 {
			return "|-(?)-"
		}
		return "|-(_)-"
	}

	if note.Revealed {
		// answered and moved on: colored fill, name hidden
		if note.Correct {
			return "|" + styleGreen.Render("-----")
		}
		return "|" + styleRed.Render("-----")
	}

	if note.Marked {
		inner := "--x--"
		if isCursor {
			return "|" + styleCursor.Render(inner)
		}
		return "|" + styleMarked.Render(inner)
	}

	if isCursor {
		return "|" + styleCursor.Render("-----")
	}

	return "|-----"
}

func noteCellLabel(name string) string {
	if len(name) == 1 {
		return fmt.Sprintf("--%s--", name)
	}
	return name
}
