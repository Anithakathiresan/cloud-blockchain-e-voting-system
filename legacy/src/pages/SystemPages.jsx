// Notices, settings, help, and the fallback pages (not found / restricted).

import { useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  Compass,
  LifeBuoy,
  Lock,
  Mail,
  Megaphone,
  Moon,
  Phone,
  Plus,
  RotateCcw,
  Send,
  Sun,
  Trash2,
} from 'lucide-react'
import { useApp } from '../context'
import { academicLine } from '../college'
import { formatDateTime, relativeTime } from '../elections'
import { Alert, Card, ConfirmModal, EmptyState, Field, KeyValue, PageIntro } from '../components/ui'

export function NoticesPage() {
  const { notices, isAdmin, admin, now } = useApp()
  const [form, setForm] = useState({ title: '', body: '' })
  const [error, setError] = useState('')
  const [composing, setComposing] = useState(false)
  const [removing, setRemoving] = useState(null)

  const submit = (event) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Enter a title for the notice.')
      return
    }
    admin.postNotice({ title: form.title.trim(), body: form.body.trim() })
    setForm({ title: '', body: '' })
    setError('')
    setComposing(false)
  }

  return (
    <div className="page-stack narrow">
      <PageIntro
        actions={
          isAdmin &&
          !composing && (
            <button type="button" className="btn btn-primary" onClick={() => setComposing(true)}>
              <Plus size={16} aria-hidden="true" /> Post notice
            </button>
          )
        }
      >
        <p>Announcements from the election committee, newest first.</p>
      </PageIntro>

      {isAdmin && composing && (
        <Card title="New notice">
          <form className="form-stack" onSubmit={submit} noValidate>
            <Field label="Title" required error={error}>
              {(id) => (
                <input
                  id={id}
                  className="input"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  maxLength={120}
                />
              )}
            </Field>
            <Field label="Details" optional>
              {(id) => (
                <textarea
                  id={id}
                  className="input"
                  rows={3}
                  value={form.body}
                  onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
                />
              )}
            </Field>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setComposing(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Send size={16} aria-hidden="true" /> Publish notice
              </button>
            </div>
          </form>
        </Card>
      )}

      {notices.length === 0 ? (
        <Card>
          <EmptyState icon={<Megaphone size={22} />} title="No notices yet" copy="Announcements from the election committee will appear here." />
        </Card>
      ) : (
        <Card flush>
          <ul className="notice-feed">
            {notices.map((notice) => (
              <li key={notice.id}>
                <span className="notice-feed-icon" aria-hidden="true">
                  <Megaphone size={18} />
                </span>
                <div className="grow">
                  <div className="notice-feed-head">
                    <h2>{notice.title}</h2>
                    <time dateTime={notice.createdAt} title={formatDateTime(notice.createdAt)}>
                      {relativeTime(notice.createdAt, now)}
                    </time>
                  </div>
                  {notice.body && <p>{notice.body}</p>}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setRemoving(notice)}
                    aria-label={`Delete notice: ${notice.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {removing && (
        <ConfirmModal
          title="Delete notice"
          confirmLabel="Delete notice"
          tone="danger"
          icon={<Trash2 size={16} aria-hidden="true" />}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            admin.deleteNotice(removing.id)
            setRemoving(null)
          }}
        >
          <p>
            Delete “{removing.title}”? Students will no longer see it.
          </p>
        </ConfirmModal>
      )}
    </div>
  )
}

export function SettingsPage() {
  const { t, theme, setTheme, language, setLanguage, languages, voter, isAdmin, admin } = useApp()
  const [resetting, setResetting] = useState(false)

  return (
    <div className="page-stack narrow">
      <Card title={t.uiAppearance} subtitle="Light is the default. Your choice is remembered on this device.">
        <div className="segmented" role="radiogroup" aria-label={t.uiAppearance}>
          {[
            { id: 'light', label: t.light, icon: <Sun size={16} aria-hidden="true" /> },
            { id: 'dark', label: t.dark, icon: <Moon size={16} aria-hidden="true" /> },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={theme === option.id}
              className={`segment ${theme === option.id ? 'active' : ''}`}
              onClick={() => setTheme(option.id)}
            >
              {option.icon} {option.label}
            </button>
          ))}
        </div>
      </Card>

      <Card title={t.uiLanguage} subtitle="Navigation and the ballot are translated; some pages remain in English.">
        <Field label={t.uiLanguage}>
          {(id) => (
            <select id={id} className="input" value={language} onChange={(event) => setLanguage(event.target.value)}>
              {languages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label} ({item.subLabel})
                </option>
              ))}
            </select>
          )}
        </Field>
      </Card>

      <Card title="Account">
        <KeyValue
          items={[
            { label: t.colName, value: voter.name },
            { label: isAdmin ? 'Username' : 'Register number', value: voter.voterId, mono: true },
            { label: 'Role', value: isAdmin ? t.uiAdmin : t.uiStudent },
            ...(isAdmin ? [] : [{ label: 'Department & year', value: academicLine(voter.department, voter.year) || '—' }]),
          ]}
        />
        {!isAdmin && (
          <p className="muted small">To correct your department or year, contact the election office.</p>
        )}
      </Card>

      {isAdmin && (
        <Card title="Demo data" subtitle="Everything is stored in this browser.">
          <Alert tone="warning">
            Resetting clears every ballot on the ledger, all registrations and all election changes, then restores the
            sample data. This cannot be undone.
          </Alert>
          <div className="form-actions">
            <button type="button" className="btn btn-danger" onClick={() => setResetting(true)}>
              <RotateCcw size={16} aria-hidden="true" /> Reset demo data
            </button>
          </div>
        </Card>
      )}

      {resetting && (
        <ConfirmModal
          title="Reset demo data"
          confirmLabel="Reset everything"
          tone="danger"
          icon={<RotateCcw size={16} aria-hidden="true" />}
          onCancel={() => setResetting(false)}
          onConfirm={() => {
            setResetting(false)
            admin.resetDemo()
          }}
        >
          <p>All ballots, receipts, registrations and election edits will be removed, and you will be signed out.</p>
        </ConfirmModal>
      )}
    </div>
  )
}

const FAQ = [
  {
    q: 'Which elections can I vote in?',
    a: 'Your dashboard lists every election you are eligible for. Eligibility depends on your department and academic year: college-wide elections are open to all verified students, department elections to that department, and year-wise elections to one year of one department.',
  },
  {
    q: 'How do I cast my vote?',
    a: 'Open Cast Vote, choose a ballot, select your candidate(s), review your selection and confirm. Once confirmed, your vote is sealed on the ledger and cannot be changed.',
  },
  {
    q: 'What is a ranked-choice ballot?',
    a: 'You rank candidates in order of preference. If no candidate has a majority of first preferences, the candidate with the fewest is eliminated and their ballots move to the next preference, until one candidate has a majority.',
  },
  {
    q: 'What is my receipt?',
    a: 'Your receipt shows the ledger block that holds your ballot. It proves your vote was recorded without revealing who you voted for. Find it any time under My Receipts.',
  },
  {
    q: 'When will results be available?',
    a: 'Each election card shows this. Some elections publish live results while voting is open; others keep results hidden until voting closes.',
  },
  {
    q: 'Is my vote secret?',
    a: 'Yes. The ledger stores only a salted digest of your register number, separate for every election, so ballots cannot be traced back to you or linked across elections.',
  },
]

export function HelpPage() {
  const { navigate } = useApp()
  return (
    <div className="page-stack narrow">
      <Card title="Frequently asked questions" icon={<LifeBuoy size={18} />}>
        <div className="faq">
          {FAQ.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>
                <span>{item.q}</span>
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </Card>
      <Card title="Still need help?">
        <KeyValue
          items={[
            { icon: <Phone size={15} />, label: 'Election helpdesk', value: '+91 98765 43210' },
            { icon: <Mail size={15} />, label: 'Email', value: 'support@e-vote.in' },
          ]}
        />
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('contact')}>
            <Send size={16} aria-hidden="true" /> Send a message
          </button>
        </div>
      </Card>
    </div>
  )
}

export function NotFoundPage() {
  const { navigate, voter } = useApp()
  return (
    <Card>
      <EmptyState icon={<Compass size={22} />} title="Page not found" copy="The page you are looking for does not exist or has moved.">
        <button type="button" className="btn btn-primary" onClick={() => navigate(voter ? 'dashboard' : 'home')}>
          <ArrowLeft size={16} aria-hidden="true" /> Go to {voter ? 'dashboard' : 'home'}
        </button>
      </EmptyState>
    </Card>
  )
}

export function RestrictedPage({ reason }) {
  const { navigate } = useApp()
  return (
    <Card>
      <EmptyState icon={<Lock size={22} />} title="Access restricted" copy={reason}>
        <button type="button" className="btn btn-primary" onClick={() => navigate('dashboard')}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to dashboard
        </button>
      </EmptyState>
    </Card>
  )
}
