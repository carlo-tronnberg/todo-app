import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import TodoItem from '../../../src/components/todo/TodoItem.vue'
import type { TodoItem as TodoItemType } from '../../../src/types'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
}

function makeItem(overrides: Partial<TodoItemType> = {}): TodoItemType {
  return {
    id: 'i1',
    listId: 'l1',
    title: 'Test Task',
    isArchived: false,
    sortOrder: 0,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  }
}

function mountItem(item: TodoItemType) {
  return mount(TodoItem, {
    props: { item },
    global: { plugins: [createPinia(), makeRouter()] },
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('urgency level class', () => {
  it('has urgency-none class when no dueDate', () => {
    const wrapper = mountItem(makeItem({ dueDate: null }))
    expect(wrapper.classes()).toContain('urgency-none')
  })

  it('has urgency-overdue class for past date', () => {
    const wrapper = mountItem(makeItem({ dueDate: '2024-06-14T00:00:00Z' }))
    expect(wrapper.classes()).toContain('urgency-overdue')
  })

  it('has urgency-overdue class for today', () => {
    const wrapper = mountItem(makeItem({ dueDate: '2024-06-15T00:00:00Z' }))
    expect(wrapper.classes()).toContain('urgency-overdue')
  })

  it('has urgency-high class for 1–3 days away', () => {
    const wrapper = mountItem(makeItem({ dueDate: '2024-06-16T00:00:00Z' }))
    expect(wrapper.classes()).toContain('urgency-high')
  })

  it('has urgency-medium class for 4–7 days away', () => {
    const wrapper = mountItem(makeItem({ dueDate: '2024-06-19T00:00:00Z' }))
    expect(wrapper.classes()).toContain('urgency-medium')
  })

  it('has urgency-low class for 8+ days away', () => {
    const wrapper = mountItem(makeItem({ dueDate: '2024-06-23T00:00:00Z' }))
    expect(wrapper.classes()).toContain('urgency-low')
  })
})

describe('dueDateLabel', () => {
  it('shows "Overdue" for a past date', () => {
    const wrapper = mountItem(makeItem({ dueDate: '2024-06-10T00:00:00Z' }))
    expect(wrapper.text()).toContain('Overdue')
  })

  it('shows "Due today" for today', () => {
    const wrapper = mountItem(makeItem({ dueDate: '2024-06-15T00:00:00Z' }))
    expect(wrapper.text()).toContain('Due today')
  })

  it('shows "Due tomorrow" for tomorrow', () => {
    const wrapper = mountItem(makeItem({ dueDate: '2024-06-16T00:00:00Z' }))
    expect(wrapper.text()).toContain('Due tomorrow')
  })

  it('shows "Due in Nd" for 2–7 days', () => {
    const wrapper = mountItem(makeItem({ dueDate: '2024-06-19T00:00:00Z' }))
    expect(wrapper.text()).toContain('Due in 4d')
  })

  it('shows "Due <date>" for 8+ days', () => {
    const wrapper = mountItem(makeItem({ dueDate: '2024-06-23T00:00:00Z' }))
    expect(wrapper.text()).toContain('Due 23 Jun 2024')
  })
})

describe('urgencyIcon', () => {
  it('shows 🔴 for overdue', () => {
    const wrapper = mountItem(makeItem({ dueDate: '2024-06-14T00:00:00Z' }))
    expect(wrapper.text()).toContain('🔴')
  })

  it('shows 🟠 for high', () => {
    const wrapper = mountItem(makeItem({ dueDate: '2024-06-16T00:00:00Z' }))
    expect(wrapper.text()).toContain('🟠')
  })

  it('shows 🟡 for medium', () => {
    const wrapper = mountItem(makeItem({ dueDate: '2024-06-19T00:00:00Z' }))
    expect(wrapper.text()).toContain('🟡')
  })

  it('shows 🟢 for low', () => {
    const wrapper = mountItem(makeItem({ dueDate: '2024-06-23T00:00:00Z' }))
    expect(wrapper.text()).toContain('🟢')
  })
})

describe('recurrenceLabel', () => {
  it('shows nothing for no recurrence rule', () => {
    const wrapper = mountItem(makeItem({ recurrenceRule: null }))
    expect(wrapper.text()).not.toContain('↻')
  })

  it('shows nothing when type is "none"', () => {
    const wrapper = mountItem(makeItem({ recurrenceRule: { id: 'r1', type: 'none' } }))
    expect(wrapper.text()).not.toContain('↻')
  })

  it('shows "Daily" for daily recurrence', () => {
    const wrapper = mountItem(makeItem({ recurrenceRule: { id: 'r1', type: 'daily' } }))
    expect(wrapper.text()).toContain('Daily')
  })

  it('shows "Weekly" for weekly recurrence', () => {
    const wrapper = mountItem(
      makeItem({ recurrenceRule: { id: 'r1', type: 'weekly', weekdayMask: 0b0000110 } })
    )
    expect(wrapper.text()).toContain('Weekly')
  })

  it('shows "Every <weekday>" for weekly_on_day', () => {
    const wrapper = mountItem(
      makeItem({ recurrenceRule: { id: 'r1', type: 'weekly_on_day', weekdayMask: 2 } }) // Monday
    )
    expect(wrapper.text()).toContain('Every Monday')
  })

  it('shows weekday name from mask for each day', () => {
    const days: Array<[number, string]> = [
      [1, 'Sunday'],
      [2, 'Monday'],
      [4, 'Tuesday'],
      [8, 'Wednesday'],
      [16, 'Thursday'],
      [32, 'Friday'],
      [64, 'Saturday'],
    ]
    for (const [mask, name] of days) {
      const wrapper = mountItem(
        makeItem({ recurrenceRule: { id: 'r1', type: 'weekly_on_day', weekdayMask: mask } })
      )
      expect(wrapper.text()).toContain(`Every ${name}`)
    }
  })

  it('falls back to "Monday" for null/zero weekdayMask', () => {
    const wrapper = mountItem(
      makeItem({ recurrenceRule: { id: 'r1', type: 'weekly_on_day', weekdayMask: null } })
    )
    expect(wrapper.text()).toContain('Every Monday')
  })

  it('shows monthly label with day', () => {
    const wrapper = mountItem(
      makeItem({ recurrenceRule: { id: 'r1', type: 'monthly_on_day', dayOfMonth: 15 } })
    )
    expect(wrapper.text()).toContain('Monthly · day 15')
  })

  it('shows monthly label with ? when dayOfMonth is null', () => {
    const wrapper = mountItem(
      makeItem({ recurrenceRule: { id: 'r1', type: 'monthly_on_day', dayOfMonth: null } })
    )
    expect(wrapper.text()).toContain('Monthly · day ?')
  })

  it('shows "Every N days" for custom_days', () => {
    const wrapper = mountItem(
      makeItem({ recurrenceRule: { id: 'r1', type: 'custom_days', intervalDays: 5 } })
    )
    expect(wrapper.text()).toContain('Every 5 days')
  })

  it('shows "Yearly" for yearly recurrence', () => {
    const wrapper = mountItem(makeItem({ recurrenceRule: { id: 'r1', type: 'yearly' } }))
    expect(wrapper.text()).toContain('Yearly')
  })
})

describe('recurrenceDetail tooltip', () => {
  it('sets tooltip for weekly_on_day', () => {
    const wrapper = mountItem(
      makeItem({ recurrenceRule: { id: 'r1', type: 'weekly_on_day', weekdayMask: 4 } }) // Tuesday
    )
    const badge = wrapper.find('.meta-recurrence')
    expect(badge.attributes('title')).toContain('Tuesday')
  })

  it('sets tooltip for monthly_on_day', () => {
    const wrapper = mountItem(
      makeItem({ recurrenceRule: { id: 'r1', type: 'monthly_on_day', dayOfMonth: 20 } })
    )
    const badge = wrapper.find('.meta-recurrence')
    expect(badge.attributes('title')).toContain('20')
  })

  it('sets tooltip for custom_days', () => {
    const wrapper = mountItem(
      makeItem({ recurrenceRule: { id: 'r1', type: 'custom_days', intervalDays: 3 } })
    )
    const badge = wrapper.find('.meta-recurrence')
    expect(badge.attributes('title')).toContain('3')
  })

  it('sets tooltip for yearly', () => {
    const wrapper = mountItem(makeItem({ recurrenceRule: { id: 'r1', type: 'yearly' } }))
    const badge = wrapper.find('.meta-recurrence')
    expect(badge.attributes('title')).toContain('year')
  })

  it('sets tooltip for daily', () => {
    const wrapper = mountItem(makeItem({ recurrenceRule: { id: 'r1', type: 'daily' } }))
    const badge = wrapper.find('.meta-recurrence')
    expect(badge.attributes('title')).toContain('every day')
  })

  it('sets tooltip for weekly (multiple days)', () => {
    const wrapper = mountItem(
      makeItem({ recurrenceRule: { id: 'r1', type: 'weekly', weekdayMask: 0b0101010 } })
    )
    const badge = wrapper.find('.meta-recurrence')
    expect(badge.attributes('title')).toContain('multiple days')
  })
})

describe('emits', () => {
  it('emits "complete" with item id when complete button clicked', async () => {
    const wrapper = mountItem(makeItem())
    await wrapper.find('.complete-btn').trigger('click')
    expect(wrapper.emitted('complete')).toEqual([['i1']])
  })

  it('emits "edit" with item when edit button clicked', async () => {
    const item = makeItem()
    const wrapper = mountItem(item)
    const buttons = wrapper.findAll('.icon-btn')
    // Edit button is the one with title="Edit item"
    const editBtn = buttons.find((b) => b.attributes('title') === 'Edit item')!
    await editBtn.trigger('click')
    expect(wrapper.emitted('edit')).toEqual([[item]])
  })

  it('emits "archive" with item id when archive button clicked', async () => {
    const wrapper = mountItem(makeItem())
    const archiveBtn = wrapper.find('.icon-btn-danger')
    await archiveBtn.trigger('click')
    expect(wrapper.emitted('archive')).toEqual([['i1']])
  })
})

describe('item content', () => {
  it('renders item title', () => {
    const wrapper = mountItem(makeItem({ title: 'Buy groceries' }))
    expect(wrapper.text()).toContain('Buy groceries')
  })

  it('renders description when present', () => {
    const wrapper = mountItem(makeItem({ description: 'Include milk' }))
    expect(wrapper.text()).toContain('Include milk')
  })

  it('does not render description element when absent', () => {
    const wrapper = mountItem(makeItem({ description: null }))
    expect(wrapper.find('.todo-desc').exists()).toBe(false)
  })
})
