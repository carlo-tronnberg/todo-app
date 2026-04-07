import { ref, computed } from 'vue'

export interface UndoableAction {
  /** Human-readable description */
  description: string
  /** Undo this action — should call the API to reverse it */
  undo: () => Promise<void>
  /** Redo this action — should call the API to re-apply it */
  redo: () => Promise<void>
}

const MAX_STACK = 50

/**
 * Composable for undo/redo. Maintains two stacks per list.
 * Call `push()` after each undoable mutation.
 */
export function useUndoRedo() {
  const undoStack = ref<UndoableAction[]>([])
  const redoStack = ref<UndoableAction[]>([])

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function push(action: UndoableAction) {
    undoStack.value = [...undoStack.value.slice(-MAX_STACK + 1), action]
    redoStack.value = [] // new action clears the redo stack
  }

  async function undo() {
    const action = undoStack.value.pop()
    if (!action) return
    undoStack.value = [...undoStack.value] // trigger reactivity
    await action.undo()
    redoStack.value = [...redoStack.value, action]
  }

  async function redo() {
    const action = redoStack.value.pop()
    if (!action) return
    redoStack.value = [...redoStack.value] // trigger reactivity
    await action.redo()
    undoStack.value = [...undoStack.value, action]
  }

  function clear() {
    undoStack.value = []
    redoStack.value = []
  }

  return { canUndo, canRedo, push, undo, redo, clear }
}
