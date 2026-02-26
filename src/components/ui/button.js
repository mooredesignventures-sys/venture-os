export default function Button({ children, variant = "default", ...props }) {
  return (
    <button type="button" className={`ui-button ui-button-${variant}`} {...props}>
      {children}
    </button>
  );
}
