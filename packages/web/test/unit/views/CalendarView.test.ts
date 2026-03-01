import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import CalendarView from '../../../src/views/CalendarView.vue'

const { mockCalendarApi, mockListsApi, mockItemsApi } = vi.hoisted(() => ({
  mockCalendarApi: {
    getRange: vi.fn(),
    getIcalUrls: vi.fn(),
  },
  mockListsApi: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getItems: vi.fn(),
    createItem: vi.fn(),
  },
  mockItemsApi: {
    getOne: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    complete: vi.fn(),
    getCompletions: vi.fn(),
    deleteCompletion: vi.fn(),
  },
}))

vi.mock('../../../src/api/calendar.api', () => ({ calendarApi: mockCalendarApi }))
vi.mock('../../../src/api/lists.api', () => ({ listsApi: mockListsApi }))
vi.mock('../../../src/api/items.api', () => ({ itemsApi: mockItemsApi }))

const fakeCalendarResponse = { items: [], completions: [] }
const fakeList = {
  id: 'l1',
  userId: 'u1',
  title: 'My List',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Dashboard</div>' } },
      { path: '/calendar', component: CalendarView },
      { path: '/lists/:listId', component: { template: '<div>List</div>' } },
    ],
  })
}

let pinia: ReturnType<typeof createPinia>
// Track the mounted wrapper so afterEach can always unmount it, preventing
// stale component instances (and their Teleport slots) from accumulating in document.body.
let currentWrapper: ReturnType<typeof mount> | null = null

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  mockCalendarApi.getRange.mockResolvedValue(fakeCalendarResponse)
  mockCalendarApi.getIcalUrls.mockReturnValue({
    https: 'https://example.com/api/calendar/ical?token=tok',
    webcal: 'webcal://example.com/api/calendar/ical?token=tok',
    google: 'https://www.google.com/calendar/render?cid=webcal%3A%2F%2Fexample.com',
  })
  mockListsApi.getAll.mockResolvedValue([fakeList])
})

afterEach(() => {
  currentWrapper?.unmount()
  currentWrapper = null
  vi.useRealTimers()
})

function mountCalendar() {
  const router = makeRouter()
  // attachTo: document.body so that Teleported content is reachable via document.body.
  // currentWrapper is tracked so afterEach always cleans up.
  const wrapper = mount(CalendarView, {
    global: { plugins: [pinia, router] },
    attachTo: document.body,
  })
  currentWrapper = wrapper
  return { wrapper, router }
}

describe('CalendarView', () => {
  it('renders the current month heading', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    // Should show June 2024
    expect(wrapper.text()).toContain('June 2024')
  })

  it('renders weekday labels', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    expect(wrapper.text()).toContain('Sun')
    expect(wrapper.text()).toContain('Mon')
    expect(wrapper.text()).toContain('Sat')
  })

  it('renders day numbers in the calendar grid', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    expect(wrapper.text()).toContain('15')
  })

  it('calls calendarApi.getRange on mount', async () => {
    mountCalendar()
    await flushPromises()
    expect(mockCalendarApi.getRange).toHaveBeenCalled()
  })

  it('navigates to previous month', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    const prevBtn = wrapper.find('button.nav-btn')
    await prevBtn.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('May 2024')
    expect(mockCalendarApi.getRange).toHaveBeenCalledTimes(2)
  })

  it('navigates to next month', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    const navBtns = wrapper.findAll('button.nav-btn')
    await navBtns[1].trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('July 2024')
  })

  it('navigates back to today when Today button is clicked', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    // Go to previous month
    const navBtns = wrapper.findAll('button.nav-btn')
    await navBtns[0].trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('May 2024')
    // Click Today
    await wrapper.find('button.today-btn').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('June 2024')
  })

  it('renders items in their correct calendar cell', async () => {
    const itemInJune = {
      id: 'i1',
      listId: 'l1',
      title: 'June Task',
      dueDate: '2024-06-20T00:00:00Z',
      listTitle: 'My List',
      isArchived: false,
      sortOrder: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }
    mockCalendarApi.getRange.mockResolvedValue({ items: [itemInJune], completions: [] })
    const { wrapper } = mountCalendar()
    await flushPromises()
    expect(wrapper.text()).toContain('June Task')
  })

  it('opens iCal dialog when iCal button is clicked', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    await wrapper.find('button.ical-btn').trigger('click')
    await flushPromises()
    // iCal dialog is teleported to body
    expect(document.body.textContent).toContain('Calendar Subscription')
  })

  it('opens add item modal when + Add Item button is clicked', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    await wrapper.find('button.add-btn').trigger('click')
    await flushPromises()
    // Modal heading is teleported to body
    expect(document.body.textContent).toContain('New Item')
  })

  it('shows validation error when submitting add form without selecting a list', async () => {
    mockListsApi.getAll.mockResolvedValue([fakeList, { ...fakeList, id: 'l2', title: 'List 2' }])
    const { wrapper } = mountCalendar()
    await flushPromises()
    await wrapper.find('button.add-btn').trigger('click')
    await flushPromises()
    // Add modal is teleported to body — interact via document.body
    const input = document.body.querySelector('input[type="text"]') as HTMLInputElement
    input.value = 'New Task'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    const form = document.body.querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(document.body.textContent).toContain('Please select a list')
  })

  it('opens month picker when heading button is clicked', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    await wrapper.find('.cal-heading-btn').trigger('click')
    await flushPromises()
    // Month picker is teleported to body
    expect(document.body.textContent).toContain('2024')
    expect(document.body.textContent).toContain('Jan')
    expect(document.body.textContent).toContain('Dec')
  })

  it('closes month picker when heading button is clicked again', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    await wrapper.find('.cal-heading-btn').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Jan')
    await wrapper.find('.cal-heading-btn').trigger('click')
    await flushPromises()
    expect(document.body.querySelector('.month-picker')).toBeNull()
  })

  it('adds an item when only one list exists (auto-selects list)', async () => {
    // When only 1 list, listId is auto-selected
    mockListsApi.getAll.mockResolvedValue([fakeList])
    mockListsApi.createItem.mockResolvedValue({
      id: 'i2',
      listId: 'l1',
      title: 'Auto List Item',
      isArchived: false,
      sortOrder: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    })
    const { wrapper } = mountCalendar()
    await flushPromises()

    await wrapper.find('button.add-btn').trigger('click')
    await flushPromises()
    // Add modal is teleported to body — interact via document.body
    const input = document.body.querySelector('input[type="text"]') as HTMLInputElement
    input.value = 'Auto List Item'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    const form = document.body.querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()

    expect(mockListsApi.createItem).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({ title: 'Auto List Item' })
    )
  })

  it('renders completion chips in calendar cells', async () => {
    const completion = {
      id: 'c1',
      itemId: 'i1',
      itemTitle: 'Done Task',
      itemDescription: null,
      listId: 'l1',
      listTitle: 'My List',
      completedAt: '2024-06-20T10:00:00Z',
      dueDateSnapshot: '2024-06-20T00:00:00Z',
      isLatestCompletion: true,
      note: null,
    }
    mockCalendarApi.getRange.mockResolvedValue({ items: [], completions: [completion] })
    const { wrapper } = mountCalendar()
    await flushPromises()
    expect(wrapper.text()).toContain('Done Task')
  })

  it('selects a month from the picker and navigates to it', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    // Open picker
    await wrapper.find('.cal-heading-btn').trigger('click')
    await flushPromises()
    // Click 'Jan' (first month button in the picker, teleported to body)
    const monthBtns = document.body.querySelectorAll('.month-picker-btn')
    ;(monthBtns[0] as HTMLElement).click()
    await flushPromises()
    expect(wrapper.text()).toContain('January 2024')
  })

  it('closes month picker when clicking outside', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    await wrapper.find('.cal-heading-btn').trigger('click')
    await flushPromises()
    expect(document.body.querySelector('.month-picker')).not.toBeNull()
    // Click outside (on document body directly, not on the picker or heading)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(document.body.querySelector('.month-picker')).toBeNull()
  })

  it('pre-fills due date when + button on a specific day is clicked', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    // Find the first cal-add-day-btn (small + on each cell)
    const addDayBtn = wrapper.find('.cal-add-day-btn')
    await addDayBtn.trigger('click')
    await flushPromises()
    // Modal should open with some date pre-filled
    const dateInput = document.body.querySelector('input[type="date"]') as HTMLInputElement
    expect(dateInput).not.toBeNull()
    // The dueDate should be set (non-empty)
    expect(dateInput.value).toBeTruthy()
  })

  it('auto-sets dayOfMonth when switching recurrence to monthly_on_day', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    await wrapper.find('button.add-btn').trigger('click')
    await flushPromises()

    // Set a due date first
    const dateInput = document.body.querySelector('input[type="date"]') as HTMLInputElement
    dateInput.value = '2024-06-15'
    dateInput.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()

    // Change recurrence type to monthly_on_day
    const selects = document.body.querySelectorAll('select')
    // The recurrence select is the second select (after list select)
    const recurrenceSelect = selects[1] as HTMLSelectElement
    recurrenceSelect.value = 'monthly_on_day'
    recurrenceSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()

    // The dayOfMonth field should appear
    const dayOfMonthInput = document.body.querySelector('input[type="number"]') as HTMLInputElement
    expect(dayOfMonthInput).not.toBeNull()
  })

  it('shows hover popup on item chip mouseenter', async () => {
    const itemInJune = {
      id: 'i1',
      listId: 'l1',
      title: 'June Task',
      dueDate: '2024-06-20T00:00:00Z',
      listTitle: 'My List',
      isArchived: false,
      sortOrder: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }
    mockCalendarApi.getRange.mockResolvedValue({ items: [itemInJune], completions: [] })
    const { wrapper } = mountCalendar()
    await flushPromises()

    const itemChip = wrapper.find('.cal-item')
    expect(itemChip.exists()).toBe(true)
    await itemChip.trigger('mouseenter')
    await flushPromises()
    // Hover popup should be visible
    expect(document.body.textContent).toContain('June Task')
    expect(document.body.querySelector('.hover-popup')).not.toBeNull()
  })

  it('hides popup after mouseleave delay and cancels if mouseenter fires', async () => {
    const itemInJune = {
      id: 'i1',
      listId: 'l1',
      title: 'June Task',
      dueDate: '2024-06-20T00:00:00Z',
      listTitle: 'My List',
      isArchived: false,
      sortOrder: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }
    mockCalendarApi.getRange.mockResolvedValue({ items: [itemInJune], completions: [] })
    const { wrapper } = mountCalendar()
    await flushPromises()

    const itemChip = wrapper.find('.cal-item')
    await itemChip.trigger('mouseenter')
    await flushPromises()

    // mouseleave starts the hide timer
    await itemChip.trigger('mouseleave')
    // Before 180ms, hover is still visible
    expect(document.body.querySelector('.hover-popup')).not.toBeNull()

    // mouseenter on the popup cancels the hide
    const popup = document.body.querySelector('.hover-popup')
    if (popup) {
      popup.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      await flushPromises()
      expect(document.body.querySelector('.hover-popup')).not.toBeNull()
      // mouseleave on popup schedules hide again
      popup.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    }

    // Advance timers past 180ms to trigger hide
    vi.advanceTimersByTime(200)
    await flushPromises()
    expect(document.body.querySelector('.hover-popup')).toBeNull()
  })

  it('shows hover popup on completion chip mouseenter', async () => {
    const completion = {
      id: 'c1',
      itemId: 'i1',
      itemTitle: 'Done Task',
      itemDescription: 'desc',
      listId: 'l1',
      listTitle: 'My List',
      completedAt: '2024-06-20T10:00:00Z',
      dueDateSnapshot: '2024-06-20T00:00:00Z',
      isLatestCompletion: true,
      note: 'great job',
    }
    mockCalendarApi.getRange.mockResolvedValue({ items: [], completions: [completion] })
    const { wrapper } = mountCalendar()
    await flushPromises()

    const completionChip = wrapper.find('.cal-item-done')
    expect(completionChip.exists()).toBe(true)
    await completionChip.trigger('mouseenter')
    await flushPromises()
    expect(document.body.querySelector('.hover-popup')).not.toBeNull()
    expect(document.body.textContent).toContain('Done Task')
  })

  it('opens undo modal and confirms undo', async () => {
    const completion = {
      id: 'c1',
      itemId: 'i1',
      itemTitle: 'Done Task',
      itemDescription: null,
      listId: 'l1',
      listTitle: 'My List',
      completedAt: '2024-06-20T10:00:00Z',
      dueDateSnapshot: '2024-06-20T00:00:00Z',
      isLatestCompletion: true,
      note: null,
    }
    mockCalendarApi.getRange.mockResolvedValue({ items: [], completions: [completion] })
    mockItemsApi.deleteCompletion.mockResolvedValue(undefined)
    const { wrapper } = mountCalendar()
    await flushPromises()

    // Click the completion chip to open the undo modal
    const completionChip = wrapper.find('.cal-item-done')
    await completionChip.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Undo completion?')

    // Click the "Undo completion" button in the modal
    const undoBtn = document.body.querySelector('.btn-danger') as HTMLElement
    undoBtn.click()
    await flushPromises()
    expect(mockItemsApi.deleteCompletion).toHaveBeenCalledWith('c1')
  })

  it('copies iCal URL when Copy button is clicked', async () => {
    // Mock clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } })

    const { wrapper } = mountCalendar()
    await flushPromises()
    await wrapper.find('button.ical-btn').trigger('click')
    await flushPromises()

    const copyBtn = document.body.querySelector('.ical-url-row .btn-secondary') as HTMLElement
    copyBtn.click()
    await flushPromises()
    expect(writeTextMock).toHaveBeenCalled()
  })

  it('shows error message when adding item fails', async () => {
    mockListsApi.getAll.mockResolvedValue([fakeList])
    mockListsApi.createItem.mockRejectedValue({ message: 'Server error' })
    const { wrapper } = mountCalendar()
    await flushPromises()

    await wrapper.find('button.add-btn').trigger('click')
    await flushPromises()

    const input = document.body.querySelector('input[type="text"]') as HTMLInputElement
    input.value = 'Failing Task'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    const form = document.body.querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()

    expect(document.body.textContent).toContain('Server error')
  })

  it('shows recurrence info in hover popup for recurring item', async () => {
    const recurringItem = {
      id: 'i2',
      listId: 'l1',
      title: 'Recurring Task',
      dueDate: '2024-06-20T00:00:00Z',
      listTitle: 'My List',
      isArchived: false,
      sortOrder: 0,
      description: 'Weekly task',
      recurrenceRule: { id: 'r1', type: 'weekly' as const, weekdayMask: 0b0000010 }, // Monday
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }
    const latestComp = {
      id: 'c2',
      itemId: 'i2',
      itemTitle: 'Recurring Task',
      itemDescription: null,
      listId: 'l1',
      listTitle: 'My List',
      completedAt: '2024-06-14T10:00:00Z',
      dueDateSnapshot: '2024-06-14T00:00:00Z',
      isLatestCompletion: true,
      note: null,
    }
    mockCalendarApi.getRange.mockResolvedValue({
      items: [recurringItem],
      completions: [latestComp],
    })
    const { wrapper } = mountCalendar()
    await flushPromises()

    const itemChip = wrapper.find('.cal-item')
    await itemChip.trigger('mouseenter')
    await flushPromises()

    expect(document.body.textContent).toContain('Recurs')
    expect(document.body.textContent).toContain('Monday')
    expect(document.body.textContent).toContain('Last done')
  })

  it('shows daily recurrence in hover popup', async () => {
    const dailyItem = {
      id: 'i3',
      listId: 'l1',
      title: 'Daily Task',
      dueDate: '2024-06-20T00:00:00Z',
      listTitle: 'My List',
      isArchived: false,
      sortOrder: 0,
      recurrenceRule: { id: 'r1', type: 'daily' as const },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }
    mockCalendarApi.getRange.mockResolvedValue({ items: [dailyItem], completions: [] })
    const { wrapper } = mountCalendar()
    await flushPromises()
    const itemChip = wrapper.find('.cal-item')
    await itemChip.trigger('mouseenter')
    await flushPromises()
    expect(document.body.textContent).toContain('Every day')
  })

  it('shows monthly recurrence in hover popup', async () => {
    const monthlyItem = {
      id: 'i4',
      listId: 'l1',
      title: 'Monthly Task',
      dueDate: '2024-06-15T00:00:00Z',
      listTitle: 'My List',
      isArchived: false,
      sortOrder: 0,
      recurrenceRule: { id: 'r1', type: 'monthly_on_day' as const, dayOfMonth: 15 },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }
    mockCalendarApi.getRange.mockResolvedValue({ items: [monthlyItem], completions: [] })
    const { wrapper } = mountCalendar()
    await flushPromises()
    const itemChip = wrapper.find('.cal-item')
    await itemChip.trigger('mouseenter')
    await flushPromises()
    expect(document.body.textContent).toContain('Monthly on day 15')
  })

  it('shows custom_days recurrence in hover popup', async () => {
    const customItem = {
      id: 'i5',
      listId: 'l1',
      title: 'Custom Task',
      dueDate: '2024-06-15T00:00:00Z',
      listTitle: 'My List',
      isArchived: false,
      sortOrder: 0,
      recurrenceRule: { id: 'r1', type: 'custom_days' as const, intervalDays: 14 },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }
    mockCalendarApi.getRange.mockResolvedValue({ items: [customItem], completions: [] })
    const { wrapper } = mountCalendar()
    await flushPromises()
    const itemChip = wrapper.find('.cal-item')
    await itemChip.trigger('mouseenter')
    await flushPromises()
    expect(document.body.textContent).toContain('Every 14 days')
  })

  it('shows yearly recurrence in hover popup', async () => {
    const yearlyItem = {
      id: 'i6',
      listId: 'l1',
      title: 'Yearly Task',
      dueDate: '2024-06-15T00:00:00Z',
      listTitle: 'My List',
      isArchived: false,
      sortOrder: 0,
      recurrenceRule: { id: 'r1', type: 'yearly' as const },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }
    mockCalendarApi.getRange.mockResolvedValue({ items: [yearlyItem], completions: [] })
    const { wrapper } = mountCalendar()
    await flushPromises()
    const itemChip = wrapper.find('.cal-item')
    await itemChip.trigger('mouseenter')
    await flushPromises()
    expect(document.body.textContent).toContain('Once a year')
  })

  it('shows weekly_on_day recurrence in hover popup', async () => {
    const wodItem = {
      id: 'i7',
      listId: 'l1',
      title: 'WOD Task',
      dueDate: '2024-06-15T00:00:00Z',
      listTitle: 'My List',
      isArchived: false,
      sortOrder: 0,
      recurrenceRule: { id: 'r1', type: 'weekly_on_day' as const, weekdayMask: 8 }, // Wednesday
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }
    mockCalendarApi.getRange.mockResolvedValue({ items: [wodItem], completions: [] })
    const { wrapper } = mountCalendar()
    await flushPromises()
    const itemChip = wrapper.find('.cal-item')
    await itemChip.trigger('mouseenter')
    await flushPromises()
    expect(document.body.textContent).toContain('Wednesday')
  })

  it('navigates year in month picker', async () => {
    const { wrapper } = mountCalendar()
    await flushPromises()
    await wrapper.find('.cal-heading-btn').trigger('click')
    await flushPromises()

    const yearNavBtns = document.body.querySelectorAll('.month-picker-year-nav')
    // Click next year
    ;(yearNavBtns[1] as HTMLElement).click()
    await flushPromises()
    expect(document.body.textContent).toContain('2025')
    // Click prev year
    ;(yearNavBtns[0] as HTMLElement).click()
    await flushPromises()
    expect(document.body.textContent).toContain('2024')
  })
})
