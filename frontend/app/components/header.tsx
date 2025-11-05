'use client';

import React from 'react';

export default function Header() {
  return (
    <header className="bg-red-600 text-white p-4 flex justify-around items-center shadow-lg rounded-b-xl">
      <a href="/Users/mural" className="text-lg font-semibold hover:text-red-200 transition-colors">Mural</a>
      <a href="/Users/conversas" className="text-lg font-semibold hover:text-red-200 transition-colors">Conversas</a>
      <a href="/Users/calendario" className="text-lg font-semibold hover:text-red-200 transition-colors">Calendário</a>
      <div className="flex items-center">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-600">
          <a href="/Users/perfil" className="flex items-center justify-center">
            <i className="bi bi-person-circle text-4xl border-2 border-black-600 rounded-full p-1"></i> 
          </a>
        </div>
      </div>
    </header>
  );
}
