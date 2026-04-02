import React, { useState, useEffect } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { Plus, Trash2, ChevronRight, FileUp, Building2, Church, Compass, Layers, Info, MapPin } from 'lucide-react';
import { useToast } from '../context/ToastContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface HierarchyItem {
  id: string;
  name: string;
  parentId: string | null;
}

type HierarchyKey = 'uniao' | 'associacao' | 'distritos' | 'igrejas' | 'unidades';

interface HierarchyState {
  uniao:      HierarchyItem[];
  associacao: HierarchyItem[];
  distritos:  HierarchyItem[];
  igrejas:    HierarchyItem[];
  unidades:   HierarchyItem[];
}

interface HierarchyDoc extends HierarchyState {
  updatedAt?: string;
  [key: string]: unknown;
}

const EMPTY_HIERARCHY: HierarchyState = {
  uniao: [], associacao: [], distritos: [], igrejas: [], unidades: [],
};

const TABS: HierarchyKey[] = ['uniao', 'associacao', 'distritos', 'igrejas', 'unidades'];

// ─── Componente ───────────────────────────────────────────────────────────────

function Hierarchy() {
  const { toast } = useToast();

  const [activeTab, setActiveTab]       = useState<HierarchyKey>('unidades');
  const [hierarchy, setHierarchy]       = useState<HierarchyState>(EMPTY_HIERARCHY);
  const [hierarchyDocId, setHierarchyDocId] = useState<string | null>(null);
  const [newItem, setNewItem]           = useState('');
  const [parentId, setParentId]         = useState('');
  const [bulkText, setBulkText]         = useState('');
  const [isBulk, setIsBulk]             = useState(false);
  const [saving, setSaving]             = useState(false);

  const {
    data: firestoreHierarchy,
    loading: firestoreHierarchyLoading,
    addItem: addHierarchyItem,
    updateItem: updateHierarchyItem,
  } = useFirestore<HierarchyDoc>('hierarchy');

  useEffect(() => {
    if (!firestoreHierarchyLoading && firestoreHierarchy.length > 0) {
      const [doc] = firestoreHierarchy;
      setHierarchy({
        uniao:      Array.isArray(doc.uniao)      ? doc.uniao      : [],
        associacao: Array.isArray(doc.associacao) ? doc.associacao : [],
        distritos:  Array.isArray(doc.distritos)  ? doc.distritos  : [],
        igrejas:    Array.isArray(doc.igrejas)    ? doc.igrejas    : [],
        unidades:   Array.isArray(doc.unidades)   ? doc.unidades   : [],
      });
      setHierarchyDocId(doc.id);
    }
  }, [firestoreHierarchy, firestoreHierarchyLoading]);

  const parents: HierarchyItem[] = React.useMemo(() => {
    const map: Record<HierarchyKey, HierarchyKey | null> = {
      uniao:      null,
      associacao: 'uniao',
      distritos:  'associacao',
      igrejas:    'distritos',
      unidades:   'igrejas',
    };
    const parentKey = map[activeTab];
    return parentKey ? hierarchy[parentKey] : [];
  }, [activeTab, hierarchy]);

  const persistHierarchy = async (newH: HierarchyState) => {
    if (saving) return;
    setSaving(true);
    const payload: HierarchyDoc = {
      ...newH,
      updatedAt: new Date().toISOString(),
    };
    try {
      if (hierarchyDocId) {
        await updateHierarchyItem(hierarchyDocId, payload);
      } else {
        await addHierarchyItem(payload);
      }
      setHierarchy(newH);
    } catch {
      toast('Erro ao salvar hierarquia. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addItem = async () => {
    const name = newItem.trim();
    if (!name) return;
    const item: HierarchyItem = {
      id: crypto.randomUUID(),
      name,
      parentId: parentId || null,
    };
    const newH = { ...hierarchy, [activeTab]: [...hierarchy[activeTab], item] };
    await persistHierarchy(newH);
    setNewItem('');
  };

  const deleteItem = async (id: string) => {
    const newH = {
      ...hierarchy,
      [activeTab]: hierarchy[activeTab].filter((i) => i.id !== id),
    };
    await persistHierarchy(newH);
  };

  const handleBulk = async () => {
    // Remove BOM, espaços e caracteres de controle invisíveis
    const lines = bulkText
      .replace(/^\uFEFF/, '')           // BOM UTF-8
      .split('\n')
      .map((l) => l.replace(/[\r\u200B\u00A0]/g, '').trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      toast('Nenhum nome encontrado na lista.', 'error');
      return;
    }

    const newItems: HierarchyItem[] = lines.map((name) => ({
      id: crypto.randomUUID(),
      name,
      parentId: parentId || null,
    }));
    const newH = { ...hierarchy, [activeTab]: [...hierarchy[activeTab], ...newItems] };
    await persistHierarchy(newH);
    toast(`${newItems.length} item(ns) importado(s) com sucesso!`, 'success');
    setBulkText('');
    setIsBulk(false);
  };

  const getIcon = (type: HierarchyKey) => {
    switch (type) {
      case 'uniao':      return <Compass   size={18} />;
      case 'associacao': return <Building2 size={18} />;
      case 'distritos':  return <MapPin    size={18} />;
      case 'igrejas':    return <Church    size={18} />;
      default:           return <Layers    size={18} />;
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

        {/* Tabs */}
        <div className="tab-container-premium" style={{ marginBottom: '1.5rem' }}>
          {TABS.map((t) => (
            <button
              key={t}
              className={`tab-btn ${activeTab === t ? 'active' : ''}`}
              onClick={() => { setActiveTab(t); setParentId(''); setNewItem(''); }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="premium-form-container animate-up">
          <div className="form-grid-premium">
            <div className="premium-input-group">
              <label htmlFor="parent-select">VÍNCULO SUPERIOR (PAI)</label>
              <select id="parent-select" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">Raiz / Sem Vínculo</option>
                {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="premium-input-group">
              <label htmlFor="new-item-input">NOME DO REGISTRO</label>
              <div style={{ position: 'relative' }}>
                <Layers size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', opacity: 0.4 }} />
                <input
                  id="new-item-input"
                  style={{ paddingLeft: '3rem' }}
                  placeholder={`Digite o nome da ${activeTab}...`}
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <button
                className="btn-login"
                style={{ width: 'auto', flex: 1, padding: '1rem', opacity: saving ? 0.6 : 1 }}
                onClick={addItem}
                disabled={saving}
              >
                <Plus size={20} /> <span style={{ marginLeft: '10px' }}>{saving ? 'Salvando...' : 'Salvar'}</span>
              </button>
              <button
                className="btn-login"
                style={{ width: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                onClick={() => setIsBulk(!isBulk)}
                title="Importação em massa"
              >
                <FileUp size={20} />
              </button>
            </div>
          </div>

          {isBulk && (
            <div className="bulk-input animate-up" style={{ marginTop: '1.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--secondary)', display: 'block', marginBottom: '0.8rem' }}>
                IMPORTAÇÃO EM MASSA
              </label>
              <textarea
                style={{ width: '100%', height: '120px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                placeholder="Cole uma lista de nomes (um por linha)..."
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
              <button
                className="btn-login"
                style={{ width: 'auto', marginTop: '1rem', padding: '0.8rem 2rem', opacity: saving ? 0.6 : 1 }}
                onClick={handleBulk}
                disabled={saving}
              >
                Finalizar Importação
              </button>
            </div>
          )}
        </div>

        {/* Lista */}
        <div className="list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem', marginTop: '2.5rem' }}>
          {hierarchy[activeTab].length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', opacity: 0.3, background: 'rgba(255,255,255,0.02)', borderRadius: '24px' }}>
              <Info size={40} style={{ marginBottom: '1rem' }} />
              <p>Nenhuma configuração ativa para {activeTab}.</p>
            </div>
          )}
          {hierarchy[activeTab].map((item) => (
            <div key={item.id} className="tree-node animate-up" style={{ borderLeft: '4px solid var(--secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '1.2rem 1.8rem', borderRadius: '16px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ color: 'var(--secondary)' }}>{getIcon(activeTab)}</div>
                <strong style={{ fontSize: '1rem' }}>{item.name}</strong>
              </div>
              <button
                onClick={() => deleteItem(item.id)}
                disabled={saving}
                aria-label={`Remover ${item.name}`}
                style={{ background: 'none', border: 'none', color: '#ff4444', opacity: saving ? 0.2 : 0.4, cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.3s' }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Visão consolidada */}
        <div className="hierarchy-tree-visual" style={{ marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ color: 'var(--secondary)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.2rem' }}>
            <Layers size={22} /> Estrutura Consolidada do Sistema
          </h3>
          <div className="tree-container glass-card" style={{ padding: '2.5rem' }}>
            {hierarchy.uniao.length === 0 && (
              <p style={{ opacity: 0.3, textAlign: 'center', padding: '2rem' }}>
                Aguardando configuração de raiz para gerar visualização.
              </p>
            )}
            {hierarchy.uniao.map((u) => (
              <div key={u.id} style={{ marginBottom: '2rem' }}>
                <div style={{ fontWeight: 900, color: 'var(--secondary)', fontSize: '1.1rem', background: 'rgba(212,175,55,0.1)', padding: '0.8rem 1.2rem', borderRadius: '10px', display: 'inline-block' }}>
                  {u.name}
                </div>
                {hierarchy.associacao.filter((a) => a.parentId === u.id).map((a) => (
                  <div key={a.id} style={{ marginLeft: '2.5rem', borderLeft: '2px solid rgba(212,175,55,0.2)', paddingLeft: '1.5rem', marginTop: '1rem' }}>
                    <div style={{ fontWeight: 700, padding: '0.5rem 0' }}>{a.name}</div>
                    {hierarchy.distritos.filter((d) => d.parentId === a.id).map((d) => (
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
