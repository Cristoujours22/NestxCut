import { INVENTORY_TABS } from '../../features/inventory/config/inventoryTabs';

export default function InventoryTabs({ activeTab, onChange }) {
  return (
    <nav className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-[#1a233a] pb-1">
      {INVENTORY_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              isActive
                ? 'border-[#00e0fe] text-[#00e0fe]'
                : 'border-transparent text-[#a3aac4] hover:text-[#dee5ff] hover:bg-[#1a233a]/20 rounded-t-lg'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
