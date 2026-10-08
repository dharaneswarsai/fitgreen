// ===========================================================
// FITGREEN — public website content
//
// Kept in one place so the marketing copy, the join form's
// program dropdown and the seeded demo data all stay in sync.
// ===========================================================

export const SITE = {
  name: 'FITGREEN',
  legalName: 'Fitgreen Strength Club',
  tagline: 'Build strength. Build confidence.',
  address: '4th Floor, Nexus Mall, 80 Feet Road, Koramangala 4th Block, Bengaluru 560034',
  phone: '+91 80 4718 2200',
  phoneHref: 'tel:+918047182200',
  whatsapp: '+91 98450 11234',
  email: 'hello@fitgreen.fit',
  mapsUrl: 'https://maps.google.com/?q=Koramangala+Bengaluru',
  instagram: '@fitgreen.club',
  rating: 4.8,
  reviewCount: 386,
  memberCount: 1240,
  yearsOpen: 9,
} as const;

export const OPENING_HOURS = [
  { day: 'Monday – Friday', open: '5:00 AM', close: '10:00 PM' },
  { day: 'Saturday', open: '6:00 AM', close: '9:00 PM' },
  { day: 'Sunday', open: '7:00 AM', close: '8:00 PM' },
] as const;

// ---------------------------------------------------------
// Programs
// ---------------------------------------------------------

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Program {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  difficulty: Difficulty;
  duration: string;
  sessions: string;
  /** Which lead goal this program maps to — used by the join form */
  goal: 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'STRENGTH' | 'FITNESS' | 'PERSONAL_TRAINING';
  outcomes: string[];
  /** Abstract art variant index */
  art: 1 | 2 | 3 | 4 | 5;
}

export const PROGRAMS: Program[] = [
  {
    slug: 'fat-loss-lab',
    name: 'Fat Loss Lab',
    tagline: 'Sustainable fat loss, no crash dieting',
    description:
      'A coached 12-week metabolic block combining circuit strength work, steady-state cardio and a nutrition baseline you can actually keep. Weekly weigh-ins and body-composition scans keep you honest.',
    difficulty: 'Beginner',
    duration: '12 weeks',
    sessions: '4 per week',
    goal: 'WEIGHT_LOSS',
    outcomes: [
      'Avg 4–7 kg loss across the block',
      'Nutrition plan built around food you already eat',
      'Fortnightly body composition scan',
      'Full strength baseline on day one',
    ],
    art: 1,
  },
  {
    slug: 'strength-foundations',
    name: 'Strength Foundations',
    tagline: 'Learn the barbell properly',
    description:
      'The programme we send every new member to. Six weeks of coached squat, hinge, push and pull patterns. You leave able to train alone with confidence and a plan.',
    difficulty: 'Beginner',
    duration: '6 weeks',
    sessions: '3 per week',
    goal: 'STRENGTH',
    outcomes: [
      'Safe, repeatable technique on the big four',
      'Personal starting numbers on every lift',
      'Progressive overload plan for your first 12 weeks',
      'Confidence training unsupervised',
    ],
    art: 2,
  },
  {
    slug: 'personal-training',
    name: 'Personal Training',
    tagline: 'One coach, your plan, your pace',
    description:
      'A dedicated coach writes your programme, corrects every rep and adjusts it as you get stronger. Includes monthly body composition tracking and direct WhatsApp access.',
    difficulty: 'Intermediate',
    duration: 'Ongoing',
    sessions: '4 per week',
    goal: 'PERSONAL_TRAINING',
    outcomes: [
      'Programme rewritten every 4 weeks',
      'Direct coach WhatsApp line',
      'Nutrition guidance without rigid meal plans',
      'Monthly progress report',
    ],
    art: 3,
  },
  {
    slug: 'athlete-engine',
    name: 'Athlete Engine',
    tagline: 'Power, speed and conditioning',
    description:
      'Built for people who play a sport or want to move better. Olympic lifts, sprint mechanics, plyometrics and conditioning built around real athletic output.',
    difficulty: 'Advanced',
    duration: '16 weeks',
    sessions: '5 per week',
    goal: 'MUSCLE_GAIN',
    outcomes: [
      'Clean olympic lifting technique',
      'Faster acceleration and sprint times',
      'Sport-specific conditioning blocks',
      'Strength that transfers, not just numbers',
    ],
    art: 4,
  },
  {
    slug: 'everyday-strong',
    name: 'Everyday Strong',
    tagline: 'Feel better in 45 minutes a week',
    description:
      'Our most popular membership programme. Three coached sessions a week built around functional movement, mobility and a sensible amount of effort. No gymnastics required.',
    difficulty: 'Beginner',
    duration: 'Ongoing',
    sessions: '3 per week',
    goal: 'FITNESS',
    outcomes: [
      'Noticeable energy and mobility in 6 weeks',
      'Sessions capped at 45 minutes',
      'Beginner-safe scaling on every lift',
      'Habit that survives a busy week',
    ],
    art: 5,
  },
];

export const PROGRAM_NAMES = PROGRAMS.map((p) => p.name);

// ---------------------------------------------------------
// Trainers
// ---------------------------------------------------------

export interface Trainer {
  name: string;
  specialty: string;
  experience: string;
  bio: string;
  credentials: string[];
  colorIndex: number;
}

export const TRAINERS: Trainer[] = [
  {
    name: 'Arjun Nair',
    specialty: 'Strength & powerlifting',
    experience: '11 years',
    bio: 'Former state-level powerlifter who now coaches the exact programming he used to compete. Expect honest loading, careful warm-ups and very little ego on the platform.',
    credentials: ['NSCA-CSCS', 'Ex-state champion, 83 kg'],
    colorIndex: 0,
  },
  {
    name: 'Priya Sharma',
    specialty: 'Fat loss & nutrition',
    experience: '8 years',
    bio: 'Runs the Fat Loss Lab and has coached more than 900 weight-loss clients through it. Specialises in people who have failed on crash diets before — and why.',
    credentials: ['Precision Nutrition L1', 'Registered Dietitian (RDN)'],
    colorIndex: 2,
  },
  {
    name: 'Rahul Menon',
    specialty: 'Mobility & rehabilitation',
    experience: '9 years',
    bio: 'Physiotherapist turned coach. Works with anyone returning from injury, managing chronic back pain, or who simply hates being stiff. The best first coach for beginners.',
    credentials: ['MPT Physiotherapy', 'FMS Level 2'],
    colorIndex: 1,
  },
  {
    name: 'Sana Qureshi',
    specialty: 'Strength & conditioning',
    experience: '6 years',
    bio: 'Coaches the Athlete Engine and our women-only strength sessions. Believes most people are trained far too softly and not nearly often enough.',
    credentials: ['NASM-CPT', 'Level 3 Strength Coach'],
    colorIndex: 4,
  },
];

// ---------------------------------------------------------
// Social proof
// ---------------------------------------------------------

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  result: string;
  colorIndex: number;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Ananya Rao',
    role: 'Member since 2023',
    quote:
      'I had walked into three gyms before this and quit all of them. The difference here was that someone actually noticed I had joined and asked me how week one went. That sounds small. It is not.',
    result: 'Lost 11 kg in 9 months',
    colorIndex: 0,
  },
  {
    name: 'Karthik Subramanian',
    role: 'Personal training client',
    quote:
      'My first deadlift was 40 kg. Six months later it is 140. Nobody sold me a package — Priya just showed me the plan and made sure I did it.',
    result: 'Deadlift 40 kg → 140 kg',
    colorIndex: 1,
  },
  {
    name: 'Meera Iyer',
    role: 'Athlete Engine programme',
    quote:
      'I picked up rugby at 34 and needed conditioning that made sense for the sport. Sana built the blocks around my season instead of a generic split. My 5k went from 34 minutes to 26.',
    result: '5k time down 8 minutes',
    colorIndex: 4,
  },
  {
    name: 'Vikram Shetty',
    role: 'Member since 2021',
    quote:
      'The trial was genuinely free and genuinely useful — an hour of assessment and a plan, no hard sell at the end. I joined because it made sense, not because someone pushed.',
    result: 'Consistent 4 years running',
    colorIndex: 3,
  },
];

// ---------------------------------------------------------
// Facilities
// ---------------------------------------------------------

export const FACILITIES = [
  {
    name: 'Free weights floor',
    detail: 'Four racks, six platforms, dumbbells to 70 kg, full barbell inventory.',
  },
  {
    name: 'Cardio deck',
    detail: 'Twelve treadmills, rowers, bikes and ski-ergs, all on their own 40 m mirrored deck.',
  },
  {
    name: 'Functional rig',
    detail: 'Rig, sleds, ropes, med balls and plyo boxes for Athlete Engine and metabolic blocks.',
  },
  {
    name: 'Studios',
    detail: 'Two studios — one for small group strength, one for mobility and women-only sessions.',
  },
  {
    name: 'Assessment suite',
    detail: 'Body composition scanner, movement screen and private consult rooms.',
  },
  {
    name: 'Recovery room',
    detail: 'Sauna, cold plunge, compression and stretch space. Included in every plan.',
  },
] as const;

// ---------------------------------------------------------
// FAQ
// ---------------------------------------------------------

export const FAQ = [
  {
    q: 'What actually happens in a free trial?',
    a: 'Sixty minutes, no card needed. A movement screen and body composition scan, a short session on equipment you have never used, and a written plan based on your goal. You leave with the plan whether or not you join.',
  },
  {
    q: 'I have never set foot in a gym. Will I be out of place?',
    a: 'No. Roughly half our members had never trained before joining. Everyone completes Strength Foundations first, and your first three sessions are coached one-to-one.',
  },
  {
    q: 'Is there a joining fee or anything hidden?',
    a: 'No joining fee on any plan, and no lock-in beyond the quarter you pay for. Prices on this page are the whole price.',
  },
  {
    q: 'Can I freeze my membership?',
    a: 'Yes — up to 4 weeks a year, free, for travel or injury. Ask at the desk and it takes a minute.',
  },
  {
    q: 'What are your peak hours?',
    a: '6:30–9:00 AM and 6:30–9:00 PM. If you want the floor to yourself, come between 10 AM and 4 PM on weekdays.',
  },
  {
    q: 'Do you train people over 50?',
    a: 'Regularly, and they are some of our most consistent members. Rahul builds a starting plan around joint health, balance and any existing conditions.',
  },
] as const;

// ---------------------------------------------------------
// Trust indicators (hero)
// ---------------------------------------------------------

export const TRUST_POINTS = [
  '4.8★ from 386 members',
  '1,240+ members trained',
  '9 years in Koramangala',
  'Coached trial, no card needed',
] as const;
