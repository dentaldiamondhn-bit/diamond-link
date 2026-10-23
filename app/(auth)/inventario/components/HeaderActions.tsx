'use client';

interface HeaderActionsProps {
  visible: boolean;
  onOpenNewItem: () => void;
  onOpenAddStock: () => void;
}

export default function HeaderActions({ visible, onOpenNewItem, onOpenAddStock }: HeaderActionsProps) {
  if (!visible) return null;

  return (
    <div className="flex gap-2">
      <button
        onClick={onOpenNewItem}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
      >
        <i className="fas fa-plus mr-2"></i>Nuevo Item
      </button>
      <button
        onClick={onOpenAddStock}
        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
      >
        <i className="fas fa-arrow-down mr-2"></i>Registrar Entrada
      </button>
    </div>
  );
}
