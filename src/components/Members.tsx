import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useAppContext } from '../context/AppContext';
import { UserPlus, User, Users, Trash2, Edit2, Search, X, Save, Mail, Lock, Phone, UserSearch, PlusCircle, MinusCircle } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../context/ToastContext';
import { ALL_ROLES, Role } from '../types';

const EMPTY_FORM = {
  name: '', roles: ['Aluno'] as Role[], email: '', password: '',
  unitId: '', churchId: '', distId: '', assocId: '', unionId: '', divisaoId: '', phone: '',
};

// Mapeamento: qual campo de escopo cada papel usa
const ROLE_SCOPE: Record<Role, { field: string; label: string; hierarchyKey: string } | null> = {
  'Aluno':                  { field: 'unitId',    label: 'Unidade',    hierarchyKey: 'unidades'   },
  'Professor ES':           { field: 'unitId',    label: 'Unidade',    hierarchyKey: 'unidades'   },
  'Secretário de Unidade':  { field: 'unitId',    label: 'Unidade',    hierarchyKey: 'unidades'   },
  'Ancião':                 { field: 'churchId',  label: 'Igreja',     hierarchyKey: 'igrejas'    },
  'Diretor ES':             { field: 'churchId',  label: 'Igreja',     hierarchyKey: 'igrejas'    },
  'Secretário ES':          { field: 'churchId',  label: 'Igreja',     hierarchyKey: 'igrejas'    },
  'Pastor':                 { field: 'distId',    label: 'Distrito',   hierarchyKey: 'distritos'  },
  'Coord. Associação':      { field: 'assocId',   label: 'Associação', hierarchyKey: 'associacao' },
  'Coord. União':           { field: 'unionId',   label: 'União',      hierarchyKey: 'uniao'      },
  'Coord. Divisão':         { field: 'divisaoId', label: 'Divisão',    hierarchyKey: 'divisao'    },
  'Administrador':          null,
};

const memberSchema = z.object({
  name:     z.string().min(2, 'Informe o nome completo do membro.'),
  email:    z.string().email('E-mail inválido.').or(z.literal('')),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.').or(z.literal('')),
  phone:    z.string().regex(/^[\d\s()\-+]*$/, 'Telefone inválido.').or(z.literal('')),
  roles:    z.array(z.string()).min(1, 'Selecione ao menos um papel.'),
  unitId: z.string(), churchId: z.string(), distId: z.string(),
  assocId: z.string(), unionId: z.string(), divisaoId: z.string(),
}).refine(
  (d) => !(d.email && !d.password),
  { message: 'Informe uma senha provisória para criar o login.', path: ['password'] },
);

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
  const [members, setMembers] = useState<any[]>([]);
  const { hierarchy } = useAppContext();
  const { toast } = useToast();

  const {
    data: firestoreMembers,
    loading: firestoreMembersLoading,
    addItem: addMemberItem,
    deleteItem: deleteMemberItem,
  } = useFirestore<Record<string, unknown>>('members');

  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Papéis que precisam de vinculação de escopo (únicos por campo)
  const neededScopes = React.useMemo(() => {
    const seen = new Set<string>();
    return formData.roles.reduce<{ role: Role; field: string; label: string; hierarchyKey: string }[]>((acc, role) => {
      const scope = ROLE_SCOPE[role as Role];
      if (scope && !seen.has(scope.field)) {
        seen.add(scope.field);
        acc.push({ role: role as Role, ...scope });
      }
      return acc;
    }, []);
  }, [formData.roles]);

  useEffect(() => {
    if (!firestoreMembersLoading && firestoreMembers.length > 0) {
      setMembers(firestoreMembers);
    }
  }, [firestoreMembers, firestoreMembersLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = memberSchema.safeParse(formData);
    if (!validation.success) {
      toast(validation.error.errors[0].message, 'error');
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
      // role principal = papel de maior escopo (último da lista ordenada)
      const sortedRoles = [...safeData.roles].sort(
        (a, b) => ALL_ROLES.indexOf(b as Role) - ALL_ROLES.indexOf(a as Role)
      );
      const primaryRole = sortedRoles[0] as Role;
      const memberDoc = {
        ...safeData,
        role:  primaryRole,
        roles: safeData.roles,
        email: safeData.email.trim().toLowerCase(),
        unitId:    safeData.unitId    || null,
        churchId:  safeData.churchId  || null,
        distId:    safeData.distId    || null,
        assocId:   safeData.assocId   || null,
        unionId:   safeData.unionId   || null,
        divisaoId: safeData.divisaoId || null,
        createdAt: new Date().toISOString(),
      };

      // Salva em members (ID automático do Firestore)
      const newId = await addMemberItem(memberDoc);

      // Se criou conta Auth, cria users/{uid} para as regras de segurança
      if (uid) {
        await setDoc(doc(db, 'users', uid), {
          role:      primaryRole,
          roles:     safeData.roles,
          unitId:    memberDoc.unitId,
          churchId:  memberDoc.churchId,
          distId:    memberDoc.distId,
          assocId:   memberDoc.assocId,
          unionId:   memberDoc.unionId,
          divisaoId: memberDoc.divisaoId,
          email:     memberDoc.email,
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
    if (deletingId) return;
    if (!window.confirm(`Remover "${m.name}" do sistema?`)) return;
    setDeletingId(m.id);
    try {
      await deleteMemberItem(m.id);
      setMembers((prev) => prev.filter((x) => x.id !== m.id));
      toast('Membro removido.', 'info');
    } finally {
      setDeletingId(null);
    }
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
                <div className="premium-input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Papéis no Sistema <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>(pode ter mais de um)</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {ALL_ROLES.map((role) => {
                      const active = formData.roles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            const next = active
                              ? formData.roles.filter((r) => r !== role)
                              : [...formData.roles, role];
                            if (next.length > 0) field('roles', next);
                          }}
                          style={{
                            padding: '0.4rem 0.9rem',
                            borderRadius: '50px',
                            border: active ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.12)',
                            background: active ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                            color: active ? 'var(--secondary)' : 'rgba(255,255,255,0.5)',
                            fontWeight: active ? 800 : 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            fontFamily: 'inherit',
                          }}
                        >
                          {active ? <MinusCircle size={12} /> : <PlusCircle size={12} />}
                          {role}
                        </button>
                      );
                    })}
                  </div>
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

                {/* Campos de escopo dinâmicos baseados nos papéis selecionados */}
                {neededScopes.map(({ field: scopeField, label, hierarchyKey }) => {
                  const items = (hierarchy as any)[hierarchyKey] || [];
                  return (
                    <div key={scopeField} className="premium-input-group">
                      <label>{label} de Atuação</label>
                      <select
                        value={(formData as any)[scopeField]}
                        onChange={(e) => field(scopeField, e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {items.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                  );
                })}
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
                            style={{ opacity: deletingId === m.id ? 0.3 : 0.5 }}
                            disabled={!!deletingId}
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
