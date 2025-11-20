import React from "react";
import type { LinkedNoteRow } from "./types";

type LinkedNotesTableProps = {
  notes: LinkedNoteRow[];
  onOpenNote?: (title: string) => void;
};

export function LinkedNotesTable({ notes, onOpenNote }: LinkedNotesTableProps) {
  return (
    <div className="section-block">
      <h3 className="section-title">リンク済みノート</h3>

      {notes.length === 0 ? (
        <div className="empty-state">リンク済みノートはありません</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>タイトル</th>
              <th style={{ fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>種類</th>
              <th style={{ fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>更新</th>
              <th style={{ fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((note, idx) => (
              <tr key={idx}>
                <td>{note.title}</td>
                <td>{note.kind}</td>
                <td>{note.updatedAt}</td>
                <td>
                  <button
                    className="action-btn"
                    onClick={() => onOpenNote?.(note.title)}
                  >
                    表示
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
