import "./bridge.css";

/**
 * Bridge Layout
 *
 * The root layout for the client portal. This layout:
 * 1. Imports bridge.css (styles isolated from dashboard)
 * 2. Applies data-surface="bridge" for CSS variable scoping
 * 3. Provides the shell structure (header, sidebar, main)
 *
 * Authentication and data fetching will be added later.
 * For now, this is just the visual shell.
 */
export default function BridgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-surface="bridge" className="bridge-shell">
      {/* Header */}
      <header className="bridge-header">
        <div className="flex items-center gap-3">
          {/* Logo placeholder */}
          <div className="h-8 w-8 rounded-lg bg-[var(--bridge-accent)] flex items-center justify-center">
            <span className="text-white text-sm font-semibold">S</span>
          </div>
          <span className="text-[var(--bridge-text-primary)] font-medium">
            Client Portal
          </span>
        </div>
      </header>

      {/* Body: Sidebar + Main */}
      <div className="flex flex-1">
        {/* Sidebar - Desktop only */}
        <aside className="bridge-sidebar">
          <BridgeNav />
        </aside>

        {/* Main content */}
        <main className="bridge-main">
          <div className="bridge-content">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="bridge-mobile-nav">
        <div className="bridge-mobile-nav-inner">
          <MobileNavItem href="/bridge" icon="home" label="Home" active />
          <MobileNavItem href="/bridge/projects" icon="folder" label="Projects" />
          <MobileNavItem href="/bridge/messages" icon="message" label="Messages" />
          <MobileNavItem href="/bridge/billing" icon="credit-card" label="Billing" />
        </div>
      </nav>
    </div>
  );
}

/**
 * Sidebar Navigation
 * Grouped by client mental model: MY PROJECT | RESOURCES | ACCOUNT
 */
function BridgeNav() {
  return (
    <nav className="flex flex-col gap-1">
      {/* MY PROJECT */}
      <div className="bridge-nav-section">
        <div className="bridge-nav-label">My Project</div>
        <NavItem href="/bridge" icon={<HomeIcon />} label="Overview" active />
        <NavItem href="/bridge/progress" icon={<ChartIcon />} label="Progress" />
        <NavItem href="/bridge/messages" icon={<MessageIcon />} label="Messages" />
      </div>

      {/* RESOURCES */}
      <div className="bridge-nav-section">
        <div className="bridge-nav-label">Resources</div>
        <NavItem href="/bridge/files" icon={<FileIcon />} label="Files" />
        <NavItem href="/bridge/intelligence" icon={<SparklesIcon />} label="Reports" />
      </div>

      {/* ACCOUNT */}
      <div className="bridge-nav-section">
        <div className="bridge-nav-label">Account</div>
        <NavItem href="/bridge/requests" icon={<InboxIcon />} label="Requests" />
        <NavItem href="/bridge/billing" icon={<CreditCardIcon />} label="Billing" />
        <NavItem href="/bridge/settings" icon={<SettingsIcon />} label="Settings" />
      </div>
    </nav>
  );
}

function NavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <a href={href} className="bridge-nav-item" data-active={active}>
      <span className="bridge-nav-icon">{icon}</span>
      {label}
    </a>
  );
}

function MobileNavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}) {
  const icons: Record<string, React.ReactNode> = {
    home: <HomeIcon />,
    folder: <FolderIcon />,
    message: <MessageIcon />,
    "credit-card": <CreditCardIcon />,
  };

  return (
    <a href={href} className="bridge-mobile-nav-item" data-active={active}>
      <span className="bridge-mobile-nav-icon">{icons[icon]}</span>
      {label}
    </a>
  );
}

/* ============================================
   ICONS (inline SVGs for now)
   Will be replaced with lucide-react later
   ============================================ */

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5L5 19z" />
      <path d="M19 11l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5L17 13l1.5-.5.5-1.5z" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <path d="M1 10h22" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}
