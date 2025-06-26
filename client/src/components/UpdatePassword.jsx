// client/src/components/UpdatePassword.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Ajuste o caminho

function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false); // Para o botão de submit
  const [loadingSession, setLoadingSession] = useState(true); // NOVO: Para indicar que a sessão está sendo carregada
  const [message, setMessage] = useState(''); // Mensagens de sucesso
  const [error, setError] = useState(null); // Mensagens de erro
  const [passwordUpdated, setPasswordUpdated] = useState(false); // Indica se a senha foi atualizada
  const [session, setSession] = useState(null); // NOVO: Estado para armazenar a sessão aqui

  useEffect(() => {
    // Tenta obter a sessão ao carregar o componente UpdatePassword
    const getActiveSession = async () => {
      console.log('UpdatePassword.jsx: Tentando obter sessão...');
      // supabase.auth.getSession() irá pegar o token da URL e tentar estabelecer a sessão.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('UpdatePassword.jsx: Erro ao obter sessão:', sessionError.message);
        setError('Erro ao verificar sua sessão. Por favor, tente novamente.');
        setLoadingSession(false);
        return;
      }

      setSession(session);
      setLoadingSession(false);
      console.log('UpdatePassword.jsx: Sessão obtida:', session ? session.user.email : 'Nenhuma sessão.');

      // Se não houver sessão, ou se o evento não for de recuperação de senha, talvez redirecionar
      // Por agora, permitimos o formulário para que o usuário possa tentar atualizar.
      if (!session) {
          setError('Sessão de redefinição não detectada. Por favor, use o link completo do e-mail.');
      }
    };

    getActiveSession();

    // Listener para mudanças no estado de autenticação (garante que estamos atualizados)
    // Isso é útil se a sessão for estabelecida após a carga inicial ou mudar.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sessionData) => {
        setSession(sessionData); // Mantém a sessão atualizada
        console.log('UpdatePassword.jsx: onAuthStateChange evento:', _event, 'Sessão:', sessionData ? sessionData.user.email : 'Nenhuma.');
        // Se a sessão for definida por um evento como SIGNED_IN após a recuperação, o formulário será habilitado.
        if (_event === 'SIGNED_IN' && sessionData) {
            setError(null); // Limpa o erro se uma sessão é estabelecida
        }
    });

    // Limpeza da assinatura ao desmontar o componente
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []); // Executa apenas uma vez ao montar o componente

  // Lida com o envio do formulário de atualização de senha
  const handleUpdatePassword = async (e) => {
    e.preventDefault(); // Previne o recarregamento da página
    setLoading(true); // Ativa o estado de carregamento do botão
    setMessage(''); // Limpa mensagens de sucesso anteriores
    setError(null); // Limpa mensagens de erro anteriores

    // Validação de senhas
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (password.length < 6) { // Supabase Auth exige no mínimo 6 caracteres para senhas
        setError('A senha deve ter no mínimo 6 caracteres.');
        setLoading(false);
        return;
    }

    // NOVO: Verificar se há uma sessão ativa antes de tentar atualizar
    // Isso é crucial para que `updateUser` funcione.
    if (!session || !session.user) {
        setError('Sessão de autenticação ausente ou não carregada. Por favor, tente novamente ou solicite outra redefinição de senha.');
        setLoading(false);
        console.error('UpdatePassword.jsx: Tentativa de atualização de senha sem sessão ativa.');
        return;
    }

    try {
      // Atualiza a senha do usuário atualmente autenticado
      // Esta operação só funciona se o usuário estiver em uma sessão ativa (mesmo que temporária de redefinição).
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error; // Lança o erro para ser capturado no bloco 'catch'
      }

      setMessage('Senha atualizada com sucesso! Você pode fazer login agora.');
      setPasswordUpdated(true); // Define que a senha foi atualizada
      setPassword(''); // Limpa os campos de senha
      setConfirmPassword('');
      console.log('UpdatePassword.jsx: Senha atualizada:', data);

    } catch (err) {
      console.error('UpdatePassword.jsx: Erro ao atualizar senha:', err.message); // Log de erro detalhado
      setError('Erro ao atualizar senha: ' + err.message);
    } finally {
      setLoading(false); // Desativa o estado de carregamento
    }
  };

  // Estilos (podem ser movidos para um arquivo CSS separado para melhor organização)
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
    message: { // Estilo para mensagens de erro ou informações
      color: 'red',
      marginTop: '10px',
      textAlign: 'center',
    },
    // Estilo para links (esqueceu senha, voltar ao login)
    forgotPassword: {
      marginTop: '10px',
      fontSize: '14px',
    }
  };

  // NOVO: Renderiza um carregador se a sessão ainda está sendo verificada
  if (loadingSession) {
    return (
      <div style={styles.container}>
        <h2>Carregando...</h2>
        <p>Verificando sua sessão de redefinição de senha.</p>
      </div>
    );
  }

  // Renderização principal do componente
  return (
    <div style={styles.container}>
      <h2>Atualizar Senha</h2>
      {passwordUpdated ? ( // Se a senha foi atualizada com sucesso
        <div>
          <p style={{ color: 'green', fontWeight: 'bold' }}>Sua senha foi atualizada com sucesso!</p>
          <p>Você já está logado. Clique no botão abaixo para ir para a tela de login.</p>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
            style={styles.button}
          >
            Voltar para o Login
          </button>
        </div>
      ) : ( // Se a senha ainda não foi atualizada, exibe o formulário
        <form onSubmit={handleUpdatePassword} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="password" style={styles.label}>Nova Senha:</label>
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
          <div style={styles.formGroup}>
            <label htmlFor="confirmPassword" style={styles.label}>Confirmar Nova Senha:</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="********"
            />
          </div>
          {message && <p style={{ color: 'green', textAlign: 'center' }}>{message}</p>}
          {error && <p style={styles.message}>{error}</p>} {/* Exibe mensagens de erro */}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Atualizando...' : 'Atualizar Senha'}
          </button>
        </form>
      )}
    </div>
  );
}

export default UpdatePassword;
