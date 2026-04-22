import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NewProjectModal from '../dashboard/NewProjectModal';

export default function AppLayout() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-[#060e20] font-['Inter'] text-[#dee5ff] overflow-hidden relative">
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenNewProject={() => setIsModalOpen(true)}
      />
      <main className="flex-1 overflow-y-auto relative h-full">
        {/* Pasamos la función al Outlet por si el Dashboard quiere abrir el modal también */}
        <Outlet context={{ openNewProjectModal: () => setIsModalOpen(true) }} />
      </main>

      {/* Modal global */}
      <NewProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
