export default function Banner({ children, tone = "info", asToast = false }) {
  const modeClass = asToast ? "ui-banner-toast" : "";
  return (
    <div className={`ui-banner ui-banner-${tone} ${modeClass}`} role="status">
      {children}
    </div>
  );
}
