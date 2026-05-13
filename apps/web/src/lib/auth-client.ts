import { createReactAuthClient } from '@yorecebimde/auth/client';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * React Better-Auth client — useSession, signIn, signOut, signUp + twoFactor.
 * Wrapper'da twoFactorClient plugin'i kayıtlı, return type plugin metodları
 * (`authClient.twoFactor.enable/verifyTotp/...`) içerir.
 */
export const authClient = createReactAuthClient({ baseURL });
