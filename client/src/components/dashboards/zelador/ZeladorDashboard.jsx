// client/src/components/dashboards/zelador/ZeladorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import './ZeladorDashboard.css';

function ZeladorDashboard() {
  const [moradores, setMoradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formMorador, setFormMorador] = useState({
    id: null,
    nome: '',
    apartamento: '',
    bloco: '',
    email: '',
    telefone: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchMoradores();
  }, []);

  async function fetchMoradores() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('moradores')
        .select('*')
        .order('apartamento', { ascending: true });

      if (error) {
        throw error;
      }
      setMoradores(data);
    } catch (error) {
      console.error('Erro ao buscar moradores:', error.message);
      alert('Erro ao carregar a lista de moradores: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitForm(event) {
    event.preventDefault();

    if (!formMorador.nome || !formMorador.apartamento || !formMorador.bloco) {
      alert('Nome, Apartamento e Bloco são obrigatórios.');
      return;
    }

    if (formMorador.email && !formMorador.telefone) {
      alert('Se um e-mail é fornecido para login, o telefone (que será a senha) também é obrigatório.');
      return;
    }

    if (formMorador.email) {
      try {
        const { data, error, status } = await supabase
          .from('moradores')
          .select('id')
          .eq('email', formMorador.email)
          .single();

        if (data && data.id !== formMorador.id) {
          alert('Erro: Este e-mail já está cadastrado para outro morador. Por favor, use um e-mail diferente.');
          console.error('E-mail duplicado detectado na tabela de moradores:', formMorador.email);
          return;
        }

        if (error && status !== 406) {
          throw error;
        }

      } catch (checkError) {
        console.error('Erro ao verificar e-mail duplicado na tabela de moradores:', checkError.message);
        alert('Ocorreu um erro ao verificar o e-mail. Tente novamente.');
        return;
      }
    }

    try {
      let response;
      if (isEditing) {
        response = await supabase
          .from('moradores')
          .update({
            nome: formMorador.nome,
            apartamento: formMorador.apartamento,
            bloco: formMorador.bloco,
            email: formMorador.email || null,
            telefone: formMorador.telefone || null,
          })
          .eq('id', formMorador.id)
          .select()
          .single();
      } else {
        response = await supabase
          .from('moradores')
          .insert([
            {
              nome: formMorador.nome,
              apartamento: formMorador.apartamento,
              bloco: formMorador.bloco,
              email: formMorador.email || null,
              telefone: formMorador.telefone || null,
            }
          ])
          .select()
          .single();
      }

      if (response.error) {
        throw response.error;
      }

      const moradorManipuladoId = response.data.id;

      if (!isEditing && formMorador.email && formMorador.telefone) {
        const { error: userAuthError } = await supabase.auth.signUp({
          email: formMorador.email,
          password: formMorador.telefone,
          options: {
            data: {
              morador_id_associado: moradorManipuladoId
            }
          }
        });

        if (userAuthError) {
          let alertMessage = `Morador ${formMorador.nome} ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso! Mas houve um erro ao criar a conta de login: ${userAuthError.message}.`;

          if (userAuthError.message.includes('User already registered')) {
            alertMessage = `Morador ${formMorador.nome} ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso! O e-mail "${formMorador.email}" já está registrado no sistema de login. O morador pode tentar usar a função "Esqueceu a senha?" para acessar.`;
          } else if (userAuthError.message.includes('AuthApiError: Email rate limit exceeded')) {
              alertMessage = `Morador ${formMorador.nome} ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso! Mas houve um erro temporário no envio de e-mails (limite de taxa excedido). Por favor, tente novamente mais tarde para criar a conta de login.`;
          }

          alert(alertMessage);
          console.error('Erro ao criar conta de usuário (signUp):', userAuthError);
        } else {
          alert(`Morador ${formMorador.nome} ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso! A conta de login foi criada. O morador poderá entrar com seu e-mail e o telefone como senha. (Pode ser necessária verificação de e-mail, verifique as configurações do Supabase Auth).`);
          console.log('Conta de usuário Auth criada para:', formMorador.email);
        }
      } else if (!isEditing) {
        alert(`Morador ${formMorador.nome} cadastrado com sucesso! Sem conta de login criada (e-mail ou telefone não fornecidos para login).`);
      } else if (isEditing) {
        alert(`Morador ${formMorador.nome} atualizado com sucesso!`);
      }

      setFormMorador({ nome: '', apartamento: '', bloco: '', email: '', telefone: '', id: null });
      setShowForm(false);
      setIsEditing(false);
      fetchMoradores();

    } catch (error) {
      console.error('Erro no processo de morador:', error.message);
      alert('Erro ao ' + (isEditing ? 'atualizar' : 'cadastrar') + ' morador: ' + error.message);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormMorador(prev => ({ ...prev, [name]: value }));
  };

  const handleEditClick = (morador) => {
    setFormMorador({ ...morador });
    setIsEditing(true);
    setShowForm(true);
  };

  // Lida com o clique no botão "Remover"
  async function handleDeleteClick(moradorId, moradorNome, moradorEmail) { // Adicionamos moradorEmail
    if (!window.confirm(`Tem certeza que deseja remover o morador ${moradorNome}? Esta ação é irreversível e removerá todos os registros vinculados a ele, INCLUINDO SUA CONTA DE LOGIN.`)) {
      return;
    }

    try {
      // 1. Opcional: Buscar o user_id associado ao e-mail do morador na tabela perfis
      // Precisamos do user_id (UID do Auth) para deletar o usuário do Auth.Users.
      let authUserIdToDelete = null;
      if (moradorEmail) {
          const { data: perfilData, error: perfilError } = await supabase
              .from('perfis')
              .select('id') // O 'id' na tabela 'perfis' é o user_id do Auth
              .eq('morador_id', moradorId) // Busca o perfil pelo morador_id
              .single();

          if (perfilError && perfilError.code !== 'PGRST116') { // 406 = No rows found (Não é um erro real)
              console.warn('Erro ao buscar perfil para deletar (pode não existir):', perfilError.message);
          } else if (perfilData) {
              authUserIdToDelete = perfilData.id;
          }
      }

      // 2. Remover registros de consumo de água vinculados a este morador
      const { error: deleteConsumoError } = await supabase
        .from('consumo_agua')
        .delete()
        .eq('morador_id', moradorId);

      if (deleteConsumoError) {
        console.error('Erro ao remover registros de consumo vinculados:', deleteConsumoError.message);
      }

      // 3. Remover o perfil da tabela 'perfis'
      // É importante remover o perfil ANTES de remover o morador, para evitar FK errors
      // e porque o perfil aponta para o morador_id.
      const { error: deletePerfilError } = await supabase
        .from('perfis')
        .delete()
        .eq('morador_id', moradorId); // Remove o perfil pelo morador_id

      if (deletePerfilError) {
        console.error('Erro ao remover perfil vinculado:', deletePerfilError.message);
      }


      // 4. Remover o morador da tabela 'moradores'
      const { error: deleteMoradorError } = await supabase
        .from('moradores')
        .delete()
        .eq('id', moradorId);

      if (deleteMoradorError) {
        throw deleteMoradorError;
      }

      // 5. Chamar a Edge Function para deletar o usuário do Supabase Auth.Users (se houver um user_id)
      if (authUserIdToDelete) {
          console.log(`Chamando Edge Function para deletar usuário Auth: ${authUserIdToDelete}`);
          const { data: edgeFunctionData, error: edgeFunctionError } = await supabase.functions.invoke('delete-user-auth', {
              body: { userId: authUserIdToDelete },
              method: 'POST',
          });

          if (edgeFunctionError) {
              console.error('Erro ao chamar Edge Function para deletar usuário Auth:', edgeFunctionError.message);
              alert(`Morador ${moradorNome} removido, mas houve um erro ao remover a conta de login. Por favor, remova manualmente a conta do usuário ${moradorEmail} no dashboard do Supabase.`);
          } else {
              console.log('Edge Function de deleção de usuário Auth executada:', edgeFunctionData);
              alert(`Morador ${moradorNome} e sua conta de login foram removidos com sucesso!`);
          }
      } else {
          alert(`Morador ${moradorNome} removido com sucesso! Nenhuma conta de login vinculada ou encontrada para remover.`);
      }

      fetchMoradores(); // Recarrega a lista de moradores

    } catch (error) {
      console.error('Erro fatal ao remover morador:', error.message);
      alert('Erro ao remover morador: ' + error.message);
    }
  }

  if (loading) {
    return (
      <div className="zelador-dashboard">
        <p>Carregando moradores...</p>
      </div>
    );
  }

  return (
    <div className="zelador-dashboard">
      <h1>Dashboard do Zelador</h1>

      {/* Seção de Cadastro/Edição de Moradores */}
      <section className="cadastro-morador-section">
        <h2>{isEditing ? 'Editar Morador' : 'Cadastro de Novo Morador'}</h2>
        <button onClick={() => {
            setShowForm(!showForm);
            setIsEditing(false);
            setFormMorador({ nome: '', apartamento: '', bloco: '', email: '', telefone: '', id: null });
        }}>
          {showForm ? 'Ocultar Formulário' : 'Adicionar Novo Morador'}
        </button>

        {showForm && (
          <form onSubmit={handleSubmitForm} className="morador-form">
            <input
              type="text"
              name="nome"
              placeholder="Nome Completo"
              value={formMorador.nome}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="apartamento"
              placeholder="Número do Apartamento"
              value={formMorador.apartamento}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="bloco"
              placeholder="Bloco"
              value={formMorador.bloco}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="E-mail (opcional, para login)"
              value={formMorador.email}
              onChange={handleChange}
            />
            <input
              type="tel"
              name="telefone"
              placeholder="Telefone (opcional, será a senha se e-mail for fornecido)"
              value={formMorador.telefone}
              onChange={handleChange}
            />
            <button type="submit">{isEditing ? 'Atualizar Morador' : 'Cadastrar Morador'}</button>
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setIsEditing(false);
                  setFormMorador({ nome: '', apartamento: '', bloco: '', email: '', telefone: '', id: null });
                }}
                className="cancel-button"
              >
                Cancelar Edição
              </button>
            )}
          </form>
        )}
      </section>

      {/* Seção de Listagem de Moradores */}
      <section className="listagem-moradores-section">
        <h2>Moradores Cadastrados</h2>
        {moradores.length === 0 ? (
          <p>Nenhum morador cadastrado ainda.</p>
        ) : (
          <table className="moradores-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Apartamento</th>
                <th>Bloco</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {moradores.map((morador) => (
                <tr key={morador.id}>
                  <td>{morador.nome}</td>
                  <td>{morador.apartamento}</td>
                  <td>{morador.bloco}</td>
                  <td>{morador.email}</td>
                  <td>{morador.telefone}</td>
                  <td>
                    <button onClick={() => handleEditClick(morador)} className="action-button edit-button">Editar</button>
                    {/* Passamos o email do morador também para a função de deletar */}
                    <button onClick={() => handleDeleteClick(morador.id, morador.nome, morador.email)} className="action-button delete-button">Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default ZeladorDashboard;
