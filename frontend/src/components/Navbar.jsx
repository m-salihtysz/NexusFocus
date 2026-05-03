import { LogIn, LogOut, Menu, Moon, Sun, X } from "lucide-react";

const PUBLIC_ITEMS = [
  { id: "landing", label: "Ana Sayfa" },
  { id: "landing", label: "Ozellikler", anchor: "features" },
  { id: "landing", label: "Modul", anchor: "modules" },
  { id: "login", label: "Giris" },
];

const PRIVATE_ITEMS = [
  { id: "home", label: "Dashboard" },
  { id: "student", label: "Ogrenci" },
  { id: "freelance", label: "Freelance" },
  { id: "enterprise", label: "Kurumsal" },
];

export default function Navbar({
  mobileOpen,
  onToggleMenu,
  activePage,
  onSelectPage,
  packageLabel,
  isAuthenticated,
  authNavItems,
  brandTargetPage,
  onLogout,
  colorMode,
  onToggleColorMode,
}) {
  const privateNav =
    isAuthenticated && authNavItems !== undefined ? authNavItems : PRIVATE_ITEMS;
  const items = isAuthenticated ? privateNav : PUBLIC_ITEMS;

  return (
    <header className="sticky top-0 z-30 border-b transition-colors duration-300" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface-glass)', backdropFilter: 'blur(8px)' }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <button
          type="button"
          onClick={() =>
            onSelectPage(isAuthenticated ? brandTargetPage || "home" : "landing")
          }
          className="text-left text-lg font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          NexusFocus
          <span
            className="ml-2 rounded-full px-2 py-1 text-xs"
            style={{ background: "var(--accentSoft)", color: "var(--accentText)" }}
          >
            {packageLabel || "AI Productivity"}
          </span>
        </button>

        <nav className="hidden items-center gap-2 md:flex">
          {items.map((item) => (
            <button
              key={`${item.id}-${item.label}`}
              type="button"
              onClick={() => onSelectPage(item.id, { anchor: item.anchor })}
              className={`rounded-xl px-4 py-2 text-sm transition ${
                !item.anchor && activePage === item.id
                  ? "text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
              style={
                !item.anchor && activePage === item.id
                  ? { background: "var(--accentSoft)", color: "var(--accentText)" }
                  : undefined
              }
            >
              {item.label}
            </button>
          ))}

          <button
            type="button"
            onClick={onToggleColorMode}
            className="ml-4 p-2 rounded-xl border transition-colors"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            aria-label="Toggle color mode"
          >
            {colorMode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={onLogout}
              className="ml-2 inline-flex items-center gap-1 rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
            >
              <LogOut size={14} />
              Cikis
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelectPage("login")}
              className="ml-2 inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-slate-950"
              style={{
                background: "var(--accent)",
                boxShadow: "0 12px 30px var(--accentShadow)",
              }}
            >
              <LogIn size={14} />
              Hemen Basla
            </button>
          )}
        </nav>

        <button
          type="button"
          onClick={onToggleMenu}
          className="inline-flex items-center rounded-lg border p-2 md:hidden"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-800 px-4 py-3 md:hidden" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Tema</span>
              <button
                type="button"
                onClick={onToggleColorMode}
                className="p-2 rounded-lg border transition-colors"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                {colorMode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
            {items.map((item) => (
              <button
                key={`${item.id}-${item.label}`}
                type="button"
                onClick={() => onSelectPage(item.id, { anchor: item.anchor })}
                className={`rounded-lg px-3 py-2 text-left text-sm ${
                  !item.anchor && activePage === item.id
                      ? "text-white"
                    : "text-slate-200"
                }`}
                  style={
                    !item.anchor && activePage === item.id
                      ? { background: "var(--accentSoft)", color: "var(--accentText)" }
                      : undefined
                  }
              >
                {item.label}
              </button>
            ))}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onLogout}
                className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200"
              >
                <LogOut size={14} />
                Cikis
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectPage("login")}
                  className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-950"
                  style={{ background: "var(--accent)" }}
              >
                <LogIn size={14} />
                Hemen Basla
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
