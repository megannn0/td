import React, { useState, useEffect, useCallback } from 'react';
import { useSelection } from '../../hooks/useSelection';
import { useTags } from '../../hooks/useTags';
import { getFileIcon } from '../../utils/icons';
import { formatBytes, formatDate } from '../../utils/format';
import { downloadFile } from '../../utils/download';
import Button from '../common/Button';
import * as fileApi from '../../api/files';
import * as tagApi from '../../api/tags';
import VideoPlayer from '../common/VideoPlayer';

const DetailsPanel: React.FC = () => {
  const { selectedFile, setSelectedFile } = useSelection();
  const { tags, refresh: refreshTags } = useTags();
  const [downloading, setDownloading] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (editingTags && selectedFile) {
      setTagInput((selectedFile.tags ?? []).join(', '));
    }
  }, [editingTags, selectedFile]);

  const handleDownload = () => {
    if (!selectedFile) return;
    setDownloading(true);
    downloadFile(selectedFile.id, selectedFile.name).finally(() => setDownloading(false));
  };

  const handleSaveTags = async () => {
    if (!selectedFile) return;
    const newNames = tagInput.split(',').map((n) => n.trim()).filter(Boolean);
    const currentNames = selectedFile.tags || [];
    const toAdd = newNames.filter((n) => !currentNames.includes(n));
    const toRemove = currentNames.filter((n) => !newNames.includes(n));
    try {
      if (toAdd.length > 0) await tagApi.addTagsToFile(selectedFile.id, toAdd);
      if (toRemove.length > 0) {
        const map: Record<string, number> = {};
        tags.forEach((t) => { map[t.name] = t.id; });
        for (const name of toRemove) {
          const id = map[name];
          if (id) await tagApi.removeTagFromFile(selectedFile.id, id);
        }
      }
      setSelectedFile({ ...selectedFile, tags: newNames });
      await refreshTags();
    } catch (err) { console.error(err); }
    setEditingTags(false);
  };

  const handleRemoveTag = useCallback(async (tagName: string) => {
    if (!selectedFile) return;
    const map: Record<string, number> = {};
    tags.forEach((t) => { map[t.name] = t.id; });
    const tagId = map[tagName];
    if (!tagId) return;
    try {
      await tagApi.removeTagFromFile(selectedFile.id, tagId);
      const updatedTags = (selectedFile.tags || []).filter((n) => n !== tagName);
      setSelectedFile({ ...selectedFile, tags: updatedTags });
      await refreshTags();
    } catch (err) { console.error(err); }
  }, [selectedFile, tags, setSelectedFile, refreshTags]);

  const isImage = selectedFile?.mime_type?.startsWith('image/');
  const isVideo = selectedFile?.mime_type?.startsWith('video/');
  const isAudio = selectedFile?.mime_type?.startsWith('audio/');

  if (!selectedFile) {
    return (
      <div className="w-72 border-l p-4 hidden md:flex items-center justify-center" style={{ background: 'var(--db-bg)', borderColor: 'var(--db-border)' }}>
        <div className="text-xs" style={{ color: 'var(--db-text-tertiary)' }}>No file selected</div>
      </div>
    );
  }

  return (
    <div className="w-72 border-l overflow-y-auto flex-shrink-0 hidden md:block" style={{ background: 'var(--db-bg)', borderColor: 'var(--db-border)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3" style={{ borderBottom: '1px solid var(--db-border)' }}>
        <span className="text-lg flex-shrink-0">{getFileIcon(selectedFile)}</span>
        <h2 className="text-sm font-semibold break-all line-clamp-2" style={{ color: 'var(--db-text-primary)' }}>{selectedFile.name}</h2>
      </div>

      {/* Preview */}
      <div className="p-3" style={{ borderBottom: '1px solid var(--db-border)' }}>
        {isImage && (
          <img src={fileApi.getStreamUrl(selectedFile.id)} alt={selectedFile.name}
            className="rounded-lg w-full h-auto max-h-48 object-contain border" style={{ borderColor: 'var(--db-border)' }} />
        )}
        {isVideo && <VideoPlayer src={fileApi.getStreamUrl(selectedFile.id)} fileId={selectedFile.id} />}
        {isAudio && <audio controls src={fileApi.getStreamUrl(selectedFile.id)} className="w-full" />}
      </div>

      {/* Metadata */}
      <div className="p-3 space-y-2" style={{ borderBottom: '1px solid var(--db-border)' }}>
        <MetaRow label="Size" value={formatBytes(selectedFile.size)} />
        {selectedFile.mime_type && <MetaRow label="Type" value={selectedFile.mime_type} />}
        <MetaRow label="Uploaded" value={formatDate(selectedFile.upload_date)} />
        <MetaRow label="Created" value={formatDate(selectedFile.created_at)} />
        <MetaRow label="Updated" value={formatDate(selectedFile.updated_at)} />
      </div>

      {/* Tags */}
      <div className="p-3" style={{ borderBottom: '1px solid var(--db-border)' }}>
        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--db-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tags</div>
        {!editingTags ? (
          <div className="space-y-1">
            {selectedFile.tags && selectedFile.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedFile.tags.map((tag) => (
                  <span key={tag}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs group"
                    style={{ background: 'var(--db-blue-light)', color: 'var(--db-blue)' }}>
                    #{tag}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag); }}
                      className="rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 p-0.5 ml-0.5"
                      title={`Remove tag "${tag}"`}
                      style={{ opacity: 0.6 }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs" style={{ color: 'var(--db-text-tertiary)' }}>No tags</div>
            )}
            <Button variant="ghost" onClick={() => setEditingTags(true)}>Edit Tags</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              className="w-full rounded-lg px-2 py-1.5 text-xs" rows={3}
              style={{ background: 'var(--db-bg-secondary)', border: '1px solid var(--db-border)', color: 'var(--db-text-primary)' }}
              placeholder="Comma-separated tags" />
            <div className="flex gap-1">
              <Button variant="primary" onClick={handleSaveTags}>Save</Button>
              <Button variant="ghost" onClick={() => setEditingTags(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3">
        <Button variant="primary" onClick={handleDownload} disabled={downloading}>
          <svg className="mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {downloading ? 'Downloading…' : 'Download'}
        </Button>
      </div>
    </div>
  );
};

const MetaRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-xs">
    <span style={{ color: 'var(--db-text-tertiary)' }}>{label}</span>
    <span style={{ color: 'var(--db-text-primary)' }} className="text-right ml-2 truncate">{value}</span>
  </div>
);

export default DetailsPanel;