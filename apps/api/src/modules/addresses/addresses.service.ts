import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { NotFoundError } from '@yorecebimde/shared';
import { AddressesRepository, type NewAddressRow } from './addresses.repository.js';

export const createAddressSchema = z.object({
  label: z.string().min(1).max(50),
  recipientName: z.string().min(2).max(200),
  phone: z.string().min(10).max(20),
  country: z.string().length(2).default('TR'),
  province: z.string().min(1).max(100),
  district: z.string().min(1).max(100),
  neighborhood: z.string().max(200).optional(),
  postalCode: z.string().max(10).optional(),
  addressLine: z.string().min(5).max(1000),
  isDefault: z.boolean().default(false),
  isBilling: z.boolean().default(false),
});
export type CreateAddressInput = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = createAddressSchema.partial();
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

@Injectable()
export class AddressesService {
  constructor(private readonly repo: AddressesRepository) {}

  list(userId: string) {
    return this.repo.listByUser(userId);
  }

  async findOne(userId: string, id: string) {
    const addr = await this.repo.findByUserAndId(userId, id);
    if (!addr) throw new NotFoundError('Address', id);
    return addr;
  }

  async create(userId: string, input: CreateAddressInput) {
    const existing = await this.repo.listByUser(userId);
    const isFirst = existing.length === 0;
    const data: NewAddressRow = {
      userId,
      label: input.label,
      recipientName: input.recipientName,
      phone: input.phone,
      country: input.country,
      province: input.province,
      district: input.district,
      ...(input.neighborhood ? { neighborhood: input.neighborhood } : {}),
      ...(input.postalCode ? { postalCode: input.postalCode } : {}),
      addressLine: input.addressLine,
      isDefault: input.isDefault || isFirst,
      isBilling: input.isBilling,
    };
    const created = await this.repo.create(data);
    if (created.isDefault && !isFirst) {
      await this.repo.setDefault(userId, created.id);
    }
    return created;
  }

  async update(userId: string, id: string, input: UpdateAddressInput) {
    await this.findOne(userId, id);
    const patch: Partial<NewAddressRow> = {};
    if (input.label !== undefined) patch.label = input.label;
    if (input.recipientName !== undefined) patch.recipientName = input.recipientName;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.country !== undefined) patch.country = input.country;
    if (input.province !== undefined) patch.province = input.province;
    if (input.district !== undefined) patch.district = input.district;
    if (input.neighborhood !== undefined) patch.neighborhood = input.neighborhood;
    if (input.postalCode !== undefined) patch.postalCode = input.postalCode;
    if (input.addressLine !== undefined) patch.addressLine = input.addressLine;
    if (input.isBilling !== undefined) patch.isBilling = input.isBilling;
    const updated = await this.repo.update(id, patch);
    if (input.isDefault) {
      await this.repo.setDefault(userId, id);
    }
    return updated;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.repo.delete(userId, id);
  }

  async setDefault(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.repo.setDefault(userId, id);
  }
}
