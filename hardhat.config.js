import dotenv from 'dotenv'
import { defineConfig } from 'hardhat/config'
import hardhatToolboxMochaEthers from '@nomicfoundation/hardhat-toolbox-mocha-ethers'

dotenv.config({ path: '.env.local' })

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  paths: {
    sources: './blockchain/contracts',
    tests: './blockchain/test',
    artifacts: './blockchain/artifacts',
    cache: './blockchain/cache',
  },
  networks: {
    localhost: {
      type: 'http',
      chainType: 'l1',
      url: process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545',
    },
    sepolia: {
      type: 'http',
      chainType: 'l1',
      url: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
      accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
    },
  },
  solidity: {
    profiles: {
      default: {
        version: '0.8.28',
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    },
  },
})