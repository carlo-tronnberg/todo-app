import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CompletionModal from '../../../src/components/CompletionModal.vue'

function mountModal(props = {}) {
  return mount(CompletionModal, {
    props: {
      amount: '',
      currency: 'SEK',
      transactionType: '',
      transactionTypes: [{ id: '1', userId: 'u1', name: 'Autogiro', createdAt: '' }],
      note: '',
      ...props,
    },
  })
}

describe('CompletionModal', () => {
  it('renders the heading', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain('Complete Item')
  })

  it('auto-focuses the amount input on mount', async () => {
    const wrapper = mountModal()
    await flushPromises()
    const input = wrapper.find('input[type="number"]')
    expect(input.exists()).toBe(true)
  })

  it('emits update:amount on input', async () => {
    const wrapper = mountModal()
    const input = wrapper.find('input[type="number"]')
    await input.setValue('100')
    expect(wrapper.emitted('update:amount')).toBeTruthy()
  })

  it('emits update:currency on select change', async () => {
    const wrapper = mountModal()
    const select = wrapper.findAll('select')[0]
    await select.setValue('EUR')
    expect(wrapper.emitted('update:currency')).toBeTruthy()
  })

  it('emits update:transactionType on select change', async () => {
    const wrapper = mountModal()
    const select = wrapper.findAll('select')[1]
    await select.setValue('Autogiro')
    expect(wrapper.emitted('update:transactionType')).toBeTruthy()
  })

  it('emits update:note on textarea input', async () => {
    const wrapper = mountModal()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Test note')
    expect(wrapper.emitted('update:note')).toBeTruthy()
  })

  it('emits confirm when Complete button is clicked', async () => {
    const wrapper = mountModal()
    await wrapper.find('.btn-primary').trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('emits cancel when Cancel button is clicked', async () => {
    const wrapper = mountModal()
    await wrapper.find('.btn-secondary').trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('emits confirm on Enter in amount field', async () => {
    const wrapper = mountModal()
    await wrapper.find('input[type="number"]').trigger('keydown.enter')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('emits cancel on Escape key', async () => {
    const wrapper = mountModal()
    await flushPromises()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('cancel')).toBeTruthy()
    wrapper.unmount()
  })
})
