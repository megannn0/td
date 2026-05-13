import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useSelection, SortField, SortDirection } from '../../hooks/useSelection';
import { useFiles } from '../../hooks/useFiles';
import { useFolders } from '../../hooks/useFolders';
import { useUpload } from '../../hooks/useUpload';
import { useTransfers } from '../../hooks/useTransfers';
import ContextMenu, { ContextMenuItem } from '../common/ContextMenu';
import FolderPickerDialog from '../common/FolderPickerDialog';
import * as filesApi from '../../api/files';
import { downloadFile } from '../../utils/download';
import FileTable from './FileTable';
import FileGrid from './FileGrid';
import DropZone from './DropZone';
import EmptyState from './EmptyState';
import Breadcrumbs from './Breadcrumbs';
import type { File as AppFile } from '../../types/file';
import type { Folder } from '../../types/folder';
import type { ExplorerItem } from './FileCard';
import { dispatchRefresh, REFRESH_ALL } from '../../utils/events';
import { useClipboard } from '../../hooks/useClipboard';

function isFile(item: ExplorerItem): item is AppFile & { type?: 'file' } {
  return (item as AppFile).mime_type !== undefined;
}

function compareByField(a: ExplorerItem, b: ExplorerItem, field: SortField, dir: SortDirection): number {
  const mul = dir === 'asc' ? 1 : -1;
  if (field === 'name') return mul * a.name.localeCompare(b.name);
  if (field === 'size') {
    const aSize = isFile(a) ? (a as AppFile).size : 0;
    const bSize = isFile(b) ? (b as AppFile).size : 0;
    return mul * (aSize - bSize);
  }
  if (field === 'date') {
    const aDate = new Date((a as any).created_at || 0).getTime();
    const bDate = new Date((b as any).created_at || 0).getTime();
    return mul * (aDate - bDate);
  }
  if (field === 'type') {
    const aType = isFile(a) ? (a as AppFile).mime_type || 'application/octet-stream' : 'inode/directory';
    const bType = isFile(b) ? (b as AppFile).mime_type || 'application/octet-stream' : 'inode/directory';
    return mul * aType.localeCompare(bType);
  }
  return 0;
}

interface DragRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const FileExplorer: React.FC = () => {
  const {
    currentFolderId,
    setCurrentFolderId,
    selectedFile,
    setSelectedFile,
    viewMode,
    search,
    sortField,
    sortDirection,
    setPreviewFile,
  } = useSelection();
  const { files, loading: filesLoading, error: filesError, refresh: refreshFiles } =
    useFiles(currentFolderId, search);
  const { folders, update: updateFolder, remove: removeFolder, refresh: refreshFolders } = useFolders(currentFolderId);
  const { uploadFiles, uploading } = useUpload();
  const { refresh: refreshTransfers } = useTransfers();
  const { clipboard, copyToClipboard, clearClipboard } = useClipboard();

  // Single selected item (for highlighting / details panel)
  const [selectedItem, setSelectedItem] = useState<ExplorerItem | null>(null);
  // Multi-selection set: keyed by "file-<id>" or "folder-<id>"
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Last clicked index for shift-select
  const [lastClickIndex, setLastClickIndex] = useState<number | null>(null);

  // Move/copy dialog
  const [moveDialog, setMoveDialog] = useState<{
    open: boolean;
    items: ExplorerItem[];
    mode: 'move' | 'copy';
  }>({ open: false, items: [], mode: 'move' });

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    item: ExplorerItem | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, item: null });

  // Combined and sorted items list
  const items: ExplorerItem[] = useMemo(() => {
    const combined: ExplorerItem[] = [
      ...folders.map((f) => ({ ...f } as ExplorerItem)),
      ...files.map((f) => ({ ...f } as ExplorerItem)),
    ];
    combined.sort((a, b) => compareByField(a, b, sortField, sortDirection));
    return combined;
  }, [folders, files, sortField, sortDirection]);

  const itemKey = (item: ExplorerItem): string =>
    isFile(item) ? `file-${item.id}` : `folder-${(item as Folder).id}`;

  const isSelected = (item: ExplorerItem): boolean => selectedIds.has(itemKey(item));

  const handleSelect = useCallback((item: ExplorerItem, event?: React.MouseEvent) => {
    const key = itemKey(item);
    const idx = items.findIndex((i) => itemKey(i) === key);

    if (event?.shiftKey && lastClickIndex !== null) {
      // Range select
      const start = Math.min(lastClickIndex, idx);
      const end = Math.max(lastClickIndex, idx);
      const newSet = new Set(selectedIds);
      for (let i = start; i <= end; i++) {
        newSet.add(itemKey(items[i]));
      }
      setSelectedIds(newSet);
    } else if (event?.ctrlKey || event?.metaKey) {
      // Toggle select
      const newSet = new Set(selectedIds);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      setSelectedIds(newSet);
    } else {
      // Single select
      setSelectedIds(new Set([key]));
    }

    setLastClickIndex(idx);
    setSelectedItem(item);

    if (isFile(item)) {
      setSelectedFile(item as AppFile);
    } else {
      setSelectedFile(null);
    }
  }, [items, lastClickIndex, selectedIds, setSelectedFile]);

  const handleOpen = (item: ExplorerItem) => {
    if (!isFile(item)) {
      const folder = item as Folder;
      setCurrentFolderId(folder.id);
      setSelectedItem(null);
      setSelectedFile(null);
      setSelectedIds(new Set());
      setLastClickIndex(null);
    } else {
      setSelectedFile(item as AppFile);
      setPreviewFile(item as AppFile);
    }
  };

  const handleContextMenu = (item: ExplorerItem, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // If right-clicking on an unselected item, select only that item
    if (!selectedIds.has(itemKey(item))) {
      setSelectedIds(new Set([itemKey(item)]));
      setSelectedItem(item);
      if (isFile(item)) {
        setSelectedFile(item as AppFile);
      } else {
        setSelectedFile(null);
      }
    }

    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      item,
    });
  };

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false, item: null }));
  }, []);

  // Get all currently selected items
  const getSelectedItems = (): ExplorerItem[] => {
    return items.filter((i) => selectedIds.has(itemKey(i)));
  };

  const handleMoveItems = async (targetFolderId: number | null) => {
    const toMove = moveDialog.items;
    for (const item of toMove) {
      if (isFile(item)) {
        await filesApi.updateFile(item.id, { folder_id: targetFolderId });
      } else {
        await updateFolder((item as Folder).id, { parentId: targetFolderId });
      }
    }
    setMoveDialog({ open: false, items: [], mode: 'move' });
    dispatchRefresh(REFRESH_ALL);
  };

  // Drag and drop: files/folders being dragged onto a folder
  const handleDropOnFolder = async (targetFolder: Folder, draggedItem: ExplorerItem) => {
    // Move the dragged item(s) into the target folder
    const toMove = selectedIds.has(itemKey(draggedItem)) ? getSelectedItems() : [draggedItem];

    for (const item of toMove) {
      if (isFile(item)) {
        await filesApi.updateFile(item.id, { folder_id: targetFolder.id });
      } else {
        const f = item as Folder;
        if (f.id !== targetFolder.id) {
          await updateFolder(f.id, { parentId: targetFolder.id });
        }
      }
    }
    dispatchRefresh(REFRESH_ALL);
  };

  // Build context menu items matching the screenshot layout:
  // Open, Download, separator, Cut, Copy, Paste, separator, Rename, Delete, separator, Folder color, separator, Properties
  const contextMenuItems: ContextMenuItem[] = useMemo(() => {
    const i = contextMenu.item;
    if (!contextMenu.isOpen || !i) return [];
    const menuItems: ContextMenuItem[] = [];
    const selectedItems = getSelectedItems();
    const multiSelect = selectedItems.length > 1;

    // Open
    if (!multiSelect) {
      menuItems.push({
        label: 'Open',
        onClick: () => {
          if (isFile(i)) {
            setSelectedFile(i as AppFile);
            setSelectedItem(i);
            setPreviewFile(i as AppFile);
          } else {
            const folder = i as Folder;
            setCurrentFolderId(folder.id);
            setSelectedItem(null);
            setSelectedFile(null);
            setSelectedIds(new Set());
          }
        },
      });
    }

    // Download (files only)
    if (isFile(i) && !multiSelect) {
      menuItems.push({
        label: 'Download',
        onClick: async () => {
          await downloadFile((i as AppFile).id, (i as AppFile).name);
        },
      });
    }

    menuItems.push({ label: '', separator: true });

    // Cut
    if (isFile(i) && !multiSelect) {
      menuItems.push({
        label: 'Cut',
        onClick: () => {
          copyToClipboard(i as AppFile, 'cut');
        },
      });
    }

    // Copy
    if (isFile(i) && !multiSelect) {
      menuItems.push({
        label: 'Copy',
        onClick: () => {
          copyToClipboard(i as AppFile, 'copy');
        },
      });
    }

    // Paste
    if (clipboard) {
      menuItems.push({
        label: 'Paste',
        onClick: async () => {
          const targetFolder = isFile(i) ? currentFolderId : (i as Folder).id;
          if (clipboard.mode === 'copy') {
            await filesApi.copyFile(clipboard.file.id, targetFolder);
          } else if (clipboard.mode === 'cut') {
            await filesApi.updateFile(clipboard.file.id, { folder_id: targetFolder });
            clearClipboard();
          }
          dispatchRefresh(REFRESH_ALL);
        },
      });
    }

    menuItems.push({ label: '', separator: true });

    // Rename
    if (!multiSelect) {
      menuItems.push({
        label: 'Rename',
        onClick: async () => {
          if (isFile(i)) {
            const newName = prompt('Rename:', (i as AppFile).name);
            if (newName && newName.trim()) {
              await filesApi.updateFile((i as AppFile).id, { name: newName.trim() });
              dispatchRefresh(REFRESH_ALL);
            }
          } else {
            const currentName = (i as Folder).name;
            const newName = prompt('New folder name:', currentName);
            if (newName && newName.trim() && newName.trim() !== currentName) {
              await updateFolder((i as Folder).id, { name: newName.trim() });
              dispatchRefresh(REFRESH_ALL);
            }
          }
        },
      });
    }

    // Delete
    if (multiSelect) {
      menuItems.push({
        label: `Delete ${selectedItems.length} items`,
        danger: true,
        onClick: async () => {
          if (!confirm(`Delete ${selectedItems.length} items?`)) return;
          for (const it of selectedItems) {
            if (isFile(it)) {
              await filesApi.deleteFile((it as AppFile).id);
            } else {
              await removeFolder((it as Folder).id);
            }
          }
          dispatchRefresh(REFRESH_ALL);
          setSelectedFile(null);
          setSelectedItem(null);
          setSelectedIds(new Set());
        },
      });
    } else {
      menuItems.push({
        label: 'Delete',
        danger: true,
        onClick: async () => {
          if (isFile(i)) {
            if (!confirm(`Delete "${(i as AppFile).name}"?`)) return;
            await filesApi.deleteFile((i as AppFile).id);
          } else {
            if (!confirm('Delete this folder and all its contents?')) return;
            await removeFolder((i as Folder).id);
          }
          dispatchRefresh(REFRESH_ALL);
          setSelectedFile(null);
          setSelectedItem(null);
          setSelectedIds(new Set());
        },
      });
    }

    // Folder color (folders only)
    if (!isFile(i) && !multiSelect) {
      menuItems.push({ label: '', separator: true });
      menuItems.push({
        label: 'Folder color',
        onClick: () => {
          alert('Folder color customization will be available in a future update.');
        },
      });
    }

    // Properties
    if (!multiSelect) {
      menuItems.push({ label: '', separator: true });
      menuItems.push({
        label: 'Properties',
        onClick: () => {
          if (isFile(i)) {
            setSelectedFile(i as AppFile);
          }
          setSelectedItem(i);
        },
      });
    }

    return menuItems;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextMenu.isOpen, contextMenu.item, selectedIds, clipboard]);

  const onDropFiles = async (dropped: File[]) => {
    if (dropped.length === 0) return;
    await uploadFiles(dropped, currentFolderId);
    dispatchRefresh(REFRESH_ALL);
  };

  // -- Drag (rubber-band) selection logic --

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragRect, setDragRect] = useState<DragRect | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag selection on left mouse button, not on modifier keys,
    // and not when clicking on an interactive element (context menu, etc.)
    if (e.button !== 0) return;
    if (e.shiftKey || e.ctrlKey || e.metaKey) return;

    // Check if click target is a draggable item (file card/row) — if so, don't start drag select
    const target = e.target as HTMLElement;
    if (target.closest('[data-item-key]')) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    // Clear selection immediately on empty-space click
    setSelectedIds(new Set());
    setSelectedItem(null);
    setSelectedFile(null);
    setLastClickIndex(null);
    setDragRect(null);

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragStartRef.current) return;
      const containerRect = container.getBoundingClientRect();
      const currentX = ev.clientX - containerRect.left;
      const currentY = ev.clientY - containerRect.top;

      const left = Math.min(dragStartRef.current.x, currentX);
      const top = Math.min(dragStartRef.current.y, currentY);
      const width = Math.abs(currentX - dragStartRef.current.x);
      const height = Math.abs(currentY - dragStartRef.current.y);

      setDragRect({ left, top, width, height });

      // Compute items that intersect the selection rectangle
      const newSet = new Set<string>();
      const selectionBox: DOMRect = new DOMRect(
        left + containerRect.left,
        top + containerRect.top,
        width,
        height,
      );

      container.querySelectorAll<HTMLElement>('[data-item-key]').forEach((el) => {
        const elRect = el.getBoundingClientRect();
        if (
          elRect.left < selectionBox.right &&
          elRect.right > selectionBox.left &&
          elRect.top < selectionBox.bottom &&
          elRect.bottom > selectionBox.top
        ) {
          newSet.add(el.getAttribute('data-item-key') || '');
        }
      });

      setSelectedIds(newSet);
      setLastClickIndex(null);
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
      setDragRect(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  let content;
  if (filesLoading) {
    content = (
      <div className="p-4 text-center text-gray-500">Loading…</div>
    );
  } else if (filesError) {
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
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onOpen={handleOpen}
        onContextMenu={handleContextMenu}
        onDropOnFolder={handleDropOnFolder}
      />
    ) : (
      <FileTable
        items={items}
        selectedItem={selectedItem}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onOpen={handleOpen}
        onContextMenu={handleContextMenu}
        onDropOnFolder={handleDropOnFolder}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col overflow-y-auto relative"
      onMouseDown={handleMouseDown}
    >
      <div className="p-2">
        <Breadcrumbs />
      </div>
      <DropZone onFiles={onDropFiles}>{content}</DropZone>
      {/* Drag selection rectangle overlay */}
      {dragRect && (
        <div
          className="pointer-events-none absolute z-50"
          style={{
            left: dragRect.left,
            top: dragRect.top,
            width: dragRect.width,
            height: dragRect.height,
            background: 'rgba(0, 97, 255, 0.08)',
            border: '1px solid rgba(0, 97, 255, 0.5)',
            borderRadius: 3,
          }}
        />
      )}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={contextMenuItems}
        onClose={closeContextMenu}
      />
      <FolderPickerDialog
        title={moveDialog.mode === 'move' ? 'Move to folder' : 'Copy to folder'}
        open={moveDialog.open}
        onSelect={handleMoveItems}
        onCancel={() => setMoveDialog({ open: false, items: [], mode: 'move' })}
        excludeIds={
          moveDialog.items
            .filter((i) => !isFile(i))
            .map((i) => (i as Folder).id)
        }
      />
    </div>
  );
};

export default FileExplorer;