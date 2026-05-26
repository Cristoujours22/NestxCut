import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NewProjectModal from '../dashboard/NewProjectModal';
import UpdateChecker from '../UpdateChecker';
import FeedbackModal from '../feedback/FeedbackModal';

export default function AppLayout() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-[#060e20] font-['Inter'] text-[#dee5ff] overflow-hidden relative">
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenNewProject={() => setIsModalOpen(true)}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
      />
      <main className="flex-1 overflow-y-auto relative h-full">
        <Outlet context={{ openNewProjectModal: () => setIsModalOpen(true) }} />
      </main>

      <NewProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />

      <UpdateChecker />
    </div>
  );
}
