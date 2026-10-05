// Election registry: elections, candidates, notices, committees and the
// admin activity log, persisted in browser storage next to the voter roll.
//
// Ballots never live here — they stay on the ledger (chain.js). The original
// single election keeps the id LEGACY_ELECTION_ID, so ballots cast before the
// registry existed are still counted for it.

import { LEGACY_ELECTION_ID } from './chain'

const REGISTRY_KEY = 'evoting_college_registry'
const REGISTRY_VERSION = 1

// Seeds are laid out around the moment they are written, so a fresh install
// always has one election open, some upcoming and one already closed.
function dayAt(base, days, hour) {
  const date = new Date(base)
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

function ago(base, ms) {
  return new Date(base - ms).toISOString()
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

function candidate(electionId, positionId, id, name, department, year, extra = {}) {
  return {
    id,
    electionId,
    positionId,
    name,
    department,
    year,
    photo: '',
    panel: '',
    about: '',
    manifesto: '',
    priorities: [],
    status: 'verified',
    baseVotes: 0,
    submittedAt: '',
    ...extra,
  }
}

function seedRegistry(now = Date.now()) {
  const elections = [
    {
      id: LEGACY_ELECTION_ID,
      legacy: true,
      title: 'Student Council Election 2026',
      category: 'Student Council',
      description: 'Elect the President of the Student Council for the 2026–27 academic year.',
      session: '2026–27',
      scope: 'college',
      departmentId: '',
      year: '',
      method: 'single',
      mode: 'direct',
      positions: [{ id: 'president', title: 'President', seats: 1 }],
      eligibility: { departments: [], years: [] },
      electorate: 18500,
      baseTurnout: 12315,
      startsAt: dayAt(now, -1, 9),
      endsAt: dayAt(now, 3, 17),
      resultsVisibility: 'live',
      published: true,
      closedAt: null,
      createdAt: ago(now, 12 * DAY),
    },
    {
      id: 'council-office-2026',
      title: 'Council Office Bearers 2026',
      category: 'Student Council',
      description: 'Elect the Vice President, General Secretary and Treasurer of the Student Council.',
      session: '2026–27',
      scope: 'college',
      departmentId: '',
      year: '',
      method: 'single',
      mode: 'direct',
      positions: [
        { id: 'vice-president', title: 'Vice President', seats: 1 },
        { id: 'general-secretary', title: 'General Secretary', seats: 1 },
        { id: 'treasurer', title: 'Treasurer', seats: 1 },
      ],
      eligibility: { departments: [], years: [] },
      electorate: 18500,
      baseTurnout: 6120,
      startsAt: dayAt(now, -1, 9),
      endsAt: dayAt(now, 2, 17),
      resultsVisibility: 'after_close',
      published: true,
      closedAt: null,
      createdAt: ago(now, 10 * DAY),
    },
    {
      id: 'cultural-2026',
      title: 'Cultural Committee 2026',
      category: 'Committee',
      description: 'Choose three members for the college Cultural Committee.',
      session: '2026–27',
      scope: 'college',
      departmentId: '',
      year: '',
      method: 'multiple',
      mode: 'direct',
      positions: [{ id: 'members', title: 'Cultural Committee Member', seats: 3 }],
      eligibility: { departments: [], years: [] },
      electorate: 18500,
      baseTurnout: 3890,
      startsAt: dayAt(now, -2, 9),
      endsAt: dayAt(now, 4, 17),
      resultsVisibility: 'live',
      published: true,
      closedAt: null,
      createdAt: ago(now, 9 * DAY),
    },
    {
      id: 'cse-dept-2026',
      title: 'CSE Department Committee',
      category: 'Department Committee',
      description: 'Rank the candidates for CSE Department Committee Leader in order of preference.',
      session: '2026–27',
      scope: 'department',
      departmentId: 'cse',
      year: '',
      method: 'ranked',
      mode: 'direct',
      positions: [{ id: 'dept-leader', title: 'Department Committee Leader', seats: 1 }],
      eligibility: { departments: ['cse'], years: [] },
      electorate: 620,
      baseTurnout: 0,
      // Seeded ranked ballots, so the runoff has transfers to show.
      baseBallots: [
        { ranking: ['cse-divya', 'cse-aravind', 'cse-priyanka'], weight: 150 },
        { ranking: ['cse-divya', 'cse-priyanka'], weight: 62 },
        { ranking: ['cse-aravind', 'cse-divya'], weight: 120 },
        { ranking: ['cse-aravind', 'cse-priyanka'], weight: 60 },
        { ranking: ['cse-priyanka', 'cse-aravind'], weight: 70 },
        { ranking: ['cse-priyanka', 'cse-divya'], weight: 25 },
      ],
      startsAt: dayAt(now, -1, 9),
      endsAt: dayAt(now, 1, 17),
      resultsVisibility: 'live',
      published: true,
      closedAt: null,
      createdAt: ago(now, 8 * DAY),
    },
    {
      id: 'aids-dept-2026',
      title: 'AI & DS Department Committee',
      category: 'Department Committee',
      description: 'Rank the candidates for AI & DS Department Committee Leader in order of preference.',
      session: '2026–27',
      scope: 'department',
      departmentId: 'aids',
      year: '',
      method: 'ranked',
      mode: 'direct',
      positions: [{ id: 'dept-leader', title: 'Department Committee Leader', seats: 1 }],
      eligibility: { departments: ['aids'], years: [] },
      electorate: 480,
      baseTurnout: 0,
      startsAt: dayAt(now, 1, 9),
      endsAt: dayAt(now, 2, 17),
      resultsVisibility: 'live',
      published: true,
      closedAt: null,
      createdAt: ago(now, 7 * DAY),
    },
    {
      id: 'aids-year4-rep',
      title: 'AI & DS IV Year Representative',
      category: 'Year Representative',
      description: 'Elect the class representative for IV Year AI & DS.',
      session: '2026–27',
      scope: 'year',
      departmentId: 'aids',
      year: 4,
      method: 'single',
      mode: 'direct',
      positions: [{ id: 'year-rep', title: 'IV Year Representative', seats: 1 }],
      eligibility: { departments: ['aids'], years: [4] },
      electorate: 120,
      baseTurnout: 0,
      startsAt: dayAt(now, 4, 9),
      endsAt: dayAt(now, 5, 17),
      resultsVisibility: 'live',
      published: true,
      closedAt: null,
      createdAt: ago(now, 6 * DAY),
    },
    {
      id: 'sports-2026',
      title: 'Sports Secretary Election',
      category: 'Student Council',
      description: 'Elect the Sports Secretary who coordinates inter-department tournaments.',
      session: '2026–27',
      scope: 'college',
      departmentId: '',
      year: '',
      method: 'single',
      mode: 'direct',
      positions: [{ id: 'sports-secretary', title: 'Sports Secretary', seats: 1 }],
      eligibility: { departments: [], years: [] },
      electorate: 18200,
      baseTurnout: 9420,
      startsAt: dayAt(now, -20, 9),
      endsAt: dayAt(now, -18, 17),
      resultsVisibility: 'live',
      published: true,
      closedAt: null,
      createdAt: ago(now, 30 * DAY),
    },
    {
      id: 'eee-year3-rep',
      title: 'EEE III Year Representative',
      category: 'Year Representative',
      description: 'Elect the class representative for III Year EEE.',
      session: '2026–27',
      scope: 'year',
      departmentId: 'eee',
      year: 3,
      method: 'single',
      mode: 'direct',
      positions: [{ id: 'year-rep', title: 'III Year Representative', seats: 1 }],
      eligibility: { departments: ['eee'], years: [3] },
      electorate: 140,
      baseTurnout: 0,
      startsAt: dayAt(now, 10, 9),
      endsAt: dayAt(now, 11, 17),
      resultsVisibility: 'live',
      published: false,
      closedAt: null,
      createdAt: ago(now, 1 * DAY),
    },
  ]

  const legacy = (id, key, image, department, baseVotes, priorities) =>
    candidate(LEGACY_ELECTION_ID, 'president', id, '', department, 4, {
      i18nKey: key,
      photo: image,
      baseVotes,
      about: 'Final-year student standing for Student Council President.',
      priorities,
      submittedAt: ago(now, 11 * DAY),
    })

  const candidates = [
    legacy('dhanush', 'candidate1', '/candidates/dhanush.png', 'cse', 4821, [
      'Open, published council budgets',
      'More internship and placement drives',
      'Department-led event planning',
    ]),
    legacy('suriya', 'candidate2', '/candidates/suriya.png', 'ece', 3456, [
      'Free peer tutoring before exams',
      'Better health centre hours',
      'A greener, plastic-free campus',
    ]),
    legacy('sivakarthikeyan', 'candidate3', '/candidates/sivakarthikeyan.png', 'aids', 2318, [
      'Startup and innovation cell',
      'Inter-department sports league',
      'Student arts and culture fund',
    ]),
    legacy('vikram', 'candidate4', '/candidates/vikram.png', 'mech', 1720, [
      'Monthly council accountability report',
      'Safer, better-lit campus paths',
      'Faster grievance redressal',
    ]),

    candidate('council-office-2026', 'vice-president', 'vp-aishwarya', 'Aishwarya Mohan', 'ece', 3, {
      baseVotes: 3310,
      about: 'Former class representative and organiser of the ECE technical symposium.',
      manifesto: 'A council that answers every student query within a week.',
      priorities: ['Weekly open council hours', 'Transparent event budgets', 'Mentoring for first-years'],
    }),
    candidate('council-office-2026', 'vice-president', 'vp-rahul', 'Rahul Venkat', 'civil', 3, {
      baseVotes: 2810,
      about: 'NSS volunteer who led the campus clean-up drive.',
      manifesto: 'Put student welfare first: transport, canteen and hostel facilities.',
      priorities: ['Extra college bus routes', 'Canteen quality committee', 'Hostel maintenance tracker'],
    }),
    candidate('council-office-2026', 'general-secretary', 'gs-lakshmi', 'Lakshmi Priya', 'aids', 3, {
      baseVotes: 2950,
      about: 'Coordinator of the AI & DS coding club.',
      manifesto: 'One shared calendar for every club, department and council event.',
      priorities: ['Unified events calendar', 'Club funding by application', 'Digital notice board'],
    }),
    candidate('council-office-2026', 'general-secretary', 'gs-vignesh', 'Vignesh Babu', 'mech', 3, {
      baseVotes: 1820,
      about: 'Captain of the college robotics team.',
      manifesto: 'More workshops and hands-on learning spaces for every department.',
      priorities: ['Open maker lab hours', 'Industry workshops', 'Alumni talks'],
    }),
    candidate('council-office-2026', 'general-secretary', 'gs-surya', 'Surya Prakash', 'cse', 3, {
      baseVotes: 1350,
      about: 'Student editor of the college newsletter.',
      manifesto: 'Clear communication between the council and every classroom.',
      priorities: ['Monthly council newsletter', 'Class-level feedback forms', 'Faster notices'],
    }),
    candidate('council-office-2026', 'treasurer', 'tr-nithya', 'Nithya Suresh', 'eee', 4, {
      baseVotes: 3480,
      about: 'Managed accounts for the EEE association for two years.',
      manifesto: 'Every rupee of council money published and accounted for.',
      priorities: ['Published monthly accounts', 'Online payment receipts', 'Audit by students'],
    }),
    candidate('council-office-2026', 'treasurer', 'tr-pranav', 'Pranav Menon', 'cse', 4, {
      baseVotes: 2640,
      about: 'Finance lead of the entrepreneurship cell.',
      manifesto: 'Make fest sponsorships work harder for student activities.',
      priorities: ['Sponsorship drive', 'Club grant scheme', 'Budget dashboard'],
    }),

    ...[
      ['cc-deepika', 'Deepika Raj', 'aids', 2, 2410, 'Classical dancer and choreographer for the annual day.'],
      ['cc-irfan', 'Mohammed Irfan', 'ece', 3, 2205, 'Lead vocalist of the college band.'],
      ['cc-shalini', 'Shalini Devi', 'civil', 2, 1980, 'Organised the inter-college art exhibition.'],
      ['cc-karan', 'Karan Singh', 'mech', 3, 1760, 'Theatre club coordinator.'],
      ['cc-anjali', 'Anjali Nair', 'cse', 2, 1590, 'Photography club founder.'],
    ].map(([id, name, department, year, baseVotes, about]) =>
      candidate('cultural-2026', 'members', id, name, department, year, {
        baseVotes,
        about,
        manifesto: 'A cultural calendar with something for every student, every month.',
        priorities: ['Monthly cultural evenings', 'Open auditions', 'Inter-department fest'],
      }),
    ),

    candidate('cse-dept-2026', 'dept-leader', 'cse-divya', 'Divya Lakshmi', 'cse', 4, {
      about: 'Placement coordinator for the CSE department.',
      manifesto: 'Placement preparation that starts in second year, not fourth.',
      priorities: ['Mock interviews every month', 'Coding practice hours', 'Alumni mentoring'],
    }),
    candidate('cse-dept-2026', 'dept-leader', 'cse-aravind', 'Aravind S', 'cse', 4, {
      about: 'Hackathon winner and open-source contributor.',
      manifesto: 'Turn the department lab into a space students can build in.',
      priorities: ['24x7 project lab access', 'Hackathon team funding', 'Open-source club'],
    }),
    candidate('cse-dept-2026', 'dept-leader', 'cse-priyanka', 'Priyanka M', 'cse', 3, {
      about: 'Class representative for III Year CSE.',
      manifesto: 'Listen first: regular feedback sessions with every year.',
      priorities: ['Year-wise feedback meetings', 'Study material library', 'Lab equipment upkeep'],
    }),

    candidate('aids-dept-2026', 'dept-leader', 'aids-arjun', 'Arjun Prakash', 'aids', 4, {
      about: 'Current AI & DS department committee leader and Kaggle competitor.',
      manifesto: 'Real datasets, real projects and industry mentors for every year.',
      priorities: ['Industry project tie-ups', 'GPU lab booking system', 'Research paper reading group'],
    }),
    candidate('aids-dept-2026', 'dept-leader', 'aids-kavya', 'Kavya Ramesh', 'aids', 3, {
      about: 'Class representative for III Year AI & DS.',
      manifesto: 'A department where every student gets a mentor and a project.',
      priorities: ['Senior–junior mentoring', 'Mini-project showcase', 'Internship alerts'],
    }),
    candidate('aids-dept-2026', 'dept-leader', 'aids-rohit', 'Rohit Sharma', 'aids', 4, {
      about: 'Organiser of the department data science workshop.',
      manifesto: 'Workshops every month, taught by students and alumni.',
      priorities: ['Monthly workshops', 'Certification support', 'Placement data sharing'],
    }),
    candidate('aids-dept-2026', 'dept-leader', 'aids-janani', 'Janani K', 'aids', 3, {
      status: 'pending',
      about: 'Volunteer with the department outreach programme.',
      manifesto: 'Bring AI & DS projects to local schools and communities.',
      priorities: ['School outreach', 'Social-good projects', 'Women in tech circle'],
      submittedAt: ago(now, 6 * HOUR),
    }),

    candidate('aids-year4-rep', 'year-rep', 'y4-tharun', 'Tharun Kumar', 'aids', 4, {
      about: 'Lab assistant volunteer and final-year project lead.',
      manifesto: 'Make the final year less stressful: clear deadlines, early placement prep.',
      priorities: ['Project review calendar', 'Placement prep sessions', 'Class feedback forms'],
    }),
    candidate('aids-year4-rep', 'year-rep', 'y4-swetha', 'Swetha R', 'aids', 4, {
      about: 'Topper of the batch and peer tutor.',
      manifesto: 'Shared notes, study groups and a voice in every faculty meeting.',
      priorities: ['Shared notes drive', 'Study groups', 'Faculty meeting reports'],
    }),
    candidate('aids-year4-rep', 'year-rep', 'y4-ashwin', 'Ashwin Das', 'aids', 4, {
      status: 'pending',
      about: 'Member of the department sports team.',
      manifesto: 'Balance academics with sports and wellbeing.',
      priorities: ['Sports hour', 'Wellbeing sessions', 'Class trips'],
      submittedAt: ago(now, 1 * DAY),
    }),
    candidate('aids-year4-rep', 'year-rep', 'y4-bala', 'Bala Murugan', 'aids', 4, {
      status: 'rejected',
      rejectionReason: 'Nomination form incomplete: attendance certificate missing.',
      about: 'Event volunteer.',
      submittedAt: ago(now, 2 * DAY),
    }),

    candidate('sports-2026', 'sports-secretary', 'sp-vishal', 'Vishal Kannan', 'mech', 4, {
      baseVotes: 4630,
      about: 'Captain of the college football team.',
      manifesto: 'More tournaments, better equipment and a league for every sport.',
      priorities: ['Inter-department league', 'New sports equipment', 'Evening ground access'],
    }),
    candidate('sports-2026', 'sports-secretary', 'sp-keerthana', 'Keerthana S', 'eee', 3, {
      baseVotes: 3210,
      about: 'State-level athletics medallist.',
      manifesto: 'Equal support for women’s teams and individual sports.',
      priorities: ['Women’s sports teams', 'Athletics coaching', 'Fitness centre hours'],
    }),
    candidate('sports-2026', 'sports-secretary', 'sp-dinesh', 'Dinesh Kumar', 'civil', 4, {
      baseVotes: 1580,
      about: 'Organiser of the annual sports meet.',
      manifesto: 'A sports calendar published at the start of every semester.',
      priorities: ['Sports calendar', 'Coaching camps', 'Indoor games room'],
    }),

    candidate('eee-year3-rep', 'year-rep', 'e3-gokul', 'Gokul Nathan', 'eee', 3, {
      status: 'pending',
      about: 'Member of the EEE association.',
      manifesto: 'Better lab schedules and industrial visits for III Year.',
      priorities: ['Lab schedule planning', 'Industrial visits', 'Class feedback'],
      submittedAt: ago(now, 1 * DAY),
    }),
    candidate('eee-year3-rep', 'year-rep', 'e3-revathi', 'Revathi P', 'eee', 3, {
      status: 'pending',
      about: 'Coordinator for the EEE technical quiz.',
      manifesto: 'More technical events and certification courses.',
      priorities: ['Technical quizzes', 'Certification courses', 'Study groups'],
      submittedAt: ago(now, 20 * HOUR),
    }),
  ]

  const holder = (name, department, year, voterId = '') => ({ name, department, year, voterId })

  const committee = {
    council: [
      { role: 'president', title: 'President', holder: holder('Aravind Selvam', 'cse', 4) },
      { role: 'vice-president', title: 'Vice President', holder: holder('Nisha Thomas', 'ece', 4) },
      { role: 'general-secretary', title: 'General Secretary', holder: holder('Prakash Raj', 'mech', 4) },
      { role: 'treasurer', title: 'Treasurer', holder: holder('Fathima Begum', 'aids', 4) },
    ],
    departments: {
      aids: {
        leader: holder('Arjun Prakash', 'aids', 4, '21AD014'),
        years: {
          4: holder('Riya Sharma', 'aids', 4, 'WXJ1892340'),
          3: holder('Kavya Ramesh', 'aids', 3, '22AD031'),
          2: holder('Naveen Raj', 'aids', 2, '23AD007'),
          1: holder('Priya Dharshini', 'aids', 1, '24AD011'),
        },
      },
      cse: {
        leader: holder('Divya Lakshmi', 'cse', 4, '21CS022'),
        years: {
          4: holder('Pranav Menon', 'cse', 4, '21CS050'),
          3: holder('Karthik Raman', 'cse', 3, 'KLR4920194'),
          2: holder('Harish Kumar', 'cse', 2, '23CS045'),
          1: holder('Rohan Das', 'cse', 1, '24CS019'),
        },
      },
      ece: {
        leader: holder('Aishwarya Mohan', 'ece', 3),
        years: {
          4: holder('Rakesh V', 'ece', 4, '21EC033'),
          3: holder('Sneha Iyer', 'ece', 3, '22EC018'),
          2: holder('Pooja Verma', 'ece', 2, 'DLH8831920'),
          1: holder('Anitha Joseph', 'ece', 1, '24EC006'),
        },
      },
      eee: {
        leader: holder('Nithya Suresh', 'eee', 4),
        years: {
          4: holder('Hari Prasad', 'eee', 4, '21EE005'),
          3: holder('Gokul Nathan', 'eee', 3, '22EE009'),
          2: holder('Madhan K', 'eee', 2, '23EE021'),
          1: holder('Lokesh Kumar', 'eee', 1, '24EE012'),
        },
      },
      mech: {
        leader: holder('Sanjay Krishnan', 'mech', 4, '21ME027'),
        years: {
          4: holder('Vishal Kannan', 'mech', 4),
          3: holder('Karan Singh', 'mech', 3, '22ME008'),
          2: holder('Ajith M', 'mech', 2, '23ME040'),
          1: holder('Surya Narayanan', 'mech', 1, '24ME015'),
        },
      },
      civil: {
        leader: holder('Dinesh Kumar', 'civil', 4),
        years: {
          4: holder('Kaviya S', 'civil', 4, '21CV002'),
          3: holder('Rahul Venkat', 'civil', 3, '22CV025'),
          2: holder('Shalini Devi', 'civil', 2, '23CV017'),
          1: holder('Meena Sundaram', 'civil', 1, '24CV003'),
        },
      },
    },
  }

  const notices = [
    {
      id: 'notice-1',
      title: 'President election voting is open',
      body: 'Voting for Student Council President is open. Sign in and cast your ballot from the Cast Vote page.',
      createdAt: ago(now, 2 * HOUR),
    },
    {
      id: 'notice-2',
      title: 'AI & DS Department Committee voting opens tomorrow',
      body: 'This is a ranked-choice ballot: rank the candidates in your order of preference.',
      createdAt: ago(now, 5 * HOUR),
    },
    {
      id: 'notice-3',
      title: 'Voting schedule updated',
      body: 'Council Office Bearers voting closes at 5:00 PM on the final day. Results are published after voting closes.',
      createdAt: ago(now, 1 * DAY + 3 * HOUR),
    },
    {
      id: 'notice-4',
      title: 'Candidate verification completed',
      body: 'All Cultural Committee nominations have been verified. Candidate profiles are on the Candidates page.',
      createdAt: ago(now, 2 * DAY + 4 * HOUR),
    },
    {
      id: 'notice-5',
      title: 'Sports Secretary results declared',
      body: 'Vishal Kannan (Mechanical, IV Year) has been elected Sports Secretary.',
      createdAt: ago(now, 17 * DAY),
    },
  ]

  const activity = [
    { id: 'act-1', at: ago(now, 6 * HOUR), text: 'Nomination received: Janani K for AI & DS Department Committee' },
    { id: 'act-2', at: ago(now, 1 * DAY), text: 'Draft created: EEE III Year Representative' },
    { id: 'act-3', at: ago(now, 2 * DAY), text: 'Candidates verified for Cultural Committee 2026' },
    { id: 'act-4', at: ago(now, 4 * DAY), text: 'Election published: Council Office Bearers 2026' },
    { id: 'act-5', at: ago(now, 18 * DAY), text: 'Election closed: Sports Secretary Election' },
  ]

  return { version: REGISTRY_VERSION, seedRevision: SEED_REVISION, elections, candidates, notices, committee, activity }
}

export function saveRegistry(registry) {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry))
  } catch (err) {
    console.error('Failed to save the election registry:', err)
  }
  return registry
}

// Ballots sealed on a fresh ledger so the explorer, receipts, participation
// and activity screens have real blocks to show. Riya Sharma's only demo
// ballot is in the closed Sports election, so every open ballot stays hers
// to cast. `hoursAgo` places each ballot inside its election's voting window.
export function demoBallots(now = Date.now()) {
  const at = (hoursAgo) => new Date(now - hoursAgo * HOUR).toISOString()
  const sportsDay = (hour) => {
    const date = new Date(now)
    date.setDate(date.getDate() - 19)
    date.setHours(hour, 0, 0, 0)
    return date.toISOString()
  }
  return [
    { voterId: 'WXJ1892340', electionId: 'sports-2026', selections: { 'sports-secretary': ['sp-vishal'] }, at: sportsDay(10) },
    { voterId: '21AD014', electionId: 'sports-2026', selections: { 'sports-secretary': ['sp-keerthana'] }, at: sportsDay(11) },
    { voterId: '21ME027', electionId: 'sports-2026', selections: { 'sports-secretary': ['sp-vishal'] }, at: sportsDay(12) },
    { voterId: '22CV025', electionId: 'sports-2026', selections: { 'sports-secretary': ['sp-dinesh'] }, at: sportsDay(14) },
    { voterId: '21AD014', electionId: LEGACY_ELECTION_ID, candidateId: 'sivakarthikeyan', at: at(20) },
    { voterId: '21CS022', electionId: LEGACY_ELECTION_ID, candidateId: 'dhanush', at: at(18) },
    { voterId: '21CS022', electionId: 'cse-dept-2026', selections: { 'dept-leader': ['cse-divya', 'cse-aravind'] }, at: at(17) },
    { voterId: '23CS045', electionId: 'cse-dept-2026', selections: { 'dept-leader': ['cse-aravind', 'cse-priyanka'] }, at: at(15) },
    { voterId: '22EC018', electionId: LEGACY_ELECTION_ID, candidateId: 'suriya', at: at(12) },
    {
      voterId: '22AD031',
      electionId: 'council-office-2026',
      selections: { 'vice-president': ['vp-aishwarya'], 'general-secretary': ['gs-lakshmi'], treasurer: ['tr-nithya'] },
      at: at(10),
    },
    { voterId: '23AD007', electionId: 'cultural-2026', selections: { members: ['cc-deepika', 'cc-irfan', 'cc-anjali'] }, at: at(8) },
    { voterId: '21ME027', electionId: LEGACY_ELECTION_ID, candidateId: 'vikram', at: at(6) },
    { voterId: '22CV025', electionId: 'cultural-2026', selections: { members: ['cc-shalini', 'cc-karan'] }, at: at(5) },
    {
      voterId: '21EE005',
      electionId: 'council-office-2026',
      selections: { 'vice-president': ['vp-rahul'], 'general-secretary': ['gs-vignesh'], treasurer: ['tr-nithya'] },
      at: at(3),
    },
    { voterId: '24CV003', electionId: LEGACY_ELECTION_ID, candidateId: 'dhanush', at: at(1.5) },
    { voterId: '23EE021', electionId: 'cultural-2026', selections: { members: ['cc-irfan', 'cc-deepika'] }, at: at(0.5) },
  ]
}

// Registries saved before the fuller demo roll existed: fill vacant seed seats
// and link seed holders to their roll entries. Runs once per registry.
const SEED_REVISION = 2

function fillSeedGaps(registry) {
  if ((registry.seedRevision || 1) >= SEED_REVISION) return registry
  const seed = seedRegistry().committee.departments
  const departments = { ...registry.committee?.departments }
  const link = (current, fallback) => {
    if (!current) return fallback || null
    if (!current.voterId && fallback && fallback.name === current.name) return { ...current, voterId: fallback.voterId }
    return current
  }
  Object.entries(seed).forEach(([id, dept]) => {
    const existing = departments[id] || { leader: null, years: {} }
    const years = { ...existing.years }
    Object.entries(dept.years).forEach(([year, holder]) => {
      years[year] = link(years[year], holder)
    })
    departments[id] = { ...existing, leader: link(existing.leader, dept.leader), years }
  })
  return { ...registry, seedRevision: SEED_REVISION, committee: { ...registry.committee, departments } }
}

export function loadRegistry() {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.version === REGISTRY_VERSION && Array.isArray(parsed.elections)) {
        return saveRegistry(fillSeedGaps(parsed))
      }
    }
  } catch (err) {
    console.error('Failed to read the election registry:', err)
  }
  return saveRegistry(seedRegistry())
}

export function resetRegistry() {
  return saveRegistry(seedRegistry())
}

// ---------------------------------------------------------- mutations ---
// Pure updates: each takes the registry and returns the next one.

export function logActivity(registry, text) {
  const entry = { id: newId('act'), at: new Date().toISOString(), text }
  return { ...registry, activity: [entry, ...registry.activity].slice(0, 200) }
}

// Saves an election together with its full candidate list. Candidates that
// already exist keep their review status; new ones start as pending.
export function saveElection(registry, election, candidates) {
  const exists = registry.elections.some((entry) => entry.id === election.id)
  const elections = exists
    ? registry.elections.map((entry) => (entry.id === election.id ? election : entry))
    : [...registry.elections, election]
  const previous = registry.candidates.filter((entry) => entry.electionId === election.id)
  const nextCandidates = candidates.map((entry) => {
    const before = previous.find((item) => item.id === entry.id)
    return {
      status: 'pending',
      baseVotes: 0,
      submittedAt: new Date().toISOString(),
      ...before,
      ...entry,
      electionId: election.id,
    }
  })
  return {
    ...registry,
    elections,
    candidates: [...registry.candidates.filter((entry) => entry.electionId !== election.id), ...nextCandidates],
  }
}

export function patchElection(registry, id, patch) {
  return {
    ...registry,
    elections: registry.elections.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
  }
}

export function removeElection(registry, id) {
  return {
    ...registry,
    elections: registry.elections.filter((entry) => entry.id !== id),
    candidates: registry.candidates.filter((entry) => entry.electionId !== id),
  }
}

export function upsertCandidate(registry, record) {
  const exists = registry.candidates.some((entry) => entry.id === record.id)
  return {
    ...registry,
    candidates: exists
      ? registry.candidates.map((entry) => (entry.id === record.id ? { ...entry, ...record } : entry))
      : [...registry.candidates, record],
  }
}

export function removeCandidate(registry, id) {
  return { ...registry, candidates: registry.candidates.filter((entry) => entry.id !== id) }
}

export function addNotice(registry, notice) {
  const entry = { id: newId('notice'), createdAt: new Date().toISOString(), ...notice }
  return { ...registry, notices: [entry, ...registry.notices] }
}

export function removeNotice(registry, id) {
  return { ...registry, notices: registry.notices.filter((entry) => entry.id !== id) }
}

// `slot` is { kind: 'council', role } or { kind: 'department', department, seat }
// where seat is 'leader' or a year number.
export function setCommitteeHolder(registry, slot, holder) {
  const committee = registry.committee
  if (slot.kind === 'council') {
    return {
      ...registry,
      committee: {
        ...committee,
        council: committee.council.map((entry) => (entry.role === slot.role ? { ...entry, holder } : entry)),
      },
    }
  }
  const dept = committee.departments[slot.department] || { leader: null, years: {} }
  const nextDept =
    slot.seat === 'leader' ? { ...dept, leader: holder } : { ...dept, years: { ...dept.years, [slot.seat]: holder } }
  return {
    ...registry,
    committee: { ...committee, departments: { ...committee.departments, [slot.department]: nextDept } },
  }
}
