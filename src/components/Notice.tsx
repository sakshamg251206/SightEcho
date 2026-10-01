import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Notice({
  tone,
  title,
  children,
  action,
}: {
  tone: 'error' | 'warning' | 'info';
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={tone === 'info' ? 'lock' : 'alert'} className="notice__icon" />
      <div className="notice__body">
        {title && <p className="notice__title">{title}</p>}
        <div>{children}</div>
        {action && <div className="notice__action">{action}</div>}
      </div>
    </div>
  );
}
