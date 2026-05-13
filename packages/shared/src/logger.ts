import pino, { type Logger, type LoggerOptions } from 'pino';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type CreateLoggerOptions = {
  level?: LogLevel;
  pretty?: boolean;
  service?: string;
  base?: Record<string, unknown>;
};

export function createLogger(opts: CreateLoggerOptions = {}): Logger {
  const { level = 'info', pretty = false, service, base } = opts;

  const options: LoggerOptions = {
    level,
    base: {
      service: service ?? 'yorecebimde',
      env: process.env.NODE_ENV ?? 'development',
      ...base,
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.token',
        '*.secret',
        '*.iban',
        '*.tc_kimlik',
        '*.tcKimlik',
        '*.cardNumber',
        '*.cvc',
      ],
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (pretty) {
    return pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname,env',
        },
      },
    });
  }

  return pino(options);
}

export const logger = createLogger({
  level: (process.env.LOG_LEVEL as LogLevel) ?? 'info',
  pretty: process.env.LOG_PRETTY === 'true',
});
