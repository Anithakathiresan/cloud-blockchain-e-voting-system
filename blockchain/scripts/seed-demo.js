import { network } from 'hardhat'

const connection = await network.create()
const { ethers } = connection
const [admin, voterOne, voterTwo, voterThree] = await ethers.getSigners()
const chainId = Number((await ethers.provider.getNetwork()).chainId)
if (chainId !== 31337) throw new Error('Demo seeding is restricted to the local Hardhat chain (31337).')

const deployment = await import(`../deployments/${connection.networkName}.json`, { with: { type: 'json' } })
const contract = await ethers.getContractAt('VotingSystem', deployment.default.contractAddress)
const currentBlock = await ethers.provider.getBlock('latest')
if (!currentBlock) throw new Error('Unable to read the local chain clock')

const electionId = await contract.nextElectionId()
await (await contract.createElection('DEMO: Student Council Election', 'ipfs://demo/student-council-election')).wait()
await (await contract.addCandidate(electionId, 'DEMO: Asha Raman', 'ipfs://demo/candidates/asha')).wait()
await (await contract.addCandidate(electionId, 'DEMO: Dev Patel', 'ipfs://demo/candidates/dev')).wait()
await (await contract.addCandidate(electionId, 'DEMO: Mina Joseph', 'ipfs://demo/candidates/mina')).wait()

for (const voter of [voterOne, voterTwo, voterThree]) {
  await (await contract.setEligibility(electionId, await voter.getAddress(), true)).wait()
}

const startsAt = BigInt(currentBlock.timestamp + 60)
const endsAt = startsAt + 300n
await (await contract.scheduleElection(electionId, startsAt, endsAt)).wait()

console.log(`DEMO election ${electionId} created on chain ${chainId}.`)
console.log(`DEMO admin wallet: ${await admin.getAddress()}`)
console.log(`DEMO eligible voter wallets: ${[voterOne, voterTwo, voterThree].map((voter) => voter.address).join(', ')}`)
console.log(`Voting opens at ${new Date(Number(startsAt) * 1000).toISOString()}.`)