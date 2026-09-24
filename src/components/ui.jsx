// Design-system primitives shared by every page: cards, badges, modals,
// steppers, form fields and the empty / loading / error states.

import { Component, useEffect, useId, useRef } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock3,
  FileText,
  Inbox,
  Info,
  Loader2,
  RefreshCw,
  Search,
  X,
  XCircle,
} from 'lucide-react'
import { STATUS_META } from '../elections'

// Colour families shared by stat cards, card icons, avatars and charts.
export const TONES = ['blue', 'green', 'violet', 'amber', 'teal', 'rose', 'sky']
const TONE_ALIASES = { default: 'blue', success: 'green', warning: 'amber', info: 'sky', error: 'rose' }
const toneClass = (tone) => `tone-${TONE_ALIASES[tone] || tone}`

export function Card({ title, subtitle, icon, action, children, className = '', flush, tone, as: Tag = 'section' }) {
  return (
    <Tag className={`card ${flush ? 'card-flush' : ''} ${className}`}>
      {(title || action) && (
        <header className="card-head">
          {icon && <span className={`card-icon ${tone ? toneClass(tone) : ''}`}>{icon}</span>}
          <div className="card-titles">
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </header>
      )}
      {children}
    </Tag>
  )
}

// Intro line under the header title: a sentence and the page's main actions.
export function PageIntro({ children, actions }) {
  return (
    <div className="page-intro">
      <div className="page-intro-text">{children}</div>
      {actions && <div className="page-intro-actions">{actions}</div>}
    </div>
  )
}

const BADGE_ICONS = {
  success: <CheckCircle2 size={13} aria-hidden="true" />,
  warning: <Clock3 size={13} aria-hidden="true" />,
  error: <XCircle size={13} aria-hidden="true" />,
  info: <Info size={13} aria-hidden="true" />,
  neutral: null,
}

// Status is always text plus an icon, never colour alone.
export function Badge({ tone = 'neutral', icon, children }) {
  return (
    <span className={`badge badge-${tone}`}>
      {icon === undefined ? BADGE_ICONS[tone] : icon}
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft
  const icons = {
    open: <CircleDot size={13} aria-hidden="true" />,
    upcoming: <Clock3 size={13} aria-hidden="true" />,
    closed: <Check size={13} aria-hidden="true" />,
    draft: <FileText size={13} aria-hidden="true" />,
  }
  return (
    <Badge tone={meta.tone} icon={icons[status]}>
      {meta.label}
    </Badge>
  )
}

const REVIEW_META = {
  verified: { tone: 'success', label: 'Verified' },
  pending: { tone: 'warning', label: 'Pending' },
  rejected: { tone: 'error', label: 'Rejected' },
}

export function ReviewBadge({ status }) {
  const meta = REVIEW_META[status] || REVIEW_META.pending
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

export function StatCard({ icon, label, value, hint, tone = 'default', onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`stat ${toneClass(tone)} ${onClick ? 'stat-link' : ''}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <span className="stat-top">
        <span className="stat-label" title={label}>
          {label}
        </span>
        <span className="stat-icon" aria-hidden="true">
          {icon}
        </span>
      </span>
      <strong className="stat-value" title={typeof value === 'string' ? value : undefined}>
        {value}
      </strong>
      <span className="stat-hint" title={typeof hint === 'string' ? hint : undefined}>
        {hint || '\u00a0'}
      </span>
    </Tag>
  )
}

export function ProgressBar({ value, tone = 'action', label }) {
  const width = Math.max(0, Math.min(100, value))
  return (
    <div
      className={`progress progress-${tone}`}
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${width}%` }} />
    </div>
  )
}

export function initialsOf(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// The same name always gets the same colour.
export function toneFor(name) {
  let sum = 0
  for (const char of String(name || '')) sum = (sum * 31 + char.charCodeAt(0)) % 997
  return TONES[sum % TONES.length]
}

export function Avatar({ name, photo, size = 'md' }) {
  if (photo) {
    return <img className={`avatar avatar-${size}`} src={photo} alt="" loading="lazy" />
  }
  return (
    <span className={`avatar avatar-${size} ${toneClass(toneFor(name))}`} aria-hidden="true">
      {initialsOf(name)}
    </span>
  )
}

// Horizontal stepper used by the ballot and the election wizard. States:
// 'done' (green tick), 'current' (blue), 'todo' (grey).
export function Stepper({ steps, current, onStepClick, compact }) {
  return (
    <ol className={`stepper ${compact ? 'stepper-compact' : ''}`}>
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo'
        const clickable = onStepClick && index < current
        const inner = (
          <>
            <span className="stepper-dot" aria-hidden="true">
              {state === 'done' ? <Check size={14} /> : index + 1}
            </span>
            <span className="stepper-label">{step}</span>
          </>
        )
        return (
          <li key={step} className={`stepper-item ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            {clickable ? (
              <button type="button" className="stepper-btn" onClick={() => onStepClick(index)}>
                {inner}
              </button>
            ) : (
              <span className="stepper-btn">{inner}</span>
            )}
            <span className="sr-only">
              {state === 'done' ? ' (completed)' : state === 'current' ? ' (current step)' : ''}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

// Journey list for the dashboard ballot progress; `horizontal` lays it out
// as a stepper on wider screens.
export function ProgressSteps({ steps, horizontal }) {
  return (
    <ol className={`journey ${horizontal ? 'journey-row' : ''}`}>
      {steps.map((step) => (
        <li key={step.label} className={`journey-item ${step.state}`}>
          <span className="journey-dot" aria-hidden="true">
            {step.state === 'done' ? <Check size={13} /> : step.state === 'current' ? <CircleDot size={13} /> : <Circle size={13} />}
          </span>
          <span className="journey-text">
            <strong>{step.label}</strong>
            {step.note && <small>{step.note}</small>}
          </span>
          <span className="sr-only">
            {step.state === 'done' ? 'Completed' : step.state === 'current' ? 'Current step' : 'Not started'}
          </span>
        </li>
      ))}
    </ol>
  )
}

export function EmptyState({ icon, title, copy, children, compact }) {
  return (
    <div className={`empty ${compact ? 'empty-compact' : ''}`}>
      <span className="empty-icon" aria-hidden="true">
        {icon || <Inbox size={22} />}
      </span>
      <h3>{title}</h3>
      {copy && <p>{copy}</p>}
      {children && <div className="empty-actions">{children}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', copy, onRetry, children }) {
  return (
    <div className="empty empty-error" role="alert">
      <span className="empty-icon" aria-hidden="true">
        <AlertTriangle size={22} />
      </span>
      <h3>{title}</h3>
      {copy && <p>{copy}</p>}
      <div className="empty-actions">
        {onRetry && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            <RefreshCw size={16} aria-hidden="true" /> Retry
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

export function Skeleton({ lines = 3, className = '' }) {
  return (
    <div className={`skeleton-block ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className="skeleton" style={{ width: `${100 - ((index * 17) % 45)}%` }} />
      ))}
    </div>
  )
}

export function LoadingState({ label = 'Loading…', lines = 3 }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-label">
        <Loader2 size={16} className="spin" aria-hidden="true" /> {label}
      </span>
      <Skeleton lines={lines} />
    </div>
  )
}

export function Alert({ tone = 'info', title, children, icon }) {
  const icons = {
    info: <Info size={18} />,
    warning: <AlertTriangle size={18} />,
    error: <AlertCircle size={18} />,
    success: <CheckCircle2 size={18} />,
  }
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <span className="alert-icon" aria-hidden="true">
        {icon || icons[tone]}
      </span>
      <div>
        {title && <strong className="alert-title">{title}</strong>}
        <div className="alert-body">{children}</div>
      </div>
    </div>
  )
}

// Accessible dialog: focus moves in on open, Escape closes, Tab stays inside.
export function Modal({ title, children, footer, onClose, size = 'md', busy, labelledBy }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const previous = document.activeElement
    const node = ref.current
    const focusables = () =>
      node.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')
    const first = focusables()[0]
    ;(first || node).focus()
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onClose?.()
      if (event.key !== 'Tab') return
      const items = focusables()
      if (!items.length) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      if (previous && previous.focus) previous.focus()
    }
    // Only on mount: the dialog owns focus for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose?.()}>
      <div
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || titleId}
        ref={ref}
        tabIndex={-1}
      >
        <header className="modal-head">
          <h2 id={titleId}>{title}</h2>
          {onClose && (
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog" disabled={busy}>
              <X size={18} />
            </button>
          )}
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}

// Confirmation for important actions: publish, close, delete, reject.
export function ConfirmModal({ title, children, confirmLabel, tone = 'primary', onConfirm, onCancel, busy, icon }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      busy={busy}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`btn btn-${tone}`} onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : icon}
            {confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  )
}

export function Field({ label, hint, error, children, required, optional }) {
  const id = useId()
  const child = typeof children === 'function' ? children(id) : children
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label className="field-label" htmlFor={id}>
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
        {optional && <span className="field-optional"> (optional)</span>}
      </label>
      {child}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search', label }) {
  return (
    <label className="search-input">
      <Search size={16} aria-hidden="true" />
      <span className="sr-only">{label || placeholder}</span>
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  )
}

// Segmented tabs for filtering lists (All / Open / Upcoming / Closed).
export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          className={`tab ${value === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function KeyValue({ items, columns = 2 }) {
  return (
    <dl className={`kv kv-${columns}`}>
      {items.map((item) => (
        <div key={item.label} className="kv-item">
          <dt>
            {item.icon && <span aria-hidden="true">{item.icon}</span>}
            {item.label}
          </dt>
          <dd className={item.mono ? 'mono' : ''}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

// Catches render errors in a page so the shell stays usable.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Page failed to render:', error, info)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          copy="We couldn't load this page. Please try again."
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}
