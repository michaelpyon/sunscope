import { useState, useCallback } from 'react'

interface Props {
  onSearch: (address: string) => void
  isLoading: boolean
}

export function AddressSearch({ onSearch, isLoading }: Props) {
  const [query, setQuery] = useState('')

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = query.trim()
      if (trimmed) onSearch(trimmed)
    },
    [query, onSearch]
  )

  return (
    <form onSubmit={handleSubmit} className="address-search">
      <div className="search-input-wrapper">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter an address (e.g. 123 Main St, New York)"
          disabled={isLoading}
          autoFocus
        />
        <button type="submit" disabled={isLoading || !query.trim()}>
          {isLoading ? (
            <span className="spinner" />
          ) : (
            '→'
          )}
        </button>
      </div>
      <p className="search-hint">Works best in NYC, SF, and Chicago where building data is rich</p>
    </form>
  )
}
