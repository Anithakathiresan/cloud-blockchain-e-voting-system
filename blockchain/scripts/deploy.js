import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { network } from 'hardhat'
import { assertLegacyDeploymentNetwork } from './deployment-policy.js'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const connection = await network.create()
const { ethers } = connection
const [deployer] = await ethers.getSigners()
const networkInfo = await ethers.provider.getNetwork()
assertLegacyDeploymentNetwork(networkInfo.chainId)
const contract = await ethers.deployContract('VotingSystem')
await contract.waitForDeployment()

const deploymentTransaction = contract.deploymentTransaction()
if (!deploymentTransaction) throw new Error('Missing contract deployment transaction')
const receipt = await deploymentTransaction.wait()
if (!receipt) throw new Error('Contract deployment was not confirmed')

const address = await contract.getAddress()
const artifactPath = resolve(currentDirectory, '../artifacts/blockchain/contracts/VotingSystem.sol/VotingSystem.json')
const artifact = JSON.parse(await readFile(artifactPath, 'utf8'))
const deployment = {
  network: connection.networkName,
  chainId: Number(networkInfo.chainId),
  contractAddress: address,
  deployer: await deployer.getAddress(),
  deploymentBlock: receipt.blockNumber,
  abi: artifact.abi,
}
const outputDirectory = resolve(currentDirectory, '../deployments')
await mkdir(outputDirectory, { recursive: true })
const outputPath = resolve(outputDirectory, `${connection.networkName}.json`)
await writeFile(outputPath, `${JSON.stringify(deployment, null, 2)}\n`)

console.log(`Network: ${deployment.network}`)
console.log(`Chain ID: ${deployment.chainId}`)
console.log(`Contract Address: ${deployment.contractAddress}`)
console.log(`Deployment Block: ${deployment.deploymentBlock}`)
console.log(`ABI and deployment manifest: ${outputPath}`)