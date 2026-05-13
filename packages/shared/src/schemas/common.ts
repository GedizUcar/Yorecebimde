import { z } from 'zod';
import { normalizeTrPhone } from '../phone.js';

export const emailSchema = z.string().email().max(320).toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(10, 'En az 10 karakter')
  .max(128)
  .regex(/[A-Z]/, 'En az 1 büyük harf')
  .regex(/[a-z]/, 'En az 1 küçük harf')
  .regex(/[0-9]/, 'En az 1 rakam');

export const trPhoneSchema = z
  .string()
  .transform((v, ctx) => {
    try {
      return normalizeTrPhone(v);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Geçersiz telefon numarası' });
      return z.NEVER;
    }
  });

export const uuidSchema = z.string().uuid();

export const localeSchema = z.enum(['tr', 'en']);

export const moneyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Geçersiz para formatı');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z
  .string()
  .regex(/^[a-z_]+:(asc|desc)$/i)
  .optional();

export const ibanSchema = z
  .string()
  .transform((v) => v.replace(/\s/g, '').toUpperCase())
  .pipe(z.string().regex(/^TR\d{24}$/, 'Geçersiz IBAN (TR ile başlamalı, 26 hane)'));

export const tcKimlikSchema = z
  .string()
  .regex(/^\d{11}$/, 'TC kimlik 11 haneli olmalı')
  .refine((tc) => isValidTcKimlik(tc), 'Geçersiz TC kimlik numarası');

export const taxIdSchema = z.string().regex(/^\d{10,11}$/, 'Vergi no 10 veya 11 hane');

function isValidTcKimlik(tc: string): boolean {
  // Standart TC kimlik algoritması
  if (!/^\d{11}$/.test(tc) || tc[0] === '0') return false;
  const digits = tc.split('').map(Number) as number[];
  const oddSum = digits[0]! + digits[2]! + digits[4]! + digits[6]! + digits[8]!;
  const evenSum = digits[1]! + digits[3]! + digits[5]! + digits[7]!;
  const d10 = (oddSum * 7 - evenSum) % 10;
  if (d10 !== digits[9]) return false;
  const total = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  return total % 10 === digits[10];
}
