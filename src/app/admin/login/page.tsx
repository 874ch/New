import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/admin/login-form';
import { Container } from '@/components/ui/container';
import { fr } from '@/content/fr';
import { getAdminSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: fr.pages.admin.login.title,
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect('/admin');
  }

  return (
    <Container className="flex justify-center py-24">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight">{fr.pages.admin.login.title}</h1>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </Container>
  );
}
