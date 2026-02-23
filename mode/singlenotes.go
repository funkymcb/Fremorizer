package mode

import (
	"math/rand"

	"github.com/funkymcb/fremorizer/instrument"
)

func RandomSingleNoteToBeDetermined(g *instrument.Guitar) {
	stringIndex := rand.Intn(len(g.Strings))
	noteIndex := rand.Intn(len(g.Strings[stringIndex].Notes))

	g.Strings[stringIndex].Notes[noteIndex].ToBeDetermined = true
}
