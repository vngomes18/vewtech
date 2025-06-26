// client/src/components/dashboards/morador/MoradorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase'; // Ajuste o caminho
import './MoradorDashboard.css'; // Vamos criar este CSS

function MoradorDashboard() {
  const [consumos, setConsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMoradorId, setCurrentMoradorId] = useState(null);
  const [nomeMorador, setNomeMorador] = useState('');

  useEffect(() => {
    // Função assíncrona para buscar o perfil e os consumos
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser(); // Obtém o usuário logado de forma assíncrona

        if (userError) {
            throw userError;
        }

        // 1. Buscar o perfil do usuário para obter o morador_id
        const { data: perfilData, error: perfilError, status: perfilStatus } = await supabase
          .from('perfis')
          .select('morador_id')
          .eq('id', user.id) // Busca o perfil pelo ID do usuário autenticado
          .single();

        if (perfilError && perfilStatus !== 406) { // 406 = No Content
          throw perfilError;
        }

        if (!perfilData || !perfilData.morador_id) {
          setError('Seu perfil de morador não está configurado ou vinculado. Entre em contato com a administração.');
          setLoading(false);
          return;
        }

        setCurrentMoradorId(perfilData.morador_id);

        // 2. Buscar o nome do morador na tabela 'moradores'
        const { data: moradorNomeData, error: moradorNomeError } = await supabase
          .from('moradores')
          .select('nome')
          .eq('id', perfilData.morador_id)
          .single();

        if (moradorNomeError) throw moradorNomeError;
        setNomeMorador(moradorNomeData.nome);

        // 3. Buscar os consumos de água para este morador_id
        const { data: consumosData, error: consumosError } = await supabase
          .from('consumo_agua')
          .select('*')
          .eq('morador_id', perfilData.morador_id) // Filtra pelo ID do morador
          .order('ano_referencia', { ascending: false }) // Ordena pelo ano (mais recente primeiro)
          .order('mes_referencia', { ascending: false }); // Depois pelo mês

        if (consumosError) throw consumosError;

        setConsumos(consumosData);

      } catch (err) {
        console.error('Erro no Dashboard do Morador:', err.message);
        setError('Não foi possível carregar seus dados de consumo: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []); // Executa apenas uma vez ao montar o componente

  if (loading) {
    return <div className="morador-dashboard">Carregando seus dados de consumo...</div>;
  }

  if (error) {
    return <div className="morador-dashboard error-message">Erro: {error}</div>;
  }

  return (
    <div className="morador-dashboard">
      <h1>Olá, {nomeMorador || 'Morador'}!</h1>
      <h2>Seu Consumo de Água</h2>

      {consumos.length === 0 ? (
        <p>Nenhum registro de consumo encontrado para você. Por favor, aguarde o próximo registro do zelador.</p>
      ) : (
        <table className="consumo-morador-table">
          <thead>
            <tr>
              <th>Mês/Ano</th>
              <th>Leitura Anterior (m³)</th>
              <th>Leitura Atual (m³)</th>
              <th>Consumo (m³)</th>
            </tr>
          </thead>
          <tbody>
            {consumos.map((c) => (
              <tr key={c.id}>
                <td>{`<span class="math-inline">\{c\.mes\_referencia\}/</span>{c.ano_referencia}`}</td>
                <td>{c.leitura_anterior}</td>
                <td>{c.leitura_atual}</td>
                <td><strong>{c.consumo_m3}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Aqui futuramente poderiam vir gráficos individuais, comparativos, etc. */}
    </div>
  );
}

export default MoradorDashboard;