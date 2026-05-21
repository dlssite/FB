import { Canvas, loadImage, FontLibrary } from 'skia-canvas';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load professional fonts from the assets folder
const fontsPath = path.join(__dirname, '../../welcomer/assets/fonts');
if (fs.existsSync(fontsPath)) {
  FontLibrary.use('Poppins', [
    path.join(fontsPath, 'Poppins-Regular.ttf'),
    path.join(fontsPath, 'Poppins-Medium.ttf'),
    path.join(fontsPath, 'Poppins-Bold.ttf')
  ]);
  FontLibrary.use('Bagel', path.join(fontsPath, 'BagelFatOne-Regular.ttf'));
}

import { Translator } from '../../../core/Translator';

export class LevelingCanvasService {
  /**
   * Generates a premium rank card for a user.
   */
  static async generateRankCard(data: {
    username: string;
    avatarUrl: string;
    level: number;
    xp: number;
    xpNeeded: number;
    rank: number;
    prestige: number;
    lang?: string;
  }) {
    const { username, avatarUrl, level, xp, xpNeeded, rank, prestige, lang = 'en' } = data;

    // 1. Setup Canvas (934x282 - Classic Premium Rank Card Size)
    const canvas = new Canvas(934, 282);
    const ctx = canvas.getContext('2d');

    // 2. Background Rendering
    this.drawBackground(ctx);

    // 3. Avatar Rendering
    try {
      const avatarSize = 160;
      const avatarX = 50;
      const avatarY = (282 - avatarSize) / 2;
      
      const avatar = await loadImage(avatarUrl);
      
      ctx.save();
      // Avatar Border
      ctx.beginPath();
      ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), (avatarSize / 2) + 5, 0, Math.PI * 2);
      ctx.fillStyle = '#7367F0';
      ctx.fill();

      // Clip Avatar
      ctx.beginPath();
      ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } catch (e) {
      console.error('[LevelingCanvas] Avatar load failed:', e);
    }

    // 4. Progress Bar
    const barX = 260;
    const barY = 200;
    const barWidth = 620;
    const barHeight = 40;
    const radius = 20;

    const progress = Math.min(1, Math.max(0, xp / xpNeeded));

    // Bar Background
    this.drawRoundedRect(ctx, barX, barY, barWidth, barHeight, radius, 'rgba(255, 255, 255, 0.1)');

    // Bar Fill (Gradient)
    const barGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    barGrad.addColorStop(0, '#7367F0');
    barGrad.addColorStop(1, '#CE9FFC');
    
    this.drawRoundedRect(ctx, barX, barY, barWidth * progress, barHeight, radius, barGrad);

    // XP Text on Bar
    ctx.font = 'bold 20px Poppins';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.fillText(`${xp.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`, barX + barWidth - 20, barY + 27);

    // 5. Main Information
    ctx.textAlign = 'left';
    
    // Username
    ctx.font = 'bold 45px Bagel';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(username.toUpperCase(), 260, 100);

    // Rank & Level Labels
    ctx.font = '22px Poppins';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(lang === 'fr' ? 'RANG' : 'RANK', 700, 75);
    ctx.fillText(lang === 'fr' ? 'NIVEAU' : 'LEVEL', 820, 75);

    // Rank & Level Values
    ctx.textAlign = 'right';
    ctx.font = 'bold 45px Poppins';
    ctx.fillStyle = '#7367F0';
    ctx.fillText(`#${rank}`, 780, 120);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${level}`, 900, 120);

    // Prestige Tag (If any)
    if (prestige > 0) {
      this.drawPrestigeTag(ctx, 260, 120, prestige, lang);
    }

    return await canvas.toBuffer('png');
  }

  private static drawBackground(ctx: any) {
    const grad = ctx.createLinearGradient(0, 0, 934, 282);
    grad.addColorStop(0, '#161d31');
    grad.addColorStop(1, '#0b0e14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 934, 282);

    // Accent Line
    ctx.fillStyle = '#7367F0';
    ctx.fillRect(0, 0, 10, 282);

    // Subtle Grid
    ctx.strokeStyle = 'rgba(115, 103, 240, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 934; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 282);
      ctx.stroke();
    }
  }

  private static drawRoundedRect(ctx: any, x: number, y: number, w: number, h: number, r: number, fill: any) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  private static drawPrestigeTag(ctx: any, x: number, y: number, prestige: number, lang: string) {
    const text = Translator.t('leveling', 'rank.prestige', lang, { prestige });
    ctx.font = 'bold 16px Poppins';
    const metrics = ctx.measureText(text);
    const w = metrics.width + 20;
    const h = 30;

    this.drawRoundedRect(ctx, x, y + 10, w, h, 8, '#FFD700');
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.fillText(text, x + 10, y + 31);
  }
}
