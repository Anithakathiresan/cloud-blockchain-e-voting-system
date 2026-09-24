// Sign-in and registration cards.

import { useState } from 'react'
import { AlertCircle, ArrowLeft, Eye, EyeOff, LogIn, ShieldCheck, UserPlus } from 'lucide-react'
import { useApp } from '../context'
import { DEPARTMENTS, YEARS } from '../college'
import { BrandMark } from '../components/Layout'

function PasswordInput({ id, value, onChange, autoComplete, t }) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="input-with-action">
      <input
        id={id}
        className="input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="input-action"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? t.hidePassword : t.showPassword}
        title={visible ? t.hidePassword : t.showPassword}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  )
}

export function LoginPage({ notice }) {
  const { t, navigate, login, voters } = useApp()
  const [voterId, setVoterId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [hint, setHint] = useState(false)

  const submit = (event) => {
    event.preventDefault()
    setError('')
    try {
      login(voterId, password)
    } catch (err) {
      setError(err.message)
    }
  }

  const students = voters.filter((voter) => voter.role !== 'admin').slice(0, 3)
  const officer = voters.find((voter) => voter.role === 'admin')
  const samples = officer ? [...students, officer] : students

  return (
    <section className="auth-wrap">
      <form className="auth-card" onSubmit={submit} noValidate>
        <button type="button" className="link-btn back" onClick={() => navigate('home')}>
          <ArrowLeft size={15} aria-hidden="true" /> {t.back}
        </button>
        <div className="auth-brand">
          <BrandMark size={40} />
          <div>
            <h1>{t.loginTitle}</h1>
            <p className="muted">{t.loginSubtitle}</p>
          </div>
        </div>

        {notice && !error && (
          <p className="inline-note" role="status">
            <ShieldCheck size={16} aria-hidden="true" /> {notice}
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            <AlertCircle size={16} aria-hidden="true" /> {error}
          </p>
        )}

        <div className="field">
          <label className="field-label" htmlFor="login-id">
            {t.usernameLabel}
          </label>
          <input
            id="login-id"
            className="input"
            value={voterId}
            onChange={(event) => setVoterId(event.target.value)}
            autoComplete="username"
            autoCapitalize="characters"
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="login-password">
            {t.passwordLabel}
          </label>
          <PasswordInput id="login-password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" t={t} />
        </div>

        <button className="btn btn-primary btn-block btn-lg" type="submit">
          <LogIn size={17} aria-hidden="true" /> {t.loginButton}
        </button>

        <button type="button" className="link-btn centered" onClick={() => setHint((value) => !value)} aria-expanded={hint}>
          {t.forgotPassword}
        </button>
        {hint && <p className="inline-note">{t.forgotHint}</p>}

        <p className="auth-switch">
          {t.noAccount}{' '}
          <button type="button" className="link-btn strong" onClick={() => navigate('register')}>
            {t.registerLink}
          </button>
        </p>

        <div className="demo-box">
          <strong>{t.demoCredentials}</strong>
          {samples.map((sample) => (
            <button
              key={sample.voterId}
              type="button"
              className="demo-row"
              onClick={() => {
                setVoterId(sample.voterId)
                setPassword(sample.password)
                setError('')
              }}
            >
              <span>
                <span className="mono">{sample.voterId}</span>
                <small>{sample.role === 'admin' ? t.uiAdmin : sample.name}</small>
              </span>
              <span className="mono muted">{sample.password}</span>
              <span className="demo-use">{t.useThisId}</span>
            </button>
          ))}
        </div>
      </form>
    </section>
  )
}

export function RegisterPage() {
  const { t, navigate, register } = useApp()
  const [form, setForm] = useState({
    name: '',
    voterId: '',
    dob: '',
    department: '',
    year: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const submit = (event) => {
    event.preventDefault()
    setError('')
    try {
      register(form)
    } catch (err) {
      setError(err.message)
    }
  }

  const text = (key, label, props = {}) => (
    <div className="field">
      <label className="field-label" htmlFor={`reg-${key}`}>
        {label}
        {props.optional && <span className="field-optional"> ({t.optional})</span>}
      </label>
      <input id={`reg-${key}`} className="input" value={form[key]} onChange={update(key)} {...props.input} />
    </div>
  )

  return (
    <section className="auth-wrap">
      <form className="auth-card wide" onSubmit={submit} noValidate>
        <button type="button" className="link-btn back" onClick={() => navigate('login')}>
          <ArrowLeft size={15} aria-hidden="true" /> {t.back}
        </button>
        <div className="auth-brand">
          <BrandMark size={40} />
          <div>
            <h1>{t.registerTitle}</h1>
            <p className="muted">{t.registerSubtitle}</p>
          </div>
        </div>

        {error && (
          <p className="form-error" role="alert">
            <AlertCircle size={16} aria-hidden="true" /> {error}
          </p>
        )}

        <div className="form-grid two">
          {text('name', t.fullNameLabel, { input: { autoComplete: 'name' } })}
          {text('voterId', t.voterIdField, { input: { autoCapitalize: 'characters', placeholder: t.voterIdPlaceholderShort } })}
          <div className="field">
            <label className="field-label" htmlFor="reg-department">
              Department
            </label>
            <select id="reg-department" className="input" value={form.department} onChange={update('department')}>
              <option value="">Select department</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="reg-year">
              Academic year
            </label>
            <select id="reg-year" className="input" value={form.year} onChange={update('year')}>
              <option value="">Select year</option>
              {YEARS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
          {text('dob', t.dobLabel, { input: { type: 'date' } })}
          {text('mobile', t.mobileLabel, { optional: true, input: { autoComplete: 'tel', inputMode: 'tel' } })}
          {text('email', t.emailLabel, { optional: true, input: { type: 'email', autoComplete: 'email' } })}
          <div className="grid-spacer" aria-hidden="true" />
          <div className="field">
            <label className="field-label" htmlFor="reg-password">
              {t.createPassword}
            </label>
            <PasswordInput id="reg-password" value={form.password} onChange={update('password')} autoComplete="new-password" t={t} />
            <p className="field-hint">At least 6 characters.</p>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="reg-confirm">
              {t.confirmPassword}
            </label>
            <PasswordInput id="reg-confirm" value={form.confirmPassword} onChange={update('confirmPassword')} autoComplete="new-password" t={t} />
          </div>
        </div>

        <button className="btn btn-primary btn-block btn-lg" type="submit">
          <UserPlus size={17} aria-hidden="true" /> {t.registerButton}
        </button>

        <p className="auth-switch">
          {t.haveAccount}{' '}
          <button type="button" className="link-btn strong" onClick={() => navigate('login')}>
            {t.loginLink}
          </button>
        </p>
      </form>
    </section>
  )
}
