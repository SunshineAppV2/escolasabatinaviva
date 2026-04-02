import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Hierarchy, Role } from '../types';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { useFirestore } from '../hooks/useFirestore';
import { logger } from '../lib/logger';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  hierarchy: Hierarchy;
  setHierarchy: (hierarchy: Hierarchy) => void;
  profileLoading: boolean;
  /** Não-nulo quando o usuário autenticado possui mais de um papel e precisa escolher a sessão. */
  pendingRoles: Role[] | null;
  /** Chamado pelo RoleSelector para ativar a sessão com o papel escolhido. */
  selectRole: (role: Role) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

/** Perfil completo retornado pelo Firestore */
interface MemberProfile extends Partial<User> {
  roles?: Role[];
}

/**
 * Busca o perfil do membro com estratégia de fallback em duas etapas:
 *
 * 1. Tenta ler users/{uid} (sempre permitido pelas regras).
 *    Se tiver role válido e roles[], usa direto.
 *
 * 2. Se não encontrar, query em members por email.
 *    Persiste resultado em users/{uid} para agilizar próximos logins.
 */
async function fetchMemberProfile(uid: string, email: string): Promise<MemberProfile> {
  // ── Passo 1: lê users/{uid} ──────────────────────────────────────────────
  let cached: MemberProfile = {};
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const d = userSnap.data();
      if (d.role && d.role !== 'Membro') {
        cached = {
          name:      d.name,
          role:      d.role as Role,
          roles:     Array.isArray(d.roles) ? d.roles as Role[] : [d.role as Role],
          unitId:    d.unitId    ?? undefined,
          churchId:  d.churchId  ?? undefined,
          distId:    d.distId    ?? undefined,
          assocId:   d.assocId   ?? undefined,
          unionId:   d.unionId   ?? undefined,
          divisaoId: d.divisaoId ?? undefined,
          phone:     d.phone     ?? undefined,
        };
        // Se já tem roles[] preenchido, retorna direto
        if (Array.isArray(d.roles) && d.roles.length > 0) return cached;
      }
    }
  } catch (err) { logger.warn('users/{uid} não encontrado no primeiro login', err); }

  // ── Passo 2: busca em members por email ──────────────────────────────────
  try {
    const q = query(collection(db, 'members'), where('email', '==', email));
    const snapshot = await getDocs(q);

    const profile: MemberProfile = snapshot.empty
      ? cached
      : (() => {
          const d = snapshot.docs[0].data();
          return {
            name:      d.name,
            role:      d.role      as Role,
            roles:     Array.isArray(d.roles) ? d.roles as Role[] : [d.role as Role],
            unitId:    d.unitId    ?? undefined,
            churchId:  d.churchId  ?? undefined,
            distId:    d.distId    ?? undefined,
            assocId:   d.assocId   ?? undefined,
            unionId:   d.unionId   ?? undefined,
            divisaoId: d.divisaoId ?? undefined,
            phone:     d.phone     ?? undefined,
          };
        })();

    // Persiste em users/{uid} para agilizar próximos logins
    await setDoc(
      doc(db, 'users', uid),
      {
        role:      profile.role      ?? cached.role ?? 'Membro',
        roles:     profile.roles     ?? cached.roles ?? [],
        unitId:    profile.unitId    ?? null,
        churchId:  profile.churchId  ?? null,
        distId:    profile.distId    ?? null,
        assocId:   profile.assocId   ?? null,
        unionId:   profile.unionId   ?? null,
        divisaoId: profile.divisaoId ?? null,
        email,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return profile;
  } catch (err) {
    logger.warn('Falha ao buscar perfil em members — usando fallback de users/{uid}', err);
    return cached;
  }
}

/** Monta o objeto User a partir do perfil + role ativo + dados do Firebase Auth */
function buildUser(
  firebaseUid: string,
  firebaseEmail: string,
  firebaseDisplayName: string | null,
  profile: MemberProfile,
  activeRole: Role,
): User {
  return {
    id:          firebaseUid,
    uid:         firebaseUid,
    name:        profile.name ?? firebaseDisplayName ?? (firebaseEmail.split('@')[0] ?? 'Usuário'),
    displayName: profile.name ?? firebaseDisplayName ?? undefined,
    email:       firebaseEmail,
    role:        activeRole,
    roles:       profile.roles ?? [activeRole],
    unitId:      profile.unitId,
    churchId:    profile.churchId,
    distId:      profile.distId,
    assocId:     profile.assocId,
    unionId:     profile.unionId,
    divisaoId:   profile.divisaoId,
    phone:       profile.phone,
  };
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Estado temporário enquanto o usuário escolhe a sessão
  const [pendingRoles, setPendingRoles]     = useState<Role[] | null>(null);
  const [pendingProfile, setPendingProfile] = useState<{
    profile: MemberProfile;
    uid: string;
    email: string;
    displayName: string | null;
  } | null>(null);

  const [hierarchy, setHierarchy] = useState<Hierarchy>({
    divisao:    [],
    uniao:      [],
    associacao: [],
    distritos:  [],
    igrejas:    [],
    unidades:   [],
  });

  const { data: firestoreHierarchy, loading: firestoreHierarchyLoading } = useFirestore('hierarchy');

  useEffect(() => {
    if (!firestoreHierarchyLoading && firestoreHierarchy.length > 0) {
      const [docData] = firestoreHierarchy;
      setHierarchy({
        divisao:    Array.isArray((docData as any).divisao)    ? (docData as any).divisao    : [],
        uniao:      Array.isArray((docData as any).uniao)      ? (docData as any).uniao      : [],
        associacao: Array.isArray((docData as any).associacao) ? (docData as any).associacao : [],
        distritos:  Array.isArray((docData as any).distritos)  ? (docData as any).distritos  : [],
        igrejas:    Array.isArray((docData as any).igrejas)    ? (docData as any).igrejas    : [],
        unidades:   Array.isArray((docData as any).unidades)   ? (docData as any).unidades   : [],
      });
    }
  }, [firestoreHierarchy, firestoreHierarchyLoading]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setProfileLoading(true);
        const profile = await fetchMemberProfile(firebaseUser.uid, firebaseUser.email ?? '');
        const roles = profile.roles ?? (profile.role ? [profile.role] : []);

        if (roles.length > 1) {
          // Múltiplos papéis: guarda o perfil e pede para o usuário escolher a sessão
          setPendingProfile({
            profile,
            uid:         firebaseUser.uid,
            email:       firebaseUser.email ?? '',
            displayName: firebaseUser.displayName,
          });
          setPendingRoles(roles);
          setProfileLoading(false);
        } else {
          // Papel único: loga direto
          const activeRole = roles[0] ?? ('Membro' as Role);
          setUser(buildUser(firebaseUser.uid, firebaseUser.email ?? '', firebaseUser.displayName, profile, activeRole));
          setPendingRoles(null);
          setPendingProfile(null);
          setProfileLoading(false);
        }
      } else {
        setUser(null);
        setPendingRoles(null);
        setPendingProfile(null);
        setProfileLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  /** Ativa a sessão com o papel escolhido pelo usuário */
  const selectRole = useCallback((role: Role) => {
    if (!pendingProfile) return;
    const { profile, uid, email, displayName } = pendingProfile;
    setUser(buildUser(uid, email, displayName, profile, role));
    setPendingRoles(null);
    setPendingProfile(null);
    // Persiste o activeRole escolhido para próximos logins
    setDoc(doc(db, 'users', uid), { role, updatedAt: new Date().toISOString() }, { merge: true })
      .catch((err) => logger.warn('Falha ao persistir activeRole', err));
  }, [pendingProfile]);

  return (
    <AppContext.Provider value={{ user, setUser, hierarchy, setHierarchy, profileLoading, pendingRoles, selectRole }}>
      {children}
    </AppContext.Provider>
  );
};
