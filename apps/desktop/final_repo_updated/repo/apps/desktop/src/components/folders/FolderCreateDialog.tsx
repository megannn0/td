import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useSelection } from '../../hooks/useSelection';
import { useFolders } from '../../hooks/useFolders';

interface FolderCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal dialog for creating a new folder. When submitted the folder
 * will be created under the currently selected folder (or root) and
 * the folder list will be refreshed. Validation is minimal; empty
 * names are not allowed. On success the dialog closes.
 */
const FolderCreateDialog: React.FC<FolderCreateDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentFolderId } = useSelection();
  // Use the appropriate folder hook to get the create method and refresh.
  const { create, refresh } = useFolders(currentFolderId);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }
    setSaving(true);
    setError(null);
    const folder = await create(name.trim(), currentFolderId);
    setSaving(false);
    if (folder) {
      setName('');
      onClose();
      // Refresh the list after creation
      refresh();
    } else {
      setError('Failed to create folder');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="New Folder"
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
            onClick={handleCreate}
            disabled={saving}
          >
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Folder Name
        </label>
        <input
          type="text"
          className="w-full px-2 py-1 border rounded-md"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
        />
        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}
      </div>
    </Modal>
  );
};

export default FolderCreateDialog;
