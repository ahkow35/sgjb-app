import { parseMotoristHtml } from '@/lib/sg-fuel'

// Trimmed but structurally faithful copy of the motorist.sg price table.
const FIXTURE = `
<table class='table table-borderless fuel_comparison_table mb-0'>
  <tr class="text-center">
    <td class="text-left font-weight-bold">92</td>
    <td class="esso">$3.39</td>
    <td class="shell">-</td>
    <td class="spc">$3.39</td>
    <td class="caltex">$3.34</td>
    <td class="sinopec">-</td>
  </tr>
  <tr class="text-center">
    <td class="text-left font-weight-bold">95</td>
    <td class="esso">$3.42</td>
    <td class="shell">$3.37</td>
    <td class="spc">$3.42</td>
    <td class="caltex">$3.37</td>
    <td class="sinopec">$3.37</td>
  </tr>
  <tr class="text-center">
    <td class="text-left font-weight-bold">98</td>
    <td class="esso">$3.94</td>
    <td class="shell">$3.89</td>
    <td class="spc">$3.93</td>
    <td class="caltex">-</td>
    <td class="sinopec">$3.88</td>
  </tr>
  <tr class="text-center">
    <td class="text-left font-weight-bold">Premium</td>
    <td class="esso">-</td>
    <td class="shell">$4.11</td>
    <td class="spc">-</td>
    <td class="caltex">$4.07</td>
    <td class="sinopec">$4.01</td>
  </tr>
  <tr class="text-center">
    <td class="text-left font-weight-bold">Diesel</td>
    <td class="esso">$4.12</td>
    <td class="shell">$4.12</td>
    <td class="spc">$4.05</td>
    <td class="caltex">$4.05</td>
    <td class="sinopec">$4.06</td>
  </tr>
</table>
`

describe('parseMotoristHtml', () => {
  it('selects the cheapest retailer per target grade', () => {
    const r = parseMotoristHtml(FIXTURE)
    expect(r.grade95.price).toBe(3.37)
    expect(r.grade98.price).toBe(3.88)
    expect(r.grade98.retailer).toBe('Sinopec')
    expect(r.diesel.price).toBe(4.05)
  })

  it('breaks ties by fixed retailer order (esso, shell, spc, caltex, sinopec)', () => {
    // 95 is 3.37 at shell, caltex and sinopec — shell comes first in order.
    const r = parseMotoristHtml(FIXTURE)
    expect(r.grade95.retailer).toBe('Shell')
  })

  it('breaks a diesel tie between spc and caltex in favour of spc', () => {
    const r = parseMotoristHtml(FIXTURE)
    expect(r.diesel.retailer).toBe('SPC')
  })

  it('sets source and a fetch timestamp', () => {
    const r = parseMotoristHtml(FIXTURE)
    expect(r.source).toBe('motorist.sg')
    expect(typeof r.updatedAt).toBe('string')
    expect(Number.isNaN(Date.parse(r.updatedAt))).toBe(false)
  })

  it('throws when a target grade has no numeric price', () => {
    const noDiesel = FIXTURE.replace(
      /<td class="text-left font-weight-bold">Diesel<\/td>[\s\S]*?<\/tr>/,
      `<td class="text-left font-weight-bold">Diesel</td>
        <td class="esso">-</td>
        <td class="shell">-</td>
        <td class="spc">-</td>
        <td class="caltex">-</td>
        <td class="sinopec">-</td>
      </tr>`,
    )
    expect(() => parseMotoristHtml(noDiesel)).toThrow(/diesel/i)
  })

  it('throws when the table is missing entirely', () => {
    expect(() => parseMotoristHtml('<html><body>no data</body></html>')).toThrow()
  })
})
