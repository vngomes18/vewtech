// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase'; // Importa a instância do Supabase
import Login from './components/Login'; // Importa o componente de Login
import UpdatePassword from './components/UpdatePassword'; // Importa o componente de atualização de senha
import './App.css'; // Importa o CSS principal

// Importa os componentes reais dos dashboards
import ZeladorDashboard from './components/dashboards/zelador/ZeladorDashboard';
import AdministradorDashboard from './components/dashboards/administrador/AdministradorDashboard';
import MoradorDashboard from './components/dashboards/morador/MoradorDashboard';

function App() {
  const [session, setSession] = useState(null); // Estado para armazenar a sessão de autenticação do usuário
  const [loadingProfile, setLoadingProfile] = useState(true); // Indica se o perfil do usuário está sendo carregado
  const [userRole, setUserRole] = useState(null); // Estado para armazenar o papel do usuário (zelador, administrador, morador)
  const [currentPath, setCurrentPath] = useState(window.location.pathname); // Estado para a rota atual do navegador

  // useEffect para monitorar as mudanças na URL (histórico do navegador)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname); // Atualiza o estado com o caminho atual da URL
    };
    window.addEventListener('popstate', handlePopState); // Adiciona listener para o evento popstate
    return () => window.removeEventListener('popstate', handlePopState); // Limpa o listener ao desmontar
  }, []);

  // useEffect principal para monitorar o estado de autenticação do Supabase
  useEffect(() => {
    // Tenta obter a sessão no carregamento inicial da aplicação
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); // Define a sessão
      setLoadingProfile(false); // Indica que a tentativa inicial de carregar a sessão terminou
      if (session) {
        getProfile(session.user.id); // Se houver uma sessão, busca o perfil do usuário
      }
    });

    // Escuta por mudanças no estado de autenticação (login, logout, etc.) em tempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session); // Atualiza a sessão
      if (session) {
        getProfile(session.user.id); // Se a sessão mudar para logado, busca o perfil
      } else {
        // Se o usuário deslogar, limpa o papel e o estado de carregamento
        setUserRole(null);
        setLoadingProfile(false);
        // Redireciona para a tela de login ao deslogar, se não estiver na página de atualização de senha
        if (window.location.pathname !== '/update-password') {
          window.history.pushState({}, '', '/'); // Altera a URL para a raiz
          setCurrentPath('/'); // Atualiza o estado da rota
        }
      }
    });

    // Função de limpeza: cancela a assinatura ao desmontar o componente
    return () => subscription.unsubscribe();
  }, []); // O array vazio [] garante que este useEffect execute apenas uma vez na montagem do componente

  // Função assíncrona para buscar o perfil do usuário na tabela 'perfis' e criar/atualizar se necessário
  const getProfile = async (userId) => {
    try {
      setLoadingProfile(true); // Indica que o carregamento do perfil está em andamento

      // Tenta selecionar o 'papel' e 'morador_id' do perfil do usuário com base no seu ID de autenticação
      const { data, error, status } = await supabase
        .from('perfis')
        .select(`papel, morador_id`) // Seleciona o papel E o morador_id
        .eq('id', userId) // O ID do perfil na tabela 'perfis' deve ser igual ao ID do usuário autenticado
        .single(); // Esperamos apenas um único resultado (um perfil por usuário)

      if (error && status !== 406) { // O status 406 (No Content) pode ocorrer se o perfil não existe, o que é tratado no 'else'
        console.error('App.jsx: Erro ao buscar perfil inicial:', error.message, 'Status:', status); // LOG DE ERRO
        throw error;
      }

      if (data) {
        // Se o perfil for encontrado, define o papel do usuário
        setUserRole(data.papel);
        console.log('App.jsx: Papel do usuário encontrado:', data.papel, 'Morador ID:', data.morador_id); // LOG DE SUCESSO
      } else {
        // Se o perfil não for encontrado (ex: usuário recém-registrado via convite)
        console.warn('App.jsx: Perfil do usuário não encontrado na tabela perfis. Tentando criar/atualizar perfil padrão...'); // LOG DE ALERTA
        try {
          // Obtém o usuário logado para acessar seu e-mail
          const { data: { user }, error: getUserError } = await supabase.auth.getUser();
          if (getUserError) throw getUserError;

          let linkedMoradorId = null;
          // Tenta encontrar um morador na tabela 'moradores' pelo e-mail do usuário logado
          if (user?.email) {
            console.log('App.jsx: Tentando vincular morador para e-mail:', user.email); // LOG DE DEBUG
            const { data: moradorMatch, error: moradorMatchError, status: moradorMatchStatus } = await supabase
              .from('moradores')
              .select('id')
              .eq('email', user.email)
              .single();

            if (moradorMatchError && moradorMatchError.code !== 'PGRST116') { // PGRST116 = No rows found (não é um erro a ser lançado aqui)
              console.error('App.jsx: Erro na busca de morador por e-mail (possível RLS ou outro erro):', moradorMatchError.message, 'Status:', moradorMatchStatus); // LOG DE ERRO
              // Não lançamos erro aqui para tentar criar o perfil mesmo sem morador_id vinculado.
            }
            if (moradorMatch) {
              linkedMoradorId = moradorMatch.id; // Se o morador for encontrado, vincula seu ID
              console.log('App.jsx: Morador encontrado para vinculação:', linkedMoradorId); // LOG DE SUCESSO
            } else {
              console.warn('App.jsx: Nenhum morador encontrado na tabela "moradores" com o e-mail:', user.email); // LOG DE ALERTA
            }
          } else {
            console.warn('App.jsx: Usuário logado sem e-mail ou e-mail nulo. Não foi possível tentar vincular morador automaticamente.'); // LOG DE ALERTA
          }

          // Objeto do novo perfil (ou perfil a ser atualizado)
          const newProfile = {
            id: userId, // O ID do perfil é o UID do usuário autenticado (chave primária)
            papel: 'morador', // Papel padrão para novos usuários sem perfil existente
            morador_id: linkedMoradorId, // Vincula ao morador se encontrado pelo e-mail (pode ser null)
          };

          // Usa 'upsert' para inserir o perfil se não existir, ou atualizá-lo se já existir
          const { error: upsertProfileError } = await supabase
            .from('perfis')
            .upsert([newProfile], { onConflict: 'id' }); // 'id' é a chave primária onde o conflito pode ocorrer

          if (upsertProfileError) {
            console.error('App.jsx: Erro ao fazer upsert do perfil padrão:', upsertProfileError.message); // LOG DE ERRO
            throw upsertProfileError;
          }
          setUserRole('morador'); // Define o papel como morador após a criação/atualização bem-sucedida
          console.log('App.jsx: Perfil padrão "morador" criado/atualizado com sucesso para o usuário:', userId, 'Morador ID vinculado:', linkedMoradorId); // LOG DE SUCESSO

        } catch (insertProfileCatchError) {
          // Captura erros durante a tentativa de criação/atualização do perfil padrão
          console.error('App.jsx: Erro fatal na tentativa de criar/atualizar perfil padrão:', insertProfileCatchError.message); // LOG DE ERRO
          setUserRole('morador'); // Define um fallback para o papel para tentar prosseguir
          // Poderíamos considerar forçar o logout aqui se o perfil é essencial e falhou.
        }
      }
    } catch (error) {
      // Captura erros gerais no processo de busca/criação de perfil (primeiro 'try')
      console.error('App.jsx: Erro geral ao buscar ou criar perfil:', error.message); // LOG DE ERRO
      setUserRole(null); // Em caso de erro grave, limpa o papel
      supabase.auth.signOut(); // Força o logout para garantir a segurança e evitar estado inconsistente
    } finally {
      setLoadingProfile(false); // Finaliza o carregamento do perfil
    }
  };

  // Renderização condicional principal da aplicação

  // 1. Lógica de roteamento simples baseada em window.location.pathname
  // Se a URL é /update-password, renderiza o componente de atualização de senha
  if (currentPath === '/update-password') {
    return (
      <div className="App">
        <UpdatePassword />
      </div>
    );
  }

  // 2. Exibe uma tela de carregamento enquanto a sessão e o perfil estão sendo verificados/carregados
  if (loadingProfile) {
    return (
      <div className="App">
        <h1>Carregando...</h1>
        <p>Verificando sua sessão e perfil.</p>
      </div>
    );
  }

  // 3. Se não houver sessão (usuário não logado), exibe o componente de Login
  if (!session) {
    return (
      <div className="App">
        <Login />
      </div>
    );
  }

  // 4. Se o usuário está logado, mas por algum motivo o papel ainda não foi definido,
  // ou se houve um erro na busca do perfil que não resultou em logout, exibe uma mensagem de processamento.
  if (!userRole) {
    return (
      <div className="App">
        <h1>Processando seu acesso...</h1>
        <p>Por favor, aguarde.</p>
      </div>
    );
  }

  // 5. Se o usuário está logado E o papel foi definido, renderiza o dashboard correto com base no papel
  return (
    <div className="App">
      {/* Renderiza o dashboard específico para cada papel */}
      {userRole === 'zelador' && <ZeladorDashboard />}
      {userRole === 'administrador' && <AdministradorDashboard />}
      {userRole === 'morador' && <MoradorDashboard />}

      {/* Exibe informações do usuário logado e botão de sair */}
      <hr style={{marginTop: '50px'}} />
      <p>Logado como: {session.user.email} (Papel: {userRole})</p>
      <button onClick={async () => {
        await supabase.auth.signOut();
        window.history.pushState({}, '', '/'); // Redireciona para a raiz ao deslogar
        setCurrentPath('/'); // Atualiza o estado da rota
      }}>Sair</button>
    </div>
  );
}

export default App;
