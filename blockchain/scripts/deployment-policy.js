export function assertLegacyDeploymentNetwork(chainId) {
  if (BigInt(chainId) !== 31337n) {
    throw new Error('Refusing to deploy LEGACY_PUBLIC_VOTE_CONTRACT outside local Hardhat chain 31337.')
  }
}