import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TileMap } from '../../src/components/settlers/TileMap'
import { IsometricTile } from '../../src/components/settlers/IsometricTile'
import { useTileStore } from '../../src/stores/tileStore'
import { TileMapConfig } from '../../src/types/settlers'

const resetStore = () => useTileStore.getState().reset()

describe('TileMap Component', () => {
  const config: TileMapConfig = {
    width: 4,
    height: 4,
    tileSize: 64,
    seed: 123
  }

  beforeEach(() => {
    resetStore()
  })

  it('renders tile map with correct dimensions', () => {
    render(<TileMap config={config} />)
    const svg = screen.getByTestId('tile-map').querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders the correct number of tiles', () => {
    render(<TileMap config={config} />)
    const tiles = screen.getAllByRole('button')
    expect(tiles).toHaveLength(16)
  })

  it('calls selectTile when a tile is clicked', () => {
    render(<TileMap config={config} />)
    const tiles = screen.getAllByRole('button')
    fireEvent.click(tiles[0])
    const state = useTileStore.getState()
    expect(state.selectedTile).toEqual({ x: 0, y: 0 })
  })
})

describe('IsometricTile Component', () => {
  const mockTile = {
    x: 0,
    y: 0,
    terrain: 'grass' as const,
    height: 0.5
  }

  it('renders correctly', () => {
    render(
      <svg>
        <IsometricTile tile={mockTile} tileSize={64} />
      </svg>
    )
    const tileGroup = screen.getByRole('button')
    expect(tileGroup).toBeInTheDocument()
  })

  it('renders selection highlight when isSelected is true', () => {
    render(
      <svg>
        <IsometricTile tile={mockTile} tileSize={64} isSelected={true} />
      </svg>
    )
    const paths = screen.getByRole('button').querySelectorAll('path')
    const selectionPath = Array.from(paths).find(p => p.getAttribute('stroke-dasharray'))
    expect(selectionPath).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(
      <svg>
        <IsometricTile tile={mockTile} tileSize={64} onClick={handleClick} />
      </svg>
    )
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })
})
