/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAIN_ID?: string
  readonly VITE_VOTING_CONTRACT_ADDRESS?: string
  readonly VITE_LOCAL_RPC_URL?: string
  readonly VITE_LOCAL_RPC_URLS?: string
  readonly VITE_SEPOLIA_RPC_URL?: string
  readonly VITE_SEPOLIA_RPC_URLS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}