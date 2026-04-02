import { useMemo } from 'react';
import { useFirestore, WhereClause } from './useFirestore';
import { HierarchyItem, ScoreWeights } from '../types';

export interface UnitScore {
  id: string;
  name: string;
  points: number;
}

export interface RollCallStats {
  presenceRate: number;
  lessonRate: number;
  missionTotal: number;
  visitsTotal: number;
  pgTotal: number;
  presentsTotal: number;
  leaderboard: UnitScore[];
  chartData: { name: string; points: number }[];
}

/**
 * Agrega estatísticas de rollCalls com pontuação configurável.
 *
 * @param units    - Lista de unidades da hierarquia
 * @param weights  - Pesos de pontuação do scoreWeights
 * @param filters  - Filtros opcionais (ex: [{field:'quarterId', op:'==', value:'q2'}])
 */
export function useRollCallStats(
  units: HierarchyItem[],
  weights: ScoreWeights,
  filters: WhereClause[] = []
): RollCallStats {
  const { data: rollCallsData } = useFirestore('rollCalls', filters);

  return useMemo(() => {
    const scores: Record<string, number> = {};
    let totalPresents = 0;
    let totalLessons  = 0;
    let totalMission  = 0;
    let totalVisits   = 0;
    let totalPg       = 0;
    let totalRecords  = 0;

    const records = rollCallsData.flatMap((doc) => {
      if (Array.isArray(doc.records)) return doc.records;
      return [];
    });

    records.forEach((r) => {
      const uId = r.unitId || 'unknown';
      if (!scores[uId]) scores[uId] = 0;

      if (r.present) { scores[uId] += weights.presence; totalPresents++; }
      if (r.lesson)  { scores[uId] += weights.lesson;   totalLessons++;  }
      if (r.pg)      { scores[uId] += weights.pg;       totalPg++;       }
      if (r.mission) { scores[uId] += weights.mission;  totalMission++;  }

      scores[uId]  += (r.bibleStudy || 0) * weights.bibleStudy;
      scores[uId]  += (r.visits     || 0) * weights.visit;
      totalVisits  += (r.visits     || 0);
      totalRecords++;
    });

    const leaderboard: UnitScore[] = units
      .map((u) => ({ id: u.id, name: u.name, points: scores[u.id] || 0 }))
      .sort((a, b) => b.points - a.points);

    const chartData = leaderboard.map((u) => ({
      name: u.name.length > 12 ? `${u.name.slice(0, 12)}…` : u.name,
      points: u.points,
    }));

    return {
      presenceRate:  totalRecords > 0 ? Math.round((totalPresents / totalRecords) * 100) : 0,
      lessonRate:    totalRecords > 0 ? Math.round((totalLessons  / totalRecords) * 100) : 0,
      missionTotal:  totalMission,
      visitsTotal:   totalVisits,
      pgTotal:       totalPg,
      presentsTotal: totalPresents,
      leaderboard,
      chartData,
    };
  }, [rollCallsData, weights, units]);
}
