interface AdminPlaceholderPageProps {
  title: string
  description: string
  action: string
  fields: string[]
}

export function AdminPlaceholderPage({ title, description, action, fields }: AdminPlaceholderPageProps) {
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <small>Gerenciamento</small>
          <h1>{title}</h1>
        </div>
        <button type="button">{action}</button>
      </div>
      <section className="admin-panel">
        <p>{description}</p>
        <div className="admin-table">
          <div className="admin-table__head">
            {fields.map((field) => <span key={field}>{field}</span>)}
          </div>
          <div className="admin-table__empty">
            Nenhum registro configurado. Os dados serão carregados do Supabase.
          </div>
        </div>
      </section>
    </>
  )
}
