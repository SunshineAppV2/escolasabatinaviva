/**
 * Tipos principais da aplicação Unidade Viva
 */

export interface User {
  id?: string;
  uid?: string;
  name: string;
  displayName?: string;
  email: string;
  role: 'Membro' | 'Secretário' | 'Diretor' | 'Pastor' | 'Administrador';
  unitId?: string;
  churchId?: string;
  distId?: string;
  phone?: string;
  password?: string;
}

export interface HierarchyItem {
  id: string;
  name: string;
  parentId?: string;
}

export interface Hierarchy {
  uniao: HierarchyItem[];
  associacao: HierarchyItem[];
  distritos: HierarchyItem[];
  igrejas: HierarchyItem[];
  unidades: HierarchyItem[];
}

export interface RollCallRecord {
  id?: string;
  memberId: string;
  unitId: string;
  day: number;
  present: boolean;
  lesson: boolean;
  mission: boolean;
  visits: number;
  bibleStudy: number;
  date: string;
}

export interface ScoreWeights {
  presence: number;
  lesson: number;
  pg: number;
  bibleStudy: number;
  mission: number;
  visit: number;
}

export interface OverallStats {
  presence: number;
  lesson: number;
  mission: number;
  visits: number;
}

export interface LeaderboardItem {
  id: string;
  name: string;
  points: number;
}