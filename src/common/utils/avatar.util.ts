import { randomUUID } from 'crypto';

export function generateAvatarSeed(): string {
  return randomUUID();
}

export function generateAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}`;
}
