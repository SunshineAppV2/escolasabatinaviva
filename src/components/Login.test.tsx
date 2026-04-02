import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from './Login';

describe('Login component', () => {
  it('renders inputs and submits credentials', () => {
    const handleLogin = jest.fn();
    render(<Login onLogin={handleLogin} />);

    const emailInput = screen.getByPlaceholderText(/E-mail ou Usuário/i);
    const passwordInput = screen.getByPlaceholderText(/Senha/i);
    const submitButton = screen.getByRole('button', { name: /Entrar Agora/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'test-password' } });
    fireEvent.click(submitButton);

    expect(handleLogin).toHaveBeenCalledWith('test@example.com', 'test-password');
  });
});
