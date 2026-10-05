import { readFile } from 'node:fs/promises'
import { expect } from 'chai'

describe('Active frontend privacy boundary', function () {
  it('does not expose the public candidate-ID voting function in its ABI or transaction handlers', async function () {
    const [app, abi] = await Promise.all([
      readFile(new URL('../../src/dapp/App.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../../src/dapp/contract.ts', import.meta.url), 'utf8'),
    ])
    expect(app).not.to.match(/functionName\s*:\s*['"]castVote['"]|confirmVote\s*=/)
    expect(abi).not.to.match(/name\s*:\s*['"]castVote['"]|candidateId/)
    expect(app).to.include('Voting is disabled in this app')
    expect(app).to.include('Voting disabled')
    expect(app).to.include('const canTransact = false')
    expect(app).to.include('Administrative writes and ballots are disabled')
  })

  it('does not persist ballot choice or encode it in active-app URLs', async function () {
    const app = await readFile(new URL('../../src/dapp/App.tsx', import.meta.url), 'utf8')
    expect(app).not.to.match(/localStorage|sessionStorage|indexedDB|URLSearchParams/)
    expect(app).to.include("const nextHash = next === 'verify' ? '#/verify-election' : '#/'")
    expect(app).not.to.match(/confirmCandidate|selectedCandidate|candidateId/)
  })
})