// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DirectoryTab, type DirectoryTabProps } from '../../src/client/DirectoryTab.tsx'
import { en, type DirectoryLocaleKey } from '../../src/client/locales.ts'

afterEach(cleanup)

const t = ((key: DirectoryLocaleKey): string => en[key]) as DirectoryTabProps['t']

describe('DirectoryTab', () => {
  it('renders the localized placeholder copy', () => {
    const view = render(<DirectoryTab t={t} />)
    expect(screen.getByText(en.placeholder)).toBeTruthy()
    expect(view.container.querySelector('[data-directory]')?.textContent).toBe(en.placeholder)
  })
})
