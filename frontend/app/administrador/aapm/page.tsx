'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../components/header_adm';
import Footer from '../../components/footer';
import ProtectedRoute from '../../components/ProtectedRoute';

interface Usuario {
  id: number;
  nome: string;
  cpf: string;
  hasAAPM: boolean;
  curso: {
    nome: string;
  } | null;
  turma: string | null;
}

export default function AAPMPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('Geral');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [totalAssinantes, setTotalAssinantes] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const turmas = ['Geral', 'A', 'B'];
  const cursos = ['Téc. Plástico', 'Téc. Logística', 'Téc. Mecânica Industrial', 'Téc. Análise e Desenvolvimento de Sistemas', 'Téc. Eletroeletrônica'];

  useEffect(() => {
    fetchUsuarios();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [usuarios, searchTerm, filtroTurma, filtroCurso]);

  const fetchUsuarios = async () => {
    try {
      const response = await fetch('http://localhost:3000/usuarios');
      if (response.ok) {
        const data = await response.json();
        setUsuarios(data);
        
        // Calcular total de assinantes
        const total = data.filter((u: Usuario) => u.hasAAPM).length;
        setTotalAssinantes(total);
      } else {
        setMessage({ type: 'error', text: 'Erro ao carregar usuários' });
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setMessage({ type: 'error', text: 'Erro de conexão com o servidor' });
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let filtered = [...usuarios];

    // Filtro de busca por nome
    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por turma
    if (filtroTurma !== 'Geral') {
      filtered = filtered.filter(u => u.turma === filtroTurma);
    }

    // Filtro por curso
    if (filtroCurso) {
      filtered = filtered.filter(u => u.curso?.nome === filtroCurso);
    }

    setFilteredUsuarios(filtered);
  };

  const toggleAAPM = async (usuarioId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`http://localhost:3000/usuarios/${usuarioId}/aapm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hasAAPM: !currentStatus
        }),
      });

      if (response.ok) {
        // Atualizar localmente
        setUsuarios(prev => prev.map(u => 
          u.id === usuarioId ? { ...u, hasAAPM: !currentStatus } : u
        ));
        
        // Atualizar contador
        setTotalAssinantes(prev => currentStatus ? prev - 1 : prev + 1);
        
        setMessage({ 
          type: 'success', 
          text: `AAPM ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!` 
        });
        
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Erro ao atualizar status AAPM' });
      }
    } catch (error) {
      console.error('Erro ao atualizar AAPM:', error);
      setMessage({ type: 'error', text: 'Erro de conexão com o servidor' });
    }
  };

  const limparFiltros = () => {
    setSearchTerm('');
    setFiltroTurma('Geral');
    setFiltroCurso('');
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Cabeçalho */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">AAPM</h1>
              <div className="w-24 h-1 bg-red-600 mx-auto mb-4"></div>
            </div>

            {/* Card de Total de Assinantes */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <p className="text-red-500 text-3xl font-semibold">
                Total de assinantes: <span className="text-3xl font-bold ml-2">{totalAssinantes}</span>
              </p>
            </div>

            {/* Mensagem de Feedback */}
            {message && (
              <div className={`mb-4 p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Filtro</h2>
              
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={() => setFiltroTurma('Geral')}
                  className={`px-6 py-2 rounded-full font-medium transition-colors ${
                    filtroTurma === 'Geral'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Total
                </button>
                
                {turmas.slice(1).map(turma => (
                  <button
                    key={turma}
                    onClick={() => setFiltroTurma(turma)}
                    className={`px-6 py-2 rounded-full font-medium transition-colors ${
                      filtroTurma === turma
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {turma}
                  </button>
                ))}

                {/* Botões de Filtro por Curso */}
                {cursos.map(curso => (
                  <button
                    key={curso}
                    onClick={() => setFiltroCurso(filtroCurso === curso ? '' : curso)}
                    className={`px-6 py-2 rounded-full font-medium transition-colors ${
                      filtroCurso === curso
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {curso.replace('Téc. ', '')}
                  </button>
                ))}
              </div>

              {/* Busca */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Pesquisar algum aluno"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Botão Limpar Filtros */}
              {(filtroTurma !== 'Geral' || filtroCurso || searchTerm) && (
                <button
                  onClick={limparFiltros}
                  className="text-red-600 hover:text-red-700 font-medium text-sm"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>

            {/* Tabela de Usuários */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                </div>
              ) : filteredUsuarios.length === 0 ? (
                <div className="text-center p-12">
                  <div className="text-6xl mb-4">&#x1F50D;</div>
                  <p className="text-gray-600 text-lg">Nenhum usuário encontrado</p>
                  <p className="text-gray-400 text-sm mt-2">Tente ajustar os filtros de busca</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Nome completo
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                          Curso
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                          Turma
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                          AAPM 
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredUsuarios
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((usuario) => (
                        <tr key={usuario.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-800">
                            {usuario.nome}
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-600">
                            {usuario.curso?.nome || '-'}
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-600">
                            {usuario.turma || '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => toggleAAPM(usuario.id, usuario.hasAAPM)}
                              className={`px-4 py-2 rounded-lg font-medium transition-all transform hover:scale-105 ${
                                usuario.hasAAPM
                                  ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 hover:cursor-pointer'
                                  : 'bg-gray-100 text-gray-500 border border-gray-300 hover:bg-gray-200 hover:cursor-pointer'
                              }`}
                            >
                              {usuario.hasAAPM ? '✓ Ativo' : '✗ Inativo'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Paginação */}
            {filteredUsuarios.length > itemsPerPage && (
              <div className="mt-6 flex items-center justify-between bg-white rounded-lg shadow-md p-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  ←
                </button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Página {currentPage} de {Math.ceil(filteredUsuarios.length / itemsPerPage)}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredUsuarios.length)} de {filteredUsuarios.length})
                  </span>
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredUsuarios.length / itemsPerPage)))}
                  disabled={currentPage >= Math.ceil(filteredUsuarios.length / itemsPerPage)}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  →
                </button>
              </div>
            )}

            {/* Footer com informações */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Mostrando {Math.min(filteredUsuarios.length, itemsPerPage)} de {filteredUsuarios.length} usuários filtrados (Total: {usuarios.length})</p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
