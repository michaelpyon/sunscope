import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// Catches any render or lifecycle crash (for example a WebGL/map failure or an
// unexpected analysis state) so the page shows a recoverable message instead of
// a blank white screen. Reuses the existing .error-state styles.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep a console trace for debugging without exposing internals to the user.
    console.error('SunScope crashed:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h2>Something went wrong</h2>
          <p>SunScope hit an unexpected error. Reloading usually fixes it.</p>
          <button onClick={this.handleReload}>Reload</button>
        </div>
      )
    }
    return this.props.children
  }
}
