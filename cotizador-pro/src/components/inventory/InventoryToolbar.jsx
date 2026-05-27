export default function InventoryToolbar({
  activeTab,
  search,
  onSearchChange,
  status,
  onStatusChange,
  specificFilter,
  specificFilterOptions,
  onSpecificFilterChange,
  onNewItem,
  tipologiaFilter,
  onTipologiaFilterChange,
}) {
  const title = activeTab === 'herrajes' ? 'Nuevo herraje' : activeTab === 'cantos' ? 'Nuevo canto' : 'Nuevo tablero';
  const specificLabel = activeTab === 'herrajes' ? 'Tipo' : activeTab === 'cantos' ? 'Tipo' : 'Material';
  const buttonLabel = activeTab === 'proveedores' ? 'Nuevo proveedor' : title;

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        <div className="flex-1 max-w-xl">
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={`Buscar en ${activeTab}...`}
            className="w-full bg-[#060e20] border border-[#1a233a] text-sm text-white rounded-xl pl-3 pr-4 py-2.5 focus:outline-none focus:border-[#00e0fe]/50"
          />
        </div>

        {activeTab !== 'proveedores' && activeTab !== 'compras' && (
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="bg-[#060e20] border border-[#1a233a] text-sm text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#00e0fe]/50"
          >
            <option value="todos">Todos los estados</option>
            <option value="ok">Stock normal</option>
            <option value="bajo">Stock bajo</option>
            <option value="agotado">Agotados</option>
          </select>
        )}

        {(activeTab === 'tableros' || activeTab === 'herrajes' || activeTab === 'cantos') && (
          <select
            value={specificFilter}
            onChange={(event) => onSpecificFilterChange(event.target.value)}
            className="bg-[#060e20] border border-[#1a233a] text-sm text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#00e0fe]/50"
          >
            <option value="todos">Todos los {specificLabel.toLowerCase()}s</option>
            {specificFilterOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )}

        {activeTab === 'herrajes' && (
          <select
            value={tipologiaFilter || 'todos'}
            onChange={(event) => onTipologiaFilterChange(event.target.value)}
            className="bg-[#060e20] border border-[#1a233a] text-sm text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#00e0fe]/50"
          >
            <option value="todos">Todas tipologías</option>
            <option value="puerta">Puerta</option>
            <option value="mueble">Mueble</option>
          </select>
        )}
      </div>

      {(activeTab === 'tableros' || activeTab === 'herrajes' || activeTab === 'cantos' || activeTab === 'proveedores') && (
        <button
          onClick={onNewItem}
          className="bg-[#00e0fe] text-[#002f33] px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#99f7ff] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
