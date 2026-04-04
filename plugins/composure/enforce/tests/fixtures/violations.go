// Test fixture: Go violations
package utils

func riskyFunction() {
	_, _ = doSomething()
	_ = err

	var handler interface{}
	_ = handler

	panic("something went wrong") //nolint
}
