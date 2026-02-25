/**
 * Issue #57 - AC5: Multi-Line Text Truncation Utility
 *
 * Truncates text to a maximum number of lines, preserving word boundaries
 * and appending "..." when truncated.
 *
 * @param text - Input text (may contain newlines)
 * @param maxLines - Maximum number of lines (default: 3)
 * @param maxCharsPerLine - Maximum characters per line before wrapping (default: 50)
 * @returns Truncated text with "..." if needed
 */
export function truncateToLines(
  text: string,
  maxLines: number = 3,
  maxCharsPerLine: number = 50
): string {
  // Handle edge cases
  if (maxLines <= 0 || text.length === 0) {
    return ''
  }

  // Split text into lines
  const inputLines = text.split('\n')

  // Process each line (wrap long lines)
  const wrappedLines: string[] = []
  for (const line of inputLines) {
    if (line.length <= maxCharsPerLine) {
      wrappedLines.push(line)
    } else {
      // Wrap long line at word boundaries
      const words = line.split(' ')
      let currentLine = ''

      for (const word of words) {
        // If word itself is longer than max, force break
        if (word.length > maxCharsPerLine) {
          if (currentLine) {
            wrappedLines.push(currentLine)
            currentLine = ''
          }
          // Split long word into chunks
          for (let i = 0; i < word.length; i += maxCharsPerLine) {
            wrappedLines.push(word.slice(i, i + maxCharsPerLine))
          }
        } else {
          // Try to add word to current line
          const testLine = currentLine ? `${currentLine} ${word}` : word
          if (testLine.length <= maxCharsPerLine) {
            currentLine = testLine
          } else {
            // Word doesn't fit, push current line and start new one
            if (currentLine) {
              wrappedLines.push(currentLine)
            }
            currentLine = word
          }
        }
      }

      // Push remaining line
      if (currentLine) {
        wrappedLines.push(currentLine)
      }
    }

    // Stop early if we've reached max lines
    if (wrappedLines.length >= maxLines) {
      break
    }
  }

  // Truncate to max lines
  if (wrappedLines.length > maxLines) {
    const truncated = wrappedLines.slice(0, maxLines)
    // Add "..." to last line
    truncated[maxLines - 1] = truncated[maxLines - 1] + '...'
    return truncated.join('\n')
  }

  // Check if we had more input lines than output
  if (inputLines.length > wrappedLines.length) {
    // We stopped early, add "..."
    const lastLine = wrappedLines[wrappedLines.length - 1]
    if (lastLine.length + 3 <= maxCharsPerLine) {
      wrappedLines[wrappedLines.length - 1] = lastLine + '...'
    } else {
      wrappedLines[wrappedLines.length - 1] = lastLine.slice(0, -3) + '...'
    }
  }

  return wrappedLines.join('\n')
}
