import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationTriggers } from './triggers.js';
import { EmailProvider, SmsProvider, PushProvider } from './providers.js';

@Global()
@Module({
  providers: [
    NotificationsService,
    NotificationTriggers,
    EmailProvider,
    SmsProvider,
    PushProvider,
  ],
  exports: [NotificationsService, NotificationTriggers],
})
export class NotificationsModule {}
