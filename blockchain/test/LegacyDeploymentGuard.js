import { expect } from 'chai'
import { assertLegacyDeploymentNetwork } from '../scripts/deployment-policy.js'

describe('Legacy public-contract deployment guard', function () {
  it('permits only the local Hardhat chain', function () {
    expect(() => assertLegacyDeploymentNetwork(31337n)).not.to.throw()
  })

  it('refuses Sepolia and other public networks', function () {
    expect(() => assertLegacyDeploymentNetwork(11155111n))
      .to.throw('Refusing to deploy LEGACY_PUBLIC_VOTE_CONTRACT outside local Hardhat chain 31337.')
  })
})