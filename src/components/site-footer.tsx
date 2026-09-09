import { fr } from '@/content/fr';

export function SiteFooter() {
  return (
    <footer className="border-border border-t">
      <div className="text-muted mx-auto max-w-6xl px-6 py-8 text-sm">
        © {new Date().getFullYear()} {fr.site.name}
      </div>
    </footer>
  );
}
