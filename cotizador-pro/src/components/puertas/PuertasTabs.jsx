import React from 'react';

export default function PuertasTabs({ items = [], activeTab, onChange }) {
  return (
    <nav className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {items.map((item) => {
        const active = item.id === activeTab;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${active
              ? 'border-[#99f7ff]/30 bg-[#99f7ff]/10 text-[#99f7ff]'
              : 'border-[#1a233a] bg-[#0a1122] text-[#a3aac4] hover:text-white hover:border-[#40485d]/40'
              }`}
          >
            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
