import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SessionUser } from '../../common/guards/session.guard.js';
import {
  AddressesService,
  createAddressSchema,
  updateAddressSchema,
} from './addresses.service.js';

class CreateAddressDto extends createZodDto(createAddressSchema) {}
class UpdateAddressDto extends createZodDto(updateAddressSchema) {}

@Controller('addresses')
@UseGuards(SessionGuard)
export class AddressesController {
  constructor(private readonly service: AddressesService) {}

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    const data = await this.service.list(user.id);
    return { data };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    const data = await this.service.findOne(user.id, id);
    return { data };
  }

  @Post()
  @HttpCode(201)
  async create(@CurrentUser() user: SessionUser, @Body() body: CreateAddressDto) {
    const data = await this.service.create(user.id, body);
    return { data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: UpdateAddressDto,
  ) {
    const data = await this.service.update(user.id, id, body);
    return { data };
  }

  @Post(':id/set-default')
  @HttpCode(200)
  async setDefault(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    await this.service.setDefault(user.id, id);
    return { data: { id, isDefault: true } };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    await this.service.remove(user.id, id);
    return { data: { id, deleted: true } };
  }
}
