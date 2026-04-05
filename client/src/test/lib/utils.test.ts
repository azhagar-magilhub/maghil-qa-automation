import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn()', () => {
  it('merges class names correctly', () => {
    const result = cn('px-4', 'py-2', 'text-sm')
    expect(result).toBe('px-4 py-2 text-sm')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const isDisabled = false

    const result = cn(
      'base-class',
      isActive && 'active-class',
      isDisabled && 'disabled-class',
    )

    expect(result).toContain('base-class')
    expect(result).toContain('active-class')
    expect(result).not.toContain('disabled-class')
  })

  it('merges conflicting Tailwind classes correctly', () => {
    const result = cn('px-4', 'px-6')
    expect(result).toBe('px-6')
  })

  it('handles undefined and null values', () => {
    const result = cn('base', undefined, null, 'end')
    expect(result).toBe('base end')
  })

  it('handles empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })
})
