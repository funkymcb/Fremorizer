package game

import (
	"math/rand"

	"github.com/funkymcb/fremorizer/instrument"
)

// FretSetGameImpl implements game mode 2.
//
// Flow:
//  1. A fret set (3 consecutive frets) is shown.
//  2. A target note is picked from the unsolved positions in that set.
//  3. The player marks every occurrence of that note in the fret set.
//  4. When all occurrences are correctly marked → those positions turn green (Solved).
//  5. A new target note is picked from the remaining unsolved positions.
//  6. When every position in the fret set is solved → the fret set advances.
type FretSetGameImpl struct {
	inst              *instrument.Instrument
	targetNote        string
	fretStart         int // 1-indexed, inclusive
	fretEnd           int // inclusive
	cursorString      int
	cursorFret        int
	sequential        bool
	fretSetsCompleted int
}

func NewFretSetGame(inst *instrument.Instrument, sequential bool) *FretSetGameImpl {
	g := &FretSetGameImpl{inst: inst, sequential: sequential}
	g.initFretSet()
	g.pickNextNote()
	return g
}

func (g *FretSetGameImpl) GetInstrument() *instrument.Instrument { return g.inst }
func (g *FretSetGameImpl) GetTargetNote() string                 { return g.targetNote }
func (g *FretSetGameImpl) GetFretSetBounds() (int, int)          { return g.fretStart, g.fretEnd }
func (g *FretSetGameImpl) GetCursor() (int, int)                 { return g.cursorString, g.cursorFret }
func (g *FretSetGameImpl) FretSetsCompleted() int                { return g.fretSetsCompleted }

func (g *FretSetGameImpl) MoveCursor(ds, df int) {
	n := len(g.inst.Strings)
	g.cursorString = ((g.cursorString+ds)%n + n) % n
	w := g.fretEnd - g.fretStart + 1
	g.cursorFret = g.fretStart + ((g.cursorFret-g.fretStart+df)%w+w)%w
}

func (g *FretSetGameImpl) ToggleMark(stringIdx, fretIdx int) {
	if fretIdx < g.fretStart || fretIdx > g.fretEnd {
		return
	}
	if stringIdx < 0 || stringIdx >= len(g.inst.Strings) {
		return
	}
	note := &g.inst.Strings[stringIdx].Notes[fretIdx]
	// don't allow marking already-solved positions
	if note.Solved {
		return
	}
	note.Marked = !note.Marked
}

// IsComplete returns true when all occurrences of the current target note in the
// fret set are marked and no wrong positions are marked.
func (g *FretSetGameImpl) IsComplete() bool {
	for _, s := range g.inst.Strings {
		for fret := g.fretStart; fret <= g.fretEnd; fret++ {
			note := s.Notes[fret]
			if note.Solved {
				continue
			}
			isTarget := note.Name == g.targetNote
			if isTarget != note.Marked {
				return false
			}
		}
	}
	return true
}

// IsFretSetComplete returns true when all positions in the fret set are solved.
// Call this before Next() to know whether the fret set will advance.
func (g *FretSetGameImpl) IsFretSetComplete() bool {
	for _, s := range g.inst.Strings {
		for fret := g.fretStart; fret <= g.fretEnd; fret++ {
			n := s.Notes[fret]
			if !n.Solved && n.Name != g.targetNote {
				return false
			}
		}
	}
	return true
}

// CheckAnswer is unused in fret-set mode.
func (g *FretSetGameImpl) CheckAnswer(_ string) bool { return false }

// HintInfo returns the number of correctly and incorrectly marked positions
// for the current target note in the fret set.
func (g *FretSetGameImpl) HintInfo() (correct, wrong int) {
	for _, s := range g.inst.Strings {
		for fret := g.fretStart; fret <= g.fretEnd; fret++ {
			note := s.Notes[fret]
			if !note.Marked {
				continue
			}
			if note.Name == g.targetNote {
				correct++
			} else {
				wrong++
			}
		}
	}
	return correct, wrong
}

// Progress returns solved/total counts for the current fret set and the whole fretboard.
func (g *FretSetGameImpl) Progress() (setCorrect, setTotal, boardCorrect, boardTotal int) {
	for _, s := range g.inst.Strings {
		for fret := 1; fret < len(s.Notes); fret++ {
			boardTotal++
			if s.Notes[fret].Solved {
				boardCorrect++
			}
			if fret >= g.fretStart && fret <= g.fretEnd {
				setTotal++
				if s.Notes[fret].Solved {
					setCorrect++
				}
			}
		}
	}
	return setCorrect, setTotal, boardCorrect, boardTotal
}

// IsBoardComplete returns true if the entire fretboard would be solved after
// the current note's positions are marked. Call this before Next().
func (g *FretSetGameImpl) IsBoardComplete() bool {
	for _, s := range g.inst.Strings {
		for fret := 1; fret < len(s.Notes); fret++ {
			if s.Notes[fret].Solved {
				continue
			}
			// not yet solved — it's OK only if it's the current target in the fret set
			if fret < g.fretStart || fret > g.fretEnd || s.Notes[fret].Name != g.targetNote {
				return false
			}
		}
	}
	return true
}

// Next solves the current target note's positions, then either picks the next
// note in the fret set or advances to the next fret set if all positions are done.
func (g *FretSetGameImpl) Next() error {
	g.solveCurrentNote()

	if g.isFretSetFullySolved() {
		g.fretSetsCompleted++
		g.clearFretSet() // clears Marked only; Solved is preserved for fretboard progress
		if g.isBoardFullySolved() {
			g.resetBoard()
			g.initFretSet()
		} else {
			g.advanceFretSet()
		}
	}

	g.pickNextNote()
	return nil
}

// ── internal ──────────────────────────────────────────────────────────────────

func (g *FretSetGameImpl) solveCurrentNote() {
	for si := range g.inst.Strings {
		for fret := g.fretStart; fret <= g.fretEnd; fret++ {
			n := &g.inst.Strings[si].Notes[fret]
			if n.Name == g.targetNote {
				n.Solved = true
				n.Marked = false
			}
		}
	}
}

func (g *FretSetGameImpl) isFretSetFullySolved() bool {
	for _, s := range g.inst.Strings {
		for fret := g.fretStart; fret <= g.fretEnd; fret++ {
			if !s.Notes[fret].Solved {
				return false
			}
		}
	}
	return true
}

// clearFretSet clears player marks from the current fret set.
// Solved state is intentionally preserved for fretboard-level progress tracking.
func (g *FretSetGameImpl) clearFretSet() {
	for si := range g.inst.Strings {
		for fret := g.fretStart; fret <= g.fretEnd; fret++ {
			g.inst.Strings[si].Notes[fret].Marked = false
		}
	}
}

func (g *FretSetGameImpl) isBoardFullySolved() bool {
	for _, s := range g.inst.Strings {
		for fret := 1; fret < len(s.Notes); fret++ {
			if !s.Notes[fret].Solved {
				return false
			}
		}
	}
	return true
}

func (g *FretSetGameImpl) resetBoard() {
	for si := range g.inst.Strings {
		for fret := 1; fret < len(g.inst.Strings[si].Notes); fret++ {
			g.inst.Strings[si].Notes[fret].Solved = false
			g.inst.Strings[si].Notes[fret].Marked = false
		}
	}
}

func (g *FretSetGameImpl) initFretSet() {
	if g.sequential {
		g.fretStart = 1
	} else {
		g.fretStart = g.randomStart()
	}
	g.fretEnd = g.fretStart + 2
}

func (g *FretSetGameImpl) advanceFretSet() {
	if g.sequential {
		next := g.fretStart + 3
		if next+2 > g.inst.Frets {
			next = 1
		}
		g.fretStart = next
	} else {
		// keep picking until we land on a set with at least one unsolved position
		for {
			g.fretStart = g.randomStart()
			if !g.isFretSetFullySolved() {
				break
			}
		}
	}
	g.fretEnd = g.fretStart + 2
}

func (g *FretSetGameImpl) pickNextNote() {
	// collect unique note names from unsolved positions in the fret set
	seen := map[string]bool{}
	var candidates []string
	for _, s := range g.inst.Strings {
		for fret := g.fretStart; fret <= g.fretEnd; fret++ {
			n := s.Notes[fret]
			if !n.Solved && !seen[n.Name] {
				seen[n.Name] = true
				candidates = append(candidates, n.Name)
			}
		}
	}
	if len(candidates) > 0 {
		g.targetNote = candidates[rand.Intn(len(candidates))]
	}
	g.cursorString = 0
	g.cursorFret = g.fretStart
}

func (g *FretSetGameImpl) randomStart() int {
	max := g.inst.Frets - 2
	if max < 1 {
		max = 1
	}
	return rand.Intn(max) + 1
}
