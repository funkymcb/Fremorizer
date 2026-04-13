# Fremorizer

TUI to help you memorize the guitar fretboard utilizing [bubbletea](https://github.com/charmbracelet/bubbletea) TUI framework

## Structure

### Choose game mode

At the start of the application you can choose between 3 different game modes.

1. Determine a random note per string
1. Determine random notes per fret set (set of 3 frets)
1. Determine the notes of various chords

### Options

#### Choose Instrument

While being presented with the game mode list you can enter the options menu by pressing 'o'.<br>
This menu will allow you to pick an istrument from the following list:

- guitar (default)
- bass
- ukulele

#### Choose Number of strings

For guitar and bass you can also change the number of strings.<br>

- for Guitar from 6 (default) up to 8 strings.
- for Bass from 4 (default) up to 6 strings

For Ukulele 4 strings is the only option.

#### Choose tuning

For guitar and bass the standard tuning is E standard (E, A, D, G, B, E)<br>
You can change the tuning by changing the tuning for each string.

#### Choose Number of frets

For all instruments you can set the number of frets between 12 (default) and 24<br>

### Game layout

#### Game mode 1 (random note per string)

The basic layout looks like this:

```text
Fretboard:
     1           3           5           7           9                12
E |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
B |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
G |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
D |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
A |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
E |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
```

In game mode 1 (1 note per string) the note to be determined will look like this '(?)' with a blinking questionmark.<br>
Beneath this view you can type your guess. When guessed right the note will be shown in the layout with a green fill.<br>
When guessed wrong three times the note will be shown as well but with a red fill.

```text
Blinking Note:
     1           3           5           7           9                12
E |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
B |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
G |-----|-----|-----|-(?)-|-----|-----|-----|-----|-----|-----|-----|-----|
D |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
A |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
E |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
```

#### Game mode 2 (Random note per fret set)

In this game mode the layout will basically the same. But 3 frets strings will be highlighted with blue color.<br>
The note to be determined will be shown at the top of the fretboard.<br>
You then need to go thorught the frets and mark (by pressing space or enter) every spot where this note appears within the 3 frets<br>
You can navigate 2 dimensionally through the strings and frets wither with arrow keys or vim keys (h, j, k, l)<br>

```text
Note to be Determined: C#

Fretboard:
     1           3           5           7           9                12
E |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
B |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
G |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
D |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
A |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
E |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
```

#### Game mode 3 (notes per chord)

TBD; This game mode will be added after mode 1 and 2 are done.
