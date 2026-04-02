/**
 * Corrige o papel de um usuário diretamente no Firestore.
 *
 * Uso:
 *   node scripts/fixUserRole.mjs serviceAccountKey.json <email> <papel>
 *
 * Exemplo:
 *   node scripts/fixUserRole.mjs serviceAccountKey.json admin@meudominio.com Administrador
 *
 * Papéis válidos: Administrador | Pastor | Diretor | Secretário | Membro
 */

import { readFile } from 'node:fs/promises';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const [,, keyPath, email, role] = process.argv;

if (!keyPath || !email || !role) {
  console.error('Uso: node scripts/fixUserRole.mjs <serviceAccountKey.json> <email> <papel>');
  process.exit(1);
}

const sa = JSON.parse(await readFile(keyPath, 'utf8'));
initializeApp({ credential: cert(sa) });

const auth = getAuth();
const db   = getFirestore();

// 1. Busca o UID do usuário pelo e-mail no Firebase Auth
let uid;
try {
  const userRecord = await auth.getUserByEmail(email);
  uid = userRecord.uid;
  console.log(`✔ Usuário encontrado: uid=${uid}`);
} catch (e) {
  console.error(`✘ Nenhum usuário no Firebase Auth com e-mail "${email}".`);
  console.error('  Verifique o e-mail ou crie a conta primeiro no Firebase Console → Authentication.');
  process.exit(1);
}

// 2. Atualiza (ou cria) users/{uid} com o papel correto
await db.collection('users').doc(uid).set(
  { role, email, updatedAt: new Date().toISOString() },
  { merge: true }
);
console.log(`✔ users/${uid} → role="${role}"`);

// 3. Garante que existe um documento em members com este e-mail e papel
const snap = await db.collection('members').where('email', '==', email).get();
if (snap.empty) {
  // Cria registro mínimo para que o AppContext encontre o perfil
  await db.collection('members').add({
    name:      email.split('@')[0],
    email,
    role,
    createdAt: new Date().toISOString(),
  });
  console.log(`✔ Novo registro em members criado para "${email}".`);
} else {
  await snap.docs[0].ref.update({ role, updatedAt: new Date().toISOString() });
  console.log(`✔ members/${snap.docs[0].id} → role="${role}"`);
}

console.log('\nPronto! Faça logout e login novamente no app para aplicar o papel.');
