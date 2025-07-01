import React from 'react'

interface JsonSyntaxHighlighterProps {
  jsonString: string
  className?: string
}

const JsonSyntaxHighlighter: React.FC<JsonSyntaxHighlighterProps> = ({ jsonString, className = '' }) => {
  const highlightJson = (json: string): React.ReactNode[] => {
    const tokens: React.ReactNode[] = []
    let currentIndex = 0
    
    // Simple tokenizer for JSON
    const patterns = [
      { type: 'string', regex: /"([^"\\]|\\.)*"/g, className: 'text-green-600 dark:text-green-400' },
      { type: 'number', regex: /-?\d+\.?\d*([eE][+-]?\d+)?/g, className: 'text-blue-600 dark:text-blue-400' },
      { type: 'boolean', regex: /\b(true|false)\b/g, className: 'text-purple-600 dark:text-purple-400' },
      { type: 'null', regex: /\bnull\b/g, className: 'text-gray-500 dark:text-gray-400' },
      { type: 'key', regex: /"([^"\\]|\\.)*"(?=\s*:)/g, className: 'text-orange-600 dark:text-orange-400 font-medium' },
      { type: 'punctuation', regex: /[{}[\]:,]/g, className: 'text-gray-600 dark:text-gray-400' }
    ]
    
    // Find all matches
    const allMatches: Array<{ start: number; end: number; type: string; className: string }> = []
    
    patterns.forEach(pattern => {
      let match
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
      while ((match = regex.exec(json)) !== null) {
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: pattern.type,
          className: pattern.className
        })
      }
    })
    
    // Sort matches by start position
    allMatches.sort((a, b) => a.start - b.start)
    
    // Remove overlapping matches (keys take precedence over strings)
    const validMatches: Array<{ start: number; end: number; type: string; className: string }> = []
    for (let i = 0; i < allMatches.length; i++) {
      const current = allMatches[i]
      const hasOverlap = validMatches.some(existing => 
        current.start < existing.end && current.end > existing.start
      )
      
      if (!hasOverlap) {
        validMatches.push(current)
      } else if (current.type === 'key') {
        // Remove overlapping string matches when we have a key
        const overlappingIndex = validMatches.findIndex(existing =>
          current.start < existing.end && current.end > existing.start && existing.type === 'string'
        )
        if (overlappingIndex !== -1) {
          validMatches[overlappingIndex] = current
        }
      }
    }
    
    // Generate highlighted content
    validMatches.forEach((match, index) => {
      // Add text before this match
      if (match.start > currentIndex) {
        const text = json.slice(currentIndex, match.start)
        if (text) {
          tokens.push(
            <span key={`text-${currentIndex}`} className="text-gray-700 dark:text-gray-300">
              {text}
            </span>
          )
        }
      }
      
      // Add highlighted match
      const matchText = json.slice(match.start, match.end)
      tokens.push(
        <span key={`match-${index}`} className={match.className}>
          {matchText}
        </span>
      )
      
      currentIndex = match.end
    })
    
    // Add remaining text
    if (currentIndex < json.length) {
      const remainingText = json.slice(currentIndex)
      if (remainingText) {
        tokens.push(
          <span key={`final-text`} className="text-gray-700 dark:text-gray-300">
            {remainingText}
          </span>
        )
      }
    }
    
    return tokens
  }

  return (
    <pre className={`whitespace-pre-wrap font-mono text-sm ${className}`}>
      {highlightJson(jsonString)}
    </pre>
  )
}

export default JsonSyntaxHighlighter