/**
 * Issue #57 - AC2: Speech Bubble Component (Comic-Style)
 *
 * Features:
 * - White rounded box with shadow
 * - Triangle pointer pointing to agent
 * - Absolute positioning (isometric coordinates)
 * - Opacity-based visibility
 */

import React from 'react'
import type { SpeechBubble } from './types'

interface SpeechBubbleComponentProps {
  bubble: SpeechBubble
}

export const SpeechBubbleComponent: React.FC<SpeechBubbleComponentProps> = ({ bubble }) => {
  // Don't render if not visible
  if (!bubble.visible) {
    return null
  }

  return (
    <div
      data-testid="speech-bubble"
      className="speech-bubble"
      style={{
        position: 'absolute',
        left: `${bubble.position.isoX}px`,
        top: `${bubble.position.isoY}px`,
        opacity: bubble.opacity,
        backgroundColor: 'white',
        color: 'black',
        padding: '8px 12px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        maxWidth: '200px',
        fontSize: '12px',
        lineHeight: '1.4',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        border: '2px solid #333',
        zIndex: 1000, // Above sprites (AC8 pre-work)
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

      {/* Text content */}
      {bubble.text}
    </div>
  )
}
