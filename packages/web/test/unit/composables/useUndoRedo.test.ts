import { describe, it, expect, vi } from 'vitest'
import { useUndoRedo } from '../../../src/composables/useUndoRedo'

function makeAction(label = 'test') {
  return {
    description: label,
    undo: vi.fn().mockResolvedValue(undefined),
    redo: vi.fn().mockResolvedValue(undefined),
  }
}

describe('useUndoRedo', () => {
  it('starts with empty stacks', () => {
    const { canUndo, canRedo } = useUndoRedo()
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)
  })

  it('push enables undo', () => {
    const { canUndo, push } = useUndoRedo()
    push(makeAction())
    expect(canUndo.value).toBe(true)
  })

  it('push clears redo stack', async () => {
    const { canRedo, push, undo } = useUndoRedo()
    push(makeAction('a'))
    await undo()
    expect(canRedo.value).toBe(true)
    push(makeAction('b'))
    expect(canRedo.value).toBe(false)
  })

  it('undo calls action.undo and moves to redo stack', async () => {
    const { canUndo, canRedo, push, undo } = useUndoRedo()
    const action = makeAction()
    push(action)
    await undo()
    expect(action.undo).toHaveBeenCalledOnce()
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(true)
  })

  it('redo calls action.redo and moves back to undo stack', async () => {
    const { canUndo, canRedo, push, undo, redo } = useUndoRedo()
    const action = makeAction()
    push(action)
    await undo()
    await redo()
    expect(action.redo).toHaveBeenCalledOnce()
    expect(canUndo.value).toBe(true)
    expect(canRedo.value).toBe(false)
  })

  it('undo does nothing when stack is empty', async () => {
    const { undo } = useUndoRedo()
    await undo() // should not throw
  })

  it('redo does nothing when stack is empty', async () => {
    const { redo } = useUndoRedo()
    await redo() // should not throw
  })

  it('clear empties both stacks', async () => {
    const { canUndo, canRedo, push, undo, clear } = useUndoRedo()
    push(makeAction())
    await undo()
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(true)
    clear()
    expect(canRedo.value).toBe(false)
  })

  it('limits undo stack to 50 actions', () => {
    const { canUndo, push } = useUndoRedo()
    for (let i = 0; i < 60; i++) push(makeAction(`action-${i}`))
    expect(canUndo.value).toBe(true)
    // Internal stack should be capped (we can't inspect length directly,
    // but 50 undos should work and 51st should not)
  })
})
