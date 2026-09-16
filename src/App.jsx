import { useState } from 'react'
import {
  ArrowUpRight,
  Accessibility,
  BarChart3,
  Bell,
  Blocks,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Download,
  ExternalLink,
  Clock3,
  FileCheck2,
  Fingerprint,
  Globe2,
  Home,
  Landmark,
  MapPin,
  Megaphone,
  LockKeyhole,
  Menu,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  Vote,
  Wallet,
  X,
} from 'lucide-react'

const candidates = [
  { id: 'maya', name: 'Maya Chen', role: 'Civic Renewal', color: 'coral', initials: 'MC', manifesto: 'Practical public services, open budgets, and neighbourhood-led decision making.' },
  { id: 'samir', name: 'Samir Okafor', role: 'Forward Together', color: 'blue', initials: 'SO', manifesto: 'A connected city built around accessible technology and sustainable growth.' },
  { id: 'elena', name: 'Elena Rossi', role: 'People First', color: 'green', initials: 'ER', manifesto: 'Investing in community health, local enterprise, and a fairer future.' },
  { id: 'jon', name: 'Jon Bell', role: 'New Horizon', color: 'yellow', initials: 'JB', manifesto: 'Clear accountability, safer streets, and a stronger voice for every ward.' },
]

const results = [
  { name: 'Maya Chen', party: 'Civic Renewal', votes: 4821, percent: 42, color: 'coral' },
  { name: 'Samir Okafor', party: 'Forward Together', votes: 3214, percent: 28, color: 'blue' },
  { name: 'Elena Rossi', party: 'People First', votes: 2065, percent: 18, color: 'green' },
  { name: 'Jon Bell', party: 'New Horizon', votes: 1377, percent: 12, color: 'yellow' },
]

function App() {
  const [activePage, setActivePage] = useState('Overview')
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [walletConnected, setWalletConnected] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const navigate = (page) => {
    setActivePage(page)
    setMobileNavOpen(false)
  }

  const castVote = () => {
    setHasVoted(true)
    setShowConfirm(false)
    setActivePage('Overview')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate('Overview')} aria-label="Go to overview">
          <span className="brand-mark"><Landmark size={21} strokeWidth={2.2} /></span>
          <span><strong>Election Commission of India</strong><small>National Voter Services Portal</small></span>
        </button>
        <div className="topbar-center"><span className="live-dot" /> Official voter services <span className="topbar-divider" /> <span className="muted">भारत निर्वाचन आयोग</span></div>
        <div className="topbar-actions">
          <button className="utility-button"><Accessibility size={16} /> Accessibility</button>
          <button className="utility-button"><Globe2 size={16} /> English <ChevronRight size={13} /></button>
          <button className="icon-button" title="Notifications"><Bell size={18} /></button>
          <button className={`wallet-button ${walletConnected ? 'connected' : ''}`} onClick={() => setWalletConnected(!walletConnected)}>
            <Wallet size={16} /> {walletConnected ? 'Verified identity' : 'Sign in'}
          </button>
          <button className="menu-button" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Toggle navigation"><Menu size={21} /></button>
        </div>
      </header>

      <div className="official-nav"><button className="official-nav-active" onClick={() => navigate('Overview')}>Home</button><button onClick={() => navigate('Candidates')}>Elections</button><button onClick={() => navigate('Vote')}>Voter services</button><button onClick={() => navigate('Results')}>Results</button><button onClick={() => navigate('Identity')}>About ECI</button><button className="nav-search" title="Search portal"><Search size={17} /></button></div>

      <div className="workspace">
        <aside className={`sidebar ${mobileNavOpen ? 'open' : ''}`}>
          <div className="profile-summary">
            <div className="avatar large">RS</div>
            <div><strong>Riya Sharma</strong><span>Verified voter</span></div>
            <button className="close-nav" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={17} /></button>
          </div>
          <div className="side-label">Online services</div>
          <nav>
            <NavItem icon={<Home size={17} />} label="Voter home" active={activePage === 'Overview'} onClick={() => navigate('Overview')} />
            <NavItem icon={<UsersRound size={17} />} label="Know your candidate" active={activePage === 'Candidates'} onClick={() => navigate('Candidates')} />
            <NavItem icon={<Vote size={17} />} label="Cast your vote" active={activePage === 'Vote'} onClick={() => navigate('Vote')} />
            <NavItem icon={<BarChart3 size={17} />} label="Election results" active={activePage === 'Results'} onClick={() => navigate('Results')} />
          </nav>
          <div className="side-label secondary-label">Voter information</div>
          <nav>
            <NavItem icon={<Fingerprint size={17} />} label="Voter identity" active={activePage === 'Identity'} onClick={() => navigate('Identity')} />
            <NavItem icon={<FileCheck2 size={17} />} label="Acknowledgement" active={activePage === 'Receipt'} onClick={() => navigate('Receipt')} />
          </nav>
          <div className="sidebar-footer">
            <div className="help-link"><CircleHelp size={17} /><span>Help & contact</span><ChevronRight size={15} /></div>
            <div className="encryption-note"><LockKeyhole size={15} /> Secure voter service</div>
          </div>
        </aside>

        <main className="main-content">
          {activePage === 'Overview' && <Overview navigate={navigate} hasVoted={hasVoted} />}
          {activePage === 'Candidates' && <CandidatesPage navigate={navigate} />}
          {activePage === 'Vote' && <VotePage candidates={candidates} selectedCandidate={selectedCandidate} setSelectedCandidate={setSelectedCandidate} hasVoted={hasVoted} onSubmit={() => setShowConfirm(true)} />}
          {activePage === 'Results' && <ResultsPage />}
          {activePage === 'Identity' && <IdentityPage walletConnected={walletConnected} />}
          {activePage === 'Receipt' && <ReceiptPage hasVoted={hasVoted} />}
        </main>
      </div>

      {showConfirm && <ConfirmDialog candidate={candidates.find((candidate) => candidate.id === selectedCandidate)} onCancel={() => setShowConfirm(false)} onConfirm={castVote} />}
    </div>
  )
}

function NavItem({ icon, label, active, onClick }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{active && <span className="nav-indicator" />}</button>
}

function Overview({ navigate, hasVoted }) {
  return <>
    <div className="official-hero reveal"><div><p className="eyebrow">Election Commission of India</p><h1>Welcome to the National Voter Services Portal</h1><p className="heading-copy">Access secure voter services, election information and verified results from one official digital platform.</p></div><div className="hero-emblem"><Landmark size={44} /><span>ECI<br /><small>सत्यमेव जयते</small></span></div></div>
    <section className="service-strip reveal delay-1"><div className="service-strip-heading"><div><p className="eyebrow">Citizen services</p><h2>How can we help you?</h2></div><button className="outline-button"><Search size={16} /> Search services</button></div><div className="service-grid"><ServiceCard icon={<Vote />} title="Cast your vote" text={hasVoted ? 'Your acknowledgement is available.' : 'Vote securely in the active election.'} onClick={() => navigate(hasVoted ? 'Receipt' : 'Vote')} /><ServiceCard icon={<UsersRound />} title="Know your candidate" text="Read candidate profiles and declarations." onClick={() => navigate('Candidates')} /><ServiceCard icon={<BarChart3 />} title="Check election results" text="View verified results and turnout." onClick={() => navigate('Results')} /><ServiceCard icon={<Fingerprint />} title="Verify voter identity" text="Review your secure voter credentials." onClick={() => navigate('Identity')} /></div></section>
    <section className="election-banner official-election reveal delay-2"><div className="banner-copy"><div className="status-pill"><span className="live-dot" /> Election information</div><h2>2026 Civic Election</h2><p>Official information for voters, candidates and election stakeholders.</p><div className="banner-meta"><span><CalendarDays size={15} /> Polling period <strong>16 Sep - 20 Sep 2026</strong></span><span><MapPin size={15} /> All constituencies</span></div></div><div className="banner-art"><div className="sun-disc" /><div className="flag flag-one" /><div className="flag flag-two" /><div className="art-lines" /></div></section>
    <section className="official-columns reveal delay-3"><div className="section-panel updates-panel"><div className="panel-heading"><div><p className="eyebrow">Public information</p><h2>Latest notices</h2></div><button className="text-button">View all <ArrowUpRight size={16} /></button></div><NoticeItem icon={<Megaphone size={16} />} date="16 SEP 2026" title="Polling and voter services are open" /><NoticeItem icon={<FileCheck2 size={16} />} date="12 SEP 2026" title="Candidate affidavits and manifestos published" /><NoticeItem icon={<Download size={16} />} date="08 SEP 2026" title="Voter information guide available" /></div><div className="section-panel contact-panel"><div className="integrity-icon"><Phone size={20} /></div><p className="eyebrow">Voter helpline</p><h2>Need assistance?</h2><p>Get help with registration, polling information, accessibility and voter services.</p><strong className="helpline-number">1950</strong><span className="helpline-caption">National Voter Helpline</span><button className="text-button">Contact ECI <ExternalLink size={15} /></button></div></section>
    <div className="portal-footer"><span><Building2 size={15} /> Election Commission of India</span><span><Globe2 size={15} /> eci.gov.in</span><span><ShieldCheck size={15} /> Secure official service</span></div>
  </>
}

function ActionCard({ icon, tone, title, text, action, onClick }) { return <article className={`action-card ${tone}`}><div className="card-icon">{icon}</div><h3>{title}</h3><p>{text}</p><button className="card-link" onClick={onClick}>{action} <ArrowUpRight size={15} /></button></article> }
function UpdateItem({ date, title, tag }) { return <div className="update-item"><span className="update-date">{date}</span><strong>{title}</strong><span className="update-tag">{tag}</span><ChevronRight size={16} /></div> }
function ServiceCard({ icon, title, text, onClick }) { return <button className="service-card" onClick={onClick}><span className="service-icon">{icon}</span><span><strong>{title}</strong><small>{text}</small></span><ChevronRight size={17} /></button> }
function NoticeItem({ icon, date, title }) { return <div className="notice-item"><span className="notice-icon">{icon}</span><span><small>{date}</small><strong>{title}</strong></span><ExternalLink size={14} /></div> }

function CandidatesPage({ navigate }) { return <PageFrame eyebrow="The field" title="Meet the candidates" subtitle="Take a moment with each platform. A considered vote is a powerful one."><div className="candidate-grid">{candidates.map((candidate, index) => <article className="candidate-card" key={candidate.id}><div className={`candidate-portrait ${candidate.color}`}><span>{candidate.initials}</span><em>0{index + 1}</em></div><div className="candidate-body"><p className="eyebrow">{candidate.role}</p><h3>{candidate.name}</h3><p>{candidate.manifesto}</p><button className="small-button" onClick={() => navigate('Vote')}>Vote for {candidate.name.split(' ')[0]} <ArrowUpRight size={14} /></button></div></article>)}</div></PageFrame> }

function VotePage({ candidates, selectedCandidate, setSelectedCandidate, hasVoted, onSubmit }) { return <PageFrame eyebrow="Secure ballot" title="Cast your vote" subtitle="Select one candidate. You will review your choice before it is signed and recorded."><div className="vote-layout"><section className="ballot-card"><div className="ballot-top"><div><span className="status-pill"><span className="live-dot" /> Election open</span><h2>City representative</h2></div><span className="ballot-number">BALLOT 01 / 01</span></div>{hasVoted ? <div className="already-voted"><div className="success-mark"><Check size={24} /></div><h3>Your vote is already recorded</h3><p>This ballot has been sealed. Your receipt is available in the account menu.</p></div> : <><div className="choice-list">{candidates.map((candidate) => <label className={`choice-row ${selectedCandidate === candidate.id ? 'selected' : ''}`} key={candidate.id}><input type="radio" name="candidate" value={candidate.id} checked={selectedCandidate === candidate.id} onChange={() => setSelectedCandidate(candidate.id)} /><span className={`mini-portrait ${candidate.color}`}>{candidate.initials}</span><span className="choice-copy"><strong>{candidate.name}</strong><small>{candidate.role}</small></span><span className="radio-mark" /></label>)}</div><div className="ballot-footer"><span><LockKeyhole size={14} /> Anonymous by design</span><button className="primary-button" disabled={!selectedCandidate} onClick={onSubmit}>Review selection <ArrowUpRight size={16} /></button></div></>}</section><aside className="vote-aside"><div className="aside-number">01<span>/03</span></div><h3>One person.<br />One choice.</h3><p>Your wallet signature proves eligibility. It never reveals who you chose.</p><div className="aside-rule" /><div className="step done"><span><Check size={13} /></span><p><strong>Eligibility checked</strong><small>Wallet verified</small></p></div><div className="step current"><span>2</span><p><strong>Select candidate</strong><small>Your choice stays private</small></p></div><div className="step"><span>3</span><p><strong>Sign & record</strong><small>Immutable ledger entry</small></p></div></aside></div></PageFrame> }

function ResultsPage() { const total = results.reduce((sum, result) => sum + result.votes, 0); return <PageFrame eyebrow="Live tally" title="Election results" subtitle="Verified votes are counted transparently as the election progresses."><div className="results-overview"><div><p className="eyebrow">Current turnout</p><strong className="big-stat">11,477</strong><span className="stat-caption">ballots recorded</span></div><div className="turnout-ring"><div><strong>68<span>%</span></strong><small>turnout</small></div></div><div className="result-note"><ShieldCheck size={18} /><p><strong>Ledger verified</strong><br />Last block confirmed 2 mins ago</p></div></div><section className="results-panel"><div className="panel-heading"><div><p className="eyebrow">Live count</p><h2>Who is leading?</h2></div><span className="live-label"><span className="live-dot" /> Updating live</span></div>{results.map((result, index) => <div className="result-row" key={result.name}><div className={`result-rank ${index === 0 ? 'winner' : ''}`}>0{index + 1}</div><div className="result-label"><strong>{result.name}</strong><span>{result.party}</span></div><div className="result-bar"><span className={result.color} style={{ width: `${result.percent}%` }} /></div><strong className="result-percent">{result.percent}%</strong><span className="result-votes">{result.votes.toLocaleString()} votes</span></div>)}<div className="total-votes">Total verified ballots <strong>{total.toLocaleString()}</strong></div></section></PageFrame> }

function IdentityPage({ walletConnected }) { return <PageFrame eyebrow="Privacy centre" title="Identity & privacy" subtitle="The system is designed to prove you can vote without exposing how you voted."><div className="privacy-grid"><section className="privacy-card dark"><Fingerprint size={30} /><p className="eyebrow">Your cryptographic identity</p><h2>{walletConnected ? 'Wallet connected' : 'Connect your wallet to verify'}</h2><p>{walletConnected ? 'Your address is eligible for this election. It can sign a ballot, but it cannot see your candidate choice.' : 'A wallet signature is used as a secure, passwordless proof of eligibility.'}</p><div className="hash-line">{walletConnected ? '0x7A8c...91B4' : 'Identity not connected'} <LockKeyhole size={14} /></div></section><section className="privacy-card"><div className="privacy-row"><span className="privacy-symbol mint"><Fingerprint size={18} /></span><p><strong>Identity layer</strong><small>Eligibility proof, kept separate</small></p><Check size={17} className="check" /></div><div className="privacy-row"><span className="privacy-symbol blue"><Vote size={18} /></span><p><strong>Ballot layer</strong><small>Anonymous vote transaction</small></p><Check size={17} className="check" /></div><div className="privacy-row"><span className="privacy-symbol yellow"><Blocks size={18} /></span><p><strong>Ledger layer</strong><small>Public, tamper-evident record</small></p><Check size={17} className="check" /></div></section></div></PageFrame> }
function ReceiptPage({ hasVoted }) { return <PageFrame eyebrow="Your record" title="Vote receipt" subtitle="A receipt proves your ballot was recorded without revealing your selection."><div className="receipt-card">{hasVoted ? <><div className="receipt-head"><div className="success-mark"><Check size={24} /></div><div><p className="eyebrow">Recorded successfully</p><h2>Your vote has been sealed.</h2></div></div><div className="receipt-details"><span>Transaction reference</span><strong>BL-2026-09-16-7A91B4</strong><span>Block confirmation</span><strong>#0001842 · verified</strong><span>Recorded at</span><strong>16 Sep 2026, 10:42 AM UTC</strong></div></> : <div className="empty-receipt"><ClipboardCheck size={28} /><h2>No receipt yet</h2><p>Your private receipt will appear here after you cast your ballot.</p></div>}</div></PageFrame> }
function PageFrame({ eyebrow, title, subtitle, children }) { return <div className="page-frame"><div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="heading-copy">{subtitle}</p></div></div>{children}</div> }
function ConfirmDialog({ candidate, onCancel, onConfirm }) { return <div className="dialog-backdrop"><section className="confirm-dialog"><button className="dialog-close" onClick={onCancel} aria-label="Close"><X size={18} /></button><div className="confirm-icon"><ShieldCheck size={24} /></div><p className="eyebrow">Final review</p><h2>Ready to make it count?</h2><p className="dialog-copy">You are selecting <strong>{candidate?.name}</strong>. Once signed, your vote is recorded on the civic ledger and cannot be changed.</p><div className="dialog-choice"><span className={`mini-portrait ${candidate?.color}`}>{candidate?.initials}</span><div><strong>{candidate?.name}</strong><small>{candidate?.role}</small></div><Check size={18} /></div><div className="dialog-actions"><button className="outline-button" onClick={onCancel}>Go back</button><button className="primary-button" onClick={onConfirm}>Sign & submit <ArrowUpRight size={16} /></button></div></section></div> }

export default App
