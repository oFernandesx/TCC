// components/Calendario.tsx
'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/header';
import { useDarkMode } from '../../contexts/DarkModeContext';

// Tipagem para os eventos, para garantir que os dados da API estejam corretos
interface Evento {
  id: number;
  titulo: string;
  descricao: string;
  data: string;
}

const CalendarioPage = () => {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [eventosDoMes, setEventosDoMes] = useState<Evento[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { isDarkMode } = useDarkMode();

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const buscarEventos = async (data: Date) => {
    setCarregando(true);
    setErro(null);
    try {
      const ano = data.getFullYear();
      const mes = data.getMonth();
      const inicioDoMes = new Date(ano, mes, 1).toISOString();
      const fimDoMes = new Date(ano, mes + 1, 0).toISOString();

      const response = await fetch(`http://localhost:3000/calendario?inicio=${inicioDoMes}&fim=${fimDoMes}`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const dados: Evento[] = await response.json();
      setEventosDoMes(dados);
    } catch (error) {
      console.error('Falha ao buscar eventos:', error);
      setEventosDoMes([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarEventos(dataAtual);
  }, [dataAtual]);

  const eventosDoDia = eventosDoMes.filter(evento => {
    if (diaSelecionado === null) return false;
    const diaEvento = new Date(evento.data).getDate();
    const mesEvento = new Date(evento.data).getMonth();
    return diaEvento === diaSelecionado && mesEvento === dataAtual.getMonth();
  });

  const renderizarDias = () => {
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const ultimoDiaMes = new Date(ano, mes, 0).getDate();
    const ultimoDiaMesAnterior = new Date(ano, mes, 0).getDate();
    const dias = [];
    
    // Dias do mês anterior
    for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
        dias.push(
            <div key={`vazio-${i}`} className={`p-2 text-center transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-200'}`}>
                {ultimoDiaMesAnterior - i}
            </div>
        );
    }

    // Dias do mês atual
    for (let i = 1; i <= ultimoDiaMes; i++) {
      const isHoje = new Date().toDateString() === new Date(ano, mes, i).toDateString();
      const temEvento = eventosDoMes.some(evento => {
        const dataEvento = new Date(evento.data);
        return dataEvento.getDate() === i && dataEvento.getMonth() === mes;
      });
      const isSelecionado = diaSelecionado === i;
      const classes = `p-2 rounded-lg text-center cursor-pointer transition-colors duration-200 relative
        ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}
        ${isSelecionado ? (isDarkMode ? 'bg-red-700 border-2 border-red-400 font-bold' : 'bg-red-200 border-2 border-red-500 font-bold') : ''}
        ${isHoje ? 'border-2 border-blue-500' : ''}
        ${temEvento ? 'text-red-600' : ''}
        ${!isSelecionado && !isHoje ? (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100') : ''}
      `;

      dias.push(
        <div 
          key={i} 
          className={classes}
          onClick={() => setDiaSelecionado(i)}
        >
          {i}
          {temEvento && (
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600"></div>
          )}
        </div>
      );
    }

    // Dias do próximo mês
    const diasRestantes = 42 - dias.length; // 6 semanas * 7 dias
    for (let i = 1; i <= diasRestantes; i++) {
      dias.push(
          <div key={`proximo-${i}`} className={`p-2 text-center cursor-pointer transition-colors duration-300 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              {i}
          </div>
      );
    }

    return dias;
  };

  return (
    <div className={`flex flex-col h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Header />
      <main className="flex-1 p-8 overflow-auto">
        {erro && (
          <div className="max-w-4xl mx-auto mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {erro}
          </div>
        )}
        
        <div className={`max-w-4xl mx-auto p-4 rounded-xl shadow-2xl transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => setDataAtual(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className={`p-2 text-xl font-bold rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isDarkMode 
                  ? 'text-gray-300 hover:bg-gray-700' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              disabled={carregando || (
                dataAtual.getFullYear() === new Date().getFullYear() && dataAtual.getMonth() === 0
              )}
            >
              &larr;
            </button>

            <h2 className="text-3xl font-extrabold text-red-600">
              {`${meses[dataAtual.getMonth()]} ${dataAtual.getFullYear()}`}
            </h2>

            <button 
              onClick={() => setDataAtual(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className={`p-2 text-xl font-bold rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isDarkMode 
                  ? 'text-gray-300 hover:bg-gray-700' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              disabled={carregando || (
                dataAtual.getFullYear() === new Date().getFullYear() && dataAtual.getMonth() === 11
              )}
            >
              &rarr;
            </button>

          </div>

          {carregando && (
            <div className="text-center mb-4">
              <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Carregando eventos...</div>
            </div>
          )}

          <div className="grid grid-cols-7 gap-2 text-center text-red-600 font-extrabold text-lg mb-2">
            <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {renderizarDias()}
          </div>

          {/* Seção de Eventos */}
          <div className="mt-8">
            <h3 className={`text-2xl font-bold text-center mb-4 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {diaSelecionado ? `Eventos do dia ${diaSelecionado}` : 'Selecione um dia para ver os eventos'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {eventosDoDia.length > 0 ? (
                eventosDoDia.map(evento => (
                  <div key={evento.id} className={`p-4 rounded-lg shadow-inner transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <p className="text-2xl font-bold text-red-600">
                      {evento.titulo}
                    </p>
                    <p className={`text-sm mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{evento.descricao}</p>
                  </div>
                ))
              ) : (
                <p className={`col-span-3 text-center transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {diaSelecionado ? 'Nenhum evento para este dia.' : 'Clique em um dia para ver os eventos.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CalendarioPage;

