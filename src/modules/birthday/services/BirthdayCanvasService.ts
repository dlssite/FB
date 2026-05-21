import { Canvas, loadImage, FontLibrary } from 'skia-canvas';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try to load fonts from the welcomer assets if they exist, or fallback
const fontsPath = path.join(__dirname, '../../welcomer/assets/fonts');
if (fs.existsSync(fontsPath)) {
  FontLibrary.use('Poppins', [
    path.join(fontsPath, 'Poppins-Regular.ttf'),
    path.join(fontsPath, 'Poppins-Medium.ttf'),
    path.join(fontsPath, 'Poppins-Bold.ttf')
  ]);
  FontLibrary.use('Bagel', path.join(fontsPath, 'BagelFatOne-Regular.ttf'));
}

export class BirthdayCanvasService {
  /**
   * Generates a high-quality birthday card image.
   */
  static async generateBirthdayCard(data: {
    username: string;
    avatarUrl: string;
    setting: any;
  }) {
    const { username, avatarUrl, setting } = data;

    const canvas = new Canvas(800, 400);
    const ctx = canvas.getContext('2d');

    // 1. Background
    if (setting.bgUrl && setting.bgUrl.startsWith('http')) {
      try {
        const bg = await loadImage(setting.bgUrl);
        ctx.drawImage(bg, 0, 0, 800, 400);
      } catch (e) {
        this.drawDefaultBackground(ctx);
      }
    } else {
      this.drawDefaultBackground(ctx);
    }

    // 2. Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, 800, 400);

    // 3. Draw Avatar
    try {
      const avatarSize = 150;
      const avatarX = 400 - (avatarSize / 2);
      const avatarY = 50;
      
      const avatar = await loadImage(avatarUrl);
      
      ctx.save();
      // Draw Border
      ctx.beginPath();
      ctx.arc(400, avatarY + (avatarSize / 2), (avatarSize / 2) + 8, 0, Math.PI * 2);
      ctx.fillStyle = setting.embedColor || '#FFD700';
      ctx.fill();

      // Clip Avatar
      ctx.beginPath();
      ctx.arc(400, avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } catch (e) {
      const { Logger } = await import('../../../utils/logger');
      Logger.error('[BirthdayCanvas] Failed to draw avatar', e);
    }

    // 4. Text
    ctx.textAlign = 'center';

    // "HAPPY BIRTHDAY"
    ctx.fillStyle = setting.embedColor || '#FFD700';
    ctx.font = `bold 55px Bagel, sans-serif`;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.fillText('HAPPY BIRTHDAY', 400, 270);

    // Username
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `40px Poppins, sans-serif`;
    ctx.fillText(username.toUpperCase(), 400, 330);

    return await canvas.toBuffer('png');
  }

  private static drawDefaultBackground(ctx: any) {
    const grad = ctx.createLinearGradient(0, 0, 800, 400);
    grad.addColorStop(0, '#2b1055');
    grad.addColorStop(1, '#7597de');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 400);

    // Decorative particles/confetti
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 800, Math.random() * 400, Math.random() * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
