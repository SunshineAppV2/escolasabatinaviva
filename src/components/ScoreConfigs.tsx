import React, { useState, useEffect, useRef } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { Settings, Save, RefreshCw, Award, Zap } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { DEFAULT_WEIGHTS } from '../lib/constants';
import { ScoreWeights } from '../types';

const MIN_WEIGHT = 0;
const MAX_WEIGHT = 100;

function ScoreConfigs() {
  const { toast } = useToast();

  const [weights, setWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [weightsDocId, setWeightsDocId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: firestoreWeights,
    loading: firestoreWeightsLoading,
    addItem: addWeightsItem,
    updateItem: updateWeightsItem,
  } = useFirestore<ScoreWeights>('scoreWeights');

  useEffect(() => {
    if (!firestoreWeightsLoading && firestoreWeights.length > 0) {
      const [doc] = firestoreWeights;
      setWeights({
        presence:   doc.presence   ?? DEFAULT_WEIGHTS.presence,
        lesson:     doc.lesson     ?? DEFAULT_WEIGHTS.lesson,
        pg:         doc.pg         ?? DEFAULT_WEIGHTS.pg,
        bibleStudy: doc.bibleStudy ?? DEFAULT_WEIGHTS.bibleStudy,
        mission:    doc.mission    ?? DEFAULT_WEIGHTS.mission,
        visit:      doc.visit      ?? DEFAULT_WEIGHTS.visit,
      });
      setWeightsDocId(doc.id);
    }
  }, [firestoreWeights, firestoreWeightsLoading]);

  // Limpa timer ao desmontar para evitar setState em componente desmontado
  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

  const setWeight = (key: keyof ScoreWeights) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Number(e.target.value)));
    setWeights((w) => ({ ...w, [key]: val }));
  };

  const saveWeights = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (weightsDocId) {
        await updateWeightsItem(weightsDocId, weights);
      } else {
        await addWeightsItem(weights);
      }
      setIsSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setIsSaved(false), 3000);
    } catch {
      toast('Erro ao salvar pesos. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof ScoreWeights; label: string }[][] = [
    [
      { key: 'presence',   label: 'PRESENÇA NO SÁBADO (PTS)' },
      { key: 'lesson',     label: 'ESTUDO DA LIÇÃO (PTS)' },
      { key: 'pg',         label: 'PRESENÇA NO P.G. (PTS)' },
    ],
    [
      { key: 'bibleStudy', label: 'ESTUDO BÍBLICO DADO (PTS)' },
      { key: 'mission',    label: 'AÇÃO MISSIONÁRIA (PTS)' },
      { key: 'visit',      label: 'VISITA PASTORAL/LÍDER (PTS)' },
    ],
  ];

  return (
    <div className="score-configs-view animate-up">
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Settings color="var(--secondary)" /> Pesos do Score Viva
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Defina a relevância de cada atividade no ranking global (0–{MAX_WEIGHT} pts)
            </p>
          </div>
          <button
            className="btn-login"
            style={{ width: 'auto', padding: '1rem 2.5rem', opacity: saving ? 0.6 : 1 }}
            onClick={saveWeights}
            disabled={saving}
          >
            <Save size={20} />
            <span style={{ marginLeft: '10px' }}>
              {saving ? 'Salvando...' : isSaved ? 'Pesos Atualizados!' : 'Salvar Pesos'}
            </span>
          </button>
        </div>

        <div className="form-grid-premium" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {/* Fidelidade Card */}
          <div className="premium-form-container" style={{ margin: 0, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.05)' }}>
            <h3 style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem', fontSize: '1.1rem' }}>
              <Award size={20} /> Fidelidade Básica
            </h3>
            {fields[0].map(({ key, label }, i) => (
              <div key={key} className="premium-input-group" style={{ marginBottom: i < fields[0].length - 1 ? '1.5rem' : 0 }}>
                <label htmlFor={`weight-${key}`}>{label}</label>
                <input
                  id={`weight-${key}`}
                  type="number"
                  min={MIN_WEIGHT}
                  max={MAX_WEIGHT}
                  value={weights[key]}
                  onChange={setWeight(key)}
                />
              </div>
            ))}
          </div>

          {/* Missão Card */}
          <div className="premium-form-container" style={{ margin: 0, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.05)' }}>
            <h3 style={{ color: '#2dd4bf', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem', fontSize: '1.1rem' }}>
              <Zap size={20} /> Impacto Missionário
            </h3>
            {fields[1].map(({ key, label }, i) => (
              <div key={key} className="premium-input-group" style={{ marginBottom: i < fields[1].length - 1 ? '1.5rem' : 0 }}>
                <label htmlFor={`weight-${key}`}>{label}</label>
                <input
                  id={`weight-${key}`}
                  type="number"
                  min={MIN_WEIGHT}
                  max={MAX_WEIGHT}
                  value={weights[key]}
                  onChange={setWeight(key)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ marginTop: '3rem', display: 'flex', alignItems: 'center', gap: '20px', padding: '1.5rem 2rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <RefreshCw size={24} color="#3b82f6" />
          <div style={{ flex: 1 }}>
            <h4 style={{ color: '#3b82f6', marginBottom: '4px', fontSize: '0.9rem' }}>Recálculo Automático</h4>
            <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>
              As alterações nos pesos serão aplicadas retroativamente a todos os registros deste trimestre, recalculando o ranking geral das unidades instantaneamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScoreConfigs;
