import { Link } from "react-router-dom";

export const CODRAI_LOGO_SRC = "/brand/codrai-official-logo.png";

export function CodraiRobotLogo({ compact = false, className = "" }) {
  return (
    <span className={`codrai-robot-logo ${compact ? "is-compact" : ""} ${className}`} aria-hidden="true">
      <svg className="codrai-robot-logo__svg" viewBox="0 0 64 64" role="img" focusable="false">
        <defs>
          <linearGradient id="codraiRobotShell" x1="12" x2="52" y1="8" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--theme-accent-hot)" />
            <stop offset="0.52" stopColor="var(--theme-accent)" />
            <stop offset="1" stopColor="var(--theme-accent-deep)" />
          </linearGradient>
          <radialGradient id="codraiRobotCore" cx="50%" cy="40%" r="62%">
            <stop offset="0" stopColor="rgba(255,255,255,0.98)" />
            <stop offset="0.48" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <path className="codrai-robot-logo__antenna" d="M32 12V7" />
        <circle className="codrai-robot-logo__spark" cx="32" cy="6" r="2.6" />
        <rect className="codrai-robot-logo__head" x="13" y="15" width="38" height="34" rx="15" />
        <rect className="codrai-robot-logo__visor" x="20" y="25" width="24" height="11" rx="5.5" />
        <circle className="codrai-robot-logo__eye codrai-robot-logo__eye-left" cx="27" cy="30.5" r="2.5" />
        <circle className="codrai-robot-logo__eye codrai-robot-logo__eye-right" cx="37" cy="30.5" r="2.5" />
        <path className="codrai-robot-logo__smile" d="M26 39c2.6 2.2 9.4 2.2 12 0" />
        <path className="codrai-robot-logo__ear codrai-robot-logo__ear-left" d="M13 29h-3.5c-2 0-3.5 1.5-3.5 3.5S7.5 36 9.5 36H13" />
        <path className="codrai-robot-logo__ear codrai-robot-logo__ear-right" d="M51 29h3.5c2 0 3.5 1.5 3.5 3.5S56.5 36 54.5 36H51" />
        <circle className="codrai-robot-logo__core" cx="32" cy="32" r="25" />
      </svg>
    </span>
  );
}

export default function CodraiBrandMark({
  to = "/",
  className = "",
  shellClassName = "",
  logoClassName = "",
  textClassName = "",
  showText = true,
  compact = false,
}) {
  const content = (
    <>
      <span className={`codrai-logo-shell ${compact ? "is-compact" : ""} ${shellClassName}`}>
        <img
          className={`codrai-sidebar-logo ${compact ? "is-compact" : ""} ${logoClassName}`}
          src={CODRAI_LOGO_SRC}
          alt=""
          aria-hidden="true"
          decoding="async"
          loading="eager"
        />
      </span>
      {showText && (
        <span className={`codrai-brand-text text-lg font-black ${textClassName}`} aria-label="CODRAI">
          <span className="codrai-brand-text__word">CODR</span>
          <CodraiRobotLogo compact className="codrai-brand-text__robot" />
          <span className="codrai-brand-text__word">AI</span>
        </span>
      )}
    </>
  );

  if (!to) {
    return <span className={`codrai-brand-link inline-flex items-center gap-3 ${className}`}>{content}</span>;
  }

  return (
    <Link to={to} className={`codrai-brand-link inline-flex items-center gap-3 ${className}`} aria-label="CODRAI home">
      {content}
    </Link>
  );
}
