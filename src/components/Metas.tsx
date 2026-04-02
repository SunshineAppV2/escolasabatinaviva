import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, Target, DollarSign } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../context/ToastContext';
import { User } from '../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface GoalValues {
  assinaturas: number;
  membrosEstudo: number;
  pgs: number;
  duplas: number;
  estudos: number;
  batismos: number;
  alvoSemanal: number;
  alvo13: number;
}

interface ReachedValues {
  assinaturas: number;
  membrosEstudo: number;
  pgs: number;
  duplas: number;
  estudos: number;
  batismos: number;
  acumulado: number;
}

const DEFAULT_GOALS: GoalValues = {
  assinaturas: 0, membrosEstudo: 0,
  pgs: 0, duplas: 0,
  estudos: 0, batismos: 0,
  alvoSemanal: 0, alvo13: 0,
};

const DEFAULT_REACHED: ReachedValues = {
  assinaturas: 0, membrosEstudo: 0,
  pgs: 0, duplas: 0,
  estudos: 0, batismos: 0,
  acumulado: 0,
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

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

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const barColor = pct >= 80 ? color : pct >= 50 ? '#f59e0b' : '#ef4444';
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
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${barColor}aa, ${barColor})`,
          borderRadius: '99px',
          transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
}

function MetaRow({
  id, label, goal, reached, color,
  onGoalChange, onReachedChange,
}: {
  id: string;
  label: string;
  goal: number;
  reached: number;
  color: string;
  onGoalChange: (val: number) => void;
  onReachedChange: (val: number) => void;
}) {
  const inputBase: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '0.5rem 0.75rem',
    color: 'white',
    fontWeight: 700,
    fontSize: '0.9rem',
    outline: 'none',
    width: '80px',
    fontFamily: 'inherit',
    textAlign: 'right',
  };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <label htmlFor={`goal-${id}`} style={labelStyle}>{label}</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>Alvo</span>
          <input
            id={`goal-${id}`}
            type="number"
            min="0"
            value={goal}
            onChange={(e) => onGoalChange(Math.max(0, +e.target.value))}
            style={inputBase}
          />
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>Real</span>
          <input
            id={`reached-${id}`}
            type="number"
            min="0"
            value={reached}
            onChange={(e) => onReachedChange(Math.max(0, +e.target.value))}
            style={{ ...inputBase, border: '1px solid rgba(255,255,255,0.18)' }}
          />
        </div>
      </div>
      <ProgressBar value={reached} max={goal} color={color} />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

function Metas({ user, onBack }: { user: User | null; onBack: () => void }) {
  const { toast } = useToast();

  const [goals,   setGoals]   = useState<GoalValues>(DEFAULT_GOALS);
  const [reached, setReached] = useState<ReachedValues>(DEFAULT_REACHED);
  const [saving,  setSaving]  = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(true);

  // Trimestre ativo
  const { data: quartersData } = useFirestore<{ name: string; status: string; start: string; end: string }>(
    'quarters',
    [{ field: 'status', op: '==', value: 'active' }],
  );
  const activeQuarter = quartersData[0] ?? null;

  // ID do documento: {quarterId}_{unitId}
  const docId = activeQuarter && user?.unitId
    ? `${activeQuarter.id}_${user.unitId}`
    : null;

  // Carrega documento de metas quando docId estiver disponível
  useEffect(() => {
    if (!docId) { setLoadingDoc(false); return; }
    setLoadingDoc(true);
    getDoc(doc(db, 'goals', docId)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.goals)   setGoals({ ...DEFAULT_GOALS,   ...d.goals });
        if (d.reached) setReached({ ...DEFAULT_REACHED, ...d.reached });
      }
    }).catch(() => {
      toast('Erro ao carregar metas. Verifique sua conexão.', 'error');
    }).finally(() => setLoadingDoc(false));
  }, [docId]);

  const handleSave = async () => {
    if (!docId) {
      toast('Nenhum trimestre ativo ou unidade não vinculada.', 'error');
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, 'goals', docId), {
        quarterId: activeQuarter!.id,
        unitId:    user!.unitId,
        goals,
        reached,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      toast('Metas salvas com sucesso!', 'success');
    } catch {
      toast('Erro ao salvar metas. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const setGoal    = (key: keyof GoalValues)   => (val: number) => setGoals(g   => ({ ...g,   [key]: val }));
  const setReach   = (key: keyof ReachedValues) => (val: number) => setReached(r => ({ ...r,   [key]: val }));

  const categories = [
    {
      letter: 'C', title: 'Comunhão',
      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',
      rows: [
        { id: 'assinaturas',  label: 'Assinaturas da Lição', goal: goals.assinaturas,  reached: reached.assinaturas,  onGoalChange: setGoal('assinaturas'),  onReachedChange: setReach('assinaturas')  },
        { id: 'membrosEstudo', label: 'Estudo Diário',       goal: goals.membrosEstudo, reached: reached.membrosEstudo, onGoalChange: setGoal('membrosEstudo'), onReachedChange: setReach('membrosEstudo') },
      ],
    },
    {
      letter: 'R', title: 'Relacionamento',
      color: '#22c55e', bg: 'rgba(34,197,94,0.12)',
      rows: [
        { id: 'pgs',   label: 'Membros em PGs',      goal: goals.pgs,   reached: reached.pgs,   onGoalChange: setGoal('pgs'),   onReachedChange: setReach('pgs')   },
        { id: 'duplas', label: 'Duplas Missionárias', goal: goals.duplas, reached: reached.duplas, onGoalChange: setGoal('duplas'), onReachedChange: setReach('duplas') },
      ],
    },
    {
      letter: 'M', title: 'Missão',
      color: '#a855f7', bg: 'rgba(168,85,247,0.12)',
      rows: [
        { id: 'estudos',  label: 'Estudos Bíblicos',  goal: goals.estudos,  reached: reached.estudos,  onGoalChange: setGoal('estudos'),  onReachedChange: setReach('estudos')  },
        { id: 'batismos', label: 'Pessoas Batizadas', goal: goals.batismos, reached: reached.batismos, onGoalChange: setGoal('batismos'), onReachedChange: setReach('batismos') },
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
            {activeQuarter ? `Trimestre: ${activeQuarter.name}` : 'Nenhum trimestre ativo'}
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
          <button
            onClick={handleSave}
            disabled={saving || !docId}
            style={{
              background: 'linear-gradient(135deg, #D4AF37, #B08D26)', color: '#0a0f2c',
              border: 'none', borderRadius: '12px', padding: '0.7rem 1.4rem',
              fontWeight: 800, fontSize: '0.8rem', cursor: saving || !docId ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'inherit',
              opacity: saving || !docId ? 0.6 : 1,
            }}
          >
            <Save size={15} /> {saving ? 'Salvando...' : 'Salvar Metas'}
          </button>
        </div>
      </div>

      {loadingDoc ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>
          Carregando metas...
        </div>
      ) : !activeQuarter ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>
          <Target size={48} style={{ opacity: 0.2, marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
          <p>Nenhum trimestre ativo. Ative um trimestre para gerenciar as metas.</p>
        </div>
      ) : (
        <>
          {/* Category cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {categories.map((cat) => (
              <div key={cat.letter} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '14px',
                    background: cat.bg, border: `1px solid ${cat.color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: '1.1rem', color: cat.color, flexShrink: 0,
                  }}>
                    {cat.letter}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block' }}>
                      Categoria
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '1rem' }}>{cat.title}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                  {cat.rows.map((row) => <MetaRow key={row.id} {...row} color={cat.color} />)}
                </div>
              </div>
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
              {([
                { label: 'Alvo Semanal',        key: 'alvoSemanal', editable: true,  value: goals.alvoSemanal,   isReached: false },
                { label: 'Acumulado Sáb. 1–11', key: 'acumulado',   editable: false, value: reached.acumulado,   isReached: true  },
                { label: 'Alvo 13º Sábado',     key: 'alvo13',      editable: true,  value: goals.alvo13,        isReached: false },
              ] as { label: string; key: string; editable: boolean; value: number; isReached: boolean }[]).map(({ label, key, editable, value, isReached }) => (
                <div key={key}>
                  <label htmlFor={`fin-${key}`} style={labelStyle}>{label}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                      color: editable ? 'var(--secondary)' : 'rgba(255,255,255,0.25)',
                      fontWeight: 800, fontSize: '0.9rem', pointerEvents: 'none',
                    }}>R$</span>
                    <input
                      id={`fin-${key}`}
                      type="number"
                      min="0"
                      disabled={!editable}
                      value={value}
                      onChange={(e) => {
                        const val = Math.max(0, +e.target.value);
                        if (isReached) setReached(r => ({ ...r, acumulado: val }));
                        else setGoals(g => ({ ...g, [key]: val }));
                      }}
                      style={{
                        width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem',
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

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={labelStyle}>Progresso da Oferta Acumulada</span>
              <ProgressBar value={reached.acumulado} max={goals.alvoSemanal * 11} color="#D4AF37" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Metas;
