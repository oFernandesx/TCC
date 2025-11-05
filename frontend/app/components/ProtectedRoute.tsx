'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[]; // ['ADMIN', 'PROFESSOR', 'ESTUDANTE']
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const usuarioData = localStorage.getItem('usuarioLogado');
      
      if (!usuarioData) {
        // Não está logado
        router.push('/Users/login');
        return;
      }

      try {
        const usuario = JSON.parse(usuarioData);
        const userRole = usuario.role || 'ESTUDANTE';

        if (!allowedRoles.includes(userRole)) {
          // Não tem permissão para acessar
          alert('Acesso negado! Você não tem permissão para acessar esta área.');
          
          // Redireciona baseado no role
          if (userRole === 'ADMIN') {
            router.push('/administrador/mural_adm');
          } else {
            router.push('/Users/mural');
          }
          return;
        }

        // Autorizado
        setIsAuthorized(true);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        router.push('/Users/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Não renderiza nada enquanto redireciona
  }

  return <>{children}</>;
}
