'use client';

import React, { useState, useCallback } from 'react';
// Dependências do Next.js (next/navigation e next/image) substituídas por funcionalidades nativas
// para garantir a compilação e execução no ambiente de visualização.

// Tipagem para a notificação
type Toast = {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
};

export default function AuthForm() {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<Toast>({ message: '', type: 'error', visible: false });
  // Variável 'router' removida, usando window.location.href para navegação.
  
  // Duração do Toast ajustada para 3 segundos para coincidir com o redirecionamento
  const TOAST_DURATION = 3000; 

  // Função para exibir a notificação
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type, visible: true });

    // Apenas mensagens de erro desaparecem sozinhas. Sucesso é coberto pelo redirecionamento.
    if (type === 'error') {
        const timer = setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
        }, TOAST_DURATION);

        return () => clearTimeout(timer); 
    }
  }, []);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    // Formatação de máscara para CPF
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    setCpf(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setToast({ message: '', type: 'error', visible: false });
    setIsLoading(true);

    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/login`;
    const cleanedCpf = cpf.replace(/\D/g, '');
    
    // 💡 DEBUG 1: Imprime o URL e os dados enviados (CPF sem formatação)
    console.log("Tentando login na URL:", url);
    console.log("Dados enviados (sem pontos/traços):", { cpf: cleanedCpf, password: '***' });


    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanedCpf, password }),
      });

      // 💡 DEBUG 2: Imprime o status da resposta HTTP
      console.log("Status da Resposta:", response.status);

      // Tenta ler o JSON, mas verifica primeiro se a resposta não está vazia
      let data = {};
      try {
        // Clonar a resposta antes de tentar ler o JSON, caso o backend não retorne corpo
        const responseClone = response.clone();
        data = await responseClone.json();
      } catch (jsonError) {
        console.warn("Aviso: O servidor retornou um erro HTTP, mas sem corpo JSON. Status:", response.status);
        data = { error: 'O servidor retornou um erro desconhecido.' };
      }

      if (response.ok) {
        showToast('Login realizado com sucesso! Redirecionando...', 'success'); 
        localStorage.setItem('usuarioLogado', JSON.stringify(data.user));

        // REDIRECIONAMENTO APÓS 3 SEGUNDOS (usando navegação nativa)
        setTimeout(() => {
          const userRole = (data.user && data.user.role) || 'USER'; // Garante um fallback
          if (userRole === 'ADMIN') window.location.href = '/administrador/mural_adm';
          else window.location.href = '/Users/mural';
        }, TOAST_DURATION);
        
      } else {
        // 💡 DEBUG 3: Imprime o erro que veio do backend (Status 4xx ou 5xx)
        console.error("Erro do Backend (resposta não OK):", data);
        showToast(data.error || 'CPF ou senha inválidos.', 'error');
        setIsLoading(false); 
      }
    } catch (error) {
      console.error('Erro de conexão (o fetch falhou completamente):', error);
      showToast('Erro na conexão com o servidor.', 'error');
      setIsLoading(false); 
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-cover bg-center font-sans"
      style={{ backgroundImage: "url('/Fundo do login.png')" }}
    >
      {/* Container Principal do Formulário */}
      <div className="w-full max-w-md bg-black/0 backdrop-blur-lg border border-white/20 shadow-2xl rounded-2xl p-8 mx-4">
        <div className="flex flex-col items-center space-y-3 mb-8">
          {/* Logo Aumentada - Substituído <Image> por <img> */}
          <img 
            src="/logo.png" 
            alt="Logo Nexus" 
            width={180} 
            height={180} 
            className="mx-auto" 
          />
          <h1 className="text-3xl font-semibold text-white text-center">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-gray-300 text-center">
            Faça login para acessar o sistema
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campo CPF */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">CPF</label>
            <input
              type="text"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={handleCpfChange}
              required
              inputMode="numeric"
              maxLength={14}
              className="w-full rounded-lg border border-gray-600/50 bg-black/30 px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-black/50 transition duration-200"
            />
          </div>

          {/* Campo Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-600/50 bg-black/30 px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-black/50 transition duration-200"
            />
            <div className="mt-2 text-right">
              <a
                href="#"
                className="text-sm font-medium text-red-500 hover:text-red-400 hover:underline transition"
              >
                Esqueci minha senha
              </a>
            </div>
          </div>

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-red-600 text-white font-medium py-2.5 rounded-lg shadow-md transition duration-200 ease-in-out hover:bg-red-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-600 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Texto de Copyright */}
        <p className="mt-8 text-center text-xs text-gray-400">
          &copy; 2025 Nexus. Todos os direitos reservados.
        </p>
      </div>

      {/* 🛑 COMPONENTE: TOAST NOTIFICATION (Modal) 🛑 */}
      {toast.visible && (
        <div
          className={`fixed bottom-4 right-4 z-50 w-80 p-4 rounded-lg shadow-2xl transition-all duration-300 ease-in-out transform ${
            toast.type === 'success'
              ? 'bg-green-700/80 border border-green-500/50'
              : 'bg-red-700/80 border border-red-500/50'
          } backdrop-blur-sm`}
        >
          <div className="flex items-center space-x-3">
            {/* Ícone de Feedback */}
            <svg
              className={`w-6 h-6 ${
                toast.type === 'success' ? 'text-green-300' : 'text-red-300'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              {toast.type === 'success' ? (
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              )}
            </svg>

            {/* Mensagem */}
            <p className="text-white text-sm font-medium flex-1">{toast.message}</p>
          </div>

          {/* Barra de Progresso (Tempo para sumir) */}
          <div className="mt-3 h-1 w-full bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                toast.type === 'success' ? 'bg-green-300' : 'bg-red-300'
              } rounded-full`}
              style={{
                animation: `progress-bar ${TOAST_DURATION}ms linear forwards`,
              }}
            ></div>
          </div>
        </div>
      )}
      {/* Adicionar Keyframes para a animação da barra de progresso (Precisa ser no CSS global) */}
      <style jsx global>{`
        @keyframes progress-bar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
