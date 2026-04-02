import React from 'react';
import { Compass, LogOut } from 'lucide-react';
import { Role } from '../types';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface RoleSelectorProps {
  roles: Role[];
  onSelect: (role: Role) => void;
}

/** Ícone/cor por grupo de papel */
function roleStyle(role: Role): { color: string; bg: string } {
  if (['Aluno'].includes(role))
    return { color: 'rgba(180,180,255,0.9)', bg: 'rgba(100,100,255,0.08)' };
  if (['Professor ES', 'Secretário de Unidade'].includes(role))
    return { color: 'var(--secondary)', bg: 'rgba(212,175,55,0.1)' };
  if (['Ancião', 'Diretor ES', 'Secretário ES'].includes(role))
    return { color: 'rgba(80,200,140,0.9)', bg: 'rgba(80,200,140,0.08)' };
  if (['Pastor'].includes(role))
    return { color: 'rgba(100,180,255,0.9)', bg: 'rgba(100,180,255,0.08)' };
  if (['Coord. Associação', 'Coord. União', 'Coord. Divisão'].includes(role))
    return { color: 'rgba(255,160,80,0.9)', bg: 'rgba(255,160,80,0.08)' };
  // Administrador
  return { color: '#ff6b6b', bg: 'rgba(255,107,107,0.08)' };
}

const ROLE_DESCRIPTION: Record<Role, string> = {
  'Aluno':                 'Visualização da unidade',
  'Professor ES':          'Edição de chamada e metas da unidade',
  'Secretário de Unidade': 'Edição de chamada e metas da unidade',
  'Ancião':                'Visualização da igreja',
  'Diretor ES':            'Relatórios e visualização da igreja',
  'Secretário ES':         'Relatórios e visualização da igreja',
  'Pastor':                'Visualização do distrito',
  'Coord. Associação':     'Visualização da associação',
  'Coord. União':          'Visualização da união',
  'Coord. Divisão':        'Visualização da divisão',
  'Administrador':         'Acesso completo ao sistema',
};

function RoleSelector({ roles, onSelect }: RoleSelectorProps) {
  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #0a0a0f)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2.5rem' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '16px',
          background: 'rgba(212,175,55,0.1)',
          border: '1px solid rgba(212,175,55,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Compass size={28} color="var(--secondary)" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
            Unidade <span style={{ color: 'var(--secondary)' }}>Viva</span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.5rem' }}>
          Selecione sua sessão
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Você possui {roles.length} papéis. Com qual deseja acessar agora?
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: roles.length <= 2 ? `repeat(${roles.length}, 1fr)` : 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '1rem',
        width: '100%',
        maxWidth: '720px',
      }}>
        {roles.map((role) => {
          const { color, bg } = roleStyle(role);
          return (
            <button
              key={role}
              onClick={() => onSelect(role)}
              style={{
                background: bg,
                border: `1px solid ${color}33`,
                borderRadius: '20px',
                padding: '1.8rem 1.5rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.border = `1px solid ${color}88`;
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.border = `1px solid ${color}33`;
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              <div style={{ color, fontWeight: 900, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                {role}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                {ROLE_DESCRIPTION[role]}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleLogout}
        style={{
          marginTop: '2.5rem',
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '0.85rem',
          fontFamily: 'inherit',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; }}
      >
        <LogOut size={15} /> Sair
      </button>
    </div>
  );
}

export default RoleSelector;
