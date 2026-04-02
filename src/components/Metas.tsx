import React, { useState } from 'react';
import { ChevronLeft, Save, Target, Users, BookOpen, Heart, Activity, DollarSign } from 'lucide-react';

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '28px',
  padding: '1.8rem 2rem',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 800,
  color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '0.4rem',
  display: 'block',
};

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const isGood = pct >= 80;
  const barColor = isGood ? color : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ marginTop: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>
          {value} / {max}
        </span>
        <span style={{ fontSize: '0.72rem', color: barColor, fontWeight: 800 }}>{pct}%</span>
      </div>
      <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${barColor}aa, ${barColor})`,
          borderRadius: '99px',
          transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
}

function CategoryCard({
  letter, title, color, bg, items,
}: {
  letter: string;
  title: string;
  color: string;
  bg: string;
  items: { label: string; value: number; goal: number }[];
}) {
  return (
    <div style={card}>
      {/* Category badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1.5rem' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '14px',
          background: bg,
          border: `1px solid ${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: '1.1rem', color,
          flexShrink: 0,
        }}>
          {letter}
        </div>
        <div>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block' }}>
            Categoria
          </span>
          <span style={{ fontWeight: 800, fontSize: '1rem' }}>{title}</span>
        </div>
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {items.map(({ label, value, goal }) => (
          <div key={label}>
            <span style={labelStyle}>{label}</span>
            <ProgressBar value={value} max={goal} color={color} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Metas({ onBack }: { onBack: () => void }) {
  const [goals, setGoals] = useState({
    assinaturas: 10, membrosEstudo: 12,
    pgs: 8, duplas: 4,
    estudos: 15, batismos: 3,
    alvoSemanal: 50, alvo13: 200,
  });

  const reached = {
    assinaturas: 8, membrosEstudo: 9,
    pgs: 6, duplas: 2,
    estudos: 10, batismos: 1,
    acumulado: 450,
  };

  const categories = [
    {
      letter: 'C', title: 'Comunhão',
      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',
      items: [
        { label: 'Assinaturas da Lição', value: reached.assinaturas, goal: goals.assinaturas },
        { label: 'Estudo Diário',        value: reached.membrosEstudo, goal: goals.membrosEstudo },
      ],
    },
    {
      letter: 'R', title: 'Relacionamento',
      color: '#22c55e', bg: 'rgba(34,197,94,0.12)',
      items: [
        { label: 'Membros em PGs',      value: reached.pgs,   goal: goals.pgs },
        { label: 'Duplas Missionárias', value: reached.duplas, goal: goals.duplas },
      ],
    },
    {
      letter: 'M', title: 'Missão',
      color: '#a855f7', bg: 'rgba(168,85,247,0.12)',
      items: [
        { label: 'Estudos Bíblicos',  value: reached.estudos,  goal: goals.estudos },
        { label: 'Pessoas Batizadas', value: reached.batismos, goal: goals.batismos },
      ],
    },
  ];

  return (
    <div className="animate-up" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
        <div>
          <span style={{
            display: 'inline-flex', padding: '0.3rem 0.9rem',
            background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: '50px', fontSize: '0.7rem', fontWeight: 800,
            color: 'var(--secondary)', letterSpacing: '1.5px', textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}>
            METAS
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 0.3rem' }}>
            Metas Trimestrais
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: '0.95rem' }}>
            Planejamento vs Realizado — Trimestre Ativo
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0, marginLeft: '1.5rem' }}>
          <button onClick={onBack} style={{
            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
            padding: '0.7rem 1.2rem', fontWeight: 700, fontSize: '0.8rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'inherit',
          }}>
            <ChevronLeft size={16} /> Voltar
          </button>
          <button style={{
            background: 'linear-gradient(135deg, #D4AF37, #B08D26)', color: '#0a0f2c',
            border: 'none', borderRadius: '12px', padding: '0.7rem 1.4rem',
            fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'inherit',
          }}>
            <Save size={15} /> Salvar Alvos
          </button>
        </div>
      </div>

      {/* Category cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {categories.map((cat) => (
          <CategoryCard key={cat.letter} {...cat} />
        ))}
      </div>

      {/* Finance card */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1.8rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '14px',
            background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <DollarSign size={20} color="var(--secondary)" />
          </div>
          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block' }}>
              Financeiro
            </span>
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>Oferta Missionária</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
          {[
            { label: 'Alvo Semanal', key: 'alvoSemanal', editable: true,  value: goals.alvoSemanal },
            { label: 'Acumulado Sáb. 1–11', key: 'acumulado',   editable: false, value: reached.acumulado },
            { label: 'Alvo 13º Sábado',    key: 'alvo13',      editable: true,  value: goals.alvo13 },
          ].map(({ label, key, editable, value }) => (
            <div key={key}>
              <span style={labelStyle}>{label}</span>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                  color: editable ? 'var(--secondary)' : 'rgba(255,255,255,0.25)',
                  fontWeight: 800, fontSize: '0.9rem', pointerEvents: 'none',
                }}>R$</span>
                <input
                  type="number"
                  disabled={!editable}
                  value={value}
                  onChange={(e) => editable && setGoals((g) => ({ ...g, [key]: +e.target.value }))}
                  style={{
                    width: '100%', paddingLeft: '2.8rem', paddingRight: '1rem',
                    padding: '0.85rem 1rem 0.85rem 2.8rem',
                    background: editable ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${editable ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                    borderRadius: '12px', color: editable ? 'white' : 'rgba(255,255,255,0.3)',
                    fontWeight: 700, fontSize: '1rem', outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                    cursor: editable ? 'text' : 'not-allowed',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar da oferta */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={labelStyle}>Progresso da Oferta Acumulada</span>
          <ProgressBar value={reached.acumulado} max={goals.alvoSemanal * 11} color="#D4AF37" />
        </div>
      </div>

    </div>
  );
}

export default Metas;
