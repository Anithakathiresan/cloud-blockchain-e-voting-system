import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronRight, CircleAlert, ExternalLink, Fingerprint, LoaderCircle, LockKeyhole, Plus, RefreshCw, ShieldCheck, Vote, Wallet, X } from 'lucide-react'
import { useAccount, useConnect, useDisconnect, useSignMessage, useSwitchChain, useWriteContract } from 'wagmi'
import { isAddress, keccak256, recoverMessageAddress, stringToHex, type Address, type Hash } from 'viem'
import { assertReadChain, chainName, configuredChainId, contractAddress, explorerTransactionUrl, getReadClient, supportedChains } from './config'
import { votingSystemAbi } from './contract'

type ChainElection = {
  id: bigint
  name: string
  metadataURI: string
  startsAt: bigint
  endsAt: bigint
  status: number
  totalVotes: bigint
  finalizedAt: bigint
  candidates: { id: bigint; name: string; metadataURI: string }[]
}

type TransactionState = {
  label: string
  state: 'awaiting_wallet' | 'submitted' | 'confirming' | 'confirmed' | 'timeout' | 'failed' | 'rejected'
  hash?: Hash
  blockNumber?: bigint
  message?: string
}

const statusNames = ['Draft', 'Scheduled', 'Active', 'Paused', 'Ended', 'Finalized']
const statusClasses = ['draft', 'scheduled', 'active', 'paused', 'ended', 'finalized']
const eventNames = new Map<string, string>([
  [keccak256(stringToHex('ElectionCreated(uint256,string,string)')), 'Election created'],
  [keccak256(stringToHex('ElectionScheduled(uint256,uint64,uint64)')), 'Election scheduled'],
  [keccak256(stringToHex('ElectionStateChanged(uint256,uint8)')), 'Election state changed'],
  [keccak256(stringToHex('CandidateAdded(uint256,uint256,string,string)')), 'Candidate added'],
  [keccak256(stringToHex('EligibilityUpdated(uint256,bytes32,bool)')), 'Eligibility updated'],
  [keccak256(stringToHex('VoteCast(uint256,uint256)')), 'Ballot cast (choice visible on-chain)'],
  [keccak256(stringToHex('ElectionFinalized(uint256,uint256,uint64)')), 'Election finalized'],
])

function humanError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (/user rejected|denied transaction|request rejected/i.test(message)) return 'Transaction rejected in wallet.'
  if (/insufficient funds/i.test(message)) return 'This wallet does not have enough test ETH to pay transaction gas.'
  if (/wrong chain|chain mismatch/i.test(message)) return 'Switch to the configured network and retry.'
  if (/already voted/i.test(message)) return 'This wallet has already submitted a ballot for this election.'
  if (/not eligible/i.test(message)) return 'This wallet is not eligible for this election.'
  if (/not started|outside voting window/i.test(message)) return 'Voting is not open at the current block time.'
  if (/election is still open/i.test(message)) return 'The configured end time has not passed yet.'
  if (/locked/i.test(message)) return 'Election rules are locked after voting starts.'
  return 'The blockchain rejected this request. Check the election state and wallet network.'
}

function dateLabel(timestamp: bigint) {
  if (timestamp === 0n) return 'Not scheduled'
  return new Date(Number(timestamp) * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function Panel({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{title && <h2 className="panel-title">{title}</h2>}{children}</section>
}

function App() {
  const queryClient = useQueryClient()
  const account = useAccount()
  const { connectors, connect, isPending: isConnecting, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const { signMessageAsync, isPending: isSigning } = useSignMessage()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()
  const { writeContractAsync, isPending: isWriting } = useWriteContract()
  const [walletVerifiedAddress, setAuthenticatedAddress] = useState<Address>()
  const [selectedElectionId, setSelectedElectionId] = useState<bigint>()
  const [section, setSection] = useState<'elections' | 'admin' | 'audit' | 'verify'>(() => window.location.hash === '#/verify-election' ? 'verify' : 'elections')
  const [transaction, setTransaction] = useState<TransactionState>()
  const [isCheckingReceipt, setIsCheckingReceipt] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [electionName, setElectionName] = useState('')
  const [electionMetadataURI, setElectionMetadataURI] = useState('')
  const [scheduleStart, setScheduleStart] = useState('')
  const [scheduleEnd, setScheduleEnd] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [candidateMetadataURI, setCandidateMetadataURI] = useState('')
  const [eligibilityAddress, setEligibilityAddress] = useState('')
  const [eligibilityValue, setEligibilityValue] = useState(true)
  const [recentEvents, setRecentEvents] = useState<{ title: string; block: bigint; hash: Hash }[]>([])
  const [auditError, setAuditError] = useState('')
  const [verifyChainId, setVerifyChainId] = useState<number>(() => supportedChains.find((chain) => chain.id === configuredChainId)?.id || supportedChains[0].id)
  const [verifyAddress, setVerifyAddress] = useState<string>(contractAddress)
  const [verifyElectionId, setVerifyElectionId] = useState('0')

  const configuredChain = supportedChains.find((chain) => chain.id === configuredChainId)
  const addressIsConfigured = isAddress(contractAddress)
  const networkMatches = Boolean(configuredChain && account.chainId === configuredChainId)
  const canTransact = false
  const readClient = useMemo(() => getReadClient(configuredChainId), [])

  const navigateSection = (next: 'elections' | 'admin' | 'audit' | 'verify') => {
    setSection(next)
    const nextHash = next === 'verify' ? '#/verify-election' : '#/'
    if (window.location.hash !== nextHash) window.history.pushState(null, '', nextHash)
  }

  useEffect(() => {
    const syncSection = () => setSection(window.location.hash === '#/verify-election' ? 'verify' : 'elections')
    window.addEventListener('popstate', syncSection)
    window.addEventListener('hashchange', syncSection)
    return () => {
      window.removeEventListener('popstate', syncSection)
      window.removeEventListener('hashchange', syncSection)
    }
  }, [])

  useEffect(() => {
    setAuthenticatedAddress(undefined)
  }, [account.address, account.chainId])

  const electionsQuery = useQuery({
    queryKey: ['chain-elections', configuredChainId, contractAddress],
    enabled: Boolean(readClient && addressIsConfigured && configuredChain),
    queryFn: async (): Promise<ChainElection[]> => {
      if (!readClient || !addressIsConfigured) return []
      await assertReadChain(readClient)
      const count = await readClient.readContract({ address: contractAddress, abi: votingSystemAbi, functionName: 'nextElectionId' })
      return Promise.all(Array.from({ length: Number(count) }, async (_, index) => {
        const id = BigInt(index)
        const [election, candidates] = await Promise.all([
          readClient.readContract({ address: contractAddress, abi: votingSystemAbi, functionName: 'getElection', args: [id] }),
          readClient.readContract({ address: contractAddress, abi: votingSystemAbi, functionName: 'getCandidates', args: [id] }),
        ])
        return { ...election, candidates } as ChainElection
      }))
    },
    refetchInterval: 12_000,
  })

  const elections = electionsQuery.data || []
  const selectedElection = elections.find((election) => election.id === selectedElectionId) || elections[0]

  useEffect(() => {
    if (selectedElection && selectedElection.id !== selectedElectionId) setSelectedElectionId(selectedElection.id)
  }, [selectedElection, selectedElectionId])

  const ownerQuery = useQuery({
    queryKey: ['chain-owner', configuredChainId, contractAddress],
    enabled: Boolean(readClient && addressIsConfigured && configuredChain),
    queryFn: async () => {
      await assertReadChain(readClient!)
      return readClient!.readContract({ address: contractAddress, abi: votingSystemAbi, functionName: 'owner' })
    },
  })
  const isAdmin = Boolean(account.address && ownerQuery.data && account.address.toLowerCase() === ownerQuery.data.toLowerCase())

  const voterStateQuery = useQuery({
    queryKey: ['voter-state', configuredChainId, contractAddress, account.address, selectedElection?.id.toString()],
    enabled: Boolean(readClient && addressIsConfigured && account.address && selectedElection && networkMatches),
    queryFn: async () => {
      if (!readClient || !account.address || !selectedElection) return { eligible: false, hasVoted: false }
      await assertReadChain(readClient)
      const [eligible, hasVoted] = await Promise.all([
        readClient.readContract({ address: contractAddress, abi: votingSystemAbi, functionName: 'isEligible', args: [selectedElection.id], account: account.address }),
        readClient.readContract({ address: contractAddress, abi: votingSystemAbi, functionName: 'hasVoted', args: [selectedElection.id], account: account.address }),
      ])
      return { eligible, hasVoted }
    },
  })

  const resultsQuery = useQuery({
    queryKey: ['election-results', configuredChainId, contractAddress, selectedElection?.id.toString()],
    enabled: Boolean(readClient && addressIsConfigured && selectedElection?.status === 5),
    queryFn: async () => {
      if (!readClient || !selectedElection) return undefined
      await assertReadChain(readClient)
      return readClient.readContract({ address: contractAddress, abi: votingSystemAbi, functionName: 'getResults', args: [selectedElection.id] })
    },
  })

  const verifyIdIsValid = /^(0|[1-9]\d{0,77})$/.test(verifyElectionId) && BigInt(verifyElectionId || '0') <= (1n << 256n) - 1n
  const verifyAddressIsValid = isAddress(verifyAddress)
  const verificationQuery = useQuery({
    queryKey: ['verify-election', verifyChainId, verifyAddress.toLowerCase(), verifyElectionId],
    enabled: section === 'verify' && verifyIdIsValid && verifyAddressIsValid,
    queryFn: async () => {
      const client = getReadClient(verifyChainId)
      if (!client) throw new Error('No read RPC is configured for this supported network.')
      await assertReadChain(client, verifyChainId)
      const address = verifyAddress as Address
      const code = await client.getBytecode({ address })
      if (!code || code === '0x') throw new Error('No contract bytecode exists at this address on the selected network.')
      const id = BigInt(verifyElectionId)
      const [election, candidates] = await Promise.all([
        client.readContract({ address, abi: votingSystemAbi, functionName: 'getElection', args: [id] }),
        client.readContract({ address, abi: votingSystemAbi, functionName: 'getCandidates', args: [id] }),
      ])
      const result = election.status === 5
        ? await client.readContract({ address, abi: votingSystemAbi, functionName: 'getResults', args: [id] })
        : undefined
      const resultTotal = result?.[2].reduce((total, candidate) => total + candidate.voteCount, 0n)
      return {
        chainId: verifyChainId,
        address,
        codeHash: keccak256(code),
        election,
        candidates,
        result,
        tallyConsistent: result ? resultTotal === result[0] && result[0] === election.totalVotes : undefined,
      }
    },
    retry: false,
  })

  const invalidateChainData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['chain-elections'] }),
      queryClient.invalidateQueries({ queryKey: ['chain-owner'] }),
      queryClient.invalidateQueries({ queryKey: ['voter-state'] }),
      queryClient.invalidateQueries({ queryKey: ['election-results'] }),
    ])
  }

  const submit = async (label: string, send: () => Promise<Hash>) => {
    setErrorMessage('')
    setTransaction({ label, state: 'awaiting_wallet' })
    let hash: Hash
    try {
      hash = await send()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      const rejected = /user rejected|denied transaction|request rejected/i.test(message)
      setTransaction({ label, state: rejected ? 'rejected' : 'failed' })
      setErrorMessage(humanError(error))
      throw error
    }

    setTransaction({ label, state: 'submitted', hash })
    if (!readClient) {
      setTransaction({ label, state: 'submitted', hash, message: 'Transaction submitted; no configured read RPC is available to confirm it. Do not resubmit until you verify this hash.' })
      return hash
    }

    setTransaction({ label, state: 'confirming', hash })
    let receipt
    try {
      await assertReadChain(readClient)
      receipt = await readClient.waitForTransactionReceipt({ hash, timeout: 120_000 })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      const timedOut = /timeout|timed out/i.test(message)
      setTransaction({
        label,
        state: timedOut ? 'timeout' : 'submitted',
        hash,
        message: 'The wallet submitted this transaction, but confirmation could not be verified. Check the transaction hash on the selected network before taking another action.',
      })
      setErrorMessage('Transaction may still be pending. Verify its hash before attempting another transaction.')
      return hash
    }

    if (receipt.status === 'reverted') {
      setTransaction({ label, state: 'failed', hash, blockNumber: receipt.blockNumber, message: 'The chain included this transaction but execution reverted.' })
      setErrorMessage('Transaction failed on-chain. The transaction hash is retained for verification.')
      return hash
    }
    setTransaction({ label, state: 'confirmed', hash, blockNumber: receipt.blockNumber, message: 'Included in a block; this is not a finality guarantee.' })
    try {
      await invalidateChainData()
    } catch {
      setErrorMessage('Transaction inclusion was confirmed, but election data could not be refreshed.')
    }
    return hash
  }

  const run = (label: string, action: () => Promise<Hash>) => {
    void submit(label, action).catch(() => undefined)
  }

  const checkTransactionReceipt = async () => {
    if (!transaction?.hash || !readClient) return
    setIsCheckingReceipt(true)
    setTransaction({ ...transaction, state: 'confirming', message: 'Checking this hash; no transaction will be resubmitted.' })
    let receipt
    try {
      await assertReadChain(readClient)
      receipt = await readClient.waitForTransactionReceipt({ hash: transaction.hash, timeout: 120_000 })
    } catch {
      setTransaction({ ...transaction, state: 'timeout', message: 'Receipt is still unavailable. Verify the hash on an independent provider before taking action.' })
      setIsCheckingReceipt(false)
      return
    }

    if (receipt.status === 'reverted') {
      setTransaction({ ...transaction, state: 'failed', blockNumber: receipt.blockNumber, message: 'The chain included this transaction but execution reverted.' })
    } else {
      setTransaction({ ...transaction, state: 'confirmed', blockNumber: receipt.blockNumber, message: 'Included in a block; this is not a finality guarantee.' })
      try {
        await invalidateChainData()
      } catch {
        setErrorMessage('Transaction inclusion was confirmed, but election data could not be refreshed.')
      }
    }
    setIsCheckingReceipt(false)
  }

  const verifyWalletControl = async () => {
    if (!account.address) return
    setErrorMessage('')
    try {
      const message = [
        'College E-Voting wallet control check',
        `Address: ${account.address}`,
        `Chain ID: ${account.chainId}`,
        `Nonce: ${window.crypto.randomUUID()}`,
        'This signature does not authorize a vote or spend funds.',
      ].join('\n')
      const signature = await signMessageAsync({ message })
      const recoveredAddress = await recoverMessageAddress({ message, signature })
      if (recoveredAddress.toLowerCase() !== account.address.toLowerCase()) throw new Error('Signature address did not match wallet')
      setAuthenticatedAddress(recoveredAddress)
    } catch (error) {
      setErrorMessage(humanError(error))
    }
  }

  const connectWallet = () => {
    const connector = connectors[0]
    if (!connector) {
      setErrorMessage('No injected wallet was found. Install MetaMask or another EIP-1193 wallet.')
      return
    }
    connect({ connector })
  }

  const createElection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canTransact || !electionName.trim()) return
    run('Create election', () => writeContractAsync({
      address: contractAddress,
      abi: votingSystemAbi,
      functionName: 'createElection',
      args: [electionName.trim(), electionMetadataURI.trim()],
    }))
    setElectionName('')
    setElectionMetadataURI('')
  }

  const scheduleElection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canTransact || !selectedElection) return
    const start = Math.floor(new Date(scheduleStart).getTime() / 1000)
    const end = Math.floor(new Date(scheduleEnd).getTime() / 1000)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= Date.now() / 1000 || end <= start) {
      setErrorMessage('Choose a future start time and an end time after it.')
      return
    }
    run('Schedule election', () => writeContractAsync({
      address: contractAddress,
      abi: votingSystemAbi,
      functionName: 'scheduleElection',
      args: [selectedElection.id, BigInt(start), BigInt(end)],
    }))
  }

  const addCandidate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canTransact || !selectedElection || !candidateName.trim()) return
    run('Add candidate', () => writeContractAsync({
      address: contractAddress,
      abi: votingSystemAbi,
      functionName: 'addCandidate',
      args: [selectedElection.id, candidateName.trim(), candidateMetadataURI.trim()],
    }))
    setCandidateName('')
    setCandidateMetadataURI('')
  }

  const updateEligibility = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canTransact || !selectedElection) return
    if (!isAddress(eligibilityAddress)) {
      setErrorMessage('Enter a valid EVM wallet address.')
      return
    }
    run(eligibilityValue ? 'Authorize voter wallet' : 'Remove voter eligibility', () => writeContractAsync({
      address: contractAddress,
      abi: votingSystemAbi,
      functionName: 'setEligibility',
      args: [selectedElection.id, eligibilityAddress, eligibilityValue],
    }))
    setEligibilityAddress('')
  }

  const runElectionAction = (action: 'startElection' | 'pauseElection' | 'resumeElection' | 'endElection' | 'finalizeElection') => {
    if (!canTransact || !selectedElection) return
    const labels = {
      startElection: 'Start election',
      pauseElection: 'Pause election',
      resumeElection: 'Resume election',
      endElection: 'End election',
      finalizeElection: 'Finalize results',
    }
    run(labels[action], () => writeContractAsync({
      address: contractAddress,
      abi: votingSystemAbi,
      functionName: action,
      args: [selectedElection.id],
    }))
  }

  const loadAudit = async () => {
    if (!readClient || !addressIsConfigured) return
    setAuditError('')
    try {
      await assertReadChain(readClient)
      const latest = await readClient.getBlockNumber()
      const fromBlock = latest > 10_000n ? latest - 10_000n : 0n
      const logs = await readClient.getLogs({ address: contractAddress, fromBlock, toBlock: latest })
      setRecentEvents(logs.slice(-12).reverse().map((log) => ({
        title: eventNames.get(log.topics[0] || '') || 'Unrecognized contract event',
        block: log.blockNumber || 0n,
        hash: log.transactionHash || `0x${'0'.repeat(64)}`,
      })))
    } catch {
      setAuditError('Audit records could not be verified from the configured RPC. Check the network and retry.')
      setRecentEvents([])
    }
  }

  useEffect(() => {
    if (section === 'audit') void loadAudit()
  }, [section, configuredChainId, contractAddress])

  const transactionUrl = transaction?.hash ? explorerTransactionUrl(configuredChainId, transaction.hash) : undefined
  const transactionPending = transaction?.state === 'awaiting_wallet' || transaction?.state === 'submitted' || transaction?.state === 'confirming'
  const expectedNetworkName = configuredChain ? chainName(configuredChain.id) : 'Not configured'
  const status = selectedElection ? statusNames[selectedElection.status] || 'Unknown' : 'No election selected'
  const canManageElection = Boolean(isAdmin && canTransact && selectedElection)
  const voterState = voterStateQuery.data
  const resultData = resultsQuery.data
  const winningTotal = resultData ? resultData[0] : 0n

  return (
    <div className="dapp-shell">
      <header className="topbar">
        <a className="brand" href="#/" aria-label="College E-Voting home">
          <span className="brand-mark"><Vote size={21} aria-hidden="true" /></span>
          <span><strong>College E-Voting</strong><small>On-chain election portal</small></span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={section === 'elections' ? 'nav-item selected' : 'nav-item'} onClick={() => navigateSection('elections')}>Elections</button>
          {isAdmin && <button className={section === 'admin' ? 'nav-item selected' : 'nav-item'} onClick={() => navigateSection('admin')}>Administration</button>}
          <button className={section === 'verify' ? 'nav-item selected' : 'nav-item'} onClick={() => navigateSection('verify')}>Verify election</button>
          <button className={section === 'audit' ? 'nav-item selected' : 'nav-item'} onClick={() => navigateSection('audit')}>Audit log</button>
        </nav>
        <div className="wallet-area">
          <span className={`network-chip ${networkMatches ? 'network-ok' : ''}`}><span className="status-dot" />{account.isConnected ? chainName(account.chainId) : expectedNetworkName}</span>
          {account.isConnected && account.address ? (
            <div className="account-menu">
              <span className="account-address" title={account.address}>{shortAddress(account.address)}</span>
              <button className="button button-quiet button-small" onClick={() => disconnect()} aria-label="Disconnect wallet">Disconnect</button>
            </div>
          ) : (
            <button className="button button-dark button-small" onClick={connectWallet} disabled={isConnecting}>
              <Wallet size={15} aria-hidden="true" />{isConnecting ? 'Connecting…' : 'Connect wallet'}
            </button>
          )}
        </div>
      </header>

      <main>
        <section className="hero-band">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-rule" />COLLEGE ELECTIONS ON EVM</p>
            <h1>Secure. Transparent.<br /><em>Decentralized voting.</em></h1>
            <p className="hero-description">Election rules, eligibility checks, ballots and finalized counts are enforced by a Solidity contract. Your wallet signs every action; there is no voting API or central vote database.</p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={() => navigateSection('elections')}>Explore elections <ChevronRight size={16} aria-hidden="true" /></button>
              {!account.isConnected && <button className="button button-outline" onClick={connectWallet}><Wallet size={16} aria-hidden="true" /> Connect wallet</button>}
            </div>
          </div>
          <div className="hero-seal" aria-hidden="true">
            <div className="seal-orbit orbit-one" /><div className="seal-orbit orbit-two" />
            <div className="seal-core"><ShieldCheck size={42} strokeWidth={1.3} /><span>VERIFIABLE<br />BY DESIGN</span></div>
            <span className="seal-node node-a" /><span className="seal-node node-b" /><span className="seal-node node-c" />
          </div>
          <div className="hero-index"><span>01</span><span className="hero-index-line" /><span>ON-CHAIN GOVERNANCE</span></div>
        </section>

        <section className="workspace-section">
          <div className="section-heading">
            <div><p className="eyebrow">LIVE CONTRACT DATA</p><h2>{section === 'elections' ? 'Elections' : section === 'admin' ? 'Administration' : section === 'verify' ? 'Verify election' : 'Audit log'}</h2></div>
            <div className="heading-meta"><span className="live-indicator" />{configuredChain ? expectedNetworkName : 'Network configuration required'}</div>
          </div>

          {!addressIsConfigured || !configuredChain ? (
            <Panel className="notice-panel">
              <CircleAlert size={21} aria-hidden="true" />
              <div><strong>Contract connection is not configured</strong><p>Set <code>VITE_CHAIN_ID</code> and <code>VITE_VOTING_CONTRACT_ADDRESS</code> to a deployed contract. No sample elections or local ballot data are shown.</p></div>
            </Panel>
          ) : electionsQuery.isLoading ? (
            <div className="loading-line"><LoaderCircle className="spin" size={20} /> Reading election state from {expectedNetworkName}…</div>
          ) : electionsQuery.isError ? (
            <Panel className="notice-panel"><CircleAlert size={21} /><div><strong>Unable to read election data</strong><p>Check that the RPC endpoint is available and the configured address contains the VotingSystem contract.</p><button className="button button-quiet button-small" onClick={() => void electionsQuery.refetch()}>Retry</button></div></Panel>
          ) : (
            <>
              <div className="workspace-grid">
                <Panel title="Election register" className="register-panel">
                  <div className="register-summary"><span>{elections.length.toString().padStart(2, '0')}</span><small>Published on this contract</small><button className="icon-button" onClick={() => void electionsQuery.refetch()} aria-label="Refresh elections"><RefreshCw size={16} /></button></div>
                  {elections.length === 0 ? <div className="empty-state"><Vote size={23} /><strong>No elections yet</strong><span>The contract has no created elections.</span></div> : (
                    <div className="election-list">
                      {[...elections].reverse().map((election) => (
                        <button key={election.id.toString()} className={`election-row ${selectedElection?.id === election.id ? 'is-selected' : ''}`} onClick={() => setSelectedElectionId(election.id)}>
                          <span className={`election-code code-${statusClasses[election.status] || 'draft'}`}>E{election.id.toString().padStart(3, '0')}</span>
                          <span className="election-row-main"><strong>{election.name}</strong><small>{statusNames[election.status] || 'Unknown state'} <span>·</span> {election.candidates.length} candidates</small></span>
                          <ChevronRight size={16} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                </Panel>

                {section === 'elections' && selectedElection && (
                  <Panel className="detail-panel">
                    <div className="detail-heading"><div><p className="eyebrow">ELECTION E{selectedElection.id.toString().padStart(3, '0')}</p><h3>{selectedElection.name}</h3></div><span className={`state-badge state-${statusClasses[selectedElection.status] || 'draft'}`}>{status}</span></div>
                    <div className="detail-facts">
                      <div><span>Voting opens</span><strong>{dateLabel(selectedElection.startsAt)}</strong></div>
                      <div><span>Voting closes</span><strong>{dateLabel(selectedElection.endsAt)}</strong></div>
                      <div><span>Finalized turnout</span><strong>{selectedElection.status === 5 ? selectedElection.totalVotes.toString() : 'Not published'}</strong></div>
                    </div>
                    <div className="candidate-heading"><h4>Candidate slate</h4><span>{selectedElection.candidates.length} listed</span></div>
                    {selectedElection.candidates.length === 0 ? <p className="muted-copy">Candidates have not been added to this election.</p> : (
                      <div className="candidate-list">
                        {selectedElection.candidates.map((candidate) => (
                          <div className="candidate-row" key={candidate.id.toString()}>
                            <span className="candidate-number">{(Number(candidate.id) + 1).toString().padStart(2, '0')}</span>
                            <span className="candidate-name"><strong>{candidate.name}</strong>{candidate.metadataURI && <small>{candidate.metadataURI}</small>}</span>
                            {selectedElection.status === 2 && voterState?.eligible && !voterState.hasVoted && (
                              <button className="button button-outline button-small" disabled title="This contract publishes the sender and candidate choice.">Voting disabled</button>
                                            )}
                            {selectedElection.status === 5 && resultData && <span className="candidate-result">{resultData[2][Number(candidate.id)]?.voteCount.toString() || '0'} votes</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="ballot-state">
                      {!account.isConnected ? <><LockKeyhole size={17} /><span>Connect a wallet to check eligibility and voting status.</span></> : !networkMatches ? <><CircleAlert size={17} /><span>Switch to {expectedNetworkName} before using contract functions.</span><button className="button button-small button-dark" onClick={() => void switchChainAsync({ chainId: configuredChainId })} disabled={isSwitching}>{isSwitching ? 'Switching…' : 'Switch network'}</button></> : walletVerifiedAddress !== account.address ? <><Fingerprint size={17} /><span>Sign a message to prove control of this wallet in this browser tab. This does not verify real-world identity.</span><button className="button button-small button-dark" onClick={() => void verifyWalletControl()} disabled={isSigning}>{isSigning ? 'Waiting for signature…' : 'Verify wallet'}</button></> : voterStateQuery.isLoading ? <><LoaderCircle className="spin" size={17} /><span>Checking eligibility on-chain…</span></> : selectedElection.status === 2 ? <><CircleAlert size={17} /><span>Voting is disabled in this app: the configured contract exposes the voter's wallet and candidate choice on-chain. No private ballot protocol is deployed.</span></> : voterState?.hasVoted ? <><Check size={17} /><span>This wallet has submitted a public ballot. Its candidate choice is visible on-chain.</span></> : voterState?.eligible ? <><ShieldCheck size={17} /><span>Wallet is eligible, but this contract does not provide ballot secrecy.</span></> : <><CircleAlert size={17} /><span>This wallet is not on the election eligibility list.</span></>}
                    </div>
                    {selectedElection.status === 5 && resultData && <div className="results-strip"><span>FINALIZED RESULTS</span><strong>{winningTotal.toString()} total ballots</strong><span>Finalized {dateLabel(resultData[1])}</span></div>}
                  </Panel>
                )}

                {section === 'admin' && (
                  <Panel className="detail-panel admin-panel">
                    <div className="detail-heading"><div><p className="eyebrow">LEGACY CONTRACT</p><h3>Election administration</h3></div>{isAdmin ? <span className="state-badge state-paused">Writes disabled</span> : <span className="state-badge state-paused">Read only</span>}</div>
                    <p className="muted-copy">This dApp is read-only for the legacy public-vote contract. Administrative writes and ballots are disabled because this contract cannot provide ballot secrecy.</p>
                    {!isAdmin ? <p className="muted-copy">Administrative transactions are enforced by Ownable in the contract. Connect the deployment owner wallet to manage elections.</p> : !selectedElection ? <p className="muted-copy">Create an election to begin configuration.</p> : (
                      <>
                        <div className="admin-selected"><span>Selected election</span><strong>{selectedElection.name}</strong><span className={`state-badge state-${statusClasses[selectedElection.status] || 'draft'}`}>{status}</span></div>
                        <div className="lifecycle-actions">
                          {selectedElection.status === 1 && <button className="button button-primary" disabled={!canManageElection || isWriting} onClick={() => runElectionAction('startElection')}>Start election</button>}
                          {selectedElection.status === 2 && <button className="button button-outline" disabled={!canManageElection || isWriting} onClick={() => runElectionAction('pauseElection')}>Pause voting</button>}
                          {selectedElection.status === 3 && <button className="button button-primary" disabled={!canManageElection || isWriting} onClick={() => runElectionAction('resumeElection')}>Resume voting</button>}
                          {selectedElection.status >= 1 && selectedElection.status <= 3 && Date.now() >= Number(selectedElection.endsAt) * 1000 && <button className="button button-outline" disabled={!canTransact || isWriting} onClick={() => runElectionAction('endElection')}>End election</button>}
                          {selectedElection.status === 4 && <button className="button button-primary" disabled={!canTransact || isWriting} onClick={() => runElectionAction('finalizeElection')}>Finalize results</button>}
                        </div>
                        {(selectedElection.status === 0 || selectedElection.status === 1) && (
                          <>
                            <form className="admin-form" onSubmit={addCandidate}>
                              <h4>Add candidate</h4>
                              <label>Candidate name<input value={candidateName} onChange={(event) => setCandidateName(event.target.value)} required maxLength={100} /></label>
                              <label>Candidate metadata URI<input value={candidateMetadataURI} onChange={(event) => setCandidateMetadataURI(event.target.value)} placeholder="ipfs://…" /></label>
                              <button className="button button-outline" type="submit" disabled={!canManageElection || isWriting}><Plus size={15} /> Add candidate</button>
                            </form>
                            {selectedElection.status === 0 && selectedElection.candidates.length > 0 && <form className="admin-form" onSubmit={scheduleElection}>
                              <h4>Schedule election</h4>
                              <label>Starts at<input type="datetime-local" value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} required /></label>
                              <label>Ends at<input type="datetime-local" value={scheduleEnd} onChange={(event) => setScheduleEnd(event.target.value)} required /></label>
                              <button className="button button-dark" type="submit" disabled={!canManageElection || isWriting}>Schedule</button>
                            </form>}
                            <form className="admin-form" onSubmit={updateEligibility}>
                              <h4>Voter eligibility</h4><p>Wallet addresses are public on EVM networks. This is not an anonymous eligibility proof.</p>
                              <label>Wallet address<input value={eligibilityAddress} onChange={(event) => setEligibilityAddress(event.target.value)} placeholder="0x…" required spellCheck={false} /></label>
                              <div className="inline-form-row"><select value={eligibilityValue ? 'true' : 'false'} onChange={(event) => setEligibilityValue(event.target.value === 'true')} aria-label="Eligibility action"><option value="true">Authorize wallet</option><option value="false">Remove eligibility</option></select><button className="button button-outline" type="submit" disabled={!canManageElection || isWriting}>Submit change</button></div>
                            </form>
                          </>
                        )}
                        {selectedElection.status >= 2 && <p className="locked-note"><LockKeyhole size={15} /> Candidate and eligibility changes are locked by the contract after voting starts.</p>}
                      </>
                    )}
                  </Panel>
                )}

                {section === 'audit' && (
                  <Panel className="detail-panel audit-panel">
                    <div className="detail-heading"><div><p className="eyebrow">PUBLIC CHAIN RECORD</p><h3>Recent contract transactions</h3></div><button className="icon-button" onClick={() => void loadAudit()} aria-label="Refresh audit log"><RefreshCw size={16} /></button></div>
                    <p className="muted-copy">These records come directly from the configured chain. Transaction input can expose a voter's choice to anyone inspecting the public ledger; this implementation does not provide ballot secrecy.</p>
                    {auditError ? <div className="empty-state"><span role="alert">{auditError}</span><button className="button button-quiet button-small" onClick={() => void loadAudit()}>Retry audit read</button></div> : recentEvents.length === 0 ? <div className="empty-state"><span>No contract events found in the recent block window.</span></div> : <div className="audit-list">{recentEvents.map((event, index) => <div className="audit-row" key={`${event.hash}-${index}`}><span className="audit-block">#{event.block.toString()}</span><span className="audit-event"><strong>{event.title}</strong><small>{shortAddress(event.hash)}</small></span>{explorerTransactionUrl(configuredChainId, event.hash) ? <a href={explorerTransactionUrl(configuredChainId, event.hash)} target="_blank" rel="noreferrer" aria-label="Open transaction in explorer"><ExternalLink size={15} /></a> : <span className="local-tag">Local</span>}</div>)}</div>}
                  </Panel>
                )}

                {section === 'verify' && (
                  <Panel className="detail-panel verify-panel">
                      <div className="detail-heading"><div><p className="eyebrow">READ-ONLY DIRECT CHAIN CHECK</p><h3>Verify legacy election state</h3></div><span className="state-badge state-scheduled">Legacy contract</span></div>
                    <form className="verify-form" onSubmit={(event) => { event.preventDefault(); if (verifyAddressIsValid && verifyIdIsValid) void verificationQuery.refetch() }}>
                      <label>Network<select value={verifyChainId} onChange={(event) => setVerifyChainId(Number(event.target.value))}>{supportedChains.map((chain) => <option key={chain.id} value={chain.id}>{chain.name} ({chain.id})</option>)}</select></label>
                      <label>Contract address<input value={verifyAddress} onChange={(event) => setVerifyAddress(event.target.value)} spellCheck={false} maxLength={42} required aria-invalid={!verifyAddressIsValid} /></label>
                      <label>Election ID<input value={verifyElectionId} onChange={(event) => setVerifyElectionId(event.target.value)} inputMode="numeric" maxLength={78} pattern="0|[1-9][0-9]*" required aria-invalid={!verifyIdIsValid} /></label>
                      <button className="button button-dark" type="submit" disabled={!verifyAddressIsValid || !verifyIdIsValid || verificationQuery.isFetching}><RefreshCw size={15} />{verificationQuery.isFetching ? 'Reading chain…' : 'Read election'}</button>
                    </form>
                    {verificationQuery.isError && <div className="inline-error" role="alert"><CircleAlert size={16} />{verificationQuery.error instanceof Error ? verificationQuery.error.message : 'Unable to verify election state from this RPC.'}</div>}
                    {verificationQuery.data && <div className="verification-result">
                      <div className="verification-status"><Check size={17} /><strong>Legacy contract state read from chain {verificationQuery.data.chainId}.</strong><span>This confirms RPC-readable state only; it is not source-code verification or an independent audit.</span></div>
                      <dl className="verification-facts"><div><dt>Contract</dt><dd title={verificationQuery.data.address}>{verificationQuery.data.address}</dd></div><div><dt>Runtime code hash</dt><dd title={verificationQuery.data.codeHash}>{verificationQuery.data.codeHash}</dd></div><div><dt>Election</dt><dd>{verificationQuery.data.election.name} (ID {verificationQuery.data.election.id.toString()})</dd></div><div><dt>State</dt><dd>{statusNames[verificationQuery.data.election.status] || 'Unknown'}</dd></div><div><dt>Schedule</dt><dd>{dateLabel(verificationQuery.data.election.startsAt)} to {dateLabel(verificationQuery.data.election.endsAt)}</dd></div><div><dt>Candidates</dt><dd>{verificationQuery.data.candidates.map((candidate) => candidate.name).join(', ') || 'None'}</dd></div>{verificationQuery.data.result && <><div><dt>Final total</dt><dd>{verificationQuery.data.result[0].toString()}</dd></div><div><dt>Tally consistency</dt><dd>{verificationQuery.data.tallyConsistent ? 'Candidate total matches contract total' : 'Mismatch; do not trust result'}</dd></div><div><dt>Finalized at</dt><dd>{dateLabel(verificationQuery.data.result[1])}</dd></div><div><dt>Candidate counts</dt><dd>{verificationQuery.data.result[2].map((candidate) => `${candidate.name}: ${candidate.voteCount.toString()}`).join(' · ')}</dd></div></>}</dl>
                      <p className="muted-copy">The deployed contract has no election configuration hash, candidate commitment, eligibility root, or result commitment. This view cannot establish those properties. Vote transactions publicly reveal sender and candidate ID.</p>
                    </div>}
                  </Panel>
                )}
              </div>

              {section === 'admin' && isAdmin && (
                <Panel title="Create an election draft" className="create-panel">
                  <form className="create-inline-form" onSubmit={createElection}>
                    <label>Election name<input value={electionName} onChange={(event) => setElectionName(event.target.value)} required maxLength={120} /></label>
                    <label>Public metadata URI<input value={electionMetadataURI} onChange={(event) => setElectionMetadataURI(event.target.value)} placeholder="ipfs://… (optional)" /></label>
                    <button className="button button-primary" type="submit" disabled={!canTransact || isWriting}><Plus size={15} /> Create draft</button>
                  </form>
                  <p className="muted-copy">A draft is created on-chain. Then select it above to add candidates, configure wallet eligibility, and schedule it.</p>
                </Panel>
              )}
            </>
          )}

          {account.isConnected && !walletVerifiedAddress && networkMatches && <div className="auth-banner"><Fingerprint size={18} /><span>Wallet connected as <strong>{account.address ? shortAddress(account.address) : ''}</strong>. A message signature checks wallet control in this tab only; it is not real-world identity verification.</span><button className="button button-dark button-small" onClick={() => void verifyWalletControl()} disabled={isSigning}>{isSigning ? 'Waiting for signature…' : 'Verify wallet'}</button></div>}
          {connectError && <div className="inline-error"><CircleAlert size={16} />{humanError(connectError)}</div>}
          {errorMessage && <div className="inline-error" role="alert"><CircleAlert size={16} />{errorMessage}<button className="icon-button" onClick={() => setErrorMessage('')} aria-label="Dismiss error"><X size={15} /></button></div>}
          {transaction && <div className={`transaction-banner tx-${transaction.state}`} role={transaction.state === 'failed' || transaction.state === 'rejected' ? 'alert' : 'status'}>
            {transactionPending ? <LoaderCircle className="spin" size={17} /> : transaction.state === 'confirmed' ? <Check size={17} /> : <CircleAlert size={17} />}
            <div><strong>{transaction.state === 'awaiting_wallet' ? `${transaction.label}: approve or reject in wallet` : transaction.state === 'submitted' ? `${transaction.label}: submitted; confirmation unverified` : transaction.state === 'confirming' ? `${transaction.label}: waiting for block inclusion` : transaction.state === 'confirmed' ? `${transaction.label}: included in block` : transaction.state === 'timeout' ? `${transaction.label}: confirmation timed out` : `${transaction.label}: ${transaction.state}`}</strong>
              {transaction.hash && <small>Transaction {shortAddress(transaction.hash)}{transaction.blockNumber ? ` · Block ${transaction.blockNumber.toString()}` : ''}</small>}
              {transaction.message && <small>{transaction.message}</small>}
            </div>
            {transactionUrl && <a href={transactionUrl} target="_blank" rel="noreferrer" aria-label="View transaction"><ExternalLink size={16} /></a>}
            {transaction.hash && (transaction.state === 'submitted' || transaction.state === 'timeout') && <button className="button button-quiet button-small" onClick={() => void checkTransactionReceipt()} disabled={isCheckingReceipt}>{isCheckingReceipt ? 'Checking…' : 'Check receipt'}</button>}
          </div>}
        </section>
      </main>

      <section className="trust-band">
        <div className="trust-label"><ShieldCheck size={19} /><span>VERIFIABLE BY CONTRACT</span></div>
        <div className="trust-step"><span>01</span>Wallet authorization</div><ChevronRight size={15} />
        <div className="trust-step"><span>02</span>Eligibility check</div><ChevronRight size={15} />
        <div className="trust-step"><span>03</span>Contract-enforced ballot</div><ChevronRight size={15} />
        <div className="trust-step"><span>04</span>Finalized tally</div>
      </section>

      <footer className="site-footer"><span>College E-Voting · Academic demonstration</span><span>Wallet {account.isConnected && account.address ? shortAddress(account.address) : 'disconnected'} · {configuredChain ? `${expectedNetworkName} · ${configuredChain.id}` : 'network not configured'}</span><span>Public-chain votes are not anonymous.</span></footer>

    </div>
  )
}

export default App