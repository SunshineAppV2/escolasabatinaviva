import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import App from './App';

// ── Mocks do Firebase ────────────────────────────────────────────────────────
// jest.mock é hoisted pelo Babel — os jest.fn() devem ficar dentro da factory.

jest.mock('./lib/firebase', () => ({
  auth:           {},
  db:             {},
  firebaseConfig: {},
  analytics:      {},
  default:        {},
}));

jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query:      jest.fn(),
  where:      jest.fn(),
  getDocs:    jest.fn().mockResolvedValue({ empty: true, docs: [] }),
  onSnapshot: jest.fn((_q: unknown, cb: (snap: object) => void) => {
    cb({ forEach: jest.fn(), docs: [] });
    return jest.fn();
  }),
  addDoc:   jest.fn().mockResolvedValue({ id: 'mock-id' }),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc:       jest.fn(),
  setDoc:    jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword:   jest.fn(),
  signOut:                      jest.fn(),
  onAuthStateChanged:           jest.fn((_auth: unknown, cb: (u: null) => void) => {
    cb(null);
    return jest.fn();
  }),
  getAuth:                      jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
}));

// Acesso tipado aos mocks após o hoisting
// eslint-disable-next-line @typescript-eslint/no-require-imports
const firebaseAuth = jest.requireMock('firebase/auth') as {
  signInWithEmailAndPassword: jest.Mock;
  signOut: jest.Mock;
  onAuthStateChanged: jest.Mock;
};

// ── Wrapper ───────────────────────────────────────────────────────────────────

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppProvider>{children}</AppProvider>
    </ToastProvider>
  );
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('App — fluxo de autenticação', () => {
  beforeEach(() => {
    firebaseAuth.signInWithEmailAndPassword.mockClear();
    firebaseAuth.signOut.mockClear();
    firebaseAuth.onAuthStateChanged.mockClear();
    firebaseAuth.onAuthStateChanged.mockImplementation(
      (_auth: unknown, cb: (u: null) => void) => { cb(null); return jest.fn(); }
    );
  });

  it('exibe o formulário de login ao clicar em Começar', () => {
    render(<App />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole('button', { name: /Começar Agora/i }));

    expect(screen.getByPlaceholderText(/E-mail ou Usuário/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Senha/i)).toBeInTheDocument();
  });

  it('chama signInWithEmailAndPassword ao submeter o formulário', async () => {
    firebaseAuth.signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'user-123', email: 'user@example.com' },
    });

    render(<App />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole('button', { name: /Começar Agora/i }));
    fireEvent.change(screen.getByPlaceholderText(/E-mail ou Usuário/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Senha/i), {
      target: { value: 'senha123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Entrar Agora/i }));

    await waitFor(() => {
      expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        'user@example.com',
        'senha123'
      );
    });
  });

  it('não chama signIn se email ou senha estiverem vazios', () => {
    render(<App />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole('button', { name: /Começar Agora/i }));
    fireEvent.click(screen.getByRole('button', { name: /Entrar Agora/i }));

    expect(firebaseAuth.signInWithEmailAndPassword).not.toHaveBeenCalled();
  });
});
