// Dataset sizes; Couples Deep revision: curation-couples-deep-episodes.json (2026-10-25).
export const SERIES_CONTRACTS = Object.freeze({
  couples: { total: 128, levels: {1: 51, 2: 49, 3: 13, 4: 15}, modes: {lite: 116, deep: 12}, sourceCounts: {loves: 42, editorial: 85, "user-provided": 1} },
  family: { total: 166, levels: {1: 38, 2: 45, 3: 49, 4: 34}, sourceCounts: {editorial: 166} },
  friends: { total: 150, levels: {1: 43, 2: 39, 3: 37, 4: 31}, sourceCounts: {editorial: 150} },
  adults: { total: 103 },
  'self-care': { total: 64 },
});

// Original datasets remain contracts of the historical editions. Us is an
// adaptation, not another source of legacy follow-up questions.
export const US_CONTRACT = Object.freeze({ total: 316, family: 166, friends: 150 });
