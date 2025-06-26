// client/src/components/Login.jsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabase'; // Importa a instância do Supabase

function Login() {
  const [email, setEmail] = useState(''); // Estado para o e-mail de login
  const [password, setPassword] = useState(''); // Estado para a senha de login
  const [loading, setLoading] = useState(false); // Estado para controlar o carregamento (botão)
  const [message, setMessage] = useState(''); // Para exibir mensagens de erro/sucesso (login)
  const [showResetPassword, setShowResetPassword] = useState(false); // NOVO: Controla a visibilidade da seção de redefinição de senha
  const [resetEmail, setResetEmail] = useState(''); // NOVO: Estado para o e-mail na redefinição de senha
  const [resetMessage, setResetMessage] = useState(''); // NOVO: Para exibir mensagens de erro/sucesso (redefinição)

  // Lida com o envio do formulário de login
  const handleLogin = async (e) => {
    e.preventDefault(); // Evita o recarregamento da página
    setLoading(true);
    setMessage(''); // Limpa mensagens anteriores

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error; // Lança o erro para ser capturado no bloco 'catch'
      }

      setMessage('Login realizado com sucesso! Redirecionando...');
      console.log('Login bem-sucedido!');

    } catch (error) {
      setMessage(`Erro no login: ${error.message}`);
      console.error('Erro no login:', error.message);
    } finally {
      setLoading(false); // Finaliza o carregamento
    }
  };

  // NOVO: Lida com a solicitação de redefinição de senha
  const handleResetPassword = async (e) => {
    e.preventDefault(); // Evita o recarregamento da página
    setLoading(true);
    setResetMessage(''); // Limpa mensagens anteriores

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + '/update-password', // URL para onde o usuário será redirecionado após clicar no link do e-mail
      });

      if (error) {
        throw error;
      }

      setResetMessage('Link de redefinição de senha enviado para seu e-mail (verifique sua caixa de entrada e spam)!');
      console.log('Link de redefinição enviado para:', resetEmail);
      setResetEmail(''); // Limpa o campo de e-mail após o envio
      //setShowResetPassword(false); // Opcional: esconder a seção após enviar
    } catch (error) {
      setResetMessage(`Erro ao enviar link de redefinição: ${error.message}`);
      console.error('Erro na redefinição de senha:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // NOVO: Função para exibir o formulário de redefinição de senha
  const handleShowResetPassword = (e) => {
    e.preventDefault(); // Evita o comportamento padrão do link
    setShowResetPassword(true);
    setMessage(''); // Limpa mensagem de login se houver
    setResetMessage(''); // Limpa mensagem de redefinição
    setResetEmail(email); // Pré-preenche o e-mail do login, se já digitado
  };

  return (
    <div style={styles.container}>
      {!showResetPassword ? ( // Mostra o formulário de login por padrão
        <>
          <h2>Login</h2>
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.formGroup}>
              <label htmlFor="email" style={styles.label}>Email:</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
                placeholder="seuemail@exemplo.com"
              />
            </div>
            <div style={styles.formGroup}>
              <label htmlFor="password" style={styles.label}>Senha:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
                placeholder="********"
              />
            </div>
            {message && <p style={styles.message}>{message}</p>}
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <p style={styles.forgotPassword}>
              <a href="#" onClick={handleShowResetPassword}>Esqueceu sua senha?</a> {/* Agora chama a função */}
            </p>
          </form>
        </>
      ) : ( // Mostra o formulário de redefinição de senha
        <>
          <h2>Redefinir Senha</h2>
          <form onSubmit={handleResetPassword} style={styles.form}>
            <div style={styles.formGroup}>
              <label htmlFor="resetEmail" style={styles.label}>Email:</label>
              <input
                type="email"
                id="resetEmail"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                style={styles.input}
                placeholder="seuemail@exemplo.com"
              />
            </div>
            {resetMessage && <p style={styles.message}>{resetMessage}</p>}
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Enviando...' : 'Redefinir Senha'}
            </button>
            <p style={styles.forgotPassword}>
              <a href="#" onClick={() => setShowResetPassword(false)}>Voltar ao Login</a> {/* Volta para o formulário de login */}
            </p>
          </form>
        </>
      )}
    </div>
  );
}

// Estilos básicos para o componente (você pode transferir para um CSS separado depois)
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
    backgroundColor: '#f4f4f4',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    maxWidth: '400px',
    margin: '50px auto',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  label: {
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '16px',
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '10px 15px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  buttonHover: {
    backgroundColor: '#0056b3',
  },
  message: {
    color: 'red',
    marginTop: '10px',
    textAlign: 'center',
  },
  forgotPassword: {
    marginTop: '10px',
    fontSize: '14px',
  }
};

export default Login;
