import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Prisma } from '../../generated/prisma/client';

function formatTimestamp(date: Date): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');
  const base =
    `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  const millis = date.getUTCMilliseconds();
  if (millis === 0) return base;
  return `${base}.${String(millis).padStart(3, '0').replace(/0+$/, '')}`;
}

export function embedOrder<T extends object>(value: T): T {
  const source = value as Record<string, unknown>;
  const keys = Object.keys(source).sort(
    (left, right) => left.length - right.length || left.localeCompare(right),
  );
  const ordered: Record<string, unknown> = {};
  for (const key of keys) ordered[key] = source[key];
  return ordered as T;
}

export function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return formatTimestamp(value);
  if (Prisma.Decimal.isDecimal(value)) return Number(value.toString());
  if (Array.isArray(value)) return value.map((entry) => serializeValue(entry));
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = serializeValue(entry);
    }
    return output;
  }
  return value;
}

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => serializeValue(data)));
  }
}
