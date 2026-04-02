import React, { useState, useEffect } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { Plus, Trash2, ChevronRight, Save, FileUp, Building2, Church, Compass, Users, Info, MapPin, Layers } from 'lucide-react';

function Hierarchy() {
  const [activeTab, setActiveTab] = useState('unidades');
  const [hierarchy, setHierarchy] = useState({
    uniao: [], associacao: [], distritos: [], igrejas: [], unidades: []
  });
  const [hierarchyDocId, setHierarchyDocId] = useState(null);
  const { data: firestoreHierarchy, loading: firestoreHierarchyLoading, error: firestoreHierarchyError, addItem: addHierarchyItem, updateItem: updateHierarchyItem } = useFirestore('hierarchy');
  const parents = React.useMemo(() => {
    if (activeTab === 'associacao') return hierarchy.uniao || [];
    else if (activeTab === 'distritos') return hierarchy.associacao || [];
    else if (activeTab === 'igrejas') return hierarchy.distritos || [];
    else if (activeTab === 'unidades') return hierarchy.igrejas || [];
    else return [];
  }, [activeTab, hierarchy]);
  const [newItem, setNewItem] = useState("");
  const [parentId, setParentId] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [isBulk, setIsBulk] = useState(false);



  const saveHierarchy = async (newH) => {
    setHierarchy(newH);
    const payload = {
      uniao: newH.uniao,
      associacao: newH.associacao,
      distritos: newH.distritos,
      igrejas: newH.igrejas,
      unidades: newH.unidades,
      updatedAt: new Date().toISOString(),
    };
    if (hierarchyDocId) {
      await updateHierarchyItem(hierarchyDocId, payload);
    } else {
      await addHierarchyItem(payload);
    }
  };

  useEffect(() => {
    if (!firestoreHierarchyLoading && firestoreHierarchy.length > 0) {
      const [doc] = firestoreHierarchy;
      if (doc) {
        const { id, ...payload } = doc;
        setHierarchy({
          uniao: payload.uniao || [],
          associacao: payload.associacao || [],
          distritos: payload.distritos || [],
          igrejas: payload.igrejas || [],
          unidades: payload.unidades || []
        });
        setHierarchyDocId(id);
      }
    }
  }, [firestoreHierarchy, firestoreHierarchyLoading]);

  const addItem = () => {
    if (!newItem.trim()) return;
    const item = { id: crypto.randomUUID(), name: newItem.trim(), parentId: parentId || null };
    const newItems = [...(hierarchy[activeTab] || []), item];
    const newH = { ...hierarchy, [activeTab]: newItems };
    saveHierarchy(newH);
    setNewItem("");
  };

  const deleteItem = (id) => {
    const newH = { ...hierarchy, [activeTab]: (hierarchy[activeTab] || []).filter(i => i.id !== id) };
    saveHierarchy(newH);
  };

  const handleBulk = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l);
    const newItems = lines.map((name) => ({ id: crypto.randomUUID(), name, parentId: parentId || null }));
    const newH = { ...hierarchy, [activeTab]: [...(hierarchy[activeTab] || []), ...newItems] };
    saveHierarchy(newH);
    setBulkText("");
    setIsBulk(false);
  };

  const getIcon = (type) => {
    switch(type) {
      case 'uniao': return <Compass size={18} />;
      case 'associacao': return <Building2 size={18} />;
      case 'distritos': return <MapPin size={18} />;
      case 'igrejas': return <Church size={18} />;
      default: return <Layers size={18} />;
    }
  };

  return (
    <div className="hierarchy-view animate-up">
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
           <div>
              <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <Building2 color="var(--secondary)" /> Gestão Organizacional
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>Configure a árvore hierárquica para filtragem de dados</p>
           </div>
        </div>
        
        {/* Modern Tabs */}
        <div className="tab-container-premium" style={{ marginBottom: '1.5rem' }}>
          {['uniao', 'associacao', 'distritos', 'igrejas', 'unidades'].map(t => (
            <button
              key={t}
              className={`tab-btn ${activeTab === t ? 'active' : ''}`}
              onClick={() => { setActiveTab(t); setParentId(''); setNewItem(''); }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Premium Form Grid */}
        <div className="premium-form-container animate-up">
          <div className="form-grid-premium">
            <div className="premium-input-group">
              <label>VÍNCULO SUPERIOR (PAI)</label>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">Raiz / Sem Vínculo</option>
                {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="premium-input-group">
              <label>NOME DO REGISTRO</label>
              <div style={{ position: 'relative' }}>
                <Layers size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', opacity: 0.4 }} />
                <input 
                  style={{ paddingLeft: '3rem' }}
                  placeholder={`Digite o nome da ${activeTab}...`} 
                  value={newItem} 
                  onChange={(e) => setNewItem(e.target.value)} 
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <button className="btn-login" style={{ width: 'auto', flex: 1, padding: '1rem' }} onClick={addItem}>
                <Plus size={20} /> <span style={{ marginLeft: '10px' }}>Salvar</span>
              </button>
              <button className="btn-login" style={{ width: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={() => setIsBulk(!isBulk)}>
                <FileUp size={20} />
              </button>
            </div>
          </div>

          {isBulk && (
            <div className="bulk-input animate-up" style={{ marginTop: '1.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--secondary)', display: 'block', marginBottom: '0.8rem' }}>IMPORTAÇÃO EM MASSA</label>
              <textarea 
                style={{ width: '100%', height: '120px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', outline: 'none' }}
                placeholder="Cole uma lista de nomes (um por linha)..."
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
              <button className="btn-login" style={{ width: 'auto', marginTop: '1rem', padding: '0.8rem 2rem' }} onClick={handleBulk}>Finalizar Importação</button>
            </div>
          )}
        </div>

        {/* Improved Node List */}
        <div className="list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem', marginTop: '2.5rem' }}>
          {(hierarchy[activeTab] || []).length === 0 && (
             <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', opacity: 0.3, background: 'rgba(255,255,255,0.02)', borderRadius: '24px' }}>
                <Info size={40} style={{ marginBottom: '1rem' }} />
                <p>Nenhuma configuração ativa para {activeTab}.</p>
             </div>
          )}
          {(hierarchy[activeTab] || []).map(item => (
            <div key={item.id} className="tree-node animate-up" style={{ borderLeft: '4px solid var(--secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '1.2rem 1.8rem', borderRadius: '16px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ color: 'var(--secondary)' }}>{getIcon(activeTab)}</div>
                  <strong style={{ fontSize: '1rem' }}>{item.name}</strong>
               </div>
               <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', color: '#ff4444', opacity: 0.4, cursor: 'pointer', transition: 'all 0.3s' }}>
                 <Trash2 size={18} />
               </button>
            </div>
          ))}
        </div>

        {/* Global Overview Section */}
        <div className="hierarchy-tree-visual" style={{ marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
           <h3 style={{ color: 'var(--secondary)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.2rem' }}>
             <Layers size={22} /> Estrutura Consolidada do Sistema
           </h3>
           <div className="tree-container glass-card" style={{ padding: '2.5rem' }}>
              {(hierarchy.uniao || []).length === 0 && <p style={{ opacity: 0.3, textAlign: 'center', padding: '2rem' }}>Aguardando configuração de raiz para gerar visualização.</p>}
              {(hierarchy.uniao || []).map(u => (
                <div key={u.id} style={{ marginBottom: '2rem' }}>
                   <div style={{ fontWeight: '900', color: 'var(--secondary)', fontSize: '1.1rem', background: 'rgba(212,175,55,0.1)', padding: '0.8rem 1.2rem', borderRadius: '10px', display: 'inline-block' }}>{u.name}</div>
                   {(hierarchy.associacao || []).filter(a => a.parentId == u.id).map(a => (
                     <div key={a.id} style={{ marginLeft: '2.5rem', borderLeft: '2px solid rgba(212,175,55,0.2)', paddingLeft: '1.5rem', marginTop: '1rem' }}>
                        <div style={{ fontWeight: '700', padding: '0.5rem 0' }}>{a.name}</div>
                        {(hierarchy.distritos || []).filter(d => d.parentId == a.id).map(d => (
                          <div key={d.id} style={{ marginLeft: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.3rem 0' }}>
                            <ChevronRight size={14} color="var(--secondary)" /> {d.name}
                          </div>
                        ))}
                     </div>
                   ))}
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}

export default Hierarchy;
