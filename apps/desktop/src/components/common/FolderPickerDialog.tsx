import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import * as foldersApi from '../../api/folders';
import type { Folder } from '../../types/folder';
import Button from './Button';

interface FolderPickerDialogProps {
  title: string;
  open: boolean;
  onSelect: (folderId: number | null) => void;
  onCancel: () => void;
  /** Folder IDs to exclude from the picker (e.g. the current folder) */
  excludeIds?: number[];
}

const FolderPickerDialog: React.FC<FolderPickerDialogProps> = ({
  title,
  open,
  onSelect,
  onCancel,
  excludeIds = [],
}) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentParent, setCurrentParent] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: number | null; name: string }[]>([
    { id: null, name: 'Root' },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    foldersApi
      .listFolders(currentParent)
      .then((list) => {
        setFolders(list.filter((f) => !excludeIds.includes(f.id)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, currentParent, excludeIds]);

  if (!open) return null;

  const navigateInto = (folder: Folder) => {
    setCurrentParent(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateTo = (idx: number) => {
    const entry = breadcrumbs[idx];
    setCurrentParent(entry.id);
    setBreadcrumbs((prev) => prev.slice(0, idx + 1));
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-96 max-h-[70vh] flex flex-col">
        <div className="px-4 py-3 border-b font-medium">{title}</div>
        <div className="px-4 py-2 text-xs text-gray-500 flex flex-wrap gap-1">
          {breadcrumbs.map((bc, idx) => (
            <span key={idx}>
              {idx > 0 && <span className="mx-1">/</span>}
              <button
                onClick={() => navigateTo(idx)}
                className="text-blue-600 hover:underline"
              >
                {bc.name}
              </button>
            </span>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-1 min-h-[120px]">
          {loading ? (
            <div className="text-sm text-gray-500 p-2">Loading…</div>
          ) : folders.length === 0 ? (
            <div className="text-sm text-gray-400 p-2">No subfolders</div>
          ) : (
            folders.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer text-sm"
                onDoubleClick={() => navigateInto(f)}
                onClick={() => navigateInto(f)}
              >
                <span>📁 {f.name}</span>
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-3 border-t flex justify-end space-x-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onSelect(currentParent)}
          >
            Move Here
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default FolderPickerDialog;
