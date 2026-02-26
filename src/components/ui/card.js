export default function Card({ title, description, children }) {
  return (
    <section className="ui-card">
      {title ? <h2 className="ui-card__title">{title}</h2> : null}
      {description ? <p className="ui-card__description">{description}</p> : null}
      {children}
    </section>
  );
}
