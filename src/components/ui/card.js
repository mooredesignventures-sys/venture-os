export function CardHeader({ title, description }) {
  if (!title && !description) {
    return null;
  }

  return (
    <header className="ui-card__header">
      {title ? <h2 className="ui-card__title">{title}</h2> : null}
      {description ? <p className="ui-card__description">{description}</p> : null}
    </header>
  );
}

export function CardContent({ children }) {
  return <div className="ui-card__content">{children}</div>;
}

export default function Card({ title, description, children, className = "" }) {
  return (
    <section className={`ui-card vo-surface${className ? ` ${className}` : ""}`}>
      <CardHeader title={title} description={description} />
      <CardContent>{children}</CardContent>
    </section>
  );
}
