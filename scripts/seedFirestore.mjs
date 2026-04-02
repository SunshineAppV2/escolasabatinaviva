import { readFile } from 'node:fs/promises';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountPath = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('Use: node scripts/seedFirestore.mjs <serviceAccountKey.json>');
  console.error('Or set GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json');
  process.exit(1);
}

const serviceAccountJson = await readFile(serviceAccountPath, 'utf8');
const serviceAccount = JSON.parse(serviceAccountJson);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const writes = [];

writes.push(db.collection('scoreWeights').doc('default').set({
  presence: 10,
  lesson: 10,
  pg: 10,
  bibleStudy: 20,
  mission: 15,
  visit: 5,
  updatedAt: new Date().toISOString(),
}));

writes.push(db.collection('quarters').doc('q1').set({
  name: '1º Trimestre 2024',
  start: '2024-01-01',
  end: '2024-03-31',
  status: 'finished',
  createdAt: new Date().toISOString(),
}));
writes.push(db.collection('quarters').doc('q2').set({
  name: '2º Trimestre 2024',
  start: '2024-04-01',
  end: '2024-06-30',
  status: 'active',
  createdAt: new Date().toISOString(),
}));

writes.push(db.collection('hierarchy').doc('default').set({
  uniao: [{ id: 'u1', name: 'União Sul' }],
  associacao: [{ id: 'a1', name: 'Associação Central', parentId: 'u1' }],
  distritos: [{ id: 'd1', name: 'Distrito Leste', parentId: 'a1' }],
  igrejas: [{ id: 'c1', name: 'Igreja Esperança', parentId: 'd1' }],
  unidades: [{ id: 't1', name: 'Unidade Viva', parentId: 'c1' }],
  updatedAt: new Date().toISOString(),
}));

writes.push(db.collection('members').doc('member1').set({
  name: 'Admin Geral',
  email: 'admin@escolaviva.com',
  role: 'Administrador',
  unitId: 't1',
  churchId: 'c1',
  distId: 'd1',
  phone: '+55 11 99999-9999',
  createdAt: new Date().toISOString(),
}));

writes.push(db.collection('members').doc('member2').set({
  name: 'Maria Silva',
  email: 'maria@unidadeviva.com',
  role: 'Secretário',
  unitId: 't1',
  churchId: 'c1',
  distId: 'd1',
  phone: '+55 11 98888-8888',
  createdAt: new Date().toISOString(),
}));

// rollCalls usa o esquema normalizado: um doc por (unitId + day),
// com um array "records" contendo presença individual por membro.
writes.push(db.collection('rollCalls').doc('rollcall-unit-t1-day-1').set({
  unitId: 't1',
  day: 1,
  date: '2024-04-06',
  records: [
    {
      id: 'member1',
      unitId: 't1',
      present: true,
      lesson: true,
      pg: false,
      mission: true,
      bibleStudy: 1,
      visits: 0,
    },
    {
      id: 'member2',
      unitId: 't1',
      present: true,
      lesson: true,
      pg: true,
      mission: false,
      bibleStudy: 0,
      visits: 1,
    },
  ],
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
}));

console.log('Seeding Firestore...');

await Promise.all(writes);

console.log('Firestore seed complete.');
