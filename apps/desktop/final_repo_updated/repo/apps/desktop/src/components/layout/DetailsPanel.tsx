import React, { useState, useEffect } from 'react';
import { useSelection } from '../../hooks/useSelection';
import { useTags } from '../../hooks/useTags';
import { getFileIcon } from '../../utils/icons';
import { formatBytes, formatDate } from '../../utils/format';
import Button from '../common/Button';
import * as fileApi from '../../api/files';
import * as tagApi from '../../api/tags';
import VideoPlayer from '../common/VideoPlayer';

/**
 * A side panel displaying details about the currently selected file. If
 * no file is selected a placeholder message is shown. For image
 * files an inline preview is rendered using the streaming endpoint.
 * Users can initiate a download from this panel.
 */
const DetailsPanel: React.FC = () => {
  const { selectedFile, setSelectedFile } = useSelection();
  const { tags, refresh: refreshTags } = useTags();
  const [downloading, setDownloading] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // When editing begins, populate tag input with current tags
  useEffect(() => {
    if (editingTags && selectedFile) {
      const currentTags = selectedFile.tags ?? [];
      setTagInput(currentTags.join(', '));
    }
  }, [editingTags, selectedFile]);

  const handleDownload = async () => {
    if (!selectedFile) return;
    setDownloading(true);
    try {
      await fileApi.downloadFile(selectedFile.id);
    } catch (err) {
      console.error(err);
    }
    setDownloading(false);
  };

  // Save tags: compute additions/removals and call tag API accordingly
  const handleSaveTags = async () => {
    if (!selectedFile) return;
    const newNames = tagInput
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    const currentNames = selectedFile.tags || [];
    const toAdd = newNames.filter((n) => !currentNames.includes(n));
    const toRemove = currentNames.filter((n) => !newNames.includes(n));
    try {
      if (toAdd.length > 0) {
        await tagApi.addTagsToFile(selectedFile.id, toAdd);
      }
      if (toRemove.length > 0) {
        // Map tag names to IDs
        const map: Record<string, number> = {};
        tags.forEach((t) => {
          map[t.name] = t.id;
        });
        for (const name of toRemove) {
          const id = map[name];
          if (id) {
            await tagApi.removeTagFromFile(selectedFile.id, id);
          }
        }
      }
      // Update selectedFile locally
      setSelectedFile({ ...selectedFile, tags: newNames });
      await refreshTags();
    } catch (err) {
      console.error(err);
    }
    setEditingTags(false);
  };

  const isImage = selectedFile?.mime_type?.startsWith('image/');
  const isVideo = selectedFile?.mime_type?.startsWith('video/');
  const isAudio = selectedFile?.mime_type?.startsWith('audio/');

  if (!selectedFile) {
    return (
      <div className="w-72 border-l bg-gray-50 p-4 hidden md:block">
        <div className="text-gray-500 text-sm">No file selected</div>
      </div>
    );
  }

  return (
    <div className="w-72 border-l bg-gray-50 p-4 overflow-y-auto hidden md:block space-y-4">
      <div className="flex items-center space-x-2">
        <span className="text-2xl">{getFileIcon(selectedFile)}</span>
        <h2 className="text-lg font-semibold break-all flex-1">{selectedFile.name}</h2>
      </div>
      {/* Preview */}
      {isImage && (
        <div>
          <img
            src={fileApi.getStreamUrl(selectedFile.id)}
            alt={selectedFile.name}
            className="rounded-md w-full h-auto max-h-48 object-contain border"
          />
        </div>
      )}
      {isVideo && (
        <div>
          <VideoPlayer
            src={fileApi.getStreamUrl(selectedFile.id)}
            fileId={selectedFile.id}
          />
        </div>
      )}
      {isAudio && (
        <div>
          <audio
            controls
            src={fileApi.getStreamUrl(selectedFile.id)}
            className="w-full"
          />
        </div>
      )}
      {/* Metadata */}
      <div className="space-y-1 text-sm">
        <div>
          <span className="font-medium">Size:</span>{' '}
          <span>{formatBytes(selectedFile.size)}</span>
        </div>
        {selectedFile.mime_type && (
          <div>
            <span className="font-medium">Type:</span>{' '}
            <span>{selectedFile.mime_type}</span>
          </div>
        )}
        <div>
          <span className="font-medium">Uploaded:</span>{' '}
          <span>{formatDate(selectedFile.upload_date)}</span>
        </div>
        <div>
          <span className="font-medium">Created:</span>{' '}
          <span>{formatDate(selectedFile.created_at)}</span>
        </div>
        <div>
          <span className="font-medium">Updated:</span>{' '}
          <span>{formatDate(selectedFile.updated_at)}</span>
        </div>
      </div>
      {/* Tags */}
      <div>
        <div className="font-medium text-sm mb-1">Tags:</div>
        {!editingTags ? (
          <div className="space-y-1">
            {selectedFile.tags && selectedFile.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1 text-sm">
                {selectedFile.tags.map((tag) => (
                  <span key={tag} className="px-1 py-0.5 bg-gray-200 rounded text-gray-700">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No tags</div>
            )}
            <Button variant="secondary" onClick={() => setEditingTags(true)} className="mt-2">
              Edit Tags
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Enter comma-separated tags"
            />
            <div className="flex space-x-2">
              <Button variant="primary" onClick={handleSaveTags}>Save</Button>
              <Button variant="secondary" onClick={() => setEditingTags(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
      {/* Actions */}
      <div className="flex space-x-2">
        <Button variant="primary" onClick={handleDownload} disabled={downloading}>
          {downloading ? 'Downloading…' : 'Download'}
        </Button>
      </div>
    </div>
  );
};

export default DetailsPanel;
