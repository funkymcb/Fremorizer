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
	ChordMode    bool // mode 3: show chord interval labels; widens left label to 3 chars
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
	if opts.ChordMode {
		sb.WriteString("   ") // align with 3-char chord-mode label
	} else {
		sb.WriteString("  ") // align with string name prefix (2 chars, same as open-note label)
	}

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

		// gap before fret set
		if opts.FretSetMode && i == opts.FretSetStart {
			sb.WriteString("  ")
		}

		if opts.FretSetMode && i >= opts.FretSetStart && i <= opts.FretSetEnd {
			sb.WriteString(styleBlue.Render(cell))
		} else {
			sb.WriteString(cell)
		}

		// gap after fret set — 3 spaces to align with the closing | added in string rows
		if opts.FretSetMode && i == opts.FretSetEnd {
			sb.WriteString("   ")
		}
	}
	return sb.String()
}

func renderStrings(strs []InstrumentString, opts RenderOpts) string {
	var sb strings.Builder

	for strIdx, s := range strs {
		// open string note name (left label)
		openName := s.Notes[0].Name
		if opts.ChordMode {
			sb.WriteString(chordStringLabel(s.Notes[0]))
		} else if len(openName) == 1 {
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

			// visual gap before fret set
			if opts.FretSetMode && fretIdx == opts.FretSetStart {
				sb.WriteString("  ")
			}

			// fret immediately after the set: drop its opening | (the set already has a closing |)
			if opts.FretSetMode && fretIdx == opts.FretSetEnd+1 {
				cell = strings.TrimPrefix(cell, "|")
			}

			sb.WriteString(cell)

			// closing | for fret set + gap
			if opts.FretSetMode && fretIdx == opts.FretSetEnd {
				sb.WriteString(styleBlue.Render("|") + "  ")
			}
		}
		sb.WriteString("|\n")
	}

	return sb.String()
}

func renderCell(note Note, blink int, isCursor bool) string {
	// Chord mode: interval-marked fret position
	if note.Interval != "" {
		if note.Solved {
			return "|" + styleGreen.Render(noteCellLabel(note.Name))
		}
		return "|" + intervalCellLabel(note.Interval)
	}

	if note.ToBeDetermined {
		if note.Revealed {
			// just-revealed: show note name in correct color before advancing
			label := noteCellLabel(note.Name)
			if note.Correct {
				return "|" + styleGreen.Render(label)
			}
			return "|" + styleRed.Render(label)
		}
		// unanswered: blink — red if this note was previously missed
		var inner string
		if blink == 0 {
			inner = "|-(?)-"
		} else {
			inner = "|-(_)-"
		}
		if note.WasMissed {
			return styleRed.Render(inner)
		}
		return inner
	}

	if note.Revealed {
		// answered and moved on: colored fill, name hidden
		if note.Correct {
			return "|" + styleGreen.Render("-----")
		}
		return "|" + styleRed.Render("-----")
	}

	if note.Solved {
		if isCursor {
			return "|" + styleCursor.Render("-----")
		}
		return "|" + styleGreen.Render("-----")
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

// intervalCellLabel formats an interval symbol into a 5-char fret cell content.
func intervalCellLabel(interval string) string {
	switch interval {
	case "1":
		return "--1--"
	case "3":
		return "--3--"
	case "5":
		return "--5--"
	case "b3":
		return "-b3--"
	}
	return "-----"
}

// chordStringLabel returns the 3-char left label for a string in chord mode.
// Muted strings show "x  ", open chord notes show the interval (or solved note name),
// and all other strings show the note name padded to 3 chars.
func chordStringLabel(openNote Note) string {
	if openNote.Muted {
		return "x  "
	}
	if openNote.Interval != "" {
		if openNote.Solved {
			name := strings.Split(openNote.Name, "/")[0]
			styled := styleGreen.Render(name)
			for i := len(name); i < 3; i++ {
				styled += " "
			}
			return styled
		}
		switch openNote.Interval {
		case "1":
			return "1  "
		case "3":
			return "3  "
		case "5":
			return "5  "
		case "b3":
			return "b3 "
		}
	}
	// Regular: note name padded to 3 chars
	name := strings.Split(openNote.Name, "/")[0]
	if len(name) == 1 {
		return name + "  "
	}
	return name + " "
}
