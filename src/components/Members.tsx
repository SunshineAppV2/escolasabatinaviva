import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserPlus, User, Users, Trash2, Edit2, Search, X, Save, Mail, Lock, Phone, UserSearch } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../context/ToastContext';

const EMPTY_FORM = {
  name: '', role: 'Membro', email: '', password: '',
  unitId: '', churchId: '', distId: '', phone: '',
};

/**
 * Cria uma conta Firebase Auth para o novo membro sem deslogar o admin.
 * Usa uma instância secundária temporária do Firebase.
 * Retorna o UID do usuário criado ou lança erro.
 */
async function createAuthAccount(email, password) {
  const secondaryApp = initializeApp(firebaseConfig, `member-create-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return credential.user.uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

function Members() {
  const [members, setMembers] = useState([]);
  const { hierarchy } = useAppContext();
  const { toast } = useToast();

  const {
    data: firestoreMembers,
    loading: firestoreMembersLoading,
    addItem: addMemberItem,
    deleteItem: deleteMemberItem,
  } = useFirestore('members');

  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!firestoreMembersLoading && firestoreMembers.length > 0) {
      setMembers(firestoreMembers);
    }
  }, [firestoreMembers, firestoreMembersLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast('Informe o nome completo do membro.', 'error');
      return;
    }
    if (formData.email && !formData.password) {
      toast('Informe uma senha provisória para criar o login.', 'error');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      toast('A senha deve ter no mínimo 6 caracteres.', 'error');
      return;
    }

    setSaving(true);
    try {
      let uid = null;

      // Se email e senha foram fornecidos, cria a conta Firebase Auth
      if (formData.email && formData.password) {
        uid = await createAuthAccount(formData.email.trim().toLowerCase(), formData.password);
      }

      // Dados do membro para Firestore — senha NUNCA é gravada
      const { password: _omit, ...safeData } = formData;
      const memberDoc = {
        ...safeData,
        email: safeData.email.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
      };

      // Salva em members (ID automático do Firestore)
      const newId = await addMemberItem(memberDoc);

      // Se criou conta Auth, cria users/{uid} para as regras de segurança
      if (uid) {
        await setDoc(doc(db, 'users', uid), {
          role: memberDoc.role,
          unitId:   memberDoc.unitId   || null,
          churchId: memberDoc.churchId || null,
          distId:   memberDoc.distId   || null,
          email:    memberDoc.email,
          updatedAt: new Date().toISOString(),
        });
      }

      setMembers((prev) => [...prev, { ...memberDoc, id: newId ?? Date.now().toString() }]);
      setFormData(EMPTY_FORM);
      setIsAdding(false);
      toast('Membro cadastrado com sucesso!', 'success');
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Este e-mail já possui uma conta cadastrada.',
        'auth/invalid-email': 'E-mail inválido.',
      };
      toast(msgs[err?.code] ?? `Erro ao cadastrar: ${err?.message ?? 'Tente novamente.'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Remover "${m.name}" do sistema?`)) return;
    await deleteMemberItem(m.id);
    setMembers((prev) => prev.filter((x) => x.id !== m.id));
    toast('Membro removido.', 'info');
  };

  const filteredMembers = members.filter((m) =>
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const field = (key, value) => setFormData((f) => ({ ...f, [key]: value }));

  return (
    <div className="members-view animate-up">
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users color="var(--secondary)" /> Gestão de Membros
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>Controle de acesso e atribuição de funções hierárquicas</p>
          </div>
          <button className="btn-login" style={{ width: 'auto', padding: '1rem 2.5rem' }} onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? <X size={20} /> : <UserPlus size={20} />}
            <span style={{ marginLeft: '10px' }}>{isAdding ? 'Fechar' : 'Novo Cadastro'}</span>
          </button>
        </div>

        {isAdding && (
          <div className="premium-form-container animate-up">
            <form onSubmit={handleSubmit}>
              <div className="form-grid-premium">
                <div className="premium-input-group">
                  <label>Nome Completo</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', opacity: 0.4 }} />
                    <input style={{ paddingLeft: '3rem' }} value={formData.name} onChange={(e) => field('name', e.target.value)} required placeholder="Ex: João da Silva" />
                  </div>
                </div>
                <div className="premium-input-group">
                  <label>WhatsApp / Celular</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', opacity: 0.4 }} />
                    <input style={{ paddingLeft: '3rem' }} value={formData.phone} onChange={(e) => field('phone', e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="premium-input-group">
                  <label>Função no Sistema</label>
                  <select value={formData.role} onChange={(e) => field('role', e.target.value)}>
                    <option>Membro</option>
                    <option>Secretário</option>
                    <option>Diretor</option>
                    <option>Pastor</option>
                    <option>Administrador</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-premium">
                <div className="premium-input-group">
                  <label>E-mail de Login</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', opacity: 0.4 }} />
                    <input style={{ paddingLeft: '3rem' }} type="email" value={formData.email} onChange={(e) => field('email', e.target.value)} placeholder="login@igreja.com" />
                  </div>
                </div>
                <div className="premium-input-group">
                  <label>Senha Provisória <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>(mín. 6 caracteres)</span></label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', opacity: 0.4 }} />
                    <input style={{ paddingLeft: '3rem' }} type="password" value={formData.password} onChange={(e) => field('password', e.target.value)} placeholder="Nunca é salva no banco" />
                  </div>
                </div>

                {formData.role === 'Pastor' && (
                  <div className="premium-input-group">
                    <label>Distrito de Atuação</label>
                    <select value={formData.distId} onChange={(e) => field('distId', e.target.value)}>
                      <option value="">Selecione...</option>
                      {(hierarchy.distritos || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                )}
                {formData.role === 'Diretor' && (
                  <div className="premium-input-group">
                    <label>Igreja de Atuação</label>
                    <select value={formData.churchId} onChange={(e) => field('churchId', e.target.value)}>
                      <option value="">Selecione...</option>
                      {(hierarchy.igrejas || []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                )}
                {(formData.role === 'Secretário' || formData.role === 'Membro') && (
                  <div className="premium-input-group">
                    <label>Unidade de Ação</label>
                    <select value={formData.unitId} onChange={(e) => field('unitId', e.target.value)}>
                      <option value="">Selecione...</option>
                      {(hierarchy.unidades || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" className="btn-login" disabled={saving} style={{ width: 'auto', marginTop: '1.5rem', padding: '1.2rem 4rem' }}>
                <Save size={22} />
                <span style={{ marginLeft: '12px' }}>{saving ? 'Salvando...' : 'Finalizar Cadastro'}</span>
              </button>
            </form>
          </div>
        )}

        <div className="search-bar glass-card" style={{ padding: '0.8rem 1.8rem', display: 'flex', alignItems: 'center', gap: '20px', marginTop: '2rem' }}>
          <Search size={22} color="var(--secondary)" />
          <input
            style={{ background: 'none', border: 'none', color: 'white', width: '100%', outline: 'none', fontSize: '1.1rem' }}
            placeholder="Pesquisar por nome ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="list-container mt-2">
          {filteredMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <UserSearch size={80} style={{ opacity: 0.15, marginBottom: '1.5rem' }} />
              <h3 style={{ opacity: 0.6, fontSize: '1.5rem' }}>Lista de Líderes e Membros Vazia</h3>
              <p style={{ opacity: 0.3, maxWidth: '450px', margin: '0.5rem auto 0' }}>Cadastre os anciãos, diretores e secretários para dar início à gestão da sua unidade.</p>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Identificação</th>
                    <th>Função</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                          <div className="avatar-mockup" style={{ width: '48px', height: '48px', fontSize: '1.1rem', background: 'linear-gradient(135deg, var(--secondary), #B08D26)', color: 'var(--primary)', fontWeight: 800 }}>
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '1rem' }}>{m.name}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.5, letterSpacing: '0.5px' }}>{m.email || 'Sem e-mail vinculado'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge ${m.role.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>{m.role}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <button className="icon-btn edit" style={{ opacity: 0.5 }} aria-label={`Editar ${m.name}`}>
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="icon-btn delete"
                            style={{ opacity: 0.5 }}
                            aria-label={`Remover ${m.name}`}
                            onClick={() => handleDelete(m)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Members;
