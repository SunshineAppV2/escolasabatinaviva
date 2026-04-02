import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  where,
  WhereFilterOp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface WhereClause {
  field: string;
  op: WhereFilterOp;
  value: unknown;
}

/**
 * Hook personalizado para operações Firestore.
 *
 * @param collectionName - Nome da coleção
 * @param filters        - Filtros opcionais (where clauses). Passando um array
 *                         vazio ou omitindo, retorna todos os documentos.
 *                         Exemplo: [{ field: 'unitId', op: '==', value: 't1' }]
 */
export const useFirestore = (collectionName: string, filters: WhereClause[] = []) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serializa os filtros para usar como chave de efeito
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    const constraints = filters.map((f) => where(f.field, f.op, f.value));
    const q = query(collection(db, collectionName), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, filtersKey]);

  const addItem = async (item: any): Promise<string | null> => {
    try {
      const docRef = await addDoc(collection(db, collectionName), item);
      return docRef.id;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  };

  const updateItem = async (id: string, item: any) => {
    try {
      await updateDoc(doc(db, collectionName, id), item);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return { data, loading, error, addItem, updateItem, deleteItem };
};
