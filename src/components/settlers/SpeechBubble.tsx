/**
 * Issue #57 - AC2: Speech Bubble Component (Comic-Style)
 *
 * Features:
 * - White rounded box with shadow
 * - Triangle pointer pointing to agent
 * - Absolute positioning (isometric coordinates)
 * - Opacity-based visibility
 */

import React, { useState } from 'react'
import type { SpeechBubble } from './types'
import { truncateToLines } from './textTruncate'
import { useSpeechBubbleAnimation } from './useSpeechBubbleAnimation'

interface SpeechBubbleComponentProps {
  bubble: SpeechBubble
}

export const SpeechBubbleComponent: React.FC<SpeechBubbleComponentProps> = ({ bubble }) => {
  // Hover state for expansion (AC7)
  const [isHovered, setIsHovered] = useState(false)

  // Truncate text to max 3 lines (AC5) - unless hovered (AC7)
  const displayText = isHovered
    ? bubble.text // Full text on hover
    : truncateToLines(bubble.text, 3, 40) // Truncated text normally

  // Fade animation on text change (AC3)
  const { opacity: animatedOpacity, isVisible } = useSpeechBubbleAnimation(
    bubble.text,
    bubble.visible
  )

  // Don't render if not visible
  if (!isVisible) {
    return null
  }

  return (
    <div
      data-testid="speech-bubble"
      className="speech-bubble"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        left: `${bubble.position.isoX}px`,
        top: `${bubble.position.isoY}px`,
        opacity: animatedOpacity * bubble.opacity, // Combine animated and base opacity
        backgroundColor: 'white',
        color: 'black',
        padding: '8px 12px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        maxWidth: isHovered ? '300px' : '200px', // Expand on hover (AC7)
        fontSize: '12px',
        lineHeight: '1.4',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        border: '2px solid #333',
        zIndex: 1000, // Above sprites (AC8 pre-work)
        transition: 'max-width 0.2s ease-in-out', // Smooth transition (AC7)
      }}
    >
      {/* Triangle pointer (CSS-based) */}
      <div
        style={{
          position: 'absolute',
          bottom: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '10px solid white',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-13px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '12px solid #333',
          zIndex: -1,
        }}
      />

      {/* Text content (truncated to max 3 lines) */}
      {displayText}
    </div>
  )
}
