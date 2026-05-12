import React, { useState, useMemo } from 'react';
import { useSelection } from '../../hooks/useSelection';
import { useFiles } from '../../hooks/useFiles';
import { useFolders } from '../../hooks/useFolders';
import { useUpload } from '../../hooks/useUpload';
import { useTransfers } from '../../hooks/useTransfers';
import ContextMenu, { ContextMenuItem } from '../common/ContextMenu';
import * as filesApi from '../../api/files';
import FileTable from './FileTable';
import FileGrid from './FileGrid';
import DropZone from './DropZone';
import EmptyState from './EmptyState';
import Breadcrumbs from './Breadcrumbs';
import type { File } from '../../types/file';
import type { Folder } from '../../types/folder';

// Define a union type for explorer items used by grid/list components
export type ExplorerItem = (File & { type?: 'file' }) | (Folder & { type?: 'folder' });

const FileExplorer: React.FC = () => {
  const {
    currentFolderId,
    setCurrentFolderId,
    selectedFile,
    setSelectedFile,
    viewMode,
    search,
  } = useSelection();
  const { files, loading: filesLoading, error: filesError, refresh: refreshFiles } =
    useFiles(currentFolderId, search);
  const { folders, update: updateFolder, remove: removeFolder, refresh: refreshFolders } = useFolders(currentFolderId);
  const { uploadFiles, uploading } = useUpload();

  // Obtain the refresh function for transfers so that initiating a
  // download via the context menu can trigger an immediate refresh of
  // the transfer list.  We ignore the returned transfers array since
  // FileExplorer does not display it directly.
  const { refresh: refreshTransfers } = useTransfers();
  // Local selected item for highlighting (can be file or folder)
  const [selectedItem, setSelectedItem] = useState<ExplorerItem | null>(null);

  // Context menu state. When isOpen is true the menu is displayed at
  // the given position for the specified item.
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    item: ExplorerItem | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, item: null });

  // Combine folders and files into a single list; folders first
  const items: ExplorerItem[] = [
    ...folders.map((f) => ({ ...f } as ExplorerItem)),
    ...files.map((f) => ({ ...f } as ExplorerItem)),
  ];

  const handleSelect = (item: ExplorerItem) => {
    setSelectedItem(item);
    // Update global selectedFile if item is a file
    if ((item as File).mime_type !== undefined) {
      setSelectedFile(item as File);
    } else {
      setSelectedFile(null);
    }
  };

  const handleOpen = (item: ExplorerItem) => {
    // Opening a folder navigates into it
    if ((item as File).mime_type === undefined) {
      const folder = item as Folder;
      setCurrentFolderId(folder.id);
      setSelectedItem(null);
      setSelectedFile(null);
    } else {
      // For files double click selects them (selection already occurs on click)
    }
  };

  // Show a custom context menu instead of the browser default.  The
  // event is prevented and the menu state is updated with the clicked
  // item and mouse coordinates.
  const handleContextMenu = (item: ExplorerItem, event: React.MouseEvent) => {
    event.preventDefault();
    setSelectedItem(item);
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      item,
    });
  };

  const closeContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, isOpen: false, item: null }));
  };

  // Build the list of context menu actions based on the type of the
  // selected item.  This uses useMemo to avoid regenerating the
  // array on every render.  Note that setSelectedFile, handleOpen
  // and other functions from hooks are stable and can be safely
  // captured here.
  const contextMenuItems: ContextMenuItem[] = useMemo(() => {
    const i = contextMenu.item;
    if (!contextMenu.isOpen || !i) return [];
    const items: ContextMenuItem[] = [];
    const isFile = (i as File).mime_type !== undefined;
    if (isFile) {
      // Preview/Open: select the file so the details panel shows the
      // preview.  We avoid calling handleOpen() for files since it
      // does nothing; instead we directly select the file here.
      items.push({ label: 'Open', onClick: () => {
        setSelectedFile(i as File);
        setSelectedItem(i);
      } });
      // Download: call the backend to start a transfer and refresh
      // transfers afterward so the transfer panel updates promptly.
      items.push({ label: 'Download', onClick: async () => {
        await filesApi.downloadFile((i as File).id);
        await refreshTransfers();
      } });
      // Edit Tags: select the file so details panel is shown.  The
      // details panel contains the edit tags button.
      items.push({ label: 'Edit Tags', onClick: () => {
        setSelectedFile(i as File);
      } });
      // Properties: show details panel
      items.push({ label: 'Properties', onClick: () => {
        setSelectedFile(i as File);
      } });
    } else {
      // Folder actions
      items.push({ label: 'Open', onClick: () => {
        const folder = i as Folder;
        setCurrentFolderId(folder.id);
        setSelectedItem(null);
        setSelectedFile(null);
      } });
      items.push({ label: 'Rename', onClick: async () => {
        const currentName = (i as Folder).name;
        const newName = prompt('New folder name:', currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
          await updateFolder((i as Folder).id, { name: newName.trim() });
          await refreshFolders();
          await refreshFiles();
        }
      } });
      items.push({ label: 'Delete', onClick: async () => {
        const confirmDelete = confirm('Delete this folder and all its contents?');
        if (!confirmDelete) return;
        await removeFolder((i as Folder).id);
        // After deletion refresh lists.  removeFolder already calls
        // refreshFolders internally, but we call refreshFiles to
        // ensure the file list updates when removing the current
        // folder.
        await refreshFiles();
        // Clear selected state if the deleted folder was selected
        setSelectedFile(null);
        setSelectedItem(null);
      } });
    }
    return items;
  }, [contextMenu, removeFolder, updateFolder, refreshFolders, refreshFiles, setSelectedFile, setSelectedItem, setCurrentFolderId, refreshTransfers]);

  const onDropFiles = async (dropped: File[]) => {
    if (dropped.length === 0) return;
    await uploadFiles(dropped, currentFolderId);
    await refreshFiles();
  };

  let content;
  if (filesLoading) {
    content = (
      <div className="p-4 text-center text-gray-500">Loading…</div>
    );
  } else if (filesError) {
    // Display the error message from the backend if available.  This
    // assists users and developers when API validation errors occur.
    content = (
      <div className="p-4 text-center text-red-500">
        Failed to load files: {filesError.message || 'Unknown error'}
      </div>
    );
  } else if (items.length === 0) {
    content = (
      <EmptyState message="This folder is empty">
        {uploading ? (
          <div className="mt-2 text-sm text-blue-600">Uploading…</div>
        ) : (
          <div className="mt-2 text-sm text-gray-600">
            Drag and drop files here to upload
          </div>
        )}
      </EmptyState>
    );
  } else {
    content = viewMode === 'grid' ? (
      <FileGrid
        items={items}
        selectedItem={selectedItem}
        onSelect={handleSelect}
        onOpen={handleOpen}
        onContextMenu={handleContextMenu}
      />
    ) : (
      <FileTable
        items={items}
        selectedItem={selectedItem}
        onSelect={handleSelect}
        onOpen={handleOpen}
        onContextMenu={handleContextMenu}
      />
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto relative">
      <div className="p-2">
        <Breadcrumbs />
      </div>
      <DropZone onFiles={onDropFiles}>{content}</DropZone>
      {/* Context menu overlay */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={contextMenuItems}
        onClose={closeContextMenu}
      />
    </div>
  );
};

export default FileExplorer;
