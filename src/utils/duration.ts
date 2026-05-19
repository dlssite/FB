/**
 * Parses a duration string (e.g. "10m", "1h", "2d") into milliseconds.
 * Returns null if the format is invalid.
 */
export function parseDuration(durationStr: string): number | null {
  const regex = /^(\d+)([smhdw])$/i;
  const match = durationStr.match(regex);

  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multi: Record<string, number> = {
    's': 1000,
    'm': 1000 * 60,
    'h': 1000 * 60 * 60,
    'd': 1000 * 60 * 60 * 24,
    'w': 1000 * 60 * 60 * 24 * 7,
  };

  return value * multi[unit];
}

/**
 * Formats milliseconds into a human-readable duration (e.g. "10 minutes").
 */
export function formatDuration(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds} seconds`;
  
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes} minutes`;
  
  const hours = minutes / 60;
  if (hours < 24) return `${hours} hours`;
  
  const days = hours / 24;
  return `${days} days`;
}
