import React, { useState, useEffect, Suspense } from 'react';
import './App.css';
import Dashboard from './components/Dashboard.tsx';
import RollCall from './components/RollCall.tsx';
import Metas from './components/Metas.tsx';
import Members from './components/Members.tsx';
import Login from './components/Login.tsx';
import Welcome from './components/Welcome.tsx';
import Quarters from './components/Quarters.tsx';
import Reports from './components/Reports.tsx';
import ScoreConfigs from './components/ScoreConfigs.tsx';
import { useAppContext } from './context/AppContext';
import { useToast } from './context/ToastContext';
import { auth } from './lib/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

const Hierarchy = React.lazy(() => import('./components/Hierarchy.tsx'));

// O evento BeforeInstallPromptEvent não consta nos tipos padrão do DOM
interface BeforeInstallPromptEvent extends Event {
  prompt(): void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

import {
  Compass,
  User as UserIcon,
  Users,
  Calendar,
  LayoutGrid,
  Star,
  Timer,
  Building2,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

function App() {
  const { user, setUser, profileLoading } = useAppContext();
  const { toast } = useToast();

  const [screen, setScreen] = useState<'welcome' | 'login' | 'dashboard'>('welcome');

  useEffect(() => {
    if (user) {
      setScreen('dashboard');
    } else if (screen !== 'login') {
      setScreen('welcome');
    }
  }, [user]);

  const [view, setView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const navigate = (v: string) => {
    setView(v);
    setSidebarOpen(false);
  };

  const installPWA = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') setDeferredPrompt(null);
    });
  };

  const handleLogin = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      toast('Preencha e-mail e senha corretamente.', 'warning');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
      setScreen('dashboard');
    } catch (error: unknown) {
      const e = error as { code?: string; message?: string };
      const msgs: Record<string, string> = {
        'auth/user-not-found':     'Usuário não encontrado. Verifique o e-mail.',
        'auth/wrong-password':     'Senha incorreta.',
        'auth/invalid-credential': 'Credenciais inválidas.',
        'auth/too-many-requests':  'Muitas tentativas. Aguarde alguns minutos.',
      };
      toast(msgs[e.code ?? ''] ?? `Falha no login: ${e.message ?? 'Erro desconhecido'}`, 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setScreen('welcome');
      setUser(null);
    } catch (error: unknown) {
      const e = error as { message?: string };
      toast(`Erro ao sair: ${e.message ?? 'Falha ao encerrar sessão'}`, 'error');
    }
  };

  const isAdmin = user?.role === 'Administrador';

  // Admin é master: enxerga tudo sem restrição.
  // Para os demais papéis, a função can() controla o acesso.
  const can = (...roles: string[]) => isAdmin || roles.includes(user?.role ?? '');

  if (profileLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary, #0a0a0f)', color: 'white', fontSize: '1.1rem' }}>
        Carregando perfil...
      </div>
    );
  }

  if (screen === 'welcome') {
    return <Welcome onStart={() => setScreen('login')} installPWA={installPWA} isInstallable={!!deferredPrompt} />;
  }

  if (screen === 'login') {
    return <Login onLogin={handleLogin} installPWA={installPWA} isInstallable={!!deferredPrompt} />;
  }

  return (
    <div className="app-container">
      {/* Mobile hamburger */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-glow">
            <Compass size={28} color="var(--secondary)" strokeWidth={2.5} style={{ position: 'relative' }} />
          </div>
          <div className="sidebar-logo-label">
            Unidade <span>Viva</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Principal */}
          <span className="sidebar-section-label">Principal</span>

          <div className={`sidebar-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => navigate('dashboard')}>
            <LayoutGrid size={18} />
            Painel
          </div>

          {/* Operacional */}
          {can('Secretário', 'Diretor', 'Pastor') && (
            <span className="sidebar-section-label">Operacional</span>
          )}

          {can('Secretário', 'Diretor', 'Pastor') && (
            <div className={`sidebar-item ${view === 'rollcall' ? 'active' : ''}`} onClick={() => navigate('rollcall')}>
              <Calendar size={18} />
              Chamada
            </div>
          )}

          {can('Secretário', 'Diretor', 'Pastor') && (
            <div className={`sidebar-item ${view === 'metas' ? 'active' : ''}`} onClick={() => navigate('metas')}>
              <Star size={18} />
              Metas
            </div>
          )}

          {can('Diretor', 'Pastor') && (
            <div className={`sidebar-item ${view === 'reports' ? 'active' : ''}`} onClick={() => navigate('reports')}>
              <BarChart2 size={18} />
              Relatórios
            </div>
          )}

          {can('Diretor', 'Pastor') && (
            <div className={`sidebar-item ${view === 'quarters' ? 'active' : ''}`} onClick={() => navigate('quarters')}>
              <Timer size={18} />
              Trimestres
            </div>
          )}

          {/* Administração */}
          {can() && <span className="sidebar-section-label">Administração</span>}

          {can() && (
            <div className={`sidebar-item ${view === 'members' ? 'active' : ''}`} onClick={() => navigate('members')}>
              <Users size={18} />
              Usuários
            </div>
          )}

          {can() && (
            <div className={`sidebar-item ${view === 'hierarchy' ? 'active' : ''}`} onClick={() => navigate('hierarchy')}>
              <Building2 size={18} />
              Unidades
            </div>
          )}

          {can() && (
            <div className={`sidebar-item ${view === 'score-weights' ? 'active' : ''}`} onClick={() => navigate('score-weights')}>
              <Settings size={18} />
              Pontuação
            </div>
          )}
        </nav>

        {/* Footer do sidebar — perfil + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Sair">
            <div className="sidebar-avatar">
              <UserIcon size={16} color="var(--secondary)" />
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name?.split(' ')[0] || 'Usuário'}</div>
              <div className="sidebar-user-role">{user?.role || 'Membro'}</div>
            </div>
            <LogOut size={15} color="rgba(255,255,255,0.3)" />
          </div>
        </div>
      </aside>

      {/* ── Conteúdo principal ── */}
      <div className="main-stage">
        <main className="main-stage-content">
          {view === 'dashboard' && user && (
            <div className="welcome-hero animate-up">
              <div className="badge-welcome">Boas-vindas</div>
              <h1>Seja bem-vindo, <span>{user.name || 'Líder'}!</span></h1>
              <p>Estamos felizes em tê-lo conosco hoje. Vamos avançar na nossa missão!</p>
            </div>
          )}

          <div className="content-area" key={view}>
            {view === 'dashboard'     && <Dashboard user={user} onNavigate={navigate} />}
            {view === 'rollcall'      && <RollCall user={user} onBack={() => navigate('dashboard')} />}
            {view === 'metas'         && <Metas user={user} onBack={() => navigate('dashboard')} />}
            {view === 'members'       && <Members user={user} />}
            {view === 'hierarchy'     && (
              <Suspense fallback={<div>Carregando...</div>}>
                <Hierarchy user={user} />
              </Suspense>
            )}
            {view === 'quarters'      && <Quarters user={user} />}
            {view === 'reports'       && <Reports user={user} />}
            {view === 'score-weights' && <ScoreConfigs />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
