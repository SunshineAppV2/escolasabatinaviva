import React, { useState } from 'react';
import { Mail, Lock, LogIn, Eye, EyeOff, ArrowLeft } from 'lucide-react';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="login-screen">
      <div className="login-box animate-up">
        <div className="login-logo-img">
           <img src="/logo_viva.png" alt="Unidade Viva Logo" />
        </div>

        <div className="welcome-headline">
           <h1>Acessar <span>Sistema</span></h1>
           <p>Escola Sabatina Digital</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <Mail size={20} color="var(--secondary)" />
            <input 
              type="text" 
              placeholder="E-mail ou Usuário" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <Lock size={20} color="var(--secondary)" />
            <input 
              type={showPass ? "text" : "password"} 
              placeholder="Senha" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div onClick={() => setShowPass(!showPass)} style={{cursor: 'pointer'}}>
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </div>
          </div>

          <button className="btn-login" type="submit">
            Entrar Agora <LogIn size={20} />
          </button>
        </form>

        <div className="welcome-footer" style={{ cursor: 'pointer', marginTop: '1.5rem' }}>
          Esqueceu sua senha? Entre em contato com a secretaria.
        </div>
      </div>
    </div>
  );
}

export default Login;
