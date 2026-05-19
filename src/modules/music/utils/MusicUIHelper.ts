/**
 * Helper for generating Symphony Music UI components.
 */
export class MusicUIHelper {
  /**
   * Generates a visual progress bar.
   * @param current Current position in ms
   * @param total Total duration in ms
   * @param size Bar length in characters
   */
  static getProgressBar(current: number, total: number, size = 15): string {
    if (total <= 0) return '▬▬▬🔘▬▬▬▬▬▬▬▬▬▬▬▬';
    
    const progress = Math.min(Math.max(current / total, 0), 1);
    const filledSize = Math.round(size * progress);
    const emptySize = size - filledSize;

    const filledBar = '▬'.repeat(filledSize);
    const emptyBar = '▬'.repeat(emptySize);

    return `${filledBar}🔘${emptyBar}`;
  }

  /**
   * Formats milliseconds into mm:ss or hh:mm:ss
   */
  static formatDuration(ms: number): string {
    if (isNaN(ms) || ms < 0) return '00:00';
    
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    const s = seconds.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    const h = hours.toString().padStart(2, '0');

    return hours > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  }

  /**
   * Generates the full timelapse string: [01:23] ▬▬▬🔘▬▬▬▬ [04:56]
   */
  static getTimelapse(current: number, total: number): string {
    const bar = this.getProgressBar(current, total);
    return `\`${this.formatDuration(current)}\` ${bar} \`${this.formatDuration(total)}\``;
  }
}
