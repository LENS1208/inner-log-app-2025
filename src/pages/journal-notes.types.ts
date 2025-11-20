export type FolderKind = 'all' | 'daily' | 'trade' | 'free' | 'unlinked';

export type NoteListItem = {
  id: string;
  title: string;
  kind: '日次' | '取引' | '自由';
  updatedAt: string;
  dateKey: string;
  linked: boolean;
  pnlYen?: number;
  memoPreview?: string;
};

export type JournalNotesHandlers = {
  onSelectFolder?: (folder: FolderKind) => void;
  onLink?: (noteId: string) => void;
  onOpenNote?: (noteId: string) => void;
};
