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
  // Papers
  { category: 'Papers', action: 'Complete a paper', xp: 15, description: 'Awarded for getting a paper marked' },
  { category: 'Papers', action: 'Score 90%+', xp: 40, description: 'Outstanding paper result' },
  { category: 'Papers', action: 'Score 80%+', xp: 30, description: 'Excellent paper result' },
  { category: 'Papers', action: 'Score 70%+', xp: 20, description: 'Good paper result' },
  { category: 'Papers', action: 'Score 60%+', xp: 10, description: 'Passing paper result' },
  { category: 'Papers', action: 'Score below 60%', xp: 5, description: 'Participation credit' },
  // Achievements
  { category: 'Achievements', action: 'Unlock any achievement', xp: 50, description: 'Every achievement awards 50 XP' },
];

export const XP_CATEGORIES = [...new Set(XP_SOURCES.map(s => s.category))];
