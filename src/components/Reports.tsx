import React from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { useRollCallStats } from '../hooks/useRollCallStats';
import { Printer, Share2, BarChart3, Award, TrendingUp, Users } from 'lucide-react';

const DEFAULT_WEIGHTS = { presence: 10, lesson: 10, pg: 10, bibleStudy: 15, mission: 20, visit: 5 };

function Reports() {
  const { data: firestoreMembers }  = useFirestore('members');
  const { data: firestoreHierarchy } = useFirestore('hierarchy');
  const { data: scoreWeightsDocs }  = useFirestore('scoreWeights');
  const { data: quartersData }      = useFirestore('quarters');

  const units = React.useMemo(() => {
    const doc = firestoreHierarchy[0];
    return doc && Array.isArray(doc.unidades) ? doc.unidades : [];
  }, [firestoreHierarchy]);

  const weights = React.useMemo(() => {
    const doc = scoreWeightsDocs[0];
    if (!doc) return DEFAULT_WEIGHTS;
    return {
      presence:   doc.presence   ?? DEFAULT_WEIGHTS.presence,
      lesson:     doc.lesson     ?? DEFAULT_WEIGHTS.lesson,
      pg:         doc.pg         ?? DEFAULT_WEIGHTS.pg,
      bibleStudy: doc.bibleStudy ?? DEFAULT_WEIGHTS.bibleStudy,
      mission:    doc.mission    ?? DEFAULT_WEIGHTS.mission,
      visit:      doc.visit      ?? DEFAULT_WEIGHTS.visit,
    };
  }, [scoreWeightsDocs]);

  const activeQuarter = React.useMemo(
    () => quartersData.find((q) => q.status === 'active') ?? null,
    [quartersData]
  );

  const rollCallFilters = React.useMemo(
    () => activeQuarter ? [{ field: 'quarterId', op: '==', value: activeQuarter.id }] : [],
    [activeQuarter]
  );

  const { presenceRate, lessonRate, missionTotal, leaderboard } =
    useRollCallStats(units, weights, rollCallFilters);

  const totalMembers = firestoreMembers.length;

  return (
    <div className="reports-view animate-up">
      <div className="glass-panel" style={{ border: 'none', background: 'none', padding: 0 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <BarChart3 color="var(--secondary)" /> Relatórios de Excelência
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>
              {activeQuarter ? activeQuarter.name : 'Nenhum trimestre ativo'} — consolidado de todas as unidades
            </p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button className="btn-login" style={{ width: 'auto', background: 'rgba(255,255,255,0.05)', color: 'white' }}>
              <Share2 size={20} />
            </button>
            <button className="btn-login" style={{ width: 'auto' }} onClick={() => window.print()}>
              <Printer size={20} /> <span style={{ marginLeft: '10px' }}>Imprimir</span>
            </button>
          </div>
        </div>

        <div className="report-sheet">
          <div className="report-header-ui">
            <div style={{ marginBottom: '1.5rem' }}>
              <img src="/logo_viva.png" alt="Logo Viva" style={{ height: '80px', filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.4))' }} />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-1px' }}>RELATÓRIO CONSOLIDADO TRIMESTRAL</h1>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '1rem', color: 'var(--secondary)', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '1px' }}>
              <span>{activeQuarter ? activeQuarter.name.toUpperCase() : 'SEM TRIMESTRE ATIVO'}</span>
              <span>•</span>
              <span>UNIDADE VIVA</span>
              <span>•</span>
              <span>SISTEMA DE GESTÃO LÍDER</span>
            </div>
          </div>

          {/* Métricas reais */}
          <div className="stats-summary-grid" style={{ marginBottom: '4rem' }}>
            <div className="status-mini-card purple">
              <div className="icon-glow"><Users size={20} /></div>
              <div>
                <span style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>Fidelidade Total</span>
                <strong style={{ fontSize: '1.5rem', display: 'block' }}>{totalMembers} Líderes</strong>
              </div>
            </div>
            <div className="status-mini-card green">
              <div className="icon-glow"><Award size={20} /></div>
              <div>
                <span style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>Média Presença</span>
                <strong style={{ fontSize: '1.5rem', display: 'block' }}>{presenceRate}%</strong>
              </div>
            </div>
            <div className="status-mini-card orange">
              <div className="icon-glow"><TrendingUp size={20} /></div>
              <div>
                <span style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>Missão</span>
                <strong style={{ fontSize: '1.5rem', display: 'block' }}>{missionTotal} ações</strong>
              </div>
            </div>
          </div>

          {/* Ranking com dados reais */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', color: 'var(--secondary)', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <Award size={20} /> Ranking Geral das Unidades
            </h3>
            <table className="report-table-modern">
              <thead>
                <tr>
                  <th>Posição / Nome da Unidade</th>
                  <th>Lição</th>
                  <th>Pontuação</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', opacity: 0.3 }}>
                      Nenhum dado de chamada para o trimestre ativo.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((u, idx) => (
                    <tr key={u.id}>
                      <td>{idx + 1}º {u.name}</td>
                      <td style={{ color: 'var(--accent-green)' }}>{lessonRate}%</td>
                      <td style={{ fontWeight: '900', color: 'var(--secondary)' }}>{u.points} pts</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          padding: '0.4rem 1rem',
                          background: idx === 0 ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                          color: idx === 0 ? '#22c55e' : 'rgba(255,255,255,0.5)',
                          borderRadius: '50px', fontSize: '0.7rem', fontWeight: 800
                        }}>
                          {idx === 0 ? 'LÍDER' : `${idx + 1}º`}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', opacity: 0.6 }}>
            <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 800 }}>SECRETÁRIO(A) DA ESCOLA SABATINA</p>
              <span style={{ fontSize: '0.7rem' }}>Assinatura Digital Viva-ID</span>
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 800 }}>DIRETOR(A) DA ESCOLA SABATINA</p>
              <span style={{ fontSize: '0.7rem' }}>Verificação por Hierarquia</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;
