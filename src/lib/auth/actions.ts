'use server';

import { redirect } from 'next/navigation';

import { fr } from '@/content/fr';
import { verifyPassword } from '@/lib/auth/password';
import { createAdminSession, destroyAdminSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');

  const user = email ? await db.adminUser.findUnique({ where: { email } }) : null;

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: fr.pages.admin.login.error };
  }

  await createAdminSession(user.id);
  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect('/admin/login');
}
