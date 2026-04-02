import React from 'react';
import { MoreHorizontal, ChevronRight, Crown, Calendar } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { useRollCallStats } from '../hooks/useRollCallStats';
import { logger } from '../lib/logger';
import { DEFAULT_WEIGHTS } from '../lib/constants';

/* ── Mini sparkline SVG ───────────────────────────────────────────────────── */
function Sparkline({ values = [], color = 'white' }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const W = 80, H = 36;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * W},${H - (v / max) * H}`)
    .join(' ');
  return (
    <svg width={W} height={H} style={{ opacity: 0.55, display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

/* ── Stat card colorido (Estatísticas de Missão) ─────────────────────────── */
function StatCard({ label, value, color, sparkValues }) {
  return (
    <div className="glass-morphic" style={{
      borderRadius: '24px',
      padding: '1.2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.2rem',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '130px',
      transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      cursor: 'pointer',
    }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</span>
      <strong style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>{value}</strong>
      
      {/* Decorative Wave/Glow */}
      <div style={{
        position: 'absolute',
        bottom: '-10px',
        left: 0,
        right: 0,
        height: '40%',
        background: `linear-gradient(to top, ${color}33, transparent)`,
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 1 }}>
        <Sparkline values={sparkValues} color={color} />
      </div>
    </div>
  );
}

/* ── Badge de posição no ranking ─────────────────────────────────────────── */
function RankBadge({ pos }) {
  const colors = ['#F59E0B', '#94A3B8', '#CD7F32'];
  const isTop3 = pos < 3;
  
  return (
    <div style={{
      width: 28, height: 28,
      background: isTop3 ? `linear-gradient(135deg, ${colors[pos]}, ${colors[pos]}88)` : 'rgba(255,255,255,0.05)',
      borderRadius: '8px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: isTop3 ? 'white' : 'rgba(255,255,255,0.4)',
      fontWeight: 800, fontSize: '0.75rem',
      boxShadow: isTop3 ? `0 4px 12px ${colors[pos]}44` : 'none'
    }}>
      {isTop3 ? (pos === 0 ? <Crown size={16} fill="white" /> : pos + 1) : pos + 1}
    </div>
  );
}

/* ── Avatar com inicial ──────────────────────────────────────────────────── */
function Avatar({ name, size = 38 }) {
  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'];
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '12px',
      background: `linear-gradient(135deg, ${color}22, ${color}44)`,
      border: `1px solid ${color}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.4, color: color, flexShrink: 0,
    }}>
      {name?.charAt(0).toUpperCase() ?? '?'}
    </div>
  );
}

/* ── Card base ───────────────────────────────────────────────────────────── */
const card = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '32px',
  padding: '1.8rem 2rem',
};

const cardHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem',
};

/* ══════════════════════════════════════════════════════════════════════════ */
function Dashboard() {
  const { data: hierarchyDocs }    = useFirestore('hierarchy');
  const { data: scoreWeightsDocs } = useFirestore('scoreWeights');
  const { data: quartersData }     = useFirestore('quarters');
  const { data: membersData }      = useFirestore('members');

  const units = React.useMemo(() => {
    const doc = hierarchyDocs[0];
    return doc?.unidades ?? [];
  }, [hierarchyDocs]);

  const weights = React.useMemo(() => {
    const doc = scoreWeightsDocs[0];
    if (!doc) return DEFAULT_WEIGHTS;
    return { ...DEFAULT_WEIGHTS, ...doc };
  }, [scoreWeightsDocs]);

  const activeQuarter = React.useMemo(
    () => quartersData.find((q) => q.status === 'active') ?? null,
    [quartersData]
  );

  const rollCallFilters = React.useMemo(
    () => activeQuarter ? [{ field: 'quarterId', op: '==', value: activeQuarter.id }] : [],
    [activeQuarter]
  );

  const { presenceRate, lessonRate, missionTotal, visitsTotal, pgTotal, presentsTotal, leaderboard, chartData } =
    useRollCallStats(units, weights, rollCallFilters);

  // Sparkline simulada por dia (1–13 sábados) — mostra tendência real se tiver dados
  const spark = React.useMemo(() => {
    if (leaderboard.length === 0) return [0, 0, 0, 0, 0];
    const top = leaderboard[0]?.points ?? 0;
    return [top * 0.3, top * 0.5, top * 0.7, top * 0.6, top];
  }, [leaderboard]);

  const recentMembers = React.useMemo(
    () => [...membersData].reverse().slice(0, 4),
    [membersData]
  );

  const downloadCSV = () => {
    const rows = ['Posição,Unidade,Pontos', ...leaderboard.map((u, i) => `${i + 1},"${u.name}",${u.points}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'ranking.csv';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    logger.info('Exportou ranking CSV');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>

      {/* ── Linha 1: 3 colunas ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1.5fr 1fr', gap: '2rem' }}>

        {/* Card 1 — Progresso do Estudo */}
        <div style={card}>
          <div style={cardHeader}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Progresso do Estudo</h3>
            <div className="icon-circle" style={{ width: 32, height: 32 }}><MoreHorizontal size={16} color="rgba(255,255,255,0.4)" /></div>
          </div>

          {/* Circular gauge */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
            <div className="outer-circle" style={{ '--percent': lessonRate, width: 180, height: 180, background: `conic-gradient(var(--secondary) calc(${lessonRate} * 1%), rgba(255,255,255,0.03) 0)` }}>
              <div className="inner-circle" style={{ width: 154, height: 154, background: '#05081a' }}>
                <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800 }}>{lessonRate}%</h2>
                <span style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 600 }}>Completado</span>
              </div>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontWeight: 800, margin: '1rem 0 1.5rem', fontSize: '1rem' }}>
            Teologia Bíblica
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 0.5rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { label: 'Batismos', value: missionTotal  },
              { label: 'Visitas',  value: visitsTotal   },
              { label: 'Alcançados', value: presentsTotal },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <strong style={{ display: 'block', fontSize: '1.1rem', fontWeight: 800 }}>{value}</strong>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2 — Estatísticas de Missão */}
        <div style={card}>
          <div style={cardHeader}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Estatísticas de Missão</h3>
            <div className="icon-circle" style={{ width: 32, height: 32 }}><MoreHorizontal size={16} color="rgba(255,255,255,0.4)" /></div>
          </div>
          
          <div className="glass-morphic" style={{ padding: '0.5rem 1rem', borderRadius: '12px', width: 'fit-content', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Metas da Unidade
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: '1.2rem' }}>
            <StatCard label="Batismos"  value={missionTotal}    color="#3B82F6" sparkValues={[...spark]} />
            <StatCard label="Visitas"   value={visitsTotal}     color="#10B981" sparkValues={spark.map(v => v * 0.8)} />
            <StatCard label="Amigos Convidados" value={pgTotal} color="#F59E0B" sparkValues={spark.map(v => v * 0.6)} />
            <StatCard label="Alcançados" value={presentsTotal}  color="#A855F7" sparkValues={spark.map(v => v * 1.2)} />
          </div>
        </div>

        {/* Card 3 — Ranking */}
        <div style={card}>
          <div style={cardHeader}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Ranking Semanal</h3>
            <button onClick={downloadCSV} className="glass-morphic" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', padding: '0.3rem 0.8rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
              CSV
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {leaderboard.length === 0 ? (
              <p style={{ opacity: 0.3, fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
                Nenhum dado disponível.
              </p>
            ) : (
              leaderboard.slice(0, 5).map((u, idx) => (
                <div key={u.id} className="glass-morphic" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.8rem 1rem', borderRadius: '16px', border: idx === 0 ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.05)' }}>
                  <RankBadge pos={idx} />
                  <Avatar name={u.name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{u.points} pontos</div>
                  </div>
                  <div style={{
                    width: 20, height: 20, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: '0.7rem', fontWeight: 800,
                  }}>
                    {idx + 1}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '1.5rem' }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--secondary)' }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>
      </div>

      {/* ── Linha 2: 3 colunas ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

        {/* Card 4 — Próximos Eventos */}
        <div style={card}>
          <div style={cardHeader}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Próximos Eventos</h3>
            <MoreHorizontal size={18} color="rgba(255,255,255,0.3)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {quartersData.length === 0 ? (
              <p style={{ opacity: 0.35, fontSize: '0.85rem' }}>Nenhum trimestre cadastrado.</p>
            ) : (
              quartersData.slice(0, 2).map((q) => (
                <div key={q.id} className="glass-morphic" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '1rem', borderRadius: '18px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={18} color="#3B82F6" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{q.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Unidade Alpha - 19:50h</div>
                  </div>
                  <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 5 — Novos Membros */}
        <div style={card}>
          <div style={cardHeader}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Novos Membros</h3>
            <MoreHorizontal size={18} color="rgba(255,255,255,0.3)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {recentMembers.length === 0 ? (
              <p style={{ opacity: 0.35, fontSize: '0.85rem' }}>Nenhum membro cadastrado.</p>
            ) : (
              recentMembers.slice(0, 3).map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '0.4rem 0' }}>
                  <Avatar name={m.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{m.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Líder de Unidade</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--secondary)' }}>3 pontos</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 6 — Notícias (Simulado como Notícias da Comunidade) */}
        <div style={card}>
          <div style={cardHeader}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Notícias da Comunidade</h3>
            <MoreHorizontal size={18} color="rgba(255,255,255,0.3)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ width: 80, height: 60, borderRadius: '12px', background: 'rgba(255,255,255,0.05)', flexShrink: 0, overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #1e293b, #0f172a)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3, marginBottom: '4px' }}>Unidade Viva - maior em todas...</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Meados 2024</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ width: 80, height: 60, borderRadius: '12px', background: 'rgba(255,255,255,0.05)', flexShrink: 0, overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #1e293b, #0f172a)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3, marginBottom: '4px' }}>Novidades no sistema...</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Hoje</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default React.memo(Dashboard);
