import { expect } from 'chai'
import { network } from 'hardhat'

describe('VotingSystem', function () {
  let ethers
  let networkHelpers
  let owner
  let voter
  let outsider
  let votingSystem
  let electionId
  let startsAt
  let endsAt

  async function startElection() {
    await networkHelpers.time.increase(61)
    await votingSystem.startElection(electionId)
  }

  beforeEach(async function () {
    ;({ ethers, networkHelpers } = await network.create())
    ;[owner, voter, outsider] = await ethers.getSigners()
    votingSystem = await ethers.deployContract('VotingSystem')

    const latestBlock = await ethers.provider.getBlock('latest')
    startsAt = BigInt(latestBlock.timestamp + 60)
    endsAt = startsAt + 120n
    electionId = 0n

    await votingSystem.createElection('Student Council 2026', 'ipfs://election-metadata')
    await votingSystem.addCandidate(electionId, 'Candidate One', 'ipfs://candidate-one')
    await votingSystem.addCandidate(electionId, 'Candidate Two', 'ipfs://candidate-two')
    await votingSystem.setEligibility(electionId, voter.address, true)
    await votingSystem.scheduleElection(electionId, startsAt, endsAt)
  })

  it('assigns administration to the deployer and schedules the created election', async function () {
    expect(await votingSystem.owner()).to.equal(owner.address)
    expect(await votingSystem.getElectionStatus(electionId)).to.equal(1n)
    await expect(votingSystem.connect(outsider).createElection('Unauthorized', ''))
      .to.be.revertedWithCustomError(votingSystem, 'OwnableUnauthorizedAccount')
  })

  it('rejects invalid schedules and prevents starting before the scheduled time', async function () {
    const now = BigInt((await ethers.provider.getBlock('latest')).timestamp)
    await votingSystem.createElection('Invalid Schedule', '')
    await expect(votingSystem.scheduleElection(1n, now, now + 60n)).to.be.revertedWith('Invalid schedule')
    await expect(votingSystem.startElection(electionId)).to.be.revertedWith('Election has not started')
  })

  it('rejects candidate and eligibility changes from non-admin accounts', async function () {
    await expect(votingSystem.connect(outsider).addCandidate(electionId, 'Other', ''))
      .to.be.revertedWithCustomError(votingSystem, 'OwnableUnauthorizedAccount')
    await expect(votingSystem.connect(outsider).setEligibility(electionId, outsider.address, true))
      .to.be.revertedWithCustomError(votingSystem, 'OwnableUnauthorizedAccount')
  })

  it('prevents voting before the election is active', async function () {
    await expect(votingSystem.connect(voter).castVote(electionId, 0n)).to.be.revertedWith('Election is not active')
  })

  it('requires an eligible voter and a valid candidate', async function () {
    await startElection()
    await expect(votingSystem.connect(outsider).castVote(electionId, 0n)).to.be.revertedWith('Voter is not eligible')
    await expect(votingSystem.connect(voter).castVote(electionId, 2n)).to.be.revertedWith('Invalid candidate')
  })

  it('records one ballot per eligible wallet and rejects reuse', async function () {
    await startElection()
    await votingSystem.connect(voter).castVote(electionId, 1n)

    expect(await votingSystem.connect(voter).hasVoted(electionId)).to.equal(true)
    await expect(votingSystem.connect(voter).castVote(electionId, 0n)).to.be.revertedWith('Voter has already voted')
  })

  it('blocks voting while paused and permits resuming before the end time', async function () {
    await startElection()
    await votingSystem.pauseElection(electionId)
    await expect(votingSystem.connect(voter).castVote(electionId, 0n)).to.be.revertedWith('Election is not active')

    await votingSystem.resumeElection(electionId)
    await votingSystem.connect(voter).castVote(electionId, 0n)
    expect(await votingSystem.connect(voter).hasVoted(electionId)).to.equal(true)
  })

  it('does not allow pausing after the voting deadline', async function () {
    await startElection()
    await networkHelpers.time.increase(180)
    await expect(votingSystem.pauseElection(electionId)).to.be.revertedWith('Voting period has ended')
  })

  it('locks candidates and eligibility after voting starts', async function () {
    await startElection()
    await expect(votingSystem.addCandidate(electionId, 'Late Candidate', ''))
      .to.be.revertedWith('Election locked')
    await expect(votingSystem.setEligibility(electionId, outsider.address, true))
      .to.be.revertedWith('Election locked')
  })

  it('ends only after the voting deadline and finalizes reproducible results', async function () {
    await startElection()
    await votingSystem.connect(voter).castVote(electionId, 1n)
    await expect(votingSystem.endElection(electionId)).to.be.revertedWith('Election is still open')
    await expect(votingSystem.getResults(electionId)).to.be.revertedWith('Results are not finalized')

    await networkHelpers.time.increase(180)
    await expect(votingSystem.connect(outsider).endElection(electionId))
      .to.emit(votingSystem, 'ElectionStateChanged')
      .withArgs(electionId, 4n)
    await votingSystem.connect(outsider).finalizeElection(electionId)

    const [totalVotes, finalizedAt, results] = await votingSystem.getResults(electionId)
    expect(totalVotes).to.equal(1n)
    expect(finalizedAt).to.be.greaterThan(0n)
    expect(results[0].voteCount).to.equal(0n)
    expect(results[1].voteCount).to.equal(1n)
    expect((await votingSystem.getElection(electionId)).totalVotes).to.equal(1n)
  })

  it('rejects voting at or after the end timestamp', async function () {
    await startElection()
    await networkHelpers.time.increase(180)
    await expect(votingSystem.connect(voter).castVote(electionId, 0n)).to.be.revertedWith('Outside voting window')
  })
})