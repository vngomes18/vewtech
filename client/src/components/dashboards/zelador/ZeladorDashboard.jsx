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
    rua: '', // Alterado de 'apartamento' para 'rua'
    lote: '', // Alterado de 'bloco' para 'lote'
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
        // Alterado de 'apartamento' para 'rua' e 'bloco' para 'lote' na ordenação
        .order('rua', { ascending: true })
        .order('lote', { ascending: true });

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

    // Validação básica com os novos nomes
    if (!formMorador.nome || !formMorador.rua || !formMorador.lote) {
      alert('Nome, Rua e Lote são obrigatórios.'); // Mensagem atualizada
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
            rua: formMorador.rua, // Alterado aqui
            lote: formMorador.lote, // Alterado aqui
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
              rua: formMorador.rua, // Alterado aqui
              lote: formMorador.lote, // Alterado aqui
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
          alert(`Morador ${formMorador.nome} ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso! A conta de login foi criada. O morador poderá entrar com seu e-mail e o telefone como senha. (Pode ser necessária verificação de e-mail).`);
          console.log('Conta de usuário Auth criada para:', formMorador.email);
        }
      } else if (!isEditing) {
        alert(`Morador ${formMorador.nome} cadastrado com sucesso! Sem conta de login criada (e-mail ou telefone não fornecidos).`);
      } else if (isEditing) {
        alert(`Morador ${formMorador.nome} atualizado com sucesso!`);
      }

      setFormMorador({ nome: '', rua: '', lote: '', email: '', telefone: '', id: null }); // Alterado aqui
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

  // Função handleDeleteClick foi removida para o AdministradorDashboard.jsx

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
            setFormMorador({ nome: '', rua: '', lote: '', email: '', telefone: '', id: null }); // Alterado aqui
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
              name="rua" // Alterado aqui
              placeholder="Número da Rua" // Alterado aqui
              value={formMorador.rua}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="lote" // Alterado aqui
              placeholder="Número do Lote" // Alterado aqui
              value={formMorador.lote}
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
                  setFormMorador({ nome: '', rua: '', lote: '', email: '', telefone: '', id: null }); // Alterado aqui
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
                <th>Rua</th> {/* Alterado aqui */}
                <th>Lote</th> {/* Alterado aqui */}
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {moradores.map((morador) => (
                <tr key={morador.id}>
                  <td>{morador.nome}</td>
                  <td>{morador.rua}</td> {/* Alterado aqui */}
                  <td>{morador.lote}</td> {/* Alterado aqui */}
                  <td>{morador.email}</td>
                  <td>{morador.telefone}</td>
                  <td>
                    <button onClick={() => handleEditClick(morador)} className="action-button edit-button">Editar</button>
                    {/* Botão "Remover" removido daqui */}
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
