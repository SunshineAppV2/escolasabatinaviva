import React, { useState, useEffect } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { Settings, Save, RefreshCw, Star, BookOpen, Users, MapPin, Zap, Award, Target, Heart } from 'lucide-react';

function ScoreConfigs() {
  const [weights, setWeights] = useState({
    presence: 10,
    lesson: 10,
    pg: 10,
    bibleStudy: 20,
    mission: 15,
    visit: 5
  });

  const [weightsDocId, setWeightsDocId] = useState(null);
  const { data: firestoreWeights, loading: firestoreWeightsLoading, error: firestoreWeightsError, addItem: addWeightsItem, updateItem: updateWeightsItem } = useFirestore('scoreWeights');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!firestoreWeightsLoading && firestoreWeights.length > 0) {
      const [doc] = firestoreWeights;
      setWeights({
        presence: doc.presence ?? 10,
        lesson: doc.lesson ?? 10,
        pg: doc.pg ?? 10,
        bibleStudy: doc.bibleStudy ?? 20,
        mission: doc.mission ?? 15,
        visit: doc.visit ?? 5,
      });
      setWeightsDocId(doc.id);
    }
  }, [firestoreWeights, firestoreWeightsLoading]);

  const saveWeights = async () => {
    if (weightsDocId) {
      await updateWeightsItem(weightsDocId, weights);
    } else {
      await addWeightsItem(weights);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="score-configs-view animate-up">
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
           <div>
              <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <Settings color="var(--secondary)" /> Pesos do Score Viva
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>Defina a relevância de cada atividade no ranking global</p>
           </div>
           <button className="btn-login" style={{ width: 'auto', padding: '1rem 2.5rem' }} onClick={saveWeights}>
              <Save size={20} /> <span style={{ marginLeft: '10px' }}>{isSaved ? "Pesos Atualizados!" : "Salvar Pesos"}</span>
           </button>
        </div>

        <div className="form-grid-premium" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
           {/* Fidelidade Card */}
           <div className="premium-form-container" style={{ margin: 0, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.05)' }}>
              <h3 style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem', fontSize: '1.1rem' }}>
                 <Award size={20} /> Fidelidade Básica
              </h3>
              <div className="premium-input-group" style={{ marginBottom: '1.5rem' }}>
                 <label>PRESENÇA NO SÁBADO (PTS)</label>
                 <input type="number" value={weights.presence} onChange={(e) => setWeights({...weights, presence: Number(e.target.value)})}/>
              </div>
              <div className="premium-input-group" style={{ marginBottom: '1.5rem' }}>
                 <label>ESTUDO DA LIÇÃO (PTS)</label>
                 <input type="number" value={weights.lesson} onChange={(e) => setWeights({...weights, lesson: Number(e.target.value)})}/>
              </div>
              <div className="premium-input-group">
                 <label>PRESENÇA NO P.G. (PTS)</label>
                 <input type="number" value={weights.pg} onChange={(e) => setWeights({...weights, pg: Number(e.target.value)})}/>
              </div>
           </div>

           {/* Missão Card */}
           <div className="premium-form-container" style={{ margin: 0, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.05)' }}>
              <h3 style={{ color: '#2dd4bf', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem', fontSize: '1.1rem' }}>
                 <Zap size={20} /> Impacto Missionário
              </h3>
              <div className="premium-input-group" style={{ marginBottom: '1.5rem' }}>
                 <label>ESTUDO BÍBLICO DADO (PTS)</label>
                 <input type="number" value={weights.bibleStudy} onChange={(e) => setWeights({...weights, bibleStudy: Number(e.target.value)})}/>
              </div>
              <div className="premium-input-group" style={{ marginBottom: '1.5rem' }}>
                 <label>AÇÃO MISSIONÁRIA (PTS)</label>
                 <input type="number" value={weights.mission} onChange={(e) => setWeights({...weights, mission: Number(e.target.value)})}/>
              </div>
              <div className="premium-input-group">
                 <label>VISITA PASTORAL/LÍDER (PTS)</label>
                 <input type="number" value={weights.visit} onChange={(e) => setWeights({...weights, visit: Number(e.target.value)})}/>
              </div>
           </div>
        </div>

        <div className="glass-card" style={{ marginTop: '3rem', display: 'flex', alignItems: 'center', gap: '20px', padding: '1.5rem 2rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
           <RefreshCw size={24} color="#3b82f6" />
           <div style={{ flex: 1 }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '4px', fontSize: '0.9rem' }}>Recálculo Automático</h4>
              <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>As alterações nos pesos serão aplicadas retroativamente a todos os registros deste trimestre, recalculando o ranking geral das unidades instantaneamente.</p>
           </div>
        </div>
      </div>
    </div>
  );
}

export default ScoreConfigs;
