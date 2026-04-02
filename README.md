# Unidade Viva

App web de gestão de Unidades de Ação Jovem da Escola Sabatina Adventista.

## Stack

- **React 19** + **Vite** + **TypeScript**
- **Firebase** (Firestore + Authentication)
- **Recharts** para gráficos
- **Zod** para validação de formulários

## Requisitos

- Node.js 18+
- Conta Firebase com Firestore e Authentication habilitados

## Setup local

```bash
# 1. Instalar dependências
npm install

# 2. Criar arquivo de variáveis de ambiente
cp .env.example .env
# Preencha as variáveis VITE_FIREBASE_* com os dados do seu projeto Firebase

# 3. Rodar em desenvolvimento
npm run dev
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

> **Nunca commite** o arquivo `.env` — ele já está no `.gitignore`.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Gera build de produção em `dist/` |
| `npm run lint` | Executa ESLint |
| `npm test` | Executa testes com Jest |
| `npm run preview` | Serve o build localmente |

## Scripts admin (requerem service account)

```bash
# Popular Firestore com dados iniciais
GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/serviceAccount.json node scripts/seedFirestore.mjs

# Corrigir papel de um usuário
GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/serviceAccount.json node scripts/fixUserRole.mjs <email> <papel>
```

> A chave de serviço (`serviceAccountKey.json`) **nunca** deve ficar na pasta do projeto.

## Hierarquia de papéis

`Administrador` > `Pastor` > `Diretor` > `Secretário` > `Membro`

Cada papel tem acesso restrito às funcionalidades correspondentes no app e às coleções do Firestore via security rules.

## Deploy

```bash
# Build
npm run build

# Publicar regras do Firestore
firebase deploy --only firestore:rules

# Publicar app (Firebase Hosting)
firebase deploy --only hosting
```
