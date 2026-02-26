export default function PageHeader({ title, meta, actions }) {
  return (
    <div className="page-header">
      <div className="page-header__main">
        <h1 className="vo-title">{title}</h1>
        {meta ? <p className="vo-meta">{meta}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </div>
  );
}
