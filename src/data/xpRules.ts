export type XpSource = {
  category: string;
  action: string;
  xp: number;
  description: string;
};

export const XP_SOURCES: XpSource[] = [
  // AQuiz
  { category: 'AQuiz', action: 'Complete a quiz', xp: 10, description: 'Awarded for finishing any quiz' },
  { category: 'AQuiz', action: 'Score 100%', xp: 40, description: 'Perfect score bonus' },
  { category: 'AQuiz', action: 'Score 90%+', xp: 35, description: 'Near-perfect performance' },
  { category: 'AQuiz', action: 'Score 80%+', xp: 30, description: 'Strong performance' },
  { category: 'AQuiz', action: 'Score 70%+', xp: 20, description: 'Good performance' },
  { category: 'AQuiz', action: 'Score 60%+', xp: 10, description: 'Passing performance' },
  { category: 'AQuiz', action: 'Score below 60%', xp: 5, description: 'Participation credit' },
  // Papers — the biggest XP source, because a marked paper is the real
  // record of progress. Timing papers pay 60% of these amounts.
  { category: 'Papers', action: 'Get a paper marked', xp: 25, description: 'Awarded as soon as your teacher enters the mark' },
  { category: 'Papers', action: 'Score 100%', xp: 70, description: 'Full marks' },
  { category: 'Papers', action: 'Score 90%+', xp: 55, description: 'Outstanding paper result' },
  { category: 'Papers', action: 'Score 80%+', xp: 40, description: 'Excellent paper result' },
  { category: 'Papers', action: 'Score 70%+', xp: 28, description: 'Good paper result' },
  { category: 'Papers', action: 'Score 60%+', xp: 18, description: 'Passing paper result' },
  { category: 'Papers', action: 'Score below 60%', xp: 8, description: 'Participation credit — sitting the paper still counts' },
  { category: 'Papers', action: 'Personal best', xp: 30, description: 'This paper beat every paper you have sat before' },
  { category: 'Papers', action: 'Improving', xp: 15, description: 'You scored above your own average of the last 3 papers' },
  // Classes — effort XP, kept small on purpose: the app can only take the
  // player's word that a video finished, so it must never out-earn papers.
  { category: 'Classes', action: 'Finish watching a lesson', xp: 8, description: 'Paid once per lesson, when the video plays to the end' },
  { category: 'Classes', action: 'Download a homework sheet', xp: 5, description: 'Paid once per sheet, the first time you open it' },
  // Achievements
  { category: 'Achievements', action: 'Unlock any achievement', xp: 50, description: 'Every achievement awards 50 XP' },
];

export const XP_CATEGORIES = [...new Set(XP_SOURCES.map(s => s.category))];
