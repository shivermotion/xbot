import * as winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom pretty format for console
const consoleFormat = printf((info) => {
  const { level, message, label, timestamp, ...meta } = info;
  const labelStr = label ? `[${label}] ` : '';
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${labelStr}${level}: ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
  transports: [
    // Human-readable colored console output
    new winston.transports.Console({
      format: combine(colorize({ all: true }), consoleFormat),
    }),
    // JSON files for long-term storage / log aggregation
    new winston.transports.File({ filename: 'error.log', level: 'error', format: combine(json()) }),
    new winston.transports.File({ filename: 'combined.log', format: combine(json()) }),
  ],
});

// Convenience helper to get a namespaced child logger
export function getLogger(label: string): winston.Logger {
  return logger.child({ label });
} 