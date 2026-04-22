package game

import (
	"math/rand"

	"github.com/funkymcb/fremorizer/instrument"
)

// notesBoth / notesSharps / notesFlats are the 12 pitch classes rendered in
// the three accidental styles. Natural notes are the same in all three.
var (
	notesBoth   = []string{"C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"}
	notesSharps = []string{"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"}
	notesFlats  = []string{"C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"}
)

// NoteListGame implements mode 5: a shuffled list of all 12 notes for
// reference while practising on a real instrument. No fretboard, no scoring.
type NoteListGame struct {
	accidentals string // "both", "sharps", "flats"
	notes       []string
}

func NewNoteListGame(accidentals string) *NoteListGame {
	g := &NoteListGame{accidentals: accidentals}
	g.Shuffle()
	return g
}

// Shuffle randomises the order of the 12 notes using the current accidental style.
func (g *NoteListGame) Shuffle() {
	var src []string
	switch g.accidentals {
	case "sharps":
		src = append([]string{}, notesSharps...)
	case "flats":
		src = append([]string{}, notesFlats...)
	default:
		src = append([]string{}, notesBoth...)
	}
	rand.Shuffle(len(src), func(i, j int) { src[i], src[j] = src[j], src[i] })
	g.notes = src
}

// Notes returns the current shuffled note list.
func (g *NoteListGame) Notes() []string { return g.notes }

// Game interface stubs — not meaningful for this mode.
func (g *NoteListGame) CheckAnswer(_ string) bool             { return false }
func (g *NoteListGame) Next() error                           { return nil }
func (g *NoteListGame) GetInstrument() *instrument.Instrument { return nil }
