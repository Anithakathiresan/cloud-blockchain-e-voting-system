# College E-Voting System

A cloud-ready election portal for college elections. Students see the elections they are eligible for, cast a confidential ballot, keep a receipt and follow verified results. Election officers create elections, verify candidates and manage the voter roll. Every ballot is sealed into a hash-linked ledger the moment it is cast.

The portal runs entirely in the browser, so the whole election workflow can be reviewed without a wallet, an RPC endpoint or a backend.

## Roles and screens

Routes are hash-based (`#/page` or `#/page/id`), so reloads, the back button and shared links work.

**Public:** home, about, services, contact, voter roll lookup (`check`), election information, login and registration. Elections, candidates, results, notices, ledger and help can also be browsed without signing in.

**Student** (sidebar: Dashboard, Elections, Candidates, Cast Vote, Results, My Receipts, Notices):

| Screen | Route | What it does |
| --- | --- | --- |
| Dashboard | `dashboard` | Greeting, eligible / active / voted / upcoming counts, election cards, ballot progress, live results preview, ledger status, notices. |
| Elections | `elections`, `election/:id` | Filter by status, department and year; election details with candidates grouped by position. |
| Candidates | `candidates`, `candidate/:id` | Directory and profile: about, manifesto, key priorities. |
| Cast Vote | `vote`, `vote/:id`, `confirmation/:id` | Select → review → confirm (dialog) → receipt. Single, multiple and ranked-choice ballots. |
| Results | `results/:id` | Filters, eligible / cast / turnout / valid summary, per-position results, instant-runoff rounds. Hidden until close when the election says so. |
| My Receipts | `receipts`, `receipt/:id` | One receipt per election, with re-verification against the ledger. |
| Ledger | `ledger` | Block explorer and verification status. |

**Administrator** adds: Election Management (`manage-elections`, publish / close / delete with confirmation), an 8-step election wizard (`election-new`, `election-edit/:id`), Candidate Verification, Voter Management, Departments (`department/:id`), Academic Years, Committees and Reports (CSV export).

Settings (light / dark theme, language) and Help are available to everyone signed in. Light is the default theme; the choice persists.

## Elections

`src/store.js` holds the election registry: elections, candidates, notices, committees and an activity log. `src/elections.js` derives everything else: lifecycle status (draft → upcoming → open → closed), eligibility, formatting and the tally.

- **Scope:** college-wide, department, or one year of one department. College-wide elections can be narrowed to some departments or years.
- **Ballot type:** single choice, multiple choice (up to N seats) or ranked choice (instant runoff).
- **Mode:** direct (eligible students vote) or representative (only committee representatives on the roll vote).
- **Results:** live, or hidden until voting closes.
- Only verified candidates appear on the ballot, and reviews lock once voting opens.

## How the ledger works

`src/chain.js` keeps a chain of blocks in browser storage:

- each block holds its index, timestamp, previous hash and a nonce, plus the election id and selections for per-election ballots;
- the hash is SHA-256 over that payload, mined until it carries a `00` prefix;
- every block commits to the hash of the block before it, so editing an old vote breaks every block that follows — `verifyChain()` reports the first index that fails;
- the ledger stores a **salted digest of the register number**, salted per election, so ballots cannot be traced to a student or linked across elections, while a second ballot in the same election is rejected.

Ballots cast before per-election voting (no `electionId`) still verify and are counted for the original Student Council President election (`LEGACY_ELECTION_ID`).

`src/db.js` is the separate voter roll: registration, sign-in, role, department, year, the public roll lookup and the "has voted" flag. Ballot choices never touch it.

## Run locally

```bash
npm install
npm run dev
```

Build a production bundle with `npm run build`.

### Demo credentials

The roll is pre-seeded, and the login page lists these with a one-click fill:

| Username | Password | Role |
| --- | --- | --- |
| `WXJ1892340` | `1998-04-24` | Student, AI & DS IV Year |
| `KLR4920194` | `1992-11-15` | Student, CSE III Year |
| `DLH8831920` | `1989-08-30` | Student, ECE II Year |
| `ADMIN001` | `admin@2026` | Administrator |

More seeded students (password = date of birth) are listed under Voter Management. Voter records, the registry, the session and the ledger live in `localStorage`; Settings → Reset demo data (administrator) restores the samples.

## Project layout

```text
src/
  App.jsx                 state, routing, access control, ballot and admin actions
  router.js               hash routes and page groups
  context.js              AppContext / useApp
  chain.js                hash-linked ballot ledger (mine, verify, tally)
  db.js                   voter roll: register, authenticate, search, update
  store.js                election registry, seed data and pure mutations
  elections.js            status, eligibility, formatting, tally (incl. instant runoff)
  college.js              departments and academic years
  translations.js, siteText.js, uiText.js   en / ta / hi strings (English fallback)
  styles.css              design tokens, light and dark themes, components
  components/
    ui.jsx                Card, Badge, StatusBadge, Modal, ConfirmModal, Stepper,
                          EmptyState, LoadingState, ErrorState, Field, Tabs, …
    Layout.jsx            console (sidebar + header) and public site frames
    election.jsx          ElectionCard, CandidateCard, PositionResults
  pages/
    HomePage, AuthPages, InfoPages      public site
    Dashboard, ElectionPages, CandidatePages, VotePage,
    ResultsPage, ReceiptPages, SystemPages
    admin/                              management pages and the election wizard
blockchain/
  contracts/VotingSystem.sol
```

Navigation, the header and the ballot flow are translated into Tamil and Hindi; other new screens currently fall back to English.

## Moving to a real network

`blockchain/contracts/VotingSystem.sol` is the integration boundary. It already models the election lifecycle (`createElection`, `addCandidate`, `setElectionStatus`), an eligibility registry (`setEligibility`), a duplicate-vote guard (`hasVoted`), and receipts (`castVote` with a `privateReceipt`, plus a `VoteRecorded` event).

A production path from here:

1. Add Hardhat scripts and contract tests for the lifecycle, eligibility and duplicate voting.
2. Add an `ethers.js` adapter and wallet connection, replacing the local ledger writes in `chain.js` with `castVote` transactions.
3. Read elections, candidates and tallies from the contract and a backend instead of the browser registry.
4. Replace the salted-digest identity with a Merkle eligibility registry and a zero-knowledge proof, so eligibility is provable without linking the voter to a ballot.
5. Deploy the front end to a static host and the contract to a controlled EVM network.

Note on secrecy: the contract's candidate identifier is visible on-chain, so this is a teaching and integration foundation, not full ballot secrecy until that proof layer is in place.
