import { render, screen } from '@testing-library/react'
import { PetrolWidget } from '@/components/PetrolWidget'

const data = { ron95: 2.05, ron97: 5.05, diesel: 2.15, date: '2026-10-15', updatedAt: '' }

describe('PetrolWidget', () => {
  it('shows RON 97 before RON 95 and marks RON 95 as Malaysian cars only', () => {
    render(<PetrolWidget data={data} sgData={null} rate={3.3} />)
    const text = document.body.textContent ?? ''
    expect(text.indexOf('RON 97')).toBeLessThan(text.indexOf('RON 95'))
    expect(screen.getAllByText('Malaysian cars only')).toHaveLength(1)
    expect(screen.getByText('RON 95').parentElement?.textContent).toContain('Malaysian cars only')
  })
})
