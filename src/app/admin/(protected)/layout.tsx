import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { Container } from '@/components/ui/container';
import { fr } from '@/content/fr';
import { logoutAction } from '@/lib/auth/actions';
import { getAdminSession } from '@/lib/auth/session';

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen">
      <header className="border-border border-b">
        <Container className="flex items-center justify-between py-4">
          <span className="font-semibold">{fr.pages.admin.title}</span>
          <form action={logoutAction}>
            <button type="submit" className="text-muted hover:text-accent text-sm">
              {fr.pages.admin.logout}
            </button>
          </form>
        </Container>
      </header>
      <Container className="py-10">{children}</Container>
    </div>
  );
}
