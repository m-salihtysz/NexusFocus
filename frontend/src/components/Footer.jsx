import { Github, Mail, ShieldCheck } from "lucide-react";

export default function Footer({ onOpenPrivacy }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t transition-colors duration-300" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface-glass)' }}>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-4 md:px-8">
        <div>
          <p className="text-base font-semibold text-white">NexusFocus</p>
          <p className="mt-2 text-xs text-slate-400">
            Kamera, fare ve mimik verisini birlestirip yapay zeka destekli odak tavsiyeleri uretir.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Modul</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            <li>Ogrenci</li>
            <li>Kurumsal</li>
            <li>Freelance</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Yasal</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            <li>
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="inline-flex items-center gap-1 hover:text-white"
              >
                <ShieldCheck size={12} /> KVKK ve Gizlilik
              </button>
            </li>
            <li>Kullanim Kosullari</li>
            <li>Cerez Politikasi</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Iletisim</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            <li className="inline-flex items-center gap-1">
              <Mail size={12} /> 
              <a href="mailto:msalihtysz@gmail.com" className="hover:underline">msalihtysz@gmail.com</a>
            </li>
            <li className="inline-flex items-center gap-1">
              <Github size={12} /> 
              <a href="https://github.com/m-salihtysz/NexusFocus" target="_blank" rel="noopener noreferrer" className="hover:underline">github.com/msalihtysz</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t px-4 py-3 text-center text-xs text-slate-500 md:px-8" style={{ borderColor: 'var(--border-color)' }}>
        © {year} NexusFocus. Tum haklari saklidir.
      </div>
    </footer>
  );
}
