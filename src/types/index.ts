/**
 * Tipos principais da aplicação Unidade Viva
 */

// Hierarquia de níveis: Divisão → União → Associação → Distrito → Igreja → Unidade
// Papéis por nível:
//   Unidade  : Aluno, Professor ES, Secretário de Unidade
//   Igreja   : Ancião, Diretor ES, Secretário ES
//   Distrito : Pastor
//   Associação: Coord. Associação
//   União    : Coord. União
//   Divisão  : Coord. Divisão
//   Global   : Administrador

export type Role =
  | 'Aluno'
  | 'Professor ES'
  | 'Secretário de Unidade'
  | 'Ancião'
  | 'Diretor ES'
  | 'Secretário ES'
  | 'Pastor'
  | 'Coord. Associação'
  | 'Coord. União'
  | 'Coord. Divisão'
  | 'Administrador';

// Papéis que podem editar dados da sua unidade
export const UNIT_EDITOR_ROLES: Role[] = ['Professor ES', 'Secretário de Unidade'];

// Papéis que podem visualizar e emitir relatórios da sua igreja
export const CHURCH_REPORT_ROLES: Role[] = ['Diretor ES', 'Secretário ES'];

// Todos os papéis em ordem crescente de escopo
export const ALL_ROLES: Role[] = [
  'Aluno',
  'Professor ES',
  'Secretário de Unidade',
  'Ancião',
  'Diretor ES',
  'Secretário ES',
  'Pastor',
  'Coord. Associação',
  'Coord. União',
  'Coord. Divisão',
  'Administrador',
];

export interface User {
  id?: string;
  uid?: string;
  name: string;
  displayName?: string;
  email: string;
  // activeRole: papel ativo na sessão atual
  role: Role;
  // roles: todos os papéis que este membro possui
  roles?: Role[];
  // IDs de escopo por nível hierárquico
  unitId?:    string;
  churchId?:  string;
  distId?:    string;
  assocId?:   string;
  unionId?:   string;
  divisaoId?: string;
  phone?: string;
  password?: string;
}

export interface HierarchyItem {
  id: string;
  name: string;
  parentId?: string;
}

export interface Hierarchy {
  divisao:    HierarchyItem[];
  uniao:      HierarchyItem[];
  associacao: HierarchyItem[];
  distritos:  HierarchyItem[];
  igrejas:    HierarchyItem[];
  unidades:   HierarchyItem[];
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
