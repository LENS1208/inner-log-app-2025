import React from 'react';

type TableProps = {
  headers: string[];
  rows: React.ReactNode[][];
  style?: React.CSSProperties;
};

export default function Table({ headers, rows, style }: TableProps) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', ...style }}>
      <thead>
        <tr>
          {headers.map((header, idx) => (
            <th key={idx} style={{ textAlign: 'left', padding: '6px' }}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIdx) => (
          <tr key={rowIdx}>
            {row.map((cell, cellIdx) => (
              <td key={cellIdx} style={{ padding: '6px' }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
