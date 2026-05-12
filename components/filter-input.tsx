'use client'

import { useState } from 'react'
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface FilterKey {
  key: string
  description: string
  examples?: string[]
}

interface FilterInputProps {
  value: string
  onChange: (v: string) => void
  onSearch: (v: string) => void
  placeholder?: string
  isSearching?: boolean
  keys: FilterKey[]
  pageExamples?: string[]
}

export function FilterInput({
  value, onChange, onSearch, placeholder, isSearching, keys, pageExamples = [],
}: FilterInputProps) {
  const [showGuide, setShowGuide] = useState(false)

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSearch(value)
  }

  return (
    <div className="space-y-3">
      {/* Guide toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Filter syntax guide
        </button>
      </div>

      {/* Guide panel */}
      {showGuide && (
        <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3 text-xs">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-foreground mb-2">Available keys</p>
              <ul className="space-y-1">
                {keys.map(k => (
                  <li key={k.key}>
                    <code className="text-primary font-mono">{k.key}</code>
                    <span className="text-muted-foreground ml-1">— {k.description}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Connectors</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><code className="text-primary">AND</code> — both conditions must match</li>
                <li><code className="text-primary">OR</code> — either condition matches</li>
                <li><code className="text-primary">( )</code> — group conditions</li>
                <li><code className="text-primary">date&gt;=</code> / <code className="text-primary">date&lt;=</code> — date ranges</li>
              </ul>
              {pageExamples.length > 0 && (
                <>
                  <p className="font-semibold text-foreground mt-3 mb-2">Examples</p>
                  <div className="space-y-1">
                    {pageExamples.map(ex => (
                      <button key={ex} onClick={() => { onChange(ex); onSearch(ex) }}
                        className="block w-full text-left px-2 py-1 rounded font-mono text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors truncate">
                        {ex}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-secondary/30 h-10 font-mono text-sm"
            placeholder={placeholder || 'workflow:name AND annotator:email'}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKey}
          />
          {value && (
            <button onClick={() => { onChange(''); onSearch('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={() => onSearch(value)} disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </div>
    </div>
  )
}
