import type { AppError } from '../types'

interface Props {
  error: AppError
  onRetry: () => void
}

const ERROR_CONTENT: Record<AppError['type'], { title: string; description: string; action: string }> = {
  API_DOWN: {
    title: 'Data temporarily unavailable',
    description: 'The building data service (OpenStreetMap) is not responding. This usually resolves in a few minutes.',
    action: 'Try again',
  },
  ADDRESS_NOT_FOUND: {
    title: 'Address not found',
    description: "We couldn't find that address. Try including the city and state (e.g. \"123 Main St, New York, NY\").",
    action: 'Search again',
  },
  NO_BUILDING_DATA: {
    title: 'No building data available',
    description: "There's no building footprint data for this location. SunScope works best in NYC, SF, and Chicago where OpenStreetMap coverage is dense.",
    action: 'Try another address',
  },
}

export function ErrorState({ error, onRetry }: Props) {
  const content = ERROR_CONTENT[error.type]

  return (
    <div className="error-state">
      <div className="error-icon">
        {error.type === 'API_DOWN' ? '⚡' : error.type === 'ADDRESS_NOT_FOUND' ? '📍' : '🏗️'}
      </div>
      <h2>{content.title}</h2>
      <p>{content.description}</p>
      <button onClick={onRetry}>{content.action}</button>
    </div>
  )
}
