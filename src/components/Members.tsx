import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useAppContext } from '../context/AppContext';
import { UserPlus, User, Users, Trash2, Edit2, Search, X, Save, Mail, Lock, Phone, UserSearch, PlusCircle, MinusCircle, Check } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../context/ToastContext';
import { ALL_ROLES, Role } from '../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  email?: string;
  role: Role;
  roles?: Role[];
  unitId?: string | null;
  churchId?: string | null;
  distId?: string | null;
  assocId?: string | null;
  unionId?: string | null;
  divisaoId?: string | null;
  phone?: string;
  createdAt?: string;
}

type FormData = {
  name: string;
  roles: Role[];
  email: string;
  password: string;
  unitId: string;
  churchId: string;
  distId: string;
  assocId: string;
  unionId: string;
  divisaoId: string;
  phone: string;
};

const EMPTY_FORM: FormData = {
  name: '', roles: ['Aluno'], email: '', password: '',
  unitId: '', churchId: '', distId: '', assocId: '', unionId: '', divisaoId: '', phone: '',
};

// Mapeamento: qual campo de escopo cada papel usa
const ROLE_SCOPE: Record<Role, { field: keyof FormData; label: string; hierarchyKey: string } | null> = {
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

// ─── Validação ────────────────────────────────────────────────────────────────

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

const editSchema = memberSchema.omit({ password: true, email: true }).extend({
  email: z.string().email('E-mail inválido.').or(z.literal('')).optional(),
});

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function createAuthAccount(email: string, password: string): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `member-create-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return credential.user.uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function primaryRole(roles: Role[] | undefined, fallback: Role): Role {
  const list = roles ?? [fallback];
  return [...list].sort((a, b) => ALL_ROLES.indexOf(b) - ALL_ROLES.indexOf(a))[0] ?? fallback;
}

function memberToForm(m: Member): FormData {
  return {
    name:      m.name ?? '',
    roles:     m.roles?.length ? m.roles : [m.role],
    email:     m.email    ?? '',
    password:  '',
    unitId:    m.unitId    ?? '',
    churchId:  m.churchId  ?? '',
    distId:    m.distId    ?? '',
    assocId:   m.assocId   ?? '',
    unionId:   m.unionId   ?? '',
    divisaoId: m.divisaoId ?? '',
    phone:     m.phone     ?? '',
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

function Members() {
  const [members, setMembers]         = useState<Member[]>([]);
  const { hierarchy }                 = useAppContext();
  const { toast }                     = useToast();

  const {
    data: firestoreMembers,
    loading: firestoreMembersLoading,
    addItem:    addMemberItem,
    updateItem: updateMemberItem,
    deleteItem: deleteMemberItem,
  } = useFirestore<Record<string, unknown>>('members');

  const [searchTerm,  setSearchTerm]  = useState('');
  const [isAdding,    setIsAdding]    = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [addForm,     setAddForm]     = useState<FormData>(EMPTY_FORM);
  const [editForm,    setEditForm]    = useState<FormData>(EMPTY_FORM);

  // Campos de escopo únicos (sem duplicar mesmo campo para papéis distintos)
  const addScopes  = useNeededScopes(addForm.roles);
  const editScopes = useNeededScopes(editForm.roles);

  useEffect(() => {
    if (!firestoreMembersLoading && firestoreMembers.length > 0) {
      setMembers(firestoreMembers as unknown as Member[]);
    }
  }, [firestoreMembers, firestoreMembersLoading]);

  // ── Cadastro ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validation = memberSchema.safeParse(addForm);
    if (!validation.success) {
      toast(validation.error.errors[0].message, 'error');
      return;
    }

    setSaving(true);
    try {
      let uid: string | null = null;
      if (addForm.email && addForm.password) {
        uid = await createAuthAccount(addForm.email.trim().toLowerCase(), addForm.password);
      }

      const { password: _omit, ...safeData } = addForm;
      const pRole = primaryRole(safeData.roles as Role[], 'Aluno');
      const memberDoc = {
        ...safeData,
        role:      pRole,
        roles:     safeData.roles,
        email:     safeData.email.trim().toLowerCase(),
        unitId:    safeData.unitId    || null,
        churchId:  safeData.churchId  || null,
        distId:    safeData.distId    || null,
        assocId:   safeData.assocId   || null,
        unionId:   safeData.unionId   || null,
        divisaoId: safeData.divisaoId || null,
        createdAt: new Date().toISOString(),
      };

      const newId = await addMemberItem(memberDoc);

      if (uid) {
        await setDoc(doc(db, 'users', uid), {
          role:      pRole,
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

      setMembers((prev) => [...prev, { ...memberDoc, id: newId ?? Date.now().toString() } as Member]);
      setAddForm(EMPTY_FORM);
      setIsAdding(false);
      toast('Membro cadastrado com sucesso!', 'success');
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      const msgs: Record<string, string> = {
        'auth/email-already-in-use': 'Este e-mail já possui uma conta cadastrada.',
        'auth/invalid-email':        'E-mail inválido.',
      };
      toast(msgs[e.code ?? ''] ?? `Erro ao cadastrar: ${e.message ?? 'Tente novamente.'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Edição ──────────────────────────────────────────────────────────────────

  const startEdit = (m: Member) => {
    setEditingId(m.id);
    setEditForm(memberToForm(m));
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validation = editSchema.safeParse(editForm);
    if (!validation.success) {
      toast(validation.error.errors[0].message, 'error');
      return;
    }

    setSaving(true);
    try {
      const pRole = primaryRole(editForm.roles, 'Aluno');
      const updateDoc = {
        name:      editForm.name.trim(),
        roles:     editForm.roles,
        role:      pRole,
        phone:     editForm.phone,
        unitId:    editForm.unitId    || null,
        churchId:  editForm.churchId  || null,
        distId:    editForm.distId    || null,
        assocId:   editForm.assocId   || null,
        unionId:   editForm.unionId   || null,
        divisaoId: editForm.divisaoId || null,
        updatedAt: new Date().toISOString(),
      };
      await updateMemberItem(editingId!, updateDoc);
      setMembers((prev) =>
        prev.map((m) => (m.id === editingId ? { ...m, ...updateDoc } : m))
      );
      cancelEdit();
      toast('Membro atualizado.', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(`Erro ao atualizar: ${e.message ?? 'Tente novamente.'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Exclusão ─────────────────────────────────────────────────────────────────

  const handleDelete = async (m: Member) => {
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

  const fieldAdd  = (key: keyof FormData, value: string | Role[]) =>
    setAddForm((f) => ({ ...f, [key]: value }));
  const fieldEdit = (key: keyof FormData, value: string | Role[]) =>
    setEditForm((f) => ({ ...f, [key]: value }));

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
          <button
            className="btn-login"
            style={{ width: 'auto', padding: '1rem 2.5rem' }}
            onClick={() => { setIsAdding(!isAdding); cancelEdit(); }}
          >
            {isAdding ? <X size={20} /> : <UserPlus size={20} />}
            <span style={{ marginLeft: '10px' }}>{isAdding ? 'Fechar' : 'Novo Cadastro'}</span>
          </button>
        </div>

        {/* ── Formulário de cadastro ── */}
        {isAdding && (
          <MemberForm
            title="Novo Cadastro"
            formData={addForm}
            neededScopes={addScopes}
            hierarchy={hierarchy}
            saving={saving}
            showPassword
            onField={fieldAdd}
            onSubmit={handleSubmit}
          />
        )}

        {/* ── Pesquisa ── */}
        <div className="search-bar glass-card" style={{ padding: '0.8rem 1.8rem', display: 'flex', alignItems: 'center', gap: '20px', marginTop: '2rem' }}>
          <Search size={22} color="var(--secondary)" />
          <input
            style={{ background: 'none', border: 'none', color: 'white', width: '100%', outline: 'none', fontSize: '1.1rem' }}
            placeholder="Pesquisar por nome ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* ── Lista ── */}
        <div className="list-container mt-2">
          {filteredMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <UserSearch size={80} style={{ opacity: 0.15, marginBottom: '1.5rem' }} />
              <h3 style={{ opacity: 0.6, fontSize: '1.5rem' }}>Lista de Líderes e Membros Vazia</h3>
              <p style={{ opacity: 0.3, maxWidth: '450px', margin: '0.5rem auto 0' }}>
                Cadastre os anciãos, diretores e secretários para dar início à gestão da sua unidade.
              </p>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Identificação</th>
                    <th>Papéis</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <React.Fragment key={m.id}>
                      <tr>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                            <div className="avatar-mockup" style={{ width: '48px', height: '48px', fontSize: '1.1rem', background: 'linear-gradient(135deg, var(--secondary), #B08D26)', color: 'var(--primary)', fontWeight: 800 }}>
                              {m.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '1rem' }}>{m.name}</div>
                              <div style={{ fontSize: '0.8rem', opacity: 0.5, letterSpacing: '0.5px' }}>
                                {m.email || 'Sem e-mail vinculado'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {(m.roles?.length ? m.roles : [m.role]).map((r) => (
                              <span
                                key={r}
                                style={{
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '50px',
                                  border: '1px solid rgba(212,175,55,0.3)',
                                  background: 'rgba(212,175,55,0.08)',
                                  color: 'var(--secondary)',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                              className="icon-btn edit"
                              style={{ opacity: editingId === m.id ? 1 : 0.5 }}
                              aria-label={`Editar ${m.name}`}
                              onClick={() => (editingId === m.id ? cancelEdit() : startEdit(m))}
                            >
                              {editingId === m.id ? <X size={16} /> : <Edit2 size={16} />}
                            </button>
                            <button
                              className="icon-btn delete"
                              style={{ opacity: deletingId === m.id ? 0.3 : 0.5 }}
                              disabled={!!deletingId || editingId === m.id}
                              aria-label={`Remover ${m.name}`}
                              onClick={() => handleDelete(m)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Linha de edição inline */}
                      {editingId === m.id && (
                        <tr>
                          <td colSpan={3} style={{ padding: '0.5rem 0 1.5rem' }}>
                            <MemberForm
                              title={`Editando: ${m.name}`}
                              formData={editForm}
                              neededScopes={editScopes}
                              hierarchy={hierarchy}
                              saving={saving}
                              showPassword={false}
                              onField={fieldEdit}
                              onSubmit={handleUpdate}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

// ─── Hook auxiliar: campos de escopo únicos ───────────────────────────────────

function useNeededScopes(roles: Role[]) {
  return React.useMemo(() => {
    const seen = new Set<string>();
    return roles.reduce<{ field: keyof FormData; label: string; hierarchyKey: string }[]>((acc, role) => {
      const scope = ROLE_SCOPE[role];
      if (scope && !seen.has(scope.field)) {
        seen.add(scope.field);
        acc.push(scope);
      }
      return acc;
    }, []);
  }, [roles]);
}

// ─── Sub-componente: formulário reutilizável ──────────────────────────────────

interface MemberFormProps {
  title: string;
  formData: FormData;
  neededScopes: { field: keyof FormData; label: string; hierarchyKey: string }[];
  hierarchy: ReturnType<typeof useAppContext>['hierarchy'];
  saving: boolean;
  showPassword: boolean;
  onField: (key: keyof FormData, value: string | Role[]) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

function MemberForm({ title, formData, neededScopes, hierarchy, saving, showPassword, onField, onSubmit }: MemberFormProps) {
  return (
    <div className="premium-form-container animate-up">
      <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '1.5rem', letterSpacing: '1px' }}>
        {title.toUpperCase()}
      </p>
      <form onSubmit={onSubmit}>
        <div className="form-grid-premium">
          <div className="premium-input-group">
            <label>Nome Completo</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', opacity: 0.4 }} />
              <input
                style={{ paddingLeft: '3rem' }}
                value={formData.name}
                onChange={(e) => onField('name', e.target.value)}
                required
                placeholder="Ex: João da Silva"
              />
            </div>
          </div>
          <div className="premium-input-group">
            <label>WhatsApp / Celular</label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', opacity: 0.4 }} />
              <input
                style={{ paddingLeft: '3rem' }}
                value={formData.phone}
                onChange={(e) => onField('phone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="premium-input-group" style={{ gridColumn: '1 / -1' }}>
            <label>
              Papéis no Sistema{' '}
              <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>(pode ter mais de um)</span>
            </label>
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
                      if (next.length > 0) onField('roles', next);
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
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
          {showPassword && (
            <>
              <div className="premium-input-group">
                <label>E-mail de Login</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', opacity: 0.4 }} />
                  <input
                    style={{ paddingLeft: '3rem' }}
                    type="email"
                    value={formData.email}
                    onChange={(e) => onField('email', e.target.value)}
                    placeholder="login@igreja.com"
                  />
                </div>
              </div>
              <div className="premium-input-group">
                <label>
                  Senha Provisória{' '}
                  <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>(mín. 6 caracteres)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', opacity: 0.4 }} />
                  <input
                    style={{ paddingLeft: '3rem' }}
                    type="password"
                    value={formData.password}
                    onChange={(e) => onField('password', e.target.value)}
                    placeholder="Nunca é salva no banco"
                  />
                </div>
              </div>
            </>
          )}

          {/* Campos de escopo dinâmicos baseados nos papéis selecionados */}
          {neededScopes.map(({ field: scopeField, label, hierarchyKey }) => {
            const items = (hierarchy as Record<string, { id: string; name: string }[]>)[hierarchyKey] ?? [];
            return (
              <div key={scopeField} className="premium-input-group">
                <label>{label} de Atuação</label>
                <select
                  value={formData[scopeField] as string}
                  onChange={(e) => onField(scopeField, e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          className="btn-login"
          disabled={saving}
          style={{ width: 'auto', marginTop: '1.5rem', padding: '1.2rem 4rem', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? <Check size={22} /> : <Save size={22} />}
          <span style={{ marginLeft: '12px' }}>{saving ? 'Salvando...' : 'Finalizar'}</span>
        </button>
      </form>
    </div>
  );
}

export default Members;
