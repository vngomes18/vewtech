// client/src/components/dashboards/administrador/AdministradorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase'; // Ajuste o caminho
import './AdministradorDashboard.css'; // O CSS já foi fornecido

function AdministradorDashboard() {
  const [moradoresComConsumo, setMoradoresComConsumo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1); // Mês atual
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear()); // Ano atual

  useEffect(() => {
    fetchMoradoresComConsumo(filtroMes, filtroAno);
  }, [filtroMes, filtroAno]); // Refaz a busca se o mês/ano mudar

  async function fetchMoradoresComConsumo(mes, ano) {
    try {
      setLoading(true);

      const { data: moradoresData, error: moradoresError } = await supabase
        .from('moradores')
        .select('*')
        // Alterado de 'apartamento' para 'rua' e 'bloco' para 'lote' na ordenação
        .order('rua', { ascending: true })
        .order('lote', { ascending: true });

      if (moradoresError) throw moradoresError;

      const { data: consumoData, error: consumoError } = await supabase
        .from('consumo_agua')
        .select('*')
        .eq('mes_referencia', mes)
        .eq('ano_referencia', ano);

      if (consumoError) throw consumoError;

      const moradoresComDados = moradoresData.map(morador => {
        const consumo = consumoData.find(c => c.morador_id === morador.id);
        return {
          ...morador,
          consumo_m3_mes: consumo ? consumo.consumo_m3 : 'N/A',
          leitura_atual_mes: consumo ? consumo.leitura_atual : 'N/A',
          leitura_anterior_mes: consumo ? consumo.leitura_anterior : 'N/A',
        };
      });

      setMoradoresComConsumo(moradoresComDados);

    } catch (error) {
      console.error('Erro ao buscar dados de consumo para admin:', error.message);
      alert('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleExportData = () => {
    alert('Funcionalidade de Exportar Dados será implementada aqui!');
    console.log('Exportando dados para:', filtroMes, filtroAno);
  };

  async function handleDeleteClick(moradorId, moradorNome, moradorEmail) {
    if (!window.confirm(`Tem certeza que deseja remover o morador ${moradorNome}? Esta ação é irreversível e removerá todos os registros vinculados a ele, INCLUINDO SUA CONTA DE LOGIN.`)) {
      return;
    }

    try {
      let authUserIdToDelete = null;
      if (moradorEmail) {
          const { data: perfilData, error: perfilError } = await supabase
              .from('perfis')
              .select('id')
              .eq('morador_id', moradorId)
              .single();

          if (perfilError && perfilError.code !== 'PGRST116') {
              console.warn('Erro ao buscar perfil para deletar (pode não existir):', perfilError.message);
          } else if (perfilData) {
              authUserIdToDelete = perfilData.id;
          }
      }

      const { error: deleteConsumoError } = await supabase
        .from('consumo_agua')
        .delete()
        .eq('morador_id', moradorId);

      if (deleteConsumoError) {
        console.error('Erro ao remover registros de consumo vinculados:', deleteConsumoError.message);
      }

      const { error: deletePerfilError } = await supabase
        .from('perfis')
        .delete()
        .eq('morador_id', moradorId);

      if (deletePerfilError) {
        console.error('Erro ao remover perfil vinculado:', deletePerfilError.message);
      }

      const { error: deleteMoradorError } = await supabase
        .from('moradores')
        .delete()
        .eq('id', moradorId);

      if (deleteMoradorError) {
        throw deleteMoradorError;
      }

      if (authUserIdToDelete) {
          console.log(`Chamando função Postgres para deletar usuário Auth: ${authUserIdToDelete}`);
          const { data: rpcData, error: rpcError } = await supabase.rpc('delete_auth_user_by_id', {
              p_user_id: authUserIdToDelete
          });

          if (rpcError) {
              console.error('Erro ao chamar Postgres Function para deletar usuário Auth:', rpcError.message);
              if (rpcError.message.includes('Permissão negada')) {
                  alert(`Morador ${moradorNome} removido, mas a conta de login não pôde ser removida: Permissão negada para o administrador remover usuários Auth. Verifique as políticas do banco de dados.`);
              } else {
                  alert(`Morador ${moradorNome} removido, mas houve um erro ao remover a conta de login. Por favor, remova manualmente a conta do usuário ${moradorEmail} no dashboard do Supabase (Authentication > Users).`);
              }
          } else {
              console.log('Postgres Function de deleção de usuário Auth executada:', rpcData);
              alert(`Morador ${moradorNome} e sua conta de login foram removidos com sucesso!`);
          }
      } else {
          alert(`Morador ${moradorNome} removido com sucesso! Nenhuma conta de login vinculada ou encontrada para remover.`);
      }

      fetchMoradoresComConsumo(filtroMes, filtroAno);

    } catch (error) {
      console.error('Erro fatal ao remover morador:', error.message);
      alert('Erro ao remover morador: ' + error.message);
    }
  }

  if (loading) {
    return <div className="admin-dashboard">Carregando dados do condomínio...</div>;
  }

  return (
    <div className="admin-dashboard">
      <h1>Dashboard do Administrador</h1>

      <section className="dashboard-geral-section">
        <h2>Visão Geral do Condomínio</h2>
        <p>Conteúdo do Dashboard Geral (gráficos e métricas).</p>
      </section>

      <section className="consumo-morador-section">
        <h2>Consumo Detalhado por Morador</h2>
        <div className="filtros-consumo">
          <label>Mês:</label>
          <input
            type="number"
            value={filtroMes}
            onChange={(e) => setFiltroMes(parseInt(e.target.value))}
            min="1"
            max="12"
          />
          <label>Ano:</label>
          <input
            type="number"
            value={filtroAno}
            onChange={(e) => setFiltroAno(parseInt(e.target.value))}
            min="2000"
          />
          <button onClick={handleExportData}>Exportar Dados (PDF/CSV)</button>
        </div>

        {moradoresComConsumo.length === 0 ? (
          <p>Nenhum dado de consumo encontrado para o mês/ano selecionado ou nenhum morador cadastrado.</p>
        ) : (
          <table className="consumo-admin-table">
            <thead>
              <tr>
                <th>Rua</th> {/* Alterado aqui */}
                <th>Lote</th> {/* Alterado aqui */}
                <th>Nome</th>
                <th>Consumo (m³)</th>
                <th>Leitura Atual</th>
                <th>Leitura Anterior</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {moradoresComConsumo.map((morador) => (
                <tr key={morador.id}>
                  <td>{morador.rua} - {morador.lote}</td> {/* Alterado aqui */}
                  <td>{morador.nome}</td>
                  <td>{morador.consumo_m3_mes}</td>
                  <td>{morador.leitura_atual_mes}</td>
                  <td>{morador.leitura_anterior_mes}</td>
                  <td>
                    <button
                      onClick={() => handleDeleteClick(morador.id, morador.nome, morador.email)}
                      className="action-button delete-button"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="log-atividades-section">
        <h2>Log de Atividades do Zelador</h2>
        <p>Conteúdo do log de atividades (futuramente, uma tabela com registros das ações do zelador).</p>
      </section>
    </div>
  );
}

export default AdministradorDashboard;
