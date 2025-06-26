// client/src/components/dashboards/administrador/AdministradorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase'; // Ajuste o caminho
import './AdministradorDashboard.css'; // Vamos criar este CSS

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

      // Subquery para obter o último consumo de cada morador no mês/ano filtrado
      // Esta é uma query mais avançada e pode precisar de uma View ou Function no Supabase para otimização
      // Para simplicidade inicial, vamos buscar todos os dados e filtrar no cliente,
      // ou fazer uma query que tente buscar a leitura mais recente.
      // Para um projeto real, uma JOIN mais inteligente ou uma View no Supabase seria ideal.

      // Abordagem simplificada: Buscar todos os moradores e seus consumos e processar no cliente
      // (Pode não ser escalável para muitos dados, mas funciona para protótipo)
      const { data: moradoresData, error: moradoresError } = await supabase
        .from('moradores')
        .select('*')
        .order('bloco', { ascending: true })
        .order('apartamento', { ascending: true });

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
    // Lógica para exportar dados (PDF/CSV)
    alert('Funcionalidade de Exportar Dados será implementada aqui!');
    console.log('Exportando dados para:', filtroMes, filtroAno);
  };

  if (loading) {
    return <div className="admin-dashboard">Carregando dados do condomínio...</div>;
  }

  return (
    <div className="admin-dashboard">
      <h1>Dashboard do Administrador</h1>

      {/* Seção do Dashboard Geral (HU3.1) */}
      <section className="dashboard-geral-section">
        <h2>Visão Geral do Condomínio</h2>
        {/* Aqui você adicionaria gráficos de consumo total, média, etc. */}
        <p>Conteúdo do Dashboard Geral (gráficos e métricas).</p>
      </section>

      {/* Seção de Consulta de Consumo por Morador (HU3.2) */}
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
            min="2000" // Ajuste conforme necessário
          />
          <button onClick={handleExportData}>Exportar Dados (PDF/CSV)</button>
        </div>

        {moradoresComConsumo.length === 0 ? (
          <p>Nenhum dado de consumo encontrado para o mês/ano selecionado ou nenhum morador cadastrado.</p>
        ) : (
          <table className="consumo-admin-table">
            <thead>
              <tr>
                <th>Unidade</th>
                <th>Nome</th>
                <th>Consumo (m³)</th>
                <th>Leitura Atual</th>
                <th>Leitura Anterior</th>
                {/* Ações (futuramente para ver detalhes do morador) */}
              </tr>
            </thead>
            <tbody>
              {moradoresComConsumo.map((morador) => (
                <tr key={morador.id}>
                  <td>{morador.unidade} - {morador.bloco}</td>
                  <td>{morador.nome}</td>
                  <td>{morador.consumo_m3_mes}</td>
                  <td>{morador.leitura_atual_mes}</td>
                  <td>{morador.leitura_anterior_mes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Seção de Log de Atividades do Zelador (HU1.3 - visualizar ações do zelador) */}
      <section className="log-atividades-section">
        <h2>Log de Atividades do Zelador</h2>
        <p>Conteúdo do log de atividades (futuramente, uma tabela com registros das ações do zelador).</p>
      </section>
    </div>
  );
}

export default AdministradorDashboard;