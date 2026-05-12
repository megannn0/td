import React, { useState, useCallback } from 'react';
import Modal from '../common/Modal';
import { useSelection } from '../../hooks/useSelection';
import * as foldersApi from '../../api/folders';
import { dispatchRefresh, REFRESH_ALL } from '../../utils/events';

interface FolderCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const FolderCreateDialog: React.FC<FolderCreateDialogProps> = ({ isOpen, onClose }) => {
  const { currentFolderId } = useSelection();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) { setError('Folder name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const folder = await foldersApi.createFolder(name.trim(), currentFolderId);
      if (folder) {
        setName('');
        onClose();
        dispatchRefresh(REFRESH_ALL);
      } else {
        setError('Failed to create folder');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create folder');
    }
    setSaving(false);
  }, [name, currentFolderId, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!saving) onClose(); }} title="New Folder"
      actions={
        <div className="flex gap-2">
          <button onClick={() => onClose()} disabled={saving}
            style={{ background: 'transparent', color: 'var(--fluent-text)', border: '1px solid var(--fluent-border)', borderRadius: 'var(--fluent-radius-sm)', padding: '6px 16px', fontSize: 13, fontWeight: 500 }}>
            Cancel
          </button>
          <button onClick={handleCreate} disabled={saving}
            style={{ background: 'var(--fluent-accent)', color: 'white', borderRadius: 'var(--fluent-radius-sm)', padding: '6px 16px', fontSize: 13, fontWeight: 500 }}>
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      }>
      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--fluent-text)' }}>Folder Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={saving}
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{ background: 'var(--fluent-bg-secondary)', border: '1px solid var(--fluent-border)', color: 'var(--fluent-text)' }}
          autoFocus />
        {error && <div className="text-xs" style={{ color: '#E81123' }}>{error}</div>}
      </div>
    </Modal>
  );
};

export default FolderCreateDialog;