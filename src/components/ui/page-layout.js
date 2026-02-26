export default function PageLayout({ title, description, badge, children }) {
  return (
    <main className="ui-page">
      <header className="ui-page-header">
        <div className="ui-page-title-row">
          <h1>{title}</h1>
          {badge ? <div>{badge}</div> : null}
        </div>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="ui-page-content">{children}</div>
    </main>
  );
}
