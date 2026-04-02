import { HierarchyItem, ScoreWeights } from '../types';

// ─── Extrai a lógica pura de cálculo para teste (sem hooks/Firebase) ──────────
// Espelha exatamente o useMemo de useRollCallStats.ts
function calcStats(
  rollCallDocs: { records?: unknown[] }[],
  units: HierarchyItem[],
  weights: ScoreWeights,
) {
  const scores: Record<string, number> = {};
  let totalPresents = 0;
  let totalLessons  = 0;
  let totalMission  = 0;
  let totalVisits   = 0;
  let totalPg       = 0;
  let totalRecords  = 0;

  const records = rollCallDocs.flatMap((doc) =>
    Array.isArray(doc.records) ? doc.records : [],
  ) as any[];

  records.forEach((r) => {
    const uId = r.unitId || 'unknown';
    if (!scores[uId]) scores[uId] = 0;

    if (r.present) { scores[uId] += weights.presence; totalPresents++; }
    if (r.lesson)  { scores[uId] += weights.lesson;   totalLessons++;  }
    if (r.pg)      { scores[uId] += weights.pg;        totalPg++;       }
    if (r.mission) { scores[uId] += weights.mission;   totalMission++;  }

    scores[uId] += (r.bibleStudy || 0) * weights.bibleStudy;
    scores[uId] += (r.visits     || 0) * weights.visit;
    totalVisits  += (r.visits     || 0);
    totalRecords++;
  });

  const leaderboard = units
    .map((u) => ({ id: u.id, name: u.name, points: scores[u.id] || 0 }))
    .sort((a, b) => b.points - a.points);

  return {
    presenceRate:  totalRecords > 0 ? Math.round((totalPresents / totalRecords) * 100) : 0,
    lessonRate:    totalRecords > 0 ? Math.round((totalLessons  / totalRecords) * 100) : 0,
    missionTotal:  totalMission,
    visitsTotal:   totalVisits,
    pgTotal:       totalPg,
    presentsTotal: totalPresents,
    leaderboard,
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const WEIGHTS: ScoreWeights = {
  presence: 10,
  lesson: 5,
  pg: 3,
  bibleStudy: 2,
  mission: 4,
  visit: 1,
};

const UNITS: HierarchyItem[] = [
  { id: 'u1', name: 'Unidade Alpha' },
  { id: 'u2', name: 'Unidade Beta' },
];

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('calcStats — lógica de pontuação do useRollCallStats', () => {
  it('retorna zeros quando não há registros', () => {
    const result = calcStats([], UNITS, WEIGHTS);
    expect(result.presenceRate).toBe(0);
    expect(result.lessonRate).toBe(0);
    expect(result.missionTotal).toBe(0);
    expect(result.visitsTotal).toBe(0);
    expect(result.pgTotal).toBe(0);
    expect(result.presentsTotal).toBe(0);
  });

  it('calcula presenceRate corretamente', () => {
    const docs = [{
      records: [
        { unitId: 'u1', present: true,  lesson: false, pg: false, mission: false, bibleStudy: 0, visits: 0 },
        { unitId: 'u1', present: false, lesson: false, pg: false, mission: false, bibleStudy: 0, visits: 0 },
        { unitId: 'u2', present: true,  lesson: false, pg: false, mission: false, bibleStudy: 0, visits: 0 },
      ],
    }];
    const result = calcStats(docs, UNITS, WEIGHTS);
    expect(result.presenceRate).toBe(67); // 2/3
    expect(result.presentsTotal).toBe(2);
  });

  it('soma pontos de presença + lição + missão corretamente por unidade', () => {
    const docs = [{
      records: [
        { unitId: 'u1', present: true, lesson: true, pg: false, mission: true, bibleStudy: 0, visits: 0 },
      ],
    }];
    const result = calcStats(docs, UNITS, WEIGHTS);
    // u1: presence(10) + lesson(5) + mission(4) = 19
    const u1 = result.leaderboard.find((u) => u.id === 'u1');
    expect(u1?.points).toBe(19);
  });

  it('contabiliza bibleStudy e visits com multiplicação', () => {
    const docs = [{
      records: [
        { unitId: 'u1', present: false, lesson: false, pg: false, mission: false, bibleStudy: 3, visits: 2 },
      ],
    }];
    const result = calcStats(docs, UNITS, WEIGHTS);
    // u1: bibleStudy(3*2=6) + visits(2*1=2) = 8
    const u1 = result.leaderboard.find((u) => u.id === 'u1');
    expect(u1?.points).toBe(8);
    expect(result.visitsTotal).toBe(2);
  });

  it('ordena leaderboard do maior para o menor', () => {
    const docs = [{
      records: [
        { unitId: 'u1', present: false, lesson: false, pg: false, mission: false, bibleStudy: 0, visits: 0 },
        { unitId: 'u2', present: true,  lesson: true,  pg: true,  mission: true,  bibleStudy: 1, visits: 1 },
      ],
    }];
    const result = calcStats(docs, UNITS, WEIGHTS);
    expect(result.leaderboard[0].id).toBe('u2');
    expect(result.leaderboard[1].id).toBe('u1');
  });

  it('unidade sem registros aparece no leaderboard com 0 pontos', () => {
    const docs = [{
      records: [
        { unitId: 'u1', present: true, lesson: false, pg: false, mission: false, bibleStudy: 0, visits: 0 },
      ],
    }];
    const result = calcStats(docs, UNITS, WEIGHTS);
    const u2 = result.leaderboard.find((u) => u.id === 'u2');
    expect(u2?.points).toBe(0);
  });

  it('ignora docs sem campo records', () => {
    const docs = [{ records: undefined }, { records: [] }] as any[];
    const result = calcStats(docs, UNITS, WEIGHTS);
    expect(result.presenceRate).toBe(0);
    expect(result.leaderboard.every((u) => u.points === 0)).toBe(true);
  });

  it('pg incrementa contador e pontuação', () => {
    const docs = [{
      records: [
        { unitId: 'u1', present: false, lesson: false, pg: true, mission: false, bibleStudy: 0, visits: 0 },
        { unitId: 'u1', present: false, lesson: false, pg: true, mission: false, bibleStudy: 0, visits: 0 },
      ],
    }];
    const result = calcStats(docs, UNITS, WEIGHTS);
    expect(result.pgTotal).toBe(2);
    const u1 = result.leaderboard.find((u) => u.id === 'u1');
    expect(u1?.points).toBe(6); // 2 * pg(3)
  });
});
