export const heroRanks = [
  { minXp: 0, tag: "Rookie Ranger" },
  { minXp: 250, tag: "Shadow Scholar" },
  { minXp: 750, tag: "Iron Mind" },
  { minXp: 1500, tag: "Captain Consistency" },
  { minXp: 3000, tag: "Thunder Learner" },
  { minXp: 5500, tag: "Titan of Tests" },
  { minXp: 9000, tag: "Infinity Achiever" },
  { minXp: 14000, tag: "Supreme Academic Hero" }
];

export function rankForXp(xp: number) {
  return heroRanks.reduce((current, rank) => (xp >= rank.minXp ? rank : current), heroRanks[0]);
}

export function levelForXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(xp / 80)) + 1);
}

export function nextRankProgress(xp: number) {
  const currentIndex = heroRanks.findIndex((rank) => rank.tag === rankForXp(xp).tag);
  const current = heroRanks[currentIndex];
  const next = heroRanks[currentIndex + 1];

  if (!next) return 100;
  return Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100);
}
