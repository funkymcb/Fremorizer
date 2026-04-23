package main

import (
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/funkymcb/fremorizer/game"
	"github.com/funkymcb/fremorizer/instrument"
)

// ── styles ────────────────────────────────────────────────────────────────────

type uiStyles struct {
	renderer *lipgloss.Renderer
	title    lipgloss.Style
	selected lipgloss.Style
	hint     lipgloss.Style
	success  lipgloss.Style
	errStyle lipgloss.Style
	result   lipgloss.Style
}

func newUIStyles(r *lipgloss.Renderer) uiStyles {
	if r == nil {
		r = lipgloss.DefaultRenderer()
	}
	return uiStyles{
		renderer: r,
		title:    r.NewStyle().Bold(true).Underline(true),
		selected: r.NewStyle().Foreground(lipgloss.Color("5")).Bold(true),
		hint:     r.NewStyle().Faint(true),
		success:  r.NewStyle().Foreground(lipgloss.Color("2")).Bold(true),
		errStyle: r.NewStyle().Foreground(lipgloss.Color("1")).Bold(true),
		result: r.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("2")).
			Foreground(lipgloss.Color("15")).
			Bold(true).
			Padding(0, 2),
	}
}

// ── app states ────────────────────────────────────────────────────────────────

type appState int

const (
	stateModeSelect appState = iota
	stateOptions
	stateOptionsTuning
	statePlaying
)

type optItem int

const (
	optItemInstrument optItem = iota
	optItemStrings
	optItemTuning
	optItemFrets
	optItemFretSetMode
	optItemChordDifficulty
	optItemChordCount
	optItemNoteListAccidentals
	optItemBack
	optItemCount
)

// ── messages ──────────────────────────────────────────────────────────────────

type (
	tickMsg         time.Time
	gameFeedbackMsg struct {
		text    string
		correct bool
	}
)

// ── model ─────────────────────────────────────────────────────────────────────

type model struct {
	styles uiStyles
	state  appState

	// mode selection
	modeCursor int

	// options
	optCursor    int
	tuneCursor   int // which string is being edited in tuning sub-menu
	tuneEditMode bool
	tuneInput    textinput.Model

	// current instrument config
	instrType           string
	numStrings          int
	tuning              []string
	frets               int
	fretSetSequential   bool
	chordDifficulty     string // "easy", "medium", "hard"
	chordCount          int    // number of chords to find per session
	noteListAccidentals string // "both", "sharps", "flats"

	// active game
	selectedMode  int
	blink         int
	activeGame    game.Game
	feedback      string
	feedbackOK    bool
	wrongGuesses  int
	textInput     textinput.Model
	revealed      bool
	gameStartTime time.Time
}

func initialModel(renderer *lipgloss.Renderer) model {
	ti := textinput.New()
	ti.Placeholder = "_"
	ti.Focus()
	ti.CharLimit = 5
	ti.Width = 20

	tuneInput := textinput.New()
	tuneInput.CharLimit = 5
	tuneInput.Width = 10

	return model{
		styles:              newUIStyles(renderer),
		state:               stateModeSelect,
		modeCursor:          0,
		optCursor:           0,
		instrType:           "guitar",
		numStrings:          6,
		tuning:              instrument.DefaultGuitarTuning(6),
		frets:               12,
		fretSetSequential:   true,
		chordDifficulty:     "easy",
		chordCount:          20,
		noteListAccidentals: "both",
		textInput:           ti,
		tuneInput:           tuneInput,
	}
}

func tick() tea.Cmd {
	return tea.Tick(time.Second, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func (m model) Init() tea.Cmd {
	return tea.Batch(tick(), textinput.Blink)
}
