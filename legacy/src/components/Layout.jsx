// The two frames every page renders in: the signed-in console (white
// sidebar + compact header) and the public site (top header + footer).

import { useEffect, useRef, useState } from 'react'
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCog,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FileBarChart,
  Globe2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Moon,
  Network,
  Phone,
  Receipt,
  Settings,
  Sun,
  UserCog,
  UserRound,
  UsersRound,
  Vote,
  X,
} from 'lucide-react'
import { useApp } from '../context'
import { academicLine } from '../college'
import { relativeTime } from '../elections'
import { Avatar } from './ui'

// Detail pages highlight the list they belong to.
const NAV_PARENT = {
  election: 'elections',
  candidate: 'candidates',
  confirmation: 'vote',
  receipt: 'receipts',
  'election-new': 'manage-elections',
  'election-edit': 'manage-elections',
  department: 'departments',
  news: 'notices',
  ledger: 'dashboard',
  profile: null,
}

export function BrandMark({ size = 32 }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <Vote size={Math.round(size * 0.58)} strokeWidth={2.2} />
    </span>
  )
}

function useDismiss(open, onClose) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose()
    }
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  return ref
}

export function ThemeToggle() {
  const { t, theme, toggleTheme } = useApp()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={dark ? t.switchToLight : t.switchToDark}
      title={dark ? t.switchToLight : t.switchToDark}
    >
      {dark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
      <span className="theme-toggle-label">{dark ? t.dark : t.light}</span>
    </button>
  )
}

function navSections(t, isAdmin) {
  const main = [
    { id: 'dashboard', label: t.navDashboard, icon: <LayoutDashboard size={18} /> },
    { id: 'elections', label: t.uiElections, icon: <CalendarCog size={18} /> },
    { id: 'candidates', label: t.uiCandidates, icon: <UsersRound size={18} /> },
    ...(isAdmin ? [] : [{ id: 'vote', label: t.uiCastVote, icon: <Vote size={18} /> }]),
    { id: 'results', label: t.uiResults, icon: <BarChart3 size={18} /> },
    ...(isAdmin ? [] : [{ id: 'receipts', label: t.uiMyReceipts, icon: <Receipt size={18} /> }]),
    { id: 'notices', label: t.uiNotices, icon: <Megaphone size={18} /> },
  ]
  const admin = [
    { id: 'manage-elections', label: t.uiElectionManagement, icon: <CalendarCog size={18} /> },
    { id: 'candidate-verification', label: t.uiCandidateVerification, icon: <ClipboardCheck size={18} /> },
    { id: 'voters', label: t.uiVoterManagement, icon: <UserCog size={18} /> },
    { id: 'departments', label: t.uiDepartments, icon: <Building2 size={18} /> },
    { id: 'academic-years', label: t.uiAcademicYears, icon: <GraduationCap size={18} /> },
    { id: 'committees', label: t.uiCommittees, icon: <Network size={18} /> },
    { id: 'reports', label: t.uiReports, icon: <FileBarChart size={18} /> },
  ]
  return [
    { id: 'main', label: t.uiMainMenu, items: main, hideLabel: true },
    ...(isAdmin ? [{ id: 'admin', label: t.uiAdministration, items: admin }] : []),
  ]
}

function Sidebar({ open, onClose }) {
  const { t, route, navigate, isAdmin, logout, pendingCount } = useApp()
  const activeId = route.page in NAV_PARENT ? NAV_PARENT[route.page] : route.page

  const item = (entry) => (
    <li key={entry.id}>
      <button
        type="button"
        className={`nav-item ${activeId === entry.id ? 'active' : ''}`}
        aria-current={activeId === entry.id ? 'page' : undefined}
        onClick={() => navigate(entry.id)}
      >
        <span className="nav-icon" aria-hidden="true">
          {entry.icon}
        </span>
        <span className="nav-text">{entry.label}</span>
        {entry.id === 'candidate-verification' && pendingCount > 0 && (
          <span className="nav-count" aria-label={`${pendingCount} pending`}>
            {pendingCount}
          </span>
        )}
      </button>
    </li>
  )

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Primary navigation">
        <div className="sidebar-brand">
          <button type="button" className="brand" onClick={() => navigate('dashboard')}>
            <BrandMark />
            <span className="brand-text">
              <strong>College E-Voting</strong>
              <small>Election Portal</small>
            </span>
          </button>
          <button type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label={t.closeMenu}>
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navSections(t, isAdmin).map((section) => (
            <div key={section.id} className="nav-section">
              <p className={`nav-label ${section.hideLabel ? 'sr-only' : ''}`}>{section.label}</p>
              <ul>{section.items.map(item)}</ul>
            </div>
          ))}

          <div className="nav-section">
            <p className="nav-label">{t.uiSystem}</p>
            <ul>
              {item({ id: 'settings', label: t.uiSettings, icon: <Settings size={18} /> })}
              {item({ id: 'help', label: t.uiHelp, icon: <CircleHelp size={18} /> })}
              <li>
                <button type="button" className="nav-item nav-logout" onClick={logout}>
                  <span className="nav-icon" aria-hidden="true">
                    <LogOut size={18} />
                  </span>
                  <span className="nav-text">{t.logout}</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </aside>
    </>
  )
}

function NotificationsMenu() {
  const { t, notices, navigate, now, voter } = useApp()
  const [open, setOpen] = useState(false)
  const seenKey = `evoting_notices_seen_${voter?.voterId || 'guest'}`
  const [seenAt, setSeenAt] = useState(() => {
    try {
      return Number(localStorage.getItem(seenKey)) || 0
    } catch {
      return 0
    }
  })
  const ref = useDismiss(open, () => setOpen(false))
  const latest = notices.slice(0, 5)
  const unread = notices.filter((notice) => Date.parse(notice.createdAt) > seenAt).length

  const toggle = () => {
    setOpen((value) => !value)
    if (!open) {
      const stamp = Date.now()
      setSeenAt(stamp)
      try {
        localStorage.setItem(seenKey, String(stamp))
      } catch {
        // Unread counts are a convenience; losing them is harmless.
      }
    }
  }

  return (
    <div className="menu-wrap" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread ? `${t.uiNotifications}: ${unread} unread` : t.uiNotifications}
        title={t.uiNotifications}
      >
        <Bell size={18} />
        {unread > 0 && <span className="dot-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="dropdown dropdown-wide" role="menu">
          <div className="dropdown-head">
            <strong>{t.uiNotifications}</strong>
          </div>
          {latest.length === 0 ? (
            <p className="dropdown-empty">No notifications yet.</p>
          ) : (
            <ul className="notif-list">
              {latest.map((notice) => (
                <li key={notice.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className="notif-item"
                    onClick={() => {
                      setOpen(false)
                      navigate('notices')
                    }}
                  >
                    <Megaphone size={16} aria-hidden="true" />
                    <span>
                      <strong>{notice.title}</strong>
                      <small>{relativeTime(notice.createdAt, now)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="dropdown-foot"
            onClick={() => {
              setOpen(false)
              navigate('notices')
            }}
          >
            View all notices
          </button>
        </div>
      )}
    </div>
  )
}

function ProfileMenu() {
  const { t, voter, isAdmin, navigate, logout } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  const roleLine = isAdmin ? t.uiAdmin : t.uiStudent
  const academic = academicLine(voter.department, voter.year)

  const go = (page) => {
    setOpen(false)
    navigate(page)
  }

  const items = isAdmin
    ? [
        { id: 'profile', label: t.uiProfile, icon: <UserRound size={16} /> },
        { id: 'manage-elections', label: t.uiElectionManagement, icon: <CalendarCog size={16} /> },
        { id: 'settings', label: t.uiSettings, icon: <Settings size={16} /> },
      ]
    : [
        { id: 'profile', label: t.uiProfile, icon: <UserRound size={16} /> },
        { id: 'elections', label: t.uiMyElections, icon: <CalendarCog size={16} /> },
        { id: 'receipts', label: t.uiMyReceipts, icon: <Receipt size={16} /> },
        { id: 'settings', label: t.uiSettings, icon: <Settings size={16} /> },
      ]

  return (
    <div className="menu-wrap" ref={ref}>
      <button
        type="button"
        className="profile-btn"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Avatar name={voter.name} size="sm" />
        <span className="profile-meta">
          <strong>{voter.name}</strong>
          <small>{academic ? `${roleLine} · ${academic}` : roleLine}</small>
        </span>
        <ChevronDown size={16} aria-hidden="true" className={open ? 'flip' : ''} />
      </button>
      {open && (
        <div className="dropdown" role="menu">
          <div className="dropdown-head dropdown-user">
            <strong>{voter.name}</strong>
            <small>{roleLine}</small>
            {academic && <small>{academic}</small>}
          </div>
          {items.map((entry) => (
            <button key={entry.id} type="button" role="menuitem" className="dropdown-item" onClick={() => go(entry.id)}>
              {entry.icon} {entry.label}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            className="dropdown-item danger"
            onClick={() => {
              setOpen(false)
              logout()
            }}
          >
            <LogOut size={16} /> {t.logout}
          </button>
        </div>
      )}
    </div>
  )
}

function Breadcrumb({ crumbs }) {
  const { navigate, t } = useApp()
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      <ol>
        <li>
          <button type="button" onClick={() => navigate('dashboard')}>
            {t.navHome}
          </button>
        </li>
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`}>
            <span aria-hidden="true">/</span>
            {crumb.page && index < crumbs.length - 1 ? (
              <button type="button" onClick={() => navigate(crumb.page, crumb.id)}>
                {crumb.label}
              </button>
            ) : (
              <span aria-current={index === crumbs.length - 1 ? 'page' : undefined}>{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function ConsoleLayout({ title, crumbs, children }) {
  const { t, route, navigate } = useApp()
  const [drawer, setDrawer] = useState(false)

  useEffect(() => {
    setDrawer(false)
  }, [route])

  useEffect(() => {
    if (!drawer) return undefined
    const onKey = (event) => event.key === 'Escape' && setDrawer(false)
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [drawer])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar open={drawer} onClose={() => setDrawer(false)} />
      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setDrawer(true)}
            aria-label={t.uiOpenMenu}
            aria-expanded={drawer}
          >
            <Menu size={20} />
          </button>
          <div className="topbar-title">
            <h1>{title}</h1>
            <Breadcrumb crumbs={crumbs} />
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <NotificationsMenu />
            <button
              type="button"
              className="icon-btn hide-sm"
              onClick={() => navigate('help')}
              aria-label={t.uiHelp}
              title={t.uiHelp}
            >
              <CircleHelp size={18} />
            </button>
            <ProfileMenu />
          </div>
        </header>
        <main id="main-content" className="content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ public ---

function LanguageMenu() {
  const { t, language, setLanguage, languages } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  return (
    <div className="menu-wrap" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t.uiLanguage}
      >
        <Globe2 size={16} aria-hidden="true" />
        <span className="hide-sm">{languages.find((item) => item.code === language)?.label}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="dropdown" role="menu">
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              role="menuitemradio"
              aria-checked={language === item.code}
              className="dropdown-item"
              onClick={() => {
                setLanguage(item.code)
                setOpen(false)
              }}
            >
              <span className="grow">
                {item.label} <small className="muted">{item.subLabel}</small>
              </span>
              {language === item.code && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function PublicLayout({ children, drawerSections }) {
  const { t, route, navigate, voter } = useApp()
  const [drawer, setDrawer] = useState(false)

  useEffect(() => {
    setDrawer(false)
  }, [route])

  useEffect(() => {
    if (!drawer) return undefined
    const onKey = (event) => event.key === 'Escape' && setDrawer(false)
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [drawer])

  const links = [
    { id: 'home', label: t.navHome },
    { id: 'elections', label: t.uiElections },
    { id: 'results', label: t.uiResults },
    { id: 'about', label: t.navAboutSite },
    { id: 'services', label: t.navServicesSite },
    { id: 'contact', label: t.navContact },
  ]

  return (
    <div className="site">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-row">
          <button type="button" className="brand" onClick={() => navigate('home')}>
            <BrandMark />
            <span className="brand-text">
              <strong>College E-Voting</strong>
              <small>Election Portal</small>
            </span>
          </button>
          <nav className="site-nav" aria-label="Site">
            {links.map((link) => (
              <button
                key={link.id}
                type="button"
                className={route.page === link.id ? 'active' : ''}
                aria-current={route.page === link.id ? 'page' : undefined}
                onClick={() => navigate(link.id)}
              >
                {link.label}
              </button>
            ))}
          </nav>
          <div className="site-actions">
            <LanguageMenu />
            <ThemeToggle />
            {voter ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('dashboard')}>
                {t.navDashboard}
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-sm hide-xs" onClick={() => navigate('login')}>
                {t.signIn}
              </button>
            )}
            <button
              type="button"
              className="icon-btn site-menu-btn"
              onClick={() => setDrawer(true)}
              aria-label={t.menu}
              aria-expanded={drawer}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {drawer && <div className="sidebar-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />}
      <aside className={`site-drawer ${drawer ? 'open' : ''}`} aria-label={t.menu} aria-hidden={!drawer}>
        <div className="sidebar-brand">
          <span className="brand">
            <BrandMark size={28} />
            <span className="brand-text">
              <strong>College E-Voting</strong>
            </span>
          </span>
          <button type="button" className="icon-btn" onClick={() => setDrawer(false)} aria-label={t.closeMenu}>
            <X size={18} />
          </button>
        </div>
        <div className="drawer-scroll">
          <ul className="drawer-links">
            {links.map((link) => (
              <li key={link.id}>
                <button
                  type="button"
                  className={`nav-item ${route.page === link.id ? 'active' : ''}`}
                  onClick={() => navigate(link.id)}
                >
                  <span className="nav-text">{link.label}</span>
                </button>
              </li>
            ))}
          </ul>
          {drawerSections.map((section) => (
            <div key={section.label} className="nav-section">
              <p className="nav-label">{section.label}</p>
              <ul>
                {section.items.map((entry) => (
                  <li key={entry.label}>
                    <button type="button" className="nav-item" onClick={entry.go}>
                      <span className="nav-icon" aria-hidden="true">
                        {entry.icon}
                      </span>
                      <span className="nav-text">{entry.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="drawer-foot">
          {voter ? (
            <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('dashboard')}>
              {t.navDashboard}
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('login')}>
                {t.signIn}
              </button>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => navigate('register')}>
                {t.registerLink}
              </button>
            </>
          )}
        </div>
      </aside>

      <main id="main-content" className="site-main" tabIndex={-1}>
        {children}
      </main>

      <footer className="site-footer">
        <div className="site-row footer-grid">
          <div className="footer-about">
            <span className="brand">
              <BrandMark size={28} />
              <span className="brand-text">
                <strong>College E-Voting</strong>
              </span>
            </span>
            <p>{t.footerTagline}</p>
          </div>
          <div>
            <h2 className="footer-title">{t.footerQuickLinks}</h2>
            <ul className="footer-links">
              {links.slice(0, 5).map((link) => (
                <li key={link.id}>
                  <button type="button" onClick={() => navigate(link.id)}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="footer-title">{t.footerContactUs}</h2>
            <ul className="footer-links">
              <li>
                <span>
                  <Mail size={14} aria-hidden="true" /> support@e-vote.in
                </span>
              </li>
              <li>
                <span>
                  <Phone size={14} aria-hidden="true" /> +91 98765 43210
                </span>
              </li>
              <li>
                <button type="button" onClick={() => navigate('contact')}>
                  {t.contactFormTitle}
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="site-row footer-base">
          <small>{t.footerLegal}</small>
          <small>© 2026 {t.footerRights}</small>
        </div>
      </footer>
    </div>
  )
}
