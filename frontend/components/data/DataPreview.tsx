'use client';

interface DataPreviewProps {
  data: {
    columns: string[];
    rows: number;
    preview: Record<string, any>[];
    dtypes: Record<string, string>;
    filename?: string;
  };
}

const TableIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const RowsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const ColumnsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
  </svg>
);

export default function DataPreview({ data }: DataPreviewProps) {
  if (!data || !data.preview || data.preview.length === 0) {
    return null;
  }

  const numRows = data.rows;
  const numCols = data.columns.length;

  return (
    <div className="w-full bg-white rounded-xl border border-[#FFEDC1] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-[#FFEDC1] bg-[#FFF7EA]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEB229] flex items-center justify-center text-[#470102] shadow-lg shadow-[#FEB229]/20">
            <TableIcon />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#470102] tracking-wide">
              Data Preview
            </h3>
            {data.filename && (
              <p className="text-sm text-[#8A5A5A] font-medium">{data.filename}</p>
            )}
            <p className="text-xs text-[#8A5A5A]/70 mt-1">Showing first 5 columns</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FFF7EA] rounded-lg text-[#8A5A5A] text-xs font-medium border border-[#FFEDC1]">
            <RowsIcon />
            <span>{numRows.toLocaleString()} rows</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FFF7EA] rounded-lg text-[#8A5A5A] text-xs font-medium border border-[#FFEDC1]">
            <ColumnsIcon />
            <span>{numCols} columns</span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <table className="w-full border-separate border-spacing-0 table-fixed">
          <thead className="bg-[#FFF7EA]">
            <tr>
              <th className="w-12 px-4 py-3 text-left text-xs font-medium text-[#470102] uppercase tracking-wider sticky left-0 bg-[#FFF7EA] border-b border-[#FFEDC1] z-20 shadow-[2px_0_5px_-2px_rgba(71,1,2,0.1)]">
                #
              </th>
              {(() => {
                // Logic to determine visible columns
                const visibleCols = data.columns.length > 6
                  ? [...data.columns.slice(0, 4), '...', data.columns[data.columns.length - 1]]
                  : data.columns;

                return visibleCols.map((col, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-3 text-left text-xs font-medium text-[#470102] uppercase tracking-wider border-b border-[#FFEDC1] bg-[#FFF7EA] truncate"
                  >
                    {col === '...' ? (
                      <div className="text-[#8A5A5A] font-bold text-lg text-center">...</div>
                    ) : (
                      <>
                        <div className="text-[#470102] font-semibold normal-case flex items-center gap-2 truncate" title={col}>
                          {col}
                        </div>
                        <div className="text-xs text-[#8A5A5A] font-normal mt-0.5 truncate">
                          {data.dtypes[col]}
                        </div>
                      </>
                    )}
                  </th>
                ));
              })()}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#FFEDC1] bg-white">
            {data.preview.slice(0, 5).map((row, rowIdx) => {
              const visibleCols = data.columns.length > 6
                ? [...data.columns.slice(0, 4), '...', data.columns[data.columns.length - 1]]
                : data.columns;

              return (
                <tr key={rowIdx} className="hover:bg-[#FFF7EA] transition-colors group">
                  <td className="px-4 py-3 text-sm text-[#8A5A5A] group-hover:text-[#470102] sticky left-0 bg-white group-hover:bg-[#FFF7EA] z-10 shadow-[2px_0_5px_-2px_rgba(71,1,2,0.1)] transition-colors border-b border-[#FFEDC1]">
                    {rowIdx + 1}
                  </td>
                  {visibleCols.map((col, cellIdx) => (
                    <td
                      key={cellIdx}
                      className="px-4 py-3 text-sm text-[#470102] border-b border-[#FFEDC1] truncate max-w-[150px]"
                      title={col !== '...' && row[col] ? String(row[col]) : undefined}
                    >
                      {col === '...' ? (
                        <div className="text-[#8A5A5A] text-center">...</div>
                      ) : (
                        row[col] === null || row[col] === undefined ? (
                          <span className="text-red-400/70 italic text-xs px-2 py-0.5 bg-red-500/10 rounded">null</span>
                        ) : (
                          String(row[col])
                        )
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {numRows > 5 && (
        <div className="px-4 py-3 bg-[#FFF7EA] border-t border-[#FFEDC1] text-center">
          <p className="text-sm text-[#8A5A5A]">
            Showing first 5 rows of {numRows.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}