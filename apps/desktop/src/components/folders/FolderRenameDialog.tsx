import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useFolders } from '../../hooks/useFolders';
import type { Folder } from '../../types/folder';

interface FolderRenameDialogProps {
  folder: Folder | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal dialog for renaming an existing folder. It pre‑populates the
 * current name and writes changes back to the backend. On success
 * the parent folder list is refreshed. If the `folder` prop is null
 * nothing is rendered.
 */
const FolderRenameDialog: React.FC<FolderRenameDialogProps> = ({
  folder,
  isOpen,
  onClose,
}) => {
  const [name, setName] = useState(folder?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Get update & refresh for the parent folder
  const { update, refresh } = useFolders(folder?.parent_id || null);

  // Reset form when folder changes
  React.useEffect(() => {
    setName(folder?.name || '');
  }, [folder]);

  if (!folder) return null;

  const handleRename = async () => {
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }
    setSaving(true);
    setError(null);
    const updated = await update(folder.id, { name: name.trim() });
    setSaving(false);
    if (updated) {
      onClose();
      refresh();
    } else {
      setError('Failed to rename folder');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Rename Folder"
      actions={
        <>
          <Button
            variant="secondary"
            onClick={() => onClose()}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleRename}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          New Name
        </label>
        <input
          type="text"
          className="w-full px-2 py-1 border rounded-md"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
        />
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
    </Modal>
  );
};

export default FolderRenameDialog;
