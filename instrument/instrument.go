package instrument

import "fmt"

// InstrumentString holds the notes for a single string.
type InstrumentString struct {
	Notes []Note
}

// Instrument represents a fretted string instrument.
type Instrument struct {
	Type    string
	Tuning  []string
	Frets   int
	Strings []InstrumentString
}

func newInstrument(instrType string, tuning []string, frets int) (*Instrument, error) {
	if frets < 12 || frets > 24 {
		return nil, fmt.Errorf("frets must be between 12 and 24, got %d", frets)
	}
	strs, err := initStrings(tuning, frets)
	if err != nil {
		return nil, err
	}
	return &Instrument{
		Type:    instrType,
		Tuning:  tuning,
		Frets:   frets,
		Strings: strs,
	}, nil
}

func initStrings(tuning []string, frets int) ([]InstrumentString, error) {
	strs := make([]InstrumentString, len(tuning))
	for i, openNote := range tuning {
		rev := len(tuning) - 1 - i // reverse: lowest string first (tab convention)
		notes := make([]Note, frets+1)
		for fret := 0; fret <= frets; fret++ {
			name, err := calculateNoteName(openNote, fret)
			if err != nil {
				return nil, fmt.Errorf("string %d fret %d: %v", i+1, fret, err)
			}
			notes[fret] = Note{Name: name}
		}
		strs[rev] = InstrumentString{Notes: notes}
	}
	return strs, nil
}

// NewGuitar creates a guitar (6-8 strings, 12-24 frets).
func NewGuitar(tuning []string, frets int) (*Instrument, error) {
	n := len(tuning)
	if n < 6 || n > 8 {
		return nil, fmt.Errorf("guitar must have 6-8 strings, got %d", n)
	}
	return newInstrument("guitar", tuning, frets)
}

// NewBass creates a bass (4-6 strings, 12-24 frets).
func NewBass(tuning []string, frets int) (*Instrument, error) {
	n := len(tuning)
	if n < 4 || n > 6 {
		return nil, fmt.Errorf("bass must have 4-6 strings, got %d", n)
	}
	return newInstrument("bass", tuning, frets)
}

// NewUkulele creates a ukulele (4 strings only, 12-24 frets).
func NewUkulele(tuning []string, frets int) (*Instrument, error) {
	if len(tuning) != 4 {
		return nil, fmt.Errorf("ukulele must have 4 strings, got %d", len(tuning))
	}
	return newInstrument("ukulele", tuning, frets)
}

// DefaultGuitarTuning returns standard E tuning for guitar (6-8 strings).
func DefaultGuitarTuning(numStrings int) []string {
	base := []string{"E", "A", "D", "G", "B", "E"}
	switch numStrings {
	case 7:
		return append([]string{"B"}, base...)
	case 8:
		return append([]string{"F#", "B"}, base...)
	default:
		return base
	}
}

// DefaultBassTuning returns standard tuning for bass (4-6 strings).
func DefaultBassTuning(numStrings int) []string {
	base := []string{"E", "A", "D", "G"}
	switch numStrings {
	case 5:
		return append([]string{"B"}, base...)
	case 6:
		return append([]string{"B"}, append(base, "C")...)
	default:
		return base
	}
}

// DefaultUkuleleTuning returns standard tuning for ukulele.
func DefaultUkuleleTuning() []string {
	return []string{"G", "C", "E", "A"}
}

// NoteNames returns all canonical note names in chromatic order.
func NoteNames() []string {
	return append([]string{}, noteOrder...)
}

// RebuildInstrument recreates an instrument with new tuning/fret config.
func RebuildInstrument(inst *Instrument) (*Instrument, error) {
	switch inst.Type {
	case "guitar":
		return NewGuitar(inst.Tuning, inst.Frets)
	case "bass":
		return NewBass(inst.Tuning, inst.Frets)
	case "ukulele":
		return NewUkulele(inst.Tuning, inst.Frets)
	default:
		return nil, fmt.Errorf("unknown instrument type: %s", inst.Type)
	}
}
