package game

import (
	"fmt"
	"strings"

	"github.com/funkymcb/fremorizer/instrument"
)

var majorScaleIntervals = []int{0, 2, 4, 5, 7, 9, 11}
var minorScaleIntervals = []int{0, 2, 3, 5, 7, 8, 10}

// FreeLearningGame implements a free-exploration mode (mode 4).
// No quiz — the player reveals notes, strings, frets, or scales at will.
type FreeLearningGame struct {
	inst         *instrument.Instrument
	cursorString int
	cursorFret   int
	message      string
}

func NewFreeLearningGame(inst *instrument.Instrument) *FreeLearningGame {
	return &FreeLearningGame{
		inst:         inst,
		cursorString: len(inst.Strings) - 1, // start on low E (bottom string)
		cursorFret:   1,
	}
}

// Game interface stubs — no quiz mechanics in this mode.
func (g *FreeLearningGame) CheckAnswer(string) bool            { return false }
func (g *FreeLearningGame) Next() error                        { return nil }
func (g *FreeLearningGame) GetInstrument() *instrument.Instrument { return g.inst }

// ── cursor ─────────────────────────────────────────────────────────────────────

func (g *FreeLearningGame) GetCursor() (int, int) { return g.cursorString, g.cursorFret }
func (g *FreeLearningGame) GetMessage() string    { return g.message }

func (g *FreeLearningGame) MoveCursor(ds, df int) {
	n := len(g.inst.Strings)
	g.cursorString = ((g.cursorString+ds)%n + n) % n
	maxFret := g.inst.Frets
	fret := g.cursorFret + df
	if fret < 1 {
		fret = maxFret
	}
	if fret > maxFret {
		fret = 1
	}
	g.cursorFret = fret
}

// ── reveal actions ────────────────────────────────────────────────────────────

// RevealNote toggles the note name under the cursor.
func (g *FreeLearningGame) RevealNote() {
	n := &g.inst.Strings[g.cursorString].Notes[g.cursorFret]
	n.ShowName = !n.ShowName
	if n.ShowName {
		g.message = "Note: " + displayName(n.Name)
	} else {
		g.message = ""
	}
}

// RevealString toggles all fret positions on the cursor's string.
func (g *FreeLearningGame) RevealString() {
	notes := g.inst.Strings[g.cursorString].Notes
	// Show if any note is currently hidden, hide if all are already shown.
	allShown := true
	for fi := 1; fi < len(notes); fi++ {
		if !notes[fi].ShowName {
			allShown = false
			break
		}
	}
	show := !allShown
	for fi := 1; fi < len(notes); fi++ {
		g.inst.Strings[g.cursorString].Notes[fi].ShowName = show
	}
	open := displayName(notes[0].Name)
	if show {
		g.message = fmt.Sprintf("String %s: all notes revealed.", open)
	} else {
		g.message = fmt.Sprintf("String %s: hidden.", open)
	}
}

// RevealFret toggles the cursor fret across all strings.
func (g *FreeLearningGame) RevealFret() {
	// Show if any string at this fret is hidden, hide if all are already shown.
	allShown := true
	for si := range g.inst.Strings {
		if !g.inst.Strings[si].Notes[g.cursorFret].ShowName {
			allShown = false
			break
		}
	}
	show := !allShown
	for si := range g.inst.Strings {
		g.inst.Strings[si].Notes[g.cursorFret].ShowName = show
	}
	if show {
		g.message = fmt.Sprintf("Fret %d: all notes revealed.", g.cursorFret)
	} else {
		g.message = fmt.Sprintf("Fret %d: hidden.", g.cursorFret)
	}
}

// RevealScale toggles major or minor scale notes in position around the cursor.
// Shows the cursor string and the 2 strings above it (higher pitch) within a
// 6-fret window around the cursor.
func (g *FreeLearningGame) RevealScale(minor bool) {
	rootName := g.inst.Strings[g.cursorString].Notes[g.cursorFret].Name
	rootSemitone := instrument.NoteToSemitone(rootName)

	intervals := majorScaleIntervals
	scaleName := "major"
	if minor {
		intervals = minorScaleIntervals
		scaleName = "minor"
	}

	semitones := map[int]bool{}
	for _, iv := range intervals {
		semitones[(rootSemitone+iv)%12] = true
	}

	// Fret window: one fret back, four frets forward.
	minFret := g.cursorFret - 1
	if minFret < 1 {
		minFret = 1
	}
	maxFret := g.cursorFret + 4
	if maxFret > g.inst.Frets {
		maxFret = g.inst.Frets
	}

	// Strings: cursor string and up to 2 higher-pitched strings above it.
	strStart := g.cursorString - 2
	if strStart < 0 {
		strStart = 0
	}

	// Collect matching positions.
	type pos struct{ si, fi int }
	var matches []pos
	for si := strStart; si <= g.cursorString; si++ {
		for fi := minFret; fi <= maxFret; fi++ {
			if semitones[instrument.NoteToSemitone(g.inst.Strings[si].Notes[fi].Name)] {
				matches = append(matches, pos{si, fi})
			}
		}
	}

	// Toggle: hide if all already shown, otherwise show.
	allShown := true
	for _, p := range matches {
		if !g.inst.Strings[p.si].Notes[p.fi].ShowName {
			allShown = false
			break
		}
	}
	show := !allShown
	for _, p := range matches {
		g.inst.Strings[p.si].Notes[p.fi].ShowName = show
	}

	if show {
		g.message = fmt.Sprintf("%s %s scale.", displayName(rootName), scaleName)
	} else {
		g.message = fmt.Sprintf("%s %s scale hidden.", displayName(rootName), scaleName)
	}
}

// ClearAll removes all revealed notes.
func (g *FreeLearningGame) ClearAll() {
	g.clearShowName()
	g.message = ""
}

func (g *FreeLearningGame) clearShowName() {
	for si := range g.inst.Strings {
		for fi := range g.inst.Strings[si].Notes {
			g.inst.Strings[si].Notes[fi].ShowName = false
		}
	}
}

// displayName returns the sharp form of a canonical note name (e.g. "C#/Db" → "C#").
func displayName(name string) string {
	return strings.Split(name, "/")[0]
}
