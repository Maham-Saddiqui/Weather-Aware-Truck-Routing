import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/Providers'
import { makeRoute } from '../../shared/testing/fixtures'
import { CheckpointList } from './CheckpointList'

function renderList(selectedCheckpointIndex: number | null = null) {
  const onSelectCheckpoint = vi.fn()
  render(
    <Providers>
      <button type="button">before</button>
      <CheckpointList
        route={makeRoute('route-a')}
        selectedCheckpointIndex={selectedCheckpointIndex}
        onSelectCheckpoint={onSelectCheckpoint}
      />
      <button type="button">after</button>
    </Providers>,
  )
  return onSelectCheckpoint
}

const rows = () => screen.getAllByRole('button').filter((row) => row.textContent.includes('Mile'))

describe('checkpoint list keyboard use (FE-07, WCAG 2.4.3)', () => {
  it('is one tab stop, so the slider is not behind every checkpoint row', async () => {
    renderList()

    await userEvent.tab()
    await userEvent.tab()
    expect(rows()[0]).toHaveFocus()
    await userEvent.tab()

    expect(screen.getByRole('button', { name: 'after' })).toHaveFocus()
  })

  it('moves between rows with the arrow keys, Home and End without leaving the end rows', async () => {
    renderList()
    rows()[0]?.focus()

    await userEvent.keyboard('{ArrowDown}')
    expect(rows()[1]).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(rows()[2]).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(rows()[2]).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(rows()[0]).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    expect(rows()[0]).toHaveFocus()
  })

  it('comes back to the row that was last used when tabbing in again', async () => {
    renderList()
    rows()[0]?.focus()
    await userEvent.keyboard('{ArrowDown}')

    await userEvent.tab()
    await userEvent.tab({ shift: true })

    expect(rows()[1]).toHaveFocus()
  })

  it('starts on the selected checkpoint and keeps saying which one is selected', async () => {
    renderList(1)

    await userEvent.tab()
    await userEvent.tab()

    expect(rows()[1]).toHaveFocus()
    expect(rows()[1]).toHaveAttribute('aria-current', 'true')
    expect(rows()[0]).not.toHaveAttribute('aria-current')
  })

  it('selects the focused checkpoint with Enter', async () => {
    const onSelect = renderList()
    rows()[0]?.focus()

    await userEvent.keyboard('{ArrowDown}{Enter}')

    expect(onSelect).toHaveBeenCalledWith('route-a', 1)
  })
})
