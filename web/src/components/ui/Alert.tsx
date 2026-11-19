interface AlertProps {
  kind?: 'error' | 'success' | 'info' | 'warning';
  children: React.ReactNode;
}

export default function Alert({ kind = 'info', children }: AlertProps) {
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
