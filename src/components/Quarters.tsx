import React, { useState, useEffect } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { Calendar, Plus, Trash2, CheckCircle2, Clock } from 'lucide-react';

const STATUS_LABEL = {
  active:   'EM CURSO',
  finished: 'ENCERRADO',
  planned:  'PLANEJADO',
};

const STATUS_COLOR = {
  active:   '#22c55e',
  finished: 'rgba(255,255,255,0.3)',
  planned:  '#f59e0b',
};

const STATUS_BG = {
  active:   'rgba(34,197,94,0.12)',
  finished: 'rgba(255,255,255,0.05)',
  planned:  'rgba(245,158,11,0.12)',
};

function StatusIcon({ status }) {
  if (status === 'active')  return <CheckCircle2 size={14} color={STATUS_COLOR.active} />;
  if (status === 'planned') return <Clock size={14} color={STATUS_COLOR.planned} />;
  return <Calendar size={14} color={STATUS_COLOR.finished} />;
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '0.85rem 1.1rem',
  color: 'white',
  outline: 'none',
  width: '100%',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const inputFocusStyle: React.CSSProperties = {
  ...inputStyle,
  border: '1px solid rgba(212,175,55,0.6)',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  fontWeight: 800,
  color: 'rgba(255,255,255,0.25)',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  marginBottom: '0.75rem',
  display: 'block',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '28px',
  padding: '1.8rem 2rem',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};

const primaryBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #D4AF37, #B08D26)',
  color: '#0a0f2c',
  border: 'none',
  borderRadius: '12px',
  padding: '0.85rem 1.5rem',
  fontWeight: 800,
  fontSize: '0.85rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const ghostBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '0.7rem 1.2rem',
  fontWeight: 700,
  fontSize: '0.8rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const dangerBtnStyle: React.CSSProperties = {
  background: 'rgba(239,68,68,0.1)',
  color: '#ef4444',
  border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: '10px',
  padding: '0.55rem 0.75rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};

function InputField({ value, onChange, type = 'text', placeholder = '' }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={focused ? inputFocusStyle : inputStyle}
    />
  );
}

function Quarters() {
  const [quarters, setQuarters] = useState([]);
  const [newQ, setNewQ] = useState({ name: '', start: '', end: '' });

  const {
    data: firestoreQuarters,
    loading: firestoreQuartersLoading,
    error: firestoreQuartersError,
    addItem:    addQuarterItem,
    updateItem: updateQuarterItem,
    deleteItem: deleteQuarterItem,
  } = useFirestore('quarters');

  useEffect(() => {
    if (!firestoreQuartersLoading && firestoreQuarters.length > 0) {
      setQuarters(firestoreQuarters);
    }
  }, [firestoreQuarters, firestoreQuartersLoading]);

  const addQuarter = async () => {
    if (!newQ.name.trim() || !newQ.start || !newQ.end) return;
    const item = { ...newQ, name: newQ.name.trim(), status: 'planned', createdAt: new Date().toISOString() };
    if (!firestoreQuartersError) {
      await addQuarterItem(item);
    }
    setNewQ({ name: '', start: '', end: '' });
  };

  const deleteQuarter = async (id) => {
    if (!firestoreQuartersError && firestoreQuarters.some((q) => q.id === id)) {
      await deleteQuarterItem(id);
    }
    setQuarters((prev) => prev.filter((q) => q.id !== id));
  };

  const activate = async (id) => {
    // Regras de transição de status:
    // - O trimestre ativado → 'active'
    // - Trimestres que estavam 'active' → 'finished' (foram encerrados ao ativar outro)
    // - Trimestres 'planned' ou 'finished' → permanecem inalterados
    const nextQuarters = quarters.map((q) => ({
      ...q,
      status:
        q.id === id
          ? 'active'
          : q.status === 'active'
          ? 'finished'
          : q.status,          // 'planned' e 'finished' não mudam
    }));

    setQuarters(nextQuarters);

    if (!firestoreQuartersError) {
      // Atualiza somente os docs que existem no Firestore e cujo status mudou
      const firestoreIds = new Set(firestoreQuarters.map((q) => q.id));
      const changed = nextQuarters.filter((q) => {
        const original = quarters.find((o) => o.id === q.id);
        return firestoreIds.has(q.id) && original?.status !== q.status;
      });
      await Promise.all(changed.map((q) => updateQuarterItem(q.id, { status: q.status })));
    }
  };

  const activeId = quarters.find((q) => q.status === 'active')?.id ?? null;

  return (
    <div className="animate-up" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{
          display: 'inline-flex',
          padding: '0.3rem 0.9rem',
          background: 'rgba(212,175,55,0.1)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: '50px',
          fontSize: '0.7rem',
          fontWeight: 800,
          color: 'var(--secondary)',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          marginBottom: '1rem',
        }}>
          TRIMESTRES
        </span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 0.3rem' }}>
          Ciclos de Apuração
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: '0.95rem' }}>
          Registre e gerencie os trimestres da Escola Sabatina
        </p>
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '2rem', marginTop: '2rem' }}>

        {/* LEFT — Form card */}
        <div style={cardStyle}>
          <span style={sectionLabelStyle}>NOVO TRIMESTRE</span>
          <h3 style={{ margin: '0 0 1.5rem', fontWeight: 800, fontSize: '1.1rem' }}>Cadastrar Período</h3>

          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Nome do Trimestre
            </label>
            <InputField
              value={newQ.name}
              onChange={(e) => setNewQ({ ...newQ, name: e.target.value })}
              placeholder="Ex: 3º Trimestre 2025"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Data Início
              </label>
              <InputField
                type="date"
                value={newQ.start}
                onChange={(e) => setNewQ({ ...newQ, start: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Data Fim
              </label>
              <InputField
                type="date"
                value={newQ.end}
                onChange={(e) => setNewQ({ ...newQ, end: e.target.value })}
              />
            </div>
          </div>

          <button style={{ ...primaryBtnStyle, width: '100%', justifyContent: 'center' }} onClick={addQuarter}>
            <Plus size={18} /> Cadastrar Ciclo
          </button>
        </div>

        {/* RIGHT — List card */}
        <div style={cardStyle}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>Trimestres Registrados</h3>
            <span style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '50px',
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
            }}>
              {quarters.length}
            </span>
          </div>

          {/* Empty state */}
          {quarters.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 0', opacity: 0.3 }}>
              <Calendar size={32} style={{ marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Nenhum trimestre cadastrado.</p>
            </div>
          )}

          {/* Quarter items */}
          {quarters.map((q) => (
            <div
              key={q.id}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: activeId === q.id
                  ? '1px solid rgba(34,197,94,0.25)'
                  : '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '1.2rem',
                marginBottom: '0.8rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              {/* Left: status + name + dates */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: STATUS_BG[q.status] ?? STATUS_BG.finished,
                  borderRadius: '50px',
                  padding: '0.2rem 0.65rem',
                  marginBottom: '0.6rem',
                }}>
                  <StatusIcon status={q.status} />
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: STATUS_COLOR[q.status] ?? STATUS_COLOR.finished,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                  }}>
                    {STATUS_LABEL[q.status] ?? q.status}
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{q.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                  {q.start} até {q.end}
                </div>
              </div>

              {/* Right: actions */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '1rem', flexShrink: 0 }}>
                {q.status !== 'active' && (
                  <button style={ghostBtnStyle} onClick={() => activate(q.id)}>
                    Ativar
                  </button>
                )}
                <button
                  style={dangerBtnStyle}
                  aria-label={`Excluir ${q.name}`}
                  onClick={() => deleteQuarter(q.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default Quarters;
