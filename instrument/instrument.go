package instrument

type Instrument interface {
	Render(blink int) string
}

// RenderInstrument takes an instrument and returns its string representation by calling its Render method.
func Render(i Instrument, blink int) string {
	return i.Render(blink)
}
