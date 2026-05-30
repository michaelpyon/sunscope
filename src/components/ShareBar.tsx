import { useState, useCallback } from 'react'
import { toPng } from 'html-to-image'

interface Props {
  // The full deep-link URL that reproduces the current result.
  shareUrl: string
  // A short label used for the native share sheet and the downloaded file name.
  shareTitle: string
}

// Copy text to the clipboard with a fallback for older browsers.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to the manual method below.
  }

  try {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.focus()
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}

export function ShareBar({ shareUrl, shareTitle }: Props) {
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(shareUrl)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }, [shareUrl])

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({ title: 'SunScope', text: shareTitle, url: shareUrl })
    } catch {
      // User dismissed the sheet or sharing failed. Fall back to copy.
      await handleCopy()
    }
  }, [shareUrl, shareTitle, handleCopy])

  const handleDownload = useCallback(async () => {
    const node = document.getElementById('summary-card')
    if (!node) return
    setSaving(true)
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true })
      const link = document.createElement('a')
      link.download = 'sunscope-result.png'
      link.href = dataUrl
      link.click()
    } catch {
      // Export failed silently. Nothing else to do here.
    } finally {
      setSaving(false)
    }
  }, [])

  return (
    <div className="share-bar">
      <button className="share-button primary" onClick={handleCopy}>
        {copied ? 'Copied' : 'Copy link'}
      </button>

      {canNativeShare && (
        <button className="share-button" onClick={handleNativeShare}>
          Share
        </button>
      )}

      <button className="share-button" onClick={handleDownload} disabled={saving}>
        {saving ? 'Saving...' : 'Save image'}
      </button>
    </div>
  )
}
