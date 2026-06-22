export const student = {
  id: 'st_001',
  name: 'Kasun',
  fullName: 'Kasun Perera',
  email: 'kasun@example.com',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'
};

export const courses = [
  { id: 'c_001', title: 'A/L ICT Theory 2025', description: 'Complete theory syllabus coverage with practical examples and past paper discussions.', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop', progress: 45, lessonCount: 42, category: 'Theory' },
  { id: 'c_002', title: 'Python Programming Masterclass', description: 'From basics to advanced concepts. Essential for the practical paper.', image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?w=600&h=400&fit=crop', progress: 80, lessonCount: 24, category: 'Practical' },
  { id: 'c_003', title: 'Database Management Systems', description: 'SQL, ER diagrams, and normalization techniques explained simply.', image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&h=400&fit=crop', progress: 15, lessonCount: 18, category: 'Theory' },
  { id: 'c_004', title: '2024 Past Paper Discussion', description: 'In-depth analysis and answers for the 2024 A/L ICT examination.', image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop', progress: 0, lessonCount: 10, category: 'Paper Classes' }
];

export const liveClasses = [
  { id: 'lc_001', title: 'Networking Basics - Live Q&A', date: 'Today', time: '18:00', zoomLink: 'https://zoom.us/j/123456789', instructor: 'Pasindu Dissanayake', courseTitle: 'A/L ICT Theory 2025', isLiveNow: true },
  { id: 'lc_002', title: 'Python Practical Session 04', date: 'Tomorrow', time: '15:30', zoomLink: 'https://zoom.us/j/987654321', instructor: 'Pasindu Dissanayake', courseTitle: 'Python Programming Masterclass', isLiveNow: false },
  { id: 'lc_003', title: 'Paper Class - 2023 MCQ Discussion', date: 'Sunday', time: '08:00', zoomLink: 'https://zoom.us/j/456789123', instructor: 'Pasindu Dissanayake', courseTitle: 'Paper Classes', isLiveNow: false }
];

export const notifications = [
  { id: 'n_001', message: 'New lesson added: Logic Gates and Boolean Algebra', type: 'video', isRead: false, timestamp: '2 hours ago' },
  { id: 'n_002', message: 'Live class starting in 30 minutes: Networking Basics', type: 'live', isRead: false, timestamp: '30 mins ago' },
  { id: 'n_003', message: 'Assignment deadline extended for Python Practical 03', type: 'announcement', isRead: true, timestamp: '1 day ago' },
  { id: 'n_004', message: 'Your course progress for Database Management is below 20%. Keep going!', type: 'announcement', isRead: true, timestamp: '2 days ago' }
];

export interface Promotion {
  id: string;
  tag: string;
  title: string;
  description: string;
  image: string;
  ctaText: string;
  ctaLink: string;
}

export const promotions: Promotion[] = [
  { id: 'p_001', tag: 'සීමිත කාලයක්', title: 'විශේෂ පුනරීක්ෂණ කඳවුර', description: 'සම්පූර්ණ විෂය නිර්දේශය ආවරණය වන දින 3ක දැඩි පුනරීක්ෂණ කඳවුරට සම්බන්ධ වන්න.', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=600&fit=crop', ctaText: 'දැන්ම ලියාපදිංචි වන්න', ctaLink: '/signup' },
  { id: 'p_002', tag: 'නව පාඨමාලාව', title: 'Python ක්‍රමලේඛන මාස්ටර්ක්ලාස්', description: 'ප්‍රායෝගික ප්‍රශ්න පත්‍රය සඳහා අත්‍යවශ්‍ය Python ක්‍රමලේඛනය මූලික සිට උසස් දක්වා ඉගෙන ගන්න.', image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?w=1200&h=600&fit=crop', ctaText: 'පාඨමාලාව බලන්න', ctaLink: '/signup' },
  { id: 'p_003', tag: '2025 බඳවා ගැනීම්', title: 'A/L ICT 2025 සිද්ධාන්ත පන්ති', description: 'සජීවී අන්තර් ක්‍රියාකාරී පන්ති, වීඩියෝ පාඩම් සහ පසුගිය විභාග ප්‍රශ්න සාකච්ඡා සියල්ල එකම තැනකින්.', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=600&fit=crop', ctaText: 'ඉගෙනීම අරඹන්න', ctaLink: '/signup' }
];

export const extraClasses = [
  { id: 'ec_001', title: 'A/L ICT 2023 Full Paper Discussion', type: 'Paper Classes', price: 1500, thumbnailUrl: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c848?w=600&h=400&fit=crop', duration: '5 Hours', videoCount: 3 },
  { id: 'ec_002', title: 'Python Complete Masterclass', type: 'Theory', price: 2500, thumbnailUrl: 'https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?w=600&h=400&fit=crop', duration: '12 Hours', videoCount: 15 },
  { id: 'ec_003', title: 'Logic Gates & Boolean Algebra Intensive', type: 'Revision', price: 1200, thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop', duration: '4 Hours', videoCount: 2 },
  { id: 'ec_004', title: 'Networking Concepts Deep Dive', type: 'Theory', price: 1800, thumbnailUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop', duration: '6 Hours', videoCount: 4 },
  { id: 'ec_005', title: 'A/L ICT 2022 Paper Discussion', type: 'Paper Classes', price: 1500, thumbnailUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=600&h=400&fit=crop', duration: '5.5 Hours', videoCount: 3 },
  { id: 'ec_006', title: 'Database Management Systems Crash Course', type: 'Revision', price: 2000, thumbnailUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&h=400&fit=crop', duration: '8 Hours', videoCount: 6 }
];

export interface MonthlyPayment {
  id: string;
  month: string;
  year: number;
  amount: string;
  status: 'Paid' | 'Pending';
  date: string;
  course: string;
}

export const monthlyPayments: MonthlyPayment[] = [
  { id: 'mp_001', month: 'March', year: 2026, amount: 'LKR 4,500', status: 'Paid', date: 'Mar 04, 2026', course: 'A/L ICT Theory 2025' },
  { id: 'mp_002', month: 'February', year: 2026, amount: 'LKR 4,500', status: 'Paid', date: 'Feb 05, 2026', course: 'A/L ICT Theory 2025' },
  { id: 'mp_003', month: 'January', year: 2026, amount: 'LKR 4,500', status: 'Paid', date: 'Jan 04, 2026', course: 'A/L ICT Theory 2025' },
  { id: 'mp_004', month: 'December', year: 2025, amount: 'LKR 4,500', status: 'Paid', date: 'Dec 05, 2025', course: 'A/L ICT Theory 2025' }
];

/* ──────────────── My Courses ──────────────── */

export interface PurchasedPack {
  id: string;
  title: string;
  type: string;
  thumbnailUrl: string;
  duration: string;
  videoCount: number;
  watchedMinutes: number;
  totalMinutes: number;
  purchaseDate: string;
}

export const purchasedPacks: PurchasedPack[] = [
  { id: 'pp_001', title: 'A/L ICT 2023 Full Paper Discussion', type: 'Paper Classes', thumbnailUrl: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c848?w=600&h=400&fit=crop', duration: '5 Hours', videoCount: 3, watchedMinutes: 165, totalMinutes: 300, purchaseDate: 'Mar 01, 2026' },
  { id: 'pp_002', title: 'Logic Gates & Boolean Algebra Intensive', type: 'Revision', thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop', duration: '4 Hours', videoCount: 2, watchedMinutes: 240, totalMinutes: 240, purchaseDate: 'Feb 14, 2026' },
  { id: 'pp_003', title: 'Networking Concepts Deep Dive', type: 'Theory', thumbnailUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop', duration: '6 Hours', videoCount: 4, watchedMinutes: 72, totalMinutes: 360, purchaseDate: 'Jan 20, 2026' }
];

export interface TheoryRecording {
  id: string;
  month: string;
  year: number;
  sessionCount: number;
  thumbnailUrl: string;
  topics: string[];
  watchedMinutes: number;
  totalMinutes: number;
  paymentStatus: 'Paid' | 'Pending';
}

export const theoryRecordings: TheoryRecording[] = [
  { id: 'tr_001', month: 'March', year: 2026, sessionCount: 4, thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop', topics: ['Networking Basics', 'OSI Model', 'TCP/IP', 'Security Fundamentals'], watchedMinutes: 90, totalMinutes: 480, paymentStatus: 'Paid' },
  { id: 'tr_002', month: 'February', year: 2026, sessionCount: 4, thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop', topics: ['Boolean Algebra', 'Logic Gates', 'Computer Architecture', 'Memory Systems'], watchedMinutes: 420, totalMinutes: 460, paymentStatus: 'Paid' },
  { id: 'tr_003', month: 'January', year: 2026, sessionCount: 5, thumbnailUrl: 'https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?w=600&h=400&fit=crop', topics: ['Data Representation', 'Binary Systems', 'Number Bases', 'Data Types', 'Encoding'], watchedMinutes: 600, totalMinutes: 600, paymentStatus: 'Paid' },
  { id: 'tr_004', month: 'December', year: 2025, sessionCount: 3, thumbnailUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&h=400&fit=crop', topics: ['Introduction to ICT', 'Information Systems', 'Data vs Information'], watchedMinutes: 360, totalMinutes: 360, paymentStatus: 'Paid' }
];

/* ──────────────── Video Lessons ──────────────── */

export interface VideoLesson {
  id: string;
  number: number;
  title: string;
  description: string;
  youtubeId: string;
  duration: string;
  isWatched: boolean;
}

/** Lessons keyed by pack or recording id */
export const packLessons: Record<string, VideoLesson[]> = {
  pp_001: [
    { id: 'pp001_l1', number: 1, title: 'Section A — MCQ Full Review', description: 'Complete walkthrough of all 40 MCQ questions from the 2023 A/L ICT paper with explanations.', youtubeId: 'dQw4w9WgXcQ', duration: '1h 45m', isWatched: true },
    { id: 'pp001_l2', number: 2, title: 'Section B — Structured Essay Q&A', description: 'Detailed answers and marking scheme analysis for structured essay questions.', youtubeId: 'dQw4w9WgXcQ', duration: '1h 30m', isWatched: true },
    { id: 'pp001_l3', number: 3, title: 'Section C — Essay & Case Study', description: 'In-depth discussion of the essay questions and case study with model answers.', youtubeId: 'dQw4w9WgXcQ', duration: '1h 45m', isWatched: false }
  ],
  pp_002: [
    { id: 'pp002_l1', number: 1, title: 'Week 1 — Logic Gates Fundamentals', description: 'AND, OR, NOT, NAND, NOR, XOR gates — symbols, truth tables and practical circuits.', youtubeId: 'dQw4w9WgXcQ', duration: '2h 00m', isWatched: true },
    { id: 'pp002_l2', number: 2, title: 'Week 2 — Boolean Algebra & Simplification', description: "De Morgan's Laws, Karnaugh Maps and expression minimisation techniques.", youtubeId: 'dQw4w9WgXcQ', duration: '2h 00m', isWatched: true }
  ],
  pp_003: [
    { id: 'pp003_l1', number: 1, title: 'Week 1 — Network Fundamentals', description: 'LAN, WAN, topologies, transmission media and bandwidth concepts.', youtubeId: 'dQw4w9WgXcQ', duration: '1h 30m', isWatched: true },
    { id: 'pp003_l2', number: 2, title: 'Week 2 — OSI & TCP/IP Models', description: 'Layer-by-layer breakdown of both models with real-world mapping.', youtubeId: 'dQw4w9WgXcQ', duration: '1h 30m', isWatched: false },
    { id: 'pp003_l3', number: 3, title: 'Week 3 — IP Addressing & Subnetting', description: 'IPv4, IPv6, classful addressing, CIDR and subnetting practice.', youtubeId: 'dQw4w9WgXcQ', duration: '1h 30m', isWatched: false },
    { id: 'pp003_l4', number: 4, title: 'Week 4 — Network Security Basics', description: 'Firewalls, encryption, VPNs, threats and cybersecurity fundamentals.', youtubeId: 'dQw4w9WgXcQ', duration: '1h 30m', isWatched: false }
  ],
  tr_001: [
    { id: 'tr001_l1', number: 1, title: 'Week 1 — Networking Basics Live Class', description: 'March week 1 recorded live session covering network fundamentals.', youtubeId: 'dQw4w9WgXcQ', duration: '2h 00m', isWatched: true },
    { id: 'tr001_l2', number: 2, title: 'Week 2 — OSI Model Deep Dive', description: 'March week 2 recorded session on the OSI model with Q&A.', youtubeId: 'dQw4w9WgXcQ', duration: '2h 00m', isWatched: false },
    { id: 'tr001_l3', number: 3, title: 'Week 3 — TCP/IP in Practice', description: 'March week 3 practical session on TCP/IP protocols and packet flow.', youtubeId: 'dQw4w9WgXcQ', duration: '2h 00m', isWatched: false },
    { id: 'tr001_l4', number: 4, title: 'Week 4 — Security Fundamentals', description: 'March week 4 session on cybersecurity, encryption and firewalls.', youtubeId: 'dQw4w9WgXcQ', duration: '2h 00m', isWatched: false }
  ],
  tr_002: [
    { id: 'tr002_l1', number: 1, title: 'Week 1 — Boolean Algebra Live Class', description: 'February week 1 session on Boolean expressions and simplification.', youtubeId: 'dQw4w9WgXcQ', duration: '1h 55m', isWatched: true },
    { id: 'tr002_l2', number: 2, title: 'Week 2 — Logic Gates Live Class', description: 'February week 2 session on combinational and sequential logic circuits.', youtubeId: 'dQw4w9WgXcQ', duration: '1h 55m', isWatched: true },
    { id: 'tr002_l3', number: 3, title: 'Week 3 — Computer Architecture', description: 'February week 3 on CPU, ALU, registers and the fetch-decode-execute cycle.', youtubeId: 'dQw4w9WgXcQ', duration: '1h 55m', isWatched: true },
    { id: 'tr002_l4', number: 4, title: 'Week 4 — Memory Systems', description: 'February week 4 on RAM, ROM, cache hierarchy and virtual memory.', youtubeId: 'dQw4w9WgXcQ', duration: '1h 55m', isWatched: false }
  ],
  tr_003: [
    { id: 'tr003_l1', number: 1, title: 'Week 1 — Data Representation', description: 'January week 1 on how computers store text, numbers and multimedia.', youtubeId: 'dQw4w9WgXcQ', duration: '2h 00m', isWatched: true },
    { id: 'tr003_l2', number: 2, title: 'Week 2 — Binary Systems', description: 'January week 2 on binary, octal, hexadecimal and arithmetic operations.', youtubeId: 'dQw4w9WgXcQ', duration: '2h 00m', isWatched: true },
    { id: 'tr003_l3', number: 3, title: 'Week 3 — Number Bases', description: "January week 3 — conversions, BCD and two's complement.", youtubeId: 'dQw4w9WgXcQ', duration: '2h 00m', isWatched: true },
    { id: 'tr003_l4', number: 4, title: 'Week 4 — Data Types', description: 'January week 4 covering primitive types, overflow and precision.', youtubeId: 'dQw4w9WgXcQ', duration: '2h 00m', isWatched: true },
    { id: 'tr003_l5', number: 5, title: 'Week 5 — Encoding Standards', description: 'January week 5 on ASCII, Unicode, UTF-8 and character encoding.', youtubeId: 'dQw4w9WgXcQ', duration: '2h 00m', isWatched: true }
  ],
  tr_004: [
    { id: 'tr004_l1', number: 1, title: 'Week 1 — Introduction to ICT', description: 'December week 1 overview of the ICT landscape, hardware and software.', youtubeId: 'dQw4w9WgXcQ', duration: '2h 00m', isWatched: true },
    { id: 'tr004_l2', number: 2, title: 'Week 2 — Information Systems', description: 'December week 2 on TPS, MIS, DSS and EIS with real-world examples.', youtubeId: 'dQw4w9WgXcQ', duration: '2h 00m', isWatched: true },
    { id: 'tr004_l3', number: 3, title: 'Week 3 — Data vs Information', description: 'December week 3 on the data/information difference, DIKW pyramid.', youtubeId: 'dQw4w9WgXcQ', duration: '2h 00m', isWatched: true }
  ]
};