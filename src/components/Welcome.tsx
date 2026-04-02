import React from 'react';
import { Shield, Users, Compass, ArrowRight, Download } from 'lucide-react';

function Welcome({ onStart, installPWA, isInstallable }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-box animate-up">
        <div className="welcome-logo-img">
           <img src="/logo_viva.png" alt="Logo Unidade Viva" />
        </div>

        <div className="welcome-headline">
           <h1>UNIDADE <span>VIVA</span></h1>
           <p>A Revolução Digital da Escola Sabatina</p>
        </div>

        <div className="welcome-features">
          <div className="feature-item">
            <div className="icon-box">
              <Shield size={24} />
            </div>
            <div className="text-box">
              <strong>Gestão Segura</strong>
              <p>Dados protegidos da União até a Unidade local.</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="icon-box">
              <Users size={24} />
            </div>
            <div className="text-box">
              <strong>Cuidado de Membros</strong>
              <p>Acompanhe presença, visitas e aniversários em tempo real.</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="icon-box">
              <Compass size={24} />
            </div>
            <div className="text-box">
              <strong>Missão Integrada</strong>
              <p>Foco total em Pequenos Grupos e Batismos.</p>
            </div>
          </div>
        </div>

        <button className="btn-start" onClick={onStart}>
          Começar Agora <ArrowRight size={20} />
        </button>

        {isInstallable && (
          <button className="btn-install-pwa" onClick={installPWA} style={{
            marginTop: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--secondary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            width: '100%'
          }}>
            <Download size={16} /> Instalar Aplicativo
          </button>
        )}

        <div className="welcome-footer">
          © 2024 Unidade Viva - Tecnologia Adventista
        </div>
      </div>
    </div>
  );
}

export default Welcome;
