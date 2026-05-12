import React, { useEffect, useRef } from "react";
import * as fileApi from "../../api/files";
import * as folderApi from "../../api/folders";
import { useSelection } from "../../hooks/useSelection";
import type { File } from "../../types/file";
import type { Folder } from "../../types/folder";
import type { ExplorerItem } from "./FileCard";

interface ContextMenuProps {
  x: number;
  y: number;
  item: ExplorerItem;
  onClose: () => void;
  onRefreshFiles: () => Promise<void>;
}

/** Fix #6 – right-click context menu. Browser default is suppressed by the
 *  parent explorer's onContextMenu={e => e.preventDefault()} wrapper. */
const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, item, onClose, onRefreshFiles }) => {
  const { setSelectedFile, setCurrentFolderId } = useSelection();
  const isFile = (item as File).mime_type !== undefined;
  const file   = isFile ? (item as File) : null;
  const folder = !isFile ? (item as Folder) : null;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const handlePreviewOpen = () => {
    if (file)   setSelectedFile(file);
    else if (folder) setCurrentFolderId(folder.id);
    onClose();
  };

  const handleDownload = async () => {
    if (!file) return;
    try { await fileApi.downloadFile(file.id); } catch (e) { console.error(e); }
    onClose();
  };

  const handleEditTags = () => {
    if (!file) return;
    setSelectedFile(file);
    window.dispatchEvent(new CustomEvent("open-tag-editor", { detail: { fileId: file.id } }));
    onClose();
  };

  const handleRename = async () => {
    const cur = file ? file.name : folder!.name;
    const next = window.prompt("New name:", cur);
    if (!next || next === cur) { onClose(); return; }
    try {
      if (file)   alert("File rename is not yet supported by the backend.");
      else if (folder) { await folderApi.updateFolder(folder.id, { name: next }); await onRefreshFiles(); }
    } catch (e) { console.error(e); }
    onClose();
  };

  const handleDelete = async () => {
    const label = file ? file.name : folder!.name;
    if (!window.confirm(`Delete "${label}"?`)) { onClose(); return; }
    try {
      if (file)   alert("File deletion is not yet supported by the backend.");
      else if (folder) { await folderApi.deleteFolder(folder.id); await onRefreshFiles(); }
    } catch (e) { console.error(e); }
    onClose();
  };

  return (
    <div
      style={{ position: "fixed", top: y, left: x, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded shadow-lg py-1 min-w-[160px] text-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <button className="w-full text-left px-4 py-1.5 hover:bg-gray-100" onClick={handlePreviewOpen}>
        {folder ? "Open" : "Preview / Open"}
      </button>
      {file && (
        <button className="w-full text-left px-4 py-1.5 hover:bg-gray-100" onClick={handleDownload}>
          Download
        </button>
      )}
      {file && (
        <button className="w-full text-left px-4 py-1.5 hover:bg-gray-100" onClick={handleEditTags}>
          Edit Tags
        </button>
      )}
      <button className="w-full text-left px-4 py-1.5 hover:bg-gray-100" onClick={() => { setSelectedFile(file ?? null); onClose(); }}>
        Properties
      </button>
      <button className="w-full text-left px-4 py-1.5 hover:bg-gray-100" onClick={handleRename}>
        Rename {file ? "(folder only)" : ""}
      </button>
      <div className="my-1 border-t border-gray-100" />
      <button className="w-full text-left px-4 py-1.5 text-red-600 hover:bg-red-50" onClick={handleDelete}>
        Delete {file ? "(folder only)" : ""}
      </button>
    </div>
  );
};

export default ContextMenu;