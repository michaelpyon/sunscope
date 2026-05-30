import { useState, useCallback } from 'react'

interface Props {
  onSearch: (address: string) => void
  isLoading: boolean
}

// Tappable sample addresses so visitors can see the product working in 1 click
// without having to type anything. One per supported city. Bounce killer.
const SAMPLE_ADDRESSES: { label: string; query: string }[] = [
  { label: 'NYC: 350 5th Ave', query: '350 5th Avenue, New York, NY' },
  { label: 'SF: 1 Market St', query: '1 Market Street, San Francisco, CA' },
  { label: 'Chicago: 233 S Wacker', query: '233 South Wacker Drive, Chicago, IL' },
]

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
          aria-label="Address to analyze"
        />
        <button type="submit" disabled={isLoading || !query.trim()} aria-label="Analyze address">
          {isLoading ? (
            <span className="spinner" />
          ) : (
            '\u2192'
          )}
        </button>
      </div>
      <p className="search-hint">Works best in NYC, SF, and Chicago where building data is rich</p>
      <div className="sample-addresses" role="group" aria-label="Try a sample address">
        <span className="sample-label">Or try:</span>
        {SAMPLE_ADDRESSES.map((s) => (
          <button
            key={s.query}
            type="button"
            className="sample-chip"
            onClick={() => onSearch(s.query)}
            disabled={isLoading}
          >
            {s.label}
          </button>
        ))}
      </div>
    </form>
  )
}
