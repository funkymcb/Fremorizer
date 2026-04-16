package game

import (
	"math/rand"

	"github.com/funkymcb/fremorizer/instrument"
)

type notePos struct{ s, n int }

// SingleNoteGame implements game mode 1.
// It cycles through every fret position on the instrument. Correctly guessed
// positions stay green. Positions missed after 3 attempts stay red and are
// retried at the end. The game ends when every position is green.
type SingleNoteGame struct {
	inst       *instrument.Instrument
	cur        notePos   // position currently being asked
	queue      []notePos // positions yet to be asked this round
	retryQueue []notePos // missed positions to retry
}

func NewSingleNoteGame(inst *instrument.Instrument) *SingleNoteGame {
	g := &SingleNoteGame{inst: inst}
	g.queue = g.buildQueue()
	g.advance()
	return g
}

func (g *SingleNoteGame) GetInstrument() *instrument.Instrument { return g.inst }

func (g *SingleNoteGame) CheckAnswer(answer string) bool {
	note := g.inst.Strings[g.cur.s].Notes[g.cur.n]
	return instrument.NoteMatches(note.Name, answer)
}

// RevealNote marks the current position as revealed (name shown temporarily).
// ToBeDetermined stays true so the name renders during the reveal moment.
func (g *SingleNoteGame) RevealNote(correct bool) {
	n := &g.inst.Strings[g.cur.s].Notes[g.cur.n]
	n.Revealed = true
	n.Correct = correct
	if !correct {
		n.WasMissed = true
		g.retryQueue = append(g.retryQueue, g.cur)
	}
}

// Next advances to the next note. The current note keeps its Revealed/Correct
// state but ToBeDetermined is cleared (color fill stays, name disappears).
func (g *SingleNoteGame) Next() error {
	n := &g.inst.Strings[g.cur.s].Notes[g.cur.n]
	n.ToBeDetermined = false
	g.advance()
	return nil
}

// IsGameOver returns true when all positions are correctly answered.
func (g *SingleNoteGame) IsGameOver() bool {
	if len(g.queue) > 0 || len(g.retryQueue) > 0 {
		return false
	}
	for _, s := range g.inst.Strings {
		for i := 1; i < len(s.Notes); i++ { // skip open string (index 0)
			if !s.Notes[i].Correct {
				return false
			}
		}
	}
	return true
}

// Progress returns the number of correctly guessed notes and the total to guess.
func (g *SingleNoteGame) Progress() (correct, total int) {
	for _, s := range g.inst.Strings {
		for i := 1; i < len(s.Notes); i++ { // skip open string
			total++
			if s.Notes[i].Correct {
				correct++
			}
		}
	}
	return correct, total
}

// CurrentNoteName returns the name of the note currently being asked.
func (g *SingleNoteGame) CurrentNoteName() string {
	return g.inst.Strings[g.cur.s].Notes[g.cur.n].Name
}

// advance picks the next position from the queue. If the queue is empty and
// there are retries, it refills from retryQueue and continues.
func (g *SingleNoteGame) advance() {
	if len(g.queue) == 0 {
		if len(g.retryQueue) == 0 {
			return // game over
		}
		g.queue = shuffle(g.retryQueue)
		g.retryQueue = nil
	}
	g.cur = g.queue[0]
	g.queue = g.queue[1:]
	n := &g.inst.Strings[g.cur.s].Notes[g.cur.n]
	// clear Revealed so the note shows as blinking (?) instead of its name
	n.Revealed = false
	n.ToBeDetermined = true
}

func (g *SingleNoteGame) buildQueue() []notePos {
	var positions []notePos
	for si := range g.inst.Strings {
		for ni := 1; ni < len(g.inst.Strings[si].Notes); ni++ { // skip open string
			positions = append(positions, notePos{si, ni})
		}
	}
	return shuffle(positions)
}

func shuffle(positions []notePos) []notePos {
	out := make([]notePos, len(positions))
	copy(out, positions)
	rand.Shuffle(len(out), func(i, j int) { out[i], out[j] = out[j], out[i] })
	return out
}
