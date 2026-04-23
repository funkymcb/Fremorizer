package main

import (
	"fmt"
	"time"

	"github.com/funkymcb/fremorizer/instrument"
)

func defaultStringCount(instrType string) int {
	switch instrType {
	case "bass", "ukulele":
		return 4
	default:
		return 6
	}
}

func defaultTuning(instrType string, numStrings int) []string {
	switch instrType {
	case "bass":
		return instrument.DefaultBassTuning(numStrings)
	case "ukulele":
		return instrument.DefaultUkuleleTuning()
	default:
		return instrument.DefaultGuitarTuning(numStrings)
	}
}

func minStrings(instrType string) int {
	switch instrType {
	case "bass", "ukulele":
		return 4
	default:
		return 6
	}
}

func maxStrings(instrType string) int {
	switch instrType {
	case "bass":
		return 6
	case "ukulele":
		return 4
	default:
		return 8
	}
}

func formatDuration(d time.Duration) string {
	s := int(d.Seconds())
	if s < 60 {
		return fmt.Sprintf("%ds", s)
	}
	return fmt.Sprintf("%dm %02ds", s/60, s%60)
}

func noteListAccidentalsLabel(a string) string {
	switch a {
	case "sharps":
		return "sharps only (C#, D#, …)"
	case "flats":
		return "flats only (Db, Eb, …)"
	default:
		return "both (sharps and flats)"
	}
}

func nextAccidentals(cur string) string {
	switch cur {
	case "both":
		return "sharps"
	case "sharps":
		return "flats"
	default:
		return "both"
	}
}

func prevAccidentals(cur string) string {
	switch cur {
	case "both":
		return "flats"
	case "flats":
		return "sharps"
	default:
		return "both"
	}
}

func nextChordDifficulty(cur string) string {
	switch cur {
	case "easy":
		return "medium"
	case "medium":
		return "hard"
	default:
		return "easy"
	}
}

func prevChordDifficulty(cur string) string {
	switch cur {
	case "hard":
		return "medium"
	case "medium":
		return "easy"
	default:
		return "hard"
	}
}

func chordDifficultyLabel(d string) string {
	switch d {
	case "medium":
		return "medium (hidden intervals)"
	case "hard":
		return "hard (coming soon)"
	default:
		return "easy (basic CAGED major/minor)"
	}
}
