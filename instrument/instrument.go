package instrument

type Instrument interface {
	Render() string
}

// RenderInstrument takes an instrument and returns its string representation by calling its Render method.
func Render(i Instrument) string {
	return i.Render()
}
