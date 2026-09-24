// A student's vote receipts and the public ledger explorer. Receipts prove a
// ballot is on the ledger; they never reveal the choice inside it.

import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Blocks,
  CheckCircle2,
  Fingerprint,
  Link2,
  Loader2,
  Printer,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Vote,
} from 'lucide-react'
import { useApp } from '../context'
import { ballotCount, ballotElectionId, compactHash, shortHash, verifyChain } from '../chain'
import { formatDateTime } from '../elections'
import { Alert, Badge, Card, EmptyState, ErrorState, LoadingState, StatCard } from '../components/ui'

export function ReceiptsPage() {
  const { elections, receipts, receiptsReady, ledger, navigate } = useApp()

  if (!receiptsReady) {
    return (
      <Card>
        <LoadingState label="Finding your receipts on the ledger…" lines={4} />
      </Card>
    )
  }

  const rows = elections
    .filter((election) => receipts[election.id])
    .map((election) => ({ election, block: receipts[election.id] }))
    .sort((a, b) => Date.parse(b.block.timestamp) - Date.parse(a.block.timestamp))

  if (!rows.length) {
    return (
      <Card>
        <EmptyState icon={<Receipt size={22} />} title="No receipts yet" copy="Your private receipt appears here after you cast a ballot.">
          <button type="button" className="btn btn-primary" onClick={() => navigate('vote')}>
            <Vote size={16} aria-hidden="true" /> Cast Vote
          </button>
        </EmptyState>
      </Card>
    )
  }

  return (
    <div className="page-stack">
      <Alert tone="info" icon={<Fingerprint size={18} />}>
        A receipt proves your ballot is sealed on the ledger. It does not show who you voted for.
      </Alert>
      <Card flush title={`${rows.length} receipt${rows.length === 1 ? '' : 's'}`}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Election</th>
                <th scope="col">Receipt ID</th>
                <th scope="col">Block</th>
                <th scope="col">Recorded</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ election, block }) => (
                <tr key={election.id}>
                  <td data-label="Election">
                    <strong>{election.title}</strong>
                  </td>
                  <td data-label="Receipt ID" className="mono">
                    {compactHash(block.hash)}
                  </td>
                  <td data-label="Block" className="mono">
                    #{block.index}
                  </td>
                  <td data-label="Recorded">{formatDateTime(block.timestamp)}</td>
                  <td data-label="Status">
                    {ledger.status === 'valid' ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Checking</Badge>}
                  </td>
                  <td className="actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('receipt', election.id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export function ReceiptPage({ id }) {
  const { t, elections, receipts, receiptsReady, chain, navigate } = useApp()
  const [check, setCheck] = useState(null)
  const election = elections.find((entry) => entry.id === id)
  const receipt = receipts[id]

  if (!id) return <ReceiptsPage />
  if (!receiptsReady) {
    return (
      <Card>
        <LoadingState label="Loading your receipt…" />
      </Card>
    )
  }
  if (!election || !receipt) {
    return (
      <Card>
        <EmptyState icon={<Receipt size={22} />} title={t.noReceiptYet} copy={t.noReceiptCopy}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('receipts')}>
            <ArrowLeft size={16} aria-hidden="true" /> {`Back to ${t.uiMyReceipts}`}
          </button>
        </EmptyState>
      </Card>
    )
  }

  // Re-run the whole chain check, then confirm this block sits where it says.
  const verify = async () => {
    setCheck({ status: 'checking' })
    const result = await verifyChain(chain)
    const onChain = chain[receipt.index]?.hash === receipt.hash
    setCheck({ status: result.valid && onChain ? 'ok' : 'bad', brokenAt: result.brokenAt })
  }

  return (
    <div className="page-stack narrow">
      <Card className="receipt">
        <div className="receipt-top">
          <span className="success-icon small" aria-hidden="true">
            <CheckCircle2 size={24} />
          </span>
          <div className="grow">
            <h2>{t.recordedSuccessfully}</h2>
            <p className="muted">{election.title}</p>
          </div>
          <Badge tone="success">Sealed</Badge>
        </div>

        <dl className="receipt-grid">
          <div>
            <dt>Receipt ID</dt>
            <dd className="mono">{compactHash(receipt.hash)}</dd>
          </div>
          <div>
            <dt>{t.blockConfirmation}</dt>
            <dd className="mono">#{receipt.index}</dd>
          </div>
          <div>
            <dt>{t.recordedAt}</dt>
            <dd>{formatDateTime(receipt.timestamp)}</dd>
          </div>
          <div>
            <dt>Voter digest</dt>
            <dd className="mono">{shortHash(receipt.voterHash, 12)}</dd>
          </div>
          <div className="full">
            <dt>{t.txRef}</dt>
            <dd className="mono wrap">{receipt.hash}</dd>
          </div>
          <div className="full">
            <dt>
              <Link2 size={13} aria-hidden="true" /> Previous block hash
            </dt>
            <dd className="mono wrap">{receipt.previousHash}</dd>
          </div>
        </dl>

        {check?.status === 'ok' && (
          <Alert tone="success" title="Receipt verified">
            Block #{receipt.index} is on the ledger and every block links correctly.
          </Alert>
        )}
        {check?.status === 'bad' && (
          <Alert tone="error" title="Verification failed">
            The ledger failed verification{check.brokenAt !== null ? ` at block #${check.brokenAt}` : ''}. Contact the election office.
          </Alert>
        )}

        <p className="receipt-note">
          <Fingerprint size={15} aria-hidden="true" /> The ledger stores only a salted digest of your register number, so this
          receipt proves you voted without revealing your choice.
        </p>

        <div className="card-foot-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('receipts')}>
            <ArrowLeft size={16} aria-hidden="true" /> {t.uiMyReceipts}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" /> Print
          </button>
          <button type="button" className="btn btn-primary" onClick={verify} disabled={check?.status === 'checking'}>
            {check?.status === 'checking' ? (
              <Loader2 size={16} className="spin" aria-hidden="true" />
            ) : (
              <ShieldCheck size={16} aria-hidden="true" />
            )}
            Verify receipt
          </button>
        </div>
      </Card>
    </div>
  )
}

const PAGE_SIZE = 25

export function LedgerPage() {
  const { chain, ledger, reverify, elections } = useApp()
  const [limit, setLimit] = useState(PAGE_SIZE)
  const blocks = [...chain].reverse()
  const titleOf = (block) =>
    block.type === 'genesis' ? '—' : elections.find((entry) => entry.id === ballotElectionId(block))?.title || 'Removed election'
  const last = chain[chain.length - 1]

  return (
    <div className="page-stack">
      <Card
        title="Ledger Status"
        icon={<Blocks size={18} />}
        action={
          <button type="button" className="btn btn-secondary btn-sm" onClick={reverify} disabled={ledger.status === 'checking'}>
            <RefreshCw size={15} aria-hidden="true" className={ledger.status === 'checking' ? 'spin' : ''} /> Verify again
          </button>
        }
      >
        {ledger.status === 'valid' && (
          <Alert tone="success" title="Election records verified">
            Every block’s hash was recomputed and every link to the previous block checks out.
          </Alert>
        )}
        {ledger.status === 'broken' && (
          <Alert tone="error" title="Tampering detected">
            Block #{ledger.brokenAt} does not match its recorded hash or link. Blocks from here on cannot be trusted.
          </Alert>
        )}
        {ledger.status === 'checking' && <LoadingState label="Verifying ledger…" lines={1} />}
      </Card>

      <div className="stat-grid">
        <StatCard tone="blue" icon={<Blocks size={20} />} label="Blocks sealed" value={ledger.blocks} />
        <StatCard tone="green" icon={<Vote size={20} />} label="Ballots on ledger" value={ballotCount(chain)} />
        <StatCard tone="violet" icon={<Link2 size={20} />} label="Latest block" value={last ? `#${last.index}` : '—'} hint={last ? formatDateTime(last.timestamp) : null} />
        <StatCard tone="teal" icon={<ShieldCheck size={20} />} label="Proof of work" value="00…" hint="Required hash prefix" />
      </div>

      {chain.length === 0 ? (
        <ErrorState title="Ledger not started" copy="The genesis block has not been written yet." onRetry={reverify} />
      ) : (
        <Card title="Blocks" subtitle="Newest first. Hashes are shortened; hover to see the full value." flush>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Block</th>
                  <th scope="col">Type</th>
                  <th scope="col">Election</th>
                  <th scope="col">Hash</th>
                  <th scope="col">Previous</th>
                  <th scope="col">Sealed</th>
                </tr>
              </thead>
              <tbody>
                {blocks.slice(0, limit).map((block) => (
                  <tr key={block.hash}>
                    <td data-label="Block" className="mono">
                      #{block.index}
                    </td>
                    <td data-label="Type">
                      <Badge tone={block.type === 'genesis' ? 'info' : 'neutral'} icon={null}>
                        {block.type === 'genesis' ? 'Genesis' : 'Ballot'}
                      </Badge>
                    </td>
                    <td data-label="Election">{titleOf(block)}</td>
                    <td data-label="Hash" className="mono" title={block.hash}>
                      {compactHash(block.hash)}
                    </td>
                    <td data-label="Previous" className="mono" title={block.previousHash}>
                      {compactHash(block.previousHash)}
                    </td>
                    <td data-label="Sealed">{formatDateTime(block.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {blocks.length > limit && (
            <div className="card-foot-actions center">
              <button type="button" className="btn btn-secondary" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
                Show more <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
