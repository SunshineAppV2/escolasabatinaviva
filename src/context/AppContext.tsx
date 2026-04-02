import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Hierarchy } from '../types';
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

/**
 * Busca o perfil do membro com estratégia de fallback em duas etapas:
 *
 * 1. Tenta ler users/{uid} (já existente de login anterior).
 *    Se tiver role válido, usa sem depender das regras de members.
 *
 * 2. Se não encontrar, tenta query em members por email.
 *    Pode falhar se as regras do Firestore ainda não foram publicadas —
 *    nesse caso retorna o que tiver de users/{uid} ou {}.
 */
async function fetchMemberProfile(uid: string, email: string): Promise<Partial<User>> {
  // ── Passo 1: lê users/{uid} (próprio doc — sempre permitido pelas regras) ──
  let cachedRole: string | undefined;
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const d = userSnap.data();
      if (d.role && d.role !== 'Membro') {
        // Perfil já sincronizado em login anterior — retorna direto
        return {
          name:     d.name,
          role:     d.role,
          unitId:   d.unitId   ?? undefined,
          churchId: d.churchId ?? undefined,
          distId:   d.distId   ?? undefined,
        };
      }
      cachedRole = d.role;
    }
  } catch (err) { logger.warn('users/{uid} não encontrado no primeiro login', err); }

  // ── Passo 2: busca em members por email ──────────────────────────────────
  try {
    const q = query(collection(db, 'members'), where('email', '==', email));
    const snapshot = await getDocs(q);

    const profile: Partial<User> = snapshot.empty
      ? {}
      : (() => {
          const d = snapshot.docs[0].data();
          return {
            name:     d.name,
            role:     d.role,
            unitId:   d.unitId,
            churchId: d.churchId,
            distId:   d.distId,
            phone:    d.phone,
          };
        })();

    // Persiste em users/{uid} para agilizar próximos logins
    await setDoc(
      doc(db, 'users', uid),
      {
        role:      profile.role     ?? cachedRole ?? 'Membro',
        unitId:    profile.unitId   ?? null,
        churchId:  profile.churchId ?? null,
        distId:    profile.distId   ?? null,
        email,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return profile;
  } catch (err) {
    // Regras ainda não publicadas no Firebase Console —
    // devolve o que havia em users/{uid} (pode ser 'Membro') ou vazio.
    logger.warn('Falha ao buscar perfil em members — usando fallback de users/{uid}', err);
    return cachedRole ? { role: cachedRole as User['role'] } : {};
  }
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [hierarchy, setHierarchy] = useState<Hierarchy>({
    uniao: [],
    associacao: [],
    distritos: [],
    igrejas: [],
    unidades: [],
  });

  const { data: firestoreHierarchy, loading: firestoreHierarchyLoading } = useFirestore('hierarchy');

  useEffect(() => {
    if (!firestoreHierarchyLoading && firestoreHierarchy.length > 0) {
      const [docData] = firestoreHierarchy;
      setHierarchy({
        uniao: docData.uniao || [],
        associacao: docData.associacao || [],
        distritos: docData.distritos || [],
        igrejas: docData.igrejas || [],
        unidades: docData.unidades || [],
      });
    }
  }, [firestoreHierarchy, firestoreHierarchyLoading]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setProfileLoading(true);
        const profile = await fetchMemberProfile(firebaseUser.uid, firebaseUser.email ?? '');
        setUser({
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          name: profile.name ?? firebaseUser.displayName ?? (firebaseUser.email?.split('@')[0] ?? 'Usuário'),
          displayName: profile.name ?? firebaseUser.displayName ?? undefined,
          email: firebaseUser.email ?? '',
          role: profile.role ?? 'Membro',
          unitId: profile.unitId,
          churchId: profile.churchId,
          distId: profile.distId,
          phone: profile.phone,
        });
        setProfileLoading(false);
      } else {
        setUser(null);
        setProfileLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AppContext.Provider value={{ user, setUser, hierarchy, setHierarchy, profileLoading }}>
      {children}
    </AppContext.Provider>
  );
};
