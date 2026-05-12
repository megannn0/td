import React, { createContext, useContext, useState } from 'react';
import type { File } from '../types/file';

export type SortField = 'name' | 'size' | 'date' | 'type';
export type SortDirection = 'asc' | 'desc';

// Defines the selection and navigation state used throughout the UI.
interface SelectionContextValue {
  /** Currently selected file. */
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  /** ID of the folder currently being viewed. Null indicates the root. */
  currentFolderId: number | null;
  setCurrentFolderId: (id: number | null) => void;
  /** Preferred view mode for the file explorer. */
  viewMode: 'list' | 'grid';
  setViewMode: (mode: 'list' | 'grid') => void;
  /** Search term applied to file listing. */
  search: string;
  setSearch: (value: string) => void;
  /** Sort configuration */
  sortField: SortField;
  setSortField: (field: SortField) => void;
  sortDirection: SortDirection;
  setSortDirection: (dir: SortDirection) => void;

  /**
   * Current top‑level section the user is viewing. Defaults to
   * "files".  Other options include "tags", "playlists",
   * "virtualFolders", and "settings".
   */
  currentSection: Section;
  setCurrentSection: (section: Section) => void;

  /** ID of the currently selected virtual folder. Null if none selected. */
  selectedVirtualFolderId: number | null;
  setSelectedVirtualFolderId: (id: number | null) => void;
  /** ID of the currently selected playlist. Null if none selected. */
  selectedPlaylistId: number | null;
  setSelectedPlaylistId: (id: number | null) => void;
  /** Name of the currently selected tag for tag filtering. Null if none. */
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
}

/**
 * Union type for the high‑level navigation sections.  Defining this
 * alias separately avoids older versions of TypeScript misparsing
 * multi‑line string literal unions within generic type parameters.
 */
export type Section = 'files' | 'tags' | 'playlists' | 'virtualFolders' | 'settings';

const SelectionContext = createContext<SelectionContextValue | undefined>(
  undefined,
);

/** Provider component for selection and navigation state. Wrap your
 * application in this provider so that descendant components can
 * access and update the current folder, selected file and view mode.
 */
export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem('viewMode');
      if (saved === 'list' || saved === 'grid') return saved;
      const settings = localStorage.getItem('telegramDriveSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.viewMode === 'list' || parsed.viewMode === 'grid') return parsed.viewMode;
      }
    } catch { /* ignore */ }
    return 'grid';
  });
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentSection, setCurrentSection] = useState<Section>('files');
  const [selectedVirtualFolderId, setSelectedVirtualFolderId] = useState<number | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  return (
    <SelectionContext.Provider
      value={{
        selectedFile,
        setSelectedFile,
        currentFolderId,
        setCurrentFolderId,
        viewMode,
        setViewMode,
        search,
        setSearch,
        sortField,
        setSortField,
        sortDirection,
        setSortDirection,
        currentSection,
        setCurrentSection,
        selectedVirtualFolderId,
        setSelectedVirtualFolderId,
        selectedPlaylistId,
        setSelectedPlaylistId,
        selectedTag,
        setSelectedTag,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return ctx;
}