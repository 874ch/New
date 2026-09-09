'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { fr } from '@/content/fr';
import { type LoginState, loginAction } from '@/lib/auth/actions';

const ERROR_ID = 'login-error';

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginState | undefined, FormData>(
    loginAction,
    undefined,
  );
  const hasError = Boolean(state?.error);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-medium">
          {fr.pages.admin.login.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          aria-invalid={hasError}
          aria-describedby={hasError ? ERROR_ID : undefined}
          className="border-border mt-1 w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium">
          {fr.pages.admin.login.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={hasError}
          aria-describedby={hasError ? ERROR_ID : undefined}
          className="border-border mt-1 w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {hasError && (
        <p id={ERROR_ID} role="alert" className="text-danger text-sm">
          {state?.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? '…' : fr.pages.admin.login.submit}
      </Button>
    </form>
  );
}
