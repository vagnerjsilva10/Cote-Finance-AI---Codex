import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TableProps = {
  head: ReactNode;
  body: ReactNode;
  className?: string;
};

export function Table({ head, body, className }: TableProps) {
  return (
    <div className={cn('table-premium', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead>{head}</thead>
          <tbody>{body}</tbody>
        </table>
      </div>
    </div>
  );
}