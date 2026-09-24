// Election management: every election in one table, with publish, close and
// delete behind confirmation dialogs.

import { useState } from 'react'
import { Eye, Lock, Pencil, Plus, Rocket, Trash2 } from 'lucide-react'
import { useApp } from '../../context'
import { METHOD_META, electionBallots, formatDateTime, formatNumber, formatPeriod, scopeLabel } from '../../elections'
import { Alert, ConfirmModal, EmptyState, PageIntro, SearchInput, StatusBadge, Tabs, Card } from '../../components/ui'

export function ElectionManagementPage() {
  const { elections, electionState, tallies, candidates, chain, navigate, admin } = useApp()
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState(null)

  const term = query.trim().toLowerCase()
  const matched = elections.filter((election) => !term || election.title.toLowerCase().includes(term))
  const count = (status) => matched.filter((election) => electionState(election).status === status).length
  const list = matched
    .filter((election) => tab === 'all' || electionState(election).status === tab)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))

  const onlineBallots = (election) => electionBallots(election, chain).length
  const unverifiedPositions = (election) =>
    election.positions.filter(
      (position) =>
        !candidates.some((entry) => entry.electionId === election.id && entry.positionId === position.id && entry.status === 'verified'),
    )

  const run = () => {
    const { action, election } = pending
    if (action === 'publish') admin.publishElection(election.id)
    if (action === 'close') admin.closeElection(election.id)
    if (action === 'delete') admin.deleteElection(election.id)
    setPending(null)
  }

  return (
    <div className="page-stack">
      <PageIntro
        actions={
          <button type="button" className="btn btn-primary" onClick={() => navigate('election-new')}>
            <Plus size={16} aria-hidden="true" /> Create election
          </button>
        }
      >
        <p>Create, publish and close elections. Elections with ballots on the ledger can be closed but not deleted.</p>
      </PageIntro>

      <div className="toolbar">
        <Tabs
          label="Filter by status"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'all', label: 'All', count: matched.length },
            { id: 'draft', label: 'Drafts', count: count('draft') },
            { id: 'upcoming', label: 'Upcoming', count: count('upcoming') },
            { id: 'open', label: 'Voting Open', count: count('open') },
            { id: 'closed', label: 'Closed', count: count('closed') },
          ]}
        />
        <div className="toolbar-filters">
          <SearchInput value={query} onChange={setQuery} placeholder="Search elections" />
        </div>
      </div>

      <Card flush>
        {list.length === 0 ? (
          <EmptyState title="No elections found" copy="Try another status or search term.">
            <button type="button" className="btn btn-primary" onClick={() => navigate('election-new')}>
              Create election
            </button>
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Election</th>
                  <th scope="col">Scope</th>
                  <th scope="col">Method</th>
                  <th scope="col">Voting period</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">
                    Votes
                  </th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((election) => {
                  const status = electionState(election).status
                  const editable = status === 'draft' || status === 'upcoming'
                  const deletable = onlineBallots(election) === 0 && status !== 'open'
                  return (
                    <tr key={election.id}>
                      <td data-label="Election">
                        <strong>{election.title}</strong>
                        <small className="cell-sub">
                          {election.category} · {election.positions.length} position{election.positions.length === 1 ? '' : 's'}
                        </small>
                      </td>
                      <td data-label="Scope">{scopeLabel(election)}</td>
                      <td data-label="Method">{METHOD_META[election.method].label}</td>
                      <td data-label="Voting period">{formatPeriod(election)}</td>
                      <td data-label="Status">
                        <StatusBadge status={status} />
                      </td>
                      <td data-label="Votes" className="num">
                        {formatNumber(tallies[election.id].votesCast)}
                      </td>
                      <td className="actions">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate('election', election.id)}
                            aria-label={`View ${election.title}`}
                          >
                            <Eye size={15} aria-hidden="true" /> View
                          </button>
                          {editable && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => navigate('election-edit', election.id)}
                              aria-label={`Edit ${election.title}`}
                            >
                              <Pencil size={15} aria-hidden="true" /> Edit
                            </button>
                          )}
                          {status === 'draft' && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => setPending({ action: 'publish', election })}
                            >
                              <Rocket size={15} aria-hidden="true" /> Publish
                            </button>
                          )}
                          {status === 'open' && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setPending({ action: 'close', election })}
                            >
                              <Lock size={15} aria-hidden="true" /> Close
                            </button>
                          )}
                          {deletable && (
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() => setPending({ action: 'delete', election })}
                              aria-label={`Delete ${election.title}`}
                              title="Delete election"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pending?.action === 'publish' && (
        <ConfirmModal
          title="Publish election"
          confirmLabel="Publish election"
          icon={<Rocket size={16} aria-hidden="true" />}
          onCancel={() => setPending(null)}
          onConfirm={run}
        >
          <p>
            Publish <strong>{pending.election.title}</strong>? Eligible students will see it, and voting opens on{' '}
            {formatDateTime(pending.election.startsAt)}.
          </p>
          {unverifiedPositions(pending.election).length > 0 && (
            <Alert tone="warning" title="Some positions have no verified candidates">
              {unverifiedPositions(pending.election)
                .map((position) => position.title)
                .join(', ')}{' '}
              will not appear on the ballot until a candidate is verified.
            </Alert>
          )}
        </ConfirmModal>
      )}
      {pending?.action === 'close' && (
        <ConfirmModal
          title="Close election"
          confirmLabel="Close voting now"
          tone="danger"
          icon={<Lock size={16} aria-hidden="true" />}
          onCancel={() => setPending(null)}
          onConfirm={run}
        >
          <p>
            Close voting for <strong>{pending.election.title}</strong> now? No more ballots will be accepted and the
            results become final.
          </p>
        </ConfirmModal>
      )}
      {pending?.action === 'delete' && (
        <ConfirmModal
          title="Delete election"
          confirmLabel="Delete election"
          tone="danger"
          icon={<Trash2 size={16} aria-hidden="true" />}
          onCancel={() => setPending(null)}
          onConfirm={run}
        >
          <p>
            Delete <strong>{pending.election.title}</strong> and its{' '}
            {candidates.filter((entry) => entry.electionId === pending.election.id).length} candidates? This cannot be
            undone.
          </p>
        </ConfirmModal>
      )}
    </div>
  )
}
