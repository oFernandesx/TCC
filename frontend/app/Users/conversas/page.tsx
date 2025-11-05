'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../../components/header';
import { io } from 'socket.io-client';
import { useDarkMode } from '../../contexts/DarkModeContext';
import Image from 'next/image';

const socket = io('http://localhost:3000');

interface Usuario {
  id: number;
  nome: string;
  curso?: {
    nome: string;
  };
}

interface Mensagem {
  id: number;
  conteudo: string;
  createdAt: string;
  lida: boolean;
  remetente: {
    id: number;
    nome: string;
  };
  conversaId: number;
}

interface Conversa {
  id: number;
  usuario1: Usuario;
  usuario2: Usuario;
  mensagens: Mensagem[];
  updatedAt: string;
  _count: {
    mensagens: number;
  };
}

// Tipo de item na lista unificada
type ItemLista = (Usuario & { 
  conversaAtiva?: Conversa; 
}) | { 
  id: 'nexus'; 
  nome: string; 
  isNexus: true 
};


export default function ConversasPage() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [mensagensConversa, setMensagensConversa] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNexusChat, setIsNexusChat] = useState(false);
  const [nexusMensagens, setNexusMensagens] = useState<any[]>([]);
  const [nexusTyping, setNexusTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useDarkMode();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagensConversa, nexusMensagens]);

  // Função para buscar conversas (estabilizada com useCallback)
  const buscarConversas = useCallback(async (userId: number) => {
    try {
      const response = await fetch(`http://localhost:3000/conversas/${userId}`);
      if (response.ok) {
        const dados = await response.json();
        setConversas(dados);
      }
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
    }
  }, []);

  // Busca mensagens (estabilizada com useCallback)
  const buscarMensagensConversa = useCallback(async (conversaId: number) => {
    try {
      const response = await fetch(`http://localhost:3000/conversa/${conversaId}/mensagens`);
      if (response.ok) {
        const dados = await response.json();
        setMensagensConversa(dados);
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  }, []);

  // Função para buscar usuários (estabilizada com useCallback)
  const buscarUsuarios = useCallback(async (userId: number) => {
    try {
      const response = await fetch('http://localhost:3000/usuarios');
      if (response.ok) {
        const dados: Usuario[] = await response.json();
        // **FILTRO ESSENCIAL:** Remove o próprio usuário logado
        setUsuarios(dados.filter(u => u.id !== userId));
      } else {
         console.error('Falha ao buscar usuários:', response.status);
      }
    } catch (error) {
      console.error('Erro de rede ao buscar usuários:', error);
    }
  }, []); // Não depende de userId, usa o que foi passado.

  // Função para marcar mensagens como lidas (estabilizada com useCallback)
  const marcarComoLida = useCallback(async (conversaId: number) => {
    setUsuarioLogado(prevUser => {
        if (!prevUser) return null;

        // 1. Notifica o servidor
        fetch(`http://localhost:3000/conversa/${conversaId}/marcar-lida/${prevUser.id}`, {
            method: 'PUT',
        }).catch(error => console.error('Erro ao marcar como lida (fetch):', error));
        
        // 2. Notifica o outro usuário via socket
        socket.emit('marcar_lida', conversaId, prevUser.id);
        
        // 3. Atualiza o estado local da lista de conversas
        setConversas(prevConversas => 
            prevConversas.map(conversa => {
                if (conversa.id === conversaId && conversa.mensagens.length > 0) {
                    const updatedMensagens = [...conversa.mensagens];
                    if (updatedMensagens[0].remetente.id !== prevUser.id) {
                      updatedMensagens[0] = { ...updatedMensagens[0], lida: true };
                    }
                    return { ...conversa, mensagens: updatedMensagens };
                }
                return conversa;
            })
        );
        return prevUser;
    });
  }, []);


  // EFEITO DE INICIALIZAÇÃO E SOCKET GERAL
  useEffect(() => {
    const dadosUsuario = localStorage.getItem('usuarioLogado');
    let userId = 0;

    if (dadosUsuario) {
      const usuario = JSON.parse(dadosUsuario);
      userId = usuario.id;
      setUsuarioLogado(usuario);
      buscarConversas(usuario.id);
      buscarUsuarios(usuario.id); // Garante que a busca seja feita
      socket.emit('usuario_conectado', usuario.id);
    }
    setLoading(false);
    
    // ... (Lógica de socket mantida - já revisada)

    const handleNovaMensagem = (mensagem: Mensagem) => {
        buscarConversas(userId); 

        setMensagensConversa(prevMensagens => {
            setConversaSelecionada(currentConversa => {
              if (currentConversa && mensagem.conversaId === currentConversa.id) {
                  marcarComoLida(currentConversa.id); 
                  return currentConversa;
              }
              return currentConversa;
            });

            if (conversaSelecionada && mensagem.conversaId === conversaSelecionada.id) {
                return [...prevMensagens, mensagem];
            }
            return prevMensagens;
        });
    };

    const handleMensagensLidas = (conversaId: number) => {
        setConversas(prevConversas => 
            prevConversas.map(conversa => {
                if (conversa.id === conversaId && conversa.mensagens.length > 0) {
                    const updatedMensagens = [...conversa.mensagens];
                    if (updatedMensagens[0].remetente.id === userId) {
                        updatedMensagens[0] = { ...updatedMensagens[0], lida: true };
                    }
                    return { ...conversa, mensagens: updatedMensagens };
                }
                return conversa;
            })
        );

        setMensagensConversa(prev => {
            if (conversaSelecionada && conversaSelecionada.id === conversaId) {
                return prev.map(msg => {
                    if (msg.remetente.id === userId) {
                        return { ...msg, lida: true };
                    }
                    return msg;
                });
            }
            return prev;
        });
    };

    socket.on('nova_mensagem', handleNovaMensagem);
    socket.on('mensagens_lidas', handleMensagensLidas);

    return () => {
        socket.off('nova_mensagem', handleNovaMensagem);
        socket.off('mensagens_lidas', handleMensagensLidas);
    };
  }, [buscarConversas, buscarUsuarios, marcarComoLida, conversaSelecionada]);


  // Funções restantes (mantidas)
  const iniciarConversa = async (outroUsuario: Usuario) => {
    if (!usuarioLogado) return;

    const conversaExistente = conversas.find(c => 
      (c.usuario1.id === usuarioLogado.id && c.usuario2.id === outroUsuario.id) || 
      (c.usuario1.id === outroUsuario.id && c.usuario2.id === usuarioLogado.id)
    );

    if (conversaExistente) {
      selecionarConversa(conversaExistente);
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/conversa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario1Id: usuarioLogado.id,
          usuario2Id: outroUsuario.id
        }),
      });

      if (response.ok) {
        const conversa = await response.json();
        setConversaSelecionada(conversa);
        setMensagensConversa([]);
        buscarConversas(usuarioLogado.id);
      }
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
    }
  };

  const selecionarConversa = (conversa: Conversa) => {
    setIsNexusChat(false);
    setConversaSelecionada(conversa);
    setMensagensConversa([]);
    
    // Busca mensagens e então marca como lida
    buscarMensagensConversa(conversa.id).then(() => {
        marcarComoLida(conversa.id);
    });
  };

  const fecharChat = () => {
    setIsNexusChat(false);
    setConversaSelecionada(null);
    setNovaMensagem('');
  }

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!novaMensagem.trim() || !usuarioLogado || !conversaSelecionada || isSending) return; 

    setIsSending(true);

    try {
      const response = await fetch('http://localhost:3000/mensagem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conteudo: novaMensagem,
          remetenteId: usuarioLogado.id,
          conversaId: conversaSelecionada.id
        }),
      });

      if (response.ok) {
        const mensagemEnviada = await response.json();
        
        setMensagensConversa(prev => [...prev, { ...mensagemEnviada, lida: false }]); 
        setNovaMensagem('');
        buscarConversas(usuarioLogado.id);
        
        socket.emit('enviar_mensagem', mensagemEnviada);

      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatarHora = (data: string) => {
    return new Date(data).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOutroUsuario = (conversa: Conversa) => {
    return conversa.usuario1.id === usuarioLogado?.id ? conversa.usuario2 : conversa.usuario1;
  };

  const iniciarChatNexus = () => {
    setIsNexusChat(true);
    setConversaSelecionada(null);
    if (nexusMensagens.length === 0) {
      setNexusMensagens([{
        id: 1,
        conteudo: `Olá ${usuarioLogado?.nome}! Eu sou a NEXUS IA, sua assistente virtual. Estou aqui para te ajudar com dúvidas sobre seus estudos, tirar questões sobre as matérias e muito mais! 
Como posso te ajudar hoje?`,
        createdAt: new Date().toISOString(),
        isNexus: true
      }]);
    }
  };

  const enviarMensagemNexus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !usuarioLogado || nexusTyping) return;

    const mensagemUsuario = {
      id: Date.now(),
      conteudo: novaMensagem,
      createdAt: new Date().toISOString(),
      isNexus: false,
      remetente: usuarioLogado
    };

    const mensagemTexto = novaMensagem;
    setNexusMensagens(prev => [...prev, mensagemUsuario]);
    setNovaMensagem('');
    setNexusTyping(true);

    try {
      const response = await fetch('/api/nexus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: mensagemTexto }),
      });

      const data = await response.json();

      if (data.success) {
        const respostaNexus = {
          id: Date.now() + 1,
          conteudo: data.resposta,
          createdAt: new Date().toISOString(),
          isNexus: true
        };
        setNexusMensagens(prev => [...prev, respostaNexus]);
      } else {
        const erroMensagem = {
          id: Date.now() + 1,
          conteudo: data.error || "Ops! Parece que estou com alguns problemas técnicos. Tente novamente em alguns instantes!",
          createdAt: new Date().toISOString(),
          isNexus: true
        };
        setNexusMensagens(prev => [...prev, erroMensagem]);
      }
    } catch (error) {
      console.error('Erro ao comunicar com NEXUS IA:', error);
      const erroMensagem = {
        id: Date.now() + 1,
        conteudo: "Ops! Parece que estou com alguns problemas técnicos. Tente novamente em alguns instantes!",
        createdAt: new Date().toISOString(),
        isNexus: true
      };
      setNexusMensagens(prev => [...prev, erroMensagem]);
    } finally {
      setNexusTyping(false);
    }
  };

  if (loading || !usuarioLogado) {
    // Renderização de loading/login
    return (
        <div className={`flex flex-col h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <Header />
            <div className="flex-1 flex items-center justify-center">
                {loading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                ) : (
                    <div className="text-center">
                        <div className="text-red-600 text-6xl mb-4">&#x1F512;</div>
                        <h2 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Login necessário</h2>
                        <p className={`mb-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Faça login para acessar suas conversas</p>
                        <button 
                            onClick={() => window.location.href = '/Users/login'}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Fazer Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
  }

  // ===========================================
  // LÓGICA DA LISTA UNIFICADA (ANTES DA RENDERIZAÇÃO)
  // ===========================================
  const usuariosDecorados: ItemLista[] = usuarios.map(usuario => {
    const conversaAtiva = conversas.find(c => 
      (c.usuario1.id === usuario.id && c.usuario2.id === usuarioLogado.id) || 
      (c.usuario1.id === usuarioLogado.id && c.usuario2.id === usuario.id)
    );
    
    return {
      ...usuario,
      conversaAtiva: conversaAtiva,
    };
  });

  usuariosDecorados.sort((a, b) => {
      const aIsActive = !!a.conversaAtiva;
      const bIsActive = !!b.conversaAtiva;

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      if (aIsActive && bIsActive) {
          return new Date(b.conversaAtiva!.updatedAt).getTime() - new Date(a.conversaAtiva!.updatedAt).getTime();
      }

      return a.nome.localeCompare(b.nome);
  });
  
  const listaUnificada: ItemLista[] = [
      { id: 'nexus', nome: 'NEXUS IA', isNexus: true },
      ...usuariosDecorados
  ];


  // ===============================================
  // 1. Renderização CONDICIONAL DA ÁREA DE CHAT
  // ===============================================
  if (conversaSelecionada || isNexusChat) {
    const isNormalChat = !!conversaSelecionada;
    const destinatario = isNormalChat ? getOutroUsuario(conversaSelecionada!) : { nome: 'NEXUS IA' };

    return (
        <div className={`flex flex-col h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <Header />
            
            <main className="flex-1 p-4">
                <div className="max-w-4xl mx-auto h-full"> 
                    <div className={`rounded-lg shadow-xl flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} style={{ height: 'calc(100vh - 100px)' }}>
                        
                        {/* Header do Chat (com botão de voltar) */}
                        <div className={`p-4 border-b flex items-center transition-colors duration-300 ${
                            isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-red-50'
                        }`}>
                            <button 
                                onClick={fecharChat} 
                                className="mr-4 text-red-600 hover:cursor-pointer hover:text-red-800 transition-colors text-2xl"
                                title="Voltar para conversas"
                            >
                                ←
                            </button>
                            {isNormalChat ? (
                                <h3 className="font-semibold text-red-600">{destinatario.nome}</h3>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-red-600">NEXUS IA</h3>
                                    <span className="text-xs text-gray-500">(Assistente Virtual)</span>
                                </div>
                            )}
                        </div>
                        
                        {/* Corpo do Chat (mantido) */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {/* Renderização das Mensagens (Lógica mantida) */}
                            {isNexusChat ? (
                                // Mensagens NEXUS IA
                                <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
                                    <div className="space-y-4 min-h-full flex flex-col justify-end">
                                        {nexusMensagens.map((mensagem) => (
                                          <div key={mensagem.id} className={`flex ${mensagem.isNexus ? 'justify-start' : 'justify-end'}`}>
                                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${mensagem.isNexus ? (isDarkMode ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' : 'bg-gradient-to-r from-red-500 to-red-600 text-white') : 'bg-gray-600 text-white'}`}>
                                              <p className="text-sm break-words whitespace-pre-wrap">{mensagem.conteudo}</p>
                                              <p className={`text-xs mt-1 ${mensagem.isNexus ? 'text-red-200' : 'text-gray-200'}`}>{formatarHora(mensagem.createdAt)}</p>
                                            </div>
                                          </div>
                                        ))}
                                        {nexusTyping && (
                                          <div className="flex justify-start">
                                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' : 'bg-gradient-to-r from-red-500 to-red-600 text-white'}`}>
                                              <div className="flex items-center space-x-2">
                                                <div className="flex space-x-1">
                                                  <div className="w-2 h-2 bg-red-200 rounded-full animate-bounce"></div>
                                                  <div className="w-2 h-2 bg-red-200 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                                  <div className="w-2 h-2 bg-red-200 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                                </div>
                                                <span className="text-xs text-red-200">NEXUS IA está digitando...</span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    <div ref={messagesEndRef} />
                                </div>
                            ) : (
                                // Mensagens da Conversa Normal
                                <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
                                    {mensagensConversa.length === 0 ? (
                                        <div className={`text-center mt-20 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <div className="text-4xl mb-4">&#x1F44B;</div>
                                            <p>Comece uma conversa!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 min-h-full flex flex-col justify-end">
                                            {mensagensConversa.map((mensagem) => {
                                                const isRemetente = mensagem.remetente.id === usuarioLogado.id;
                                                
                                                return (
                                                    <div key={mensagem.id} className={`flex ${isRemetente ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isRemetente ? 'bg-red-600 text-white' : (isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800')}`}>
                                                            <p className="text-sm break-words">{mensagem.conteudo}</p>
                                                            
                                                            <div className={`text-xs mt-1 flex items-center justify-end ${isRemetente ? 'text-red-200' : (isDarkMode ? 'text-gray-300' : 'text-gray-500')}`}>
                                                                
                                                                {formatarHora(mensagem.createdAt)}
                                                                
                                                                {/* ÍCONE DE VISTO (Somente se você for o remetente) */}
                                                                {isRemetente && (
                                                                    <span className={`ml-1 text-sm ${
                                                                        mensagem.lida ? 'text-blue-400' : 'text-gray-400'
                                                                    }`}>
                                                                        ✓✓
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* Campo de Envio */}
                        <div className={`border-t p-4 transition-colors duration-300 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                            <form onSubmit={isNexusChat ? enviarMensagemNexus : enviarMensagem} className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={novaMensagem} 
                                    onChange={(e) => setNovaMensagem(e.target.value)} 
                                    placeholder={isNexusChat ? "Faça uma pergunta para a NEXUS IA..." : "Digite sua mensagem..."}
                                    disabled={isSending || nexusTyping}
                                    className={`flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-black placeholder-gray-500'}`} 
                                />
                                <button 
                                    type="submit" 
                                    disabled={!novaMensagem.trim() || isSending || nexusTyping}
                                    className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSending || nexusTyping ? '...' : '➤'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
  }

  // ===============================================
  // 2. Renderização do Layout da Lista (Tela Cheia)
  // ===============================================
  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Header />
      
      <main className="flex-1 p-4">
        <div className="max-w-xl mx-auto h-full">
          <h1 className={`text-3xl font-bold text-center mb-6 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Conversas</h1>
          
          <div className={`rounded-lg shadow-xl flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} style={{ minHeight: 'calc(100vh - 200px)' }}>
              
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className={`divide-y transition-colors duration-300 ${isDarkMode ? 'divide-gray-200' : 'divide-gray-200'}`}>
                  
                  {/* DEBUG: Mostra a contagem de usuários carregados */}
                  {usuarios.length === 0 && !loading && (
                      <div className={`text-center p-4 transition-colors duration-300 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                          <p className="text-sm font-semibold">Não foi possível carregar outros usuários. Verifique a API.</p>
                      </div>
                  )}

                  {listaUnificada.map((item) => {
                    
                    if ('isNexus' in item && item.isNexus) {
                      // NEXUS IA
                      return (
                        <div 
                          key={item.id}
                          onClick={iniciarChatNexus}
                          className={`p-4 cursor-pointer transition-colors duration-300 flex justify-between items-center ${
                            isNexusChat 
                              ? (isDarkMode ? 'bg-gray-700' : 'bg-red-50')
                              : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                          }`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 relative border-2 border-red-500 shadow-lg">
                              <Image src="/maca.png" alt="NEXUS IA" width={24} height={24} unoptimized />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-red-600 truncate">NEXUS IA</h3>
                              <p className={`text-sm truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Sua assistente virtual
                              </p>
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0 animate-pulse"></div>
                        </div>
                      );
                    }
                    
                    // Usuários (Com ou Sem Conversa)
                    const usuarioItem = item as Usuario & { conversaAtiva?: Conversa };
                    const conversa = usuarioItem.conversaAtiva;
                    const isConversaAtiva = !!conversa;
                    const keyId = isConversaAtiva ? `conversa-${conversa.id}` : `user-${usuarioItem.id}`;
                    
                    const onClickAction = isConversaAtiva ? () => selecionarConversa(conversa!) : () => iniciarConversa(usuarioItem as Usuario);
                    
                    // Lógica para status/notificação da conversa ativa
                    const ultimaMensagem = conversa?.mensagens.length > 0 ? conversa.mensagens[0] : null;
                    const isMinhaMensagem = usuarioLogado && ultimaMensagem?.remetente.id === usuarioLogado.id;
                    const naoLidaDoOutro = ultimaMensagem && !isMinhaMensagem && !ultimaMensagem.lida;

                    // Conteúdo do Item
                    return (
                        <div 
                            key={keyId}
                            onClick={onClickAction}
                            className={`p-4 cursor-pointer transition-colors duration-300 flex justify-between items-center ${
                                isConversaAtiva
                                ? (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                                : (isDarkMode ? 'hover:bg-gray-600/50' : 'hover:bg-gray-100')
                            }`}
                        >
                            <div className="flex items-center gap-4 flex-1">
                                {/* Ícone de Avatar */}
                                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-semibold text-lg">
                                        {usuarioItem.nome.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    {/* Nome */}
                                    <h3 className={`font-semibold text-base truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {usuarioItem.nome}
                                    </h3>
                                    
                                    {/* Subtítulo: Última mensagem (se ativa) ou Curso (se novo) */}
                                    {isConversaAtiva && ultimaMensagem ? (
                                        <p className={`text-sm truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            {ultimaMensagem.conteudo}
                                        </p>
                                    ) : (
                                        <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                            Novo Chat: {usuarioItem.curso?.nome || 'Sem curso'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Status (Notificação/Visto) - Apenas se for conversa ativa */}
                            {isConversaAtiva && ultimaMensagem && (
                                <div className="flex flex-col items-end text-xs">
                                    {/* Hora da última mensagem */}
                                    <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {formatarHora(ultimaMensagem.createdAt)}
                                    </span>
                                    
                                    {/* Ícone de status */}
                                    {naoLidaDoOutro ? (
                                        // Mensagem não lida do outro usuário (Notificação Vermelha '1')
                                        <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center ml-2 mt-1">
                                            <span className="text-white text-xs font-bold">1</span>
                                        </div>
                                    ) : isMinhaMensagem && ultimaMensagem.lida ? (
                                        // SUA MENSAGEM LIDA PELO DESTINATÁRIO (AZUL)
                                        <span className="text-blue-500 ml-2 mt-1">✓✓</span>
                                    ) : isMinhaMensagem ? (
                                        // SUA MENSAGEM NÃO LIDA PELO DESTINATÁRIO (CINZA)
                                        <span className="text-gray-400 ml-2 mt-1">✓✓</span>
                                    ) : (
                                      // Default para mensagens lidas do outro
                                      null
                                    )}
                                </div>
                            )}
                        </div>
                    );
                  })}
                  
                  {/* Se a lista de usuários estiver vazia (além da NEXUS IA) */}
                  {listaUnificada.length === 1 && usuarios.length > 0 && ( 
                    <div className={`text-center p-8 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <p className="text-sm">Nenhum usuário disponível para chat, exceto a NEXUS IA.</p>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
      </main>
    </div>
  );
}