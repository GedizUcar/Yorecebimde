/**
 * Better-Auth client factory (frontend için).
 *
 * `createBetterAuthClient` — vanilla client (atom-based, framework-agnostic).
 * `createReactAuthClient` — React hooks dahil (useSession, signIn, signOut, signUp...).
 */
import { createAuthClient as createVanillaClient } from 'better-auth/client';
import { createAuthClient as createReactClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';

export type CreateClientOptions = {
  baseURL: string;
};

export function createBetterAuthClient(opts: CreateClientOptions) {
  return createVanillaClient({
    baseURL: opts.baseURL,
    plugins: [twoFactorClient()],
  });
}

export function createReactAuthClient(opts: CreateClientOptions) {
  return createReactClient({
    baseURL: opts.baseURL,
    plugins: [twoFactorClient()],
  });
}

export type AuthClient = ReturnType<typeof createBetterAuthClient>;
export type ReactAuthClient = ReturnType<typeof createReactAuthClient>;
