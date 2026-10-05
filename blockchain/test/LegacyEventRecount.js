import { expect } from 'chai'
import { countVoteEvents } from '../../scripts/verify-election-core.js'

describe('Legacy public event recount helper', function () {
  it('counts candidate IDs from public events without consulting getResults', function () {
    const counts = countVoteEvents([
      { args: { candidateId: 0n } },
      { args: { candidateId: 1n } },
      { args: { candidateId: 1n } },
    ], 2)
    expect(counts).to.deep.equal([1n, 2n])
  })

  it('rejects event candidate IDs outside the configured candidate set', function () {
    expect(() => countVoteEvents([{ args: { candidateId: 2n } }], 2))
      .to.throw('invalid candidate ID')
  })

  it('rejects malformed decoded events with no candidate ID', function () {
    expect(() => countVoteEvents([{ args: {} }], 2))
      .to.throw('missing candidate ID')
  })
})