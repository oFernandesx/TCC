'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Header from '../../components/header';
import { useDarkMode } from '../../contexts/DarkModeContext';

const socket = io('http://localhost:3000');

interface Curso {
  id: number;
  nome: string;
}

interface Message {
  id: number;
  conteudo: string;
  tipoPublico: string;
  cursoId?: number;
  turma?: string;
  createdAt: string;
  curso?: Curso;
}

interface User {
  id: number;
  nome: string;
  cpf: string;
  role: string;
  cursoId?: number;
  turma?: string;
}

export default function MuralDeAvisos() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [usuarioLogado, setUsuarioLogado] = useState<User | null>(null);
  const { isDarkMode } = useDarkMode();

  useEffect(() => {
    // Recuperar usuário logado
    const userStr = localStorage.getItem('usuarioLogado');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUsuarioLogado(user);
      fetchMessages(user);
    }

    socket.on('novaMensagem', (message: Message) => {
      // Verificar se a mensagem é relevante para o usuário
      const userStr = localStorage.getItem('usuarioLogado');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (isMessageRelevant(message, user)) {
          setMessages(prev => [message, ...prev]);
        }
      }
    });

    return () => {
      socket.off('novaMensagem');
    };
  }, []);

  const isMessageRelevant = (msg: Message, user: User): boolean => {
    if (msg.tipoPublico === 'TODOS') return true;
    if (msg.tipoPublico === 'CURSO' && msg.cursoId === user.cursoId) return true;
    if (msg.tipoPublico === 'TURMA' && msg.cursoId === user.cursoId && msg.turma === user.turma) return true;
    return false;
  };

  const fetchMessages = async (user: User) => {
    try {
      const params = new URLSearchParams();
      if (user.cursoId) params.append('cursoId', user.cursoId.toString());
      if (user.turma) params.append('turma', user.turma);
      
      const response = await fetch(`http://localhost:3000/mural?${params.toString()}`);
      const data = await response.json();
      // Verificar se data é um array antes de setar
      if (Array.isArray(data)) {
        setMessages(data);
      } else {
        console.error('Dados recebidos não são um array:', data);
        setMessages([]);
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      setMessages([]);
    }
  };
  
  const getTipoPublicoLabel = (msg: Message) => {
    if (msg.tipoPublico === 'TODOS') return 'Geral';
    if (msg.tipoPublico === 'CURSO') return `${msg.curso?.nome || 'Curso'}`;
    if (msg.tipoPublico === 'TURMA') return `${msg.curso?.nome || 'Curso'} - Turma ${msg.turma}`;
    return '';
  };

  return (
    // Container principal com flexbox para ocupar a altura da tela
    <div className={`flex flex-col h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Header />
      {/* Main agora usa 'overflow-auto' para gerenciar o scroll de todo o conteúdo */}
      <main className="flex-1 p-8 flex flex-col items-center overflow-auto">
        {/* Bem-vindo section */}
        <div className="text-center mb-6">
          <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Bem-vindo {usuarioLogado?.nome}</p>
          <h2 className={`text-3xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Avisos recentes</h2>
        </div>
        {/* Aviso Card com altura máxima controlada */}
        <div className={`w-full max-w-2xl rounded-lg shadow-xl p-6 flex flex-col h-full transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {/* A div interna é o painel de scroll */}
          <div className="flex-1 overflow-y-auto space-y-6">
            {messages.length === 0 ? (
              <div className={`text-center transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nenhum aviso no momento.</div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`border-b pb-4 last:border-b-0 last:pb-0 transition-colors duration-300 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white">
                      <i className="bi bi-person-circle text-4xl text-red-600"></i> 
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className={`font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Administração</h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {getTipoPublicoLabel(message)}
                      </span>
                    </div>
                  </div>
                  <p className={`whitespace-pre-line transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{message.conteudo}</p>
                  <span className={`block text-xs mt-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date(message.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}