import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  /** Right-aligned numeric column. */
  numeric?: boolean;
  width?: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
}: {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return <div className="py-10 text-center text-[13px] text-ink/45">{empty ?? 'Nothing to show.'}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-ink/[0.08]">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink/40 ${c.numeric ? 'text-right' : ''}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-ink/[0.05] last:border-0 ${onRowClick ? 'cursor-pointer transition-colors hover:bg-ink/[0.03]' : ''}`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-3 align-middle text-[13px] text-ink/80 ${c.numeric ? 'text-right tabular-nums' : ''}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className = '',
}: {
  tabs: Array<{ value: T; label: string; count?: number }>;
  active: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 overflow-x-auto border-b border-ink/[0.08] ${className}`}>
      {tabs.map((t) => {
        const on = t.value === active;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={`relative whitespace-nowrap px-3 py-2.5 text-[13px] font-medium transition-colors ${
              on ? 'text-ink' : 'text-ink/50 hover:text-ink/80'
            }`}
          >
            {t.label}
            {t.count !== undefined ? (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  on ? 'bg-ink text-white' : 'bg-ink/[0.07] text-ink/55'
                }`}
              >
                {t.count}
              </span>
            ) : null}
            {on ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-fit-500" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Compact filter chip row used above tables. */
export function FilterChips<T extends string>({
  options,
  active,
  onChange,
}: {
  options: Array<{ value: T; label: string; count?: number }>;
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((o) => {
        const on = o.value === active;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              on
                ? 'border-ink bg-ink text-white'
                : 'border-ink/12 bg-white text-ink/60 hover:border-ink/30 hover:text-ink'
            }`}
          >
            {o.label}
            {o.count !== undefined ? (
              <span className={`ml-1.5 tabular-nums ${on ? 'text-white/70' : 'text-ink/40'}`}>
                {o.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
