import { createPublicClient, fallback, http, type Address } from 'viem'
import { hardhat, sepolia } from 'wagmi/chains'
import { createConfig, injected } from 'wagmi'

export const supportedChains = [hardhat, sepolia] as const

function configuredRpcUrls(chainId: number) {
  const primary = chainId === hardhat.id ? import.meta.env.VITE_LOCAL_RPC_URL : import.meta.env.VITE_SEPOLIA_RPC_URL
  const additional = chainId === hardhat.id ? import.meta.env.VITE_LOCAL_RPC_URLS : import.meta.env.VITE_SEPOLIA_RPC_URLS
  const urls = [primary, ...(additional || '').split(',')]
    .map((url) => url?.trim())
    .filter((url): url is string => Boolean(url))
  return [...new Set(urls)]
}

function readTransport(chainId: number) {
  const urls = configuredRpcUrls(chainId)
  const transports = urls.length ? urls.map((url) => http(url)) : [http()]
  return transports.length === 1 ? transports[0] : fallback(transports)
}

export const walletConfig = createConfig({
  chains: supportedChains,
  connectors: [injected()],
  transports: {
    [hardhat.id]: readTransport(hardhat.id),
    [sepolia.id]: readTransport(sepolia.id),
  },
})

export const contractAddress = (import.meta.env.VITE_VOTING_CONTRACT_ADDRESS || '') as Address
export const configuredChainId = Number(import.meta.env.VITE_CHAIN_ID || 0)

const readClients = new Map<number, ReturnType<typeof createPublicClient>>()

export function getReadClient(chainId: number) {
  const chain = supportedChains.find((candidate) => candidate.id === chainId)
  if (!chain) return undefined

  let client = readClients.get(chainId)
  if (!client) {
    client = createPublicClient({ chain, transport: readTransport(chainId) })
    readClients.set(chainId, client)
  }
  return client
}

export async function assertReadChain(client: NonNullable<ReturnType<typeof getReadClient>>, expectedChainId = configuredChainId) {
  const actualChainId = await client.getChainId()
  if (actualChainId !== expectedChainId) {
    throw new Error(`RPC chain mismatch: expected ${expectedChainId}, received ${actualChainId}`)
  }
}

export function chainName(chainId: number | undefined) {
  return supportedChains.find((chain) => chain.id === chainId)?.name || `Unknown network${chainId ? ` (${chainId})` : ''}`
}

export function explorerTransactionUrl(chainId: number, hash: string) {
  if (chainId === sepolia.id) return `https://sepolia.etherscan.io/tx/${hash}`
  return undefined
}