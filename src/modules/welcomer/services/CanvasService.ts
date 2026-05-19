import { Canvas, loadImage, FontLibrary } from 'skia-canvas';
import path from 'path';
import fs from 'fs';

// Load professional fonts from the assets folder
const fontsPath = path.join(__dirname, '../assets/fonts');
if (fs.existsSync(fontsPath)) {
  FontLibrary.use('Poppins', [
    path.join(fontsPath, 'Poppins-Regular.ttf'),
    path.join(fontsPath, 'Poppins-Medium.ttf'),
    path.join(fontsPath, 'Poppins-Bold.ttf')
  ]);
  FontLibrary.use('Bagel', path.join(fontsPath, 'BagelFatOne-Regular.ttf'));
}

export class CanvasService {
  /**
   * Generates a high-quality welcome card image.
   */
  static async generateWelcomeCard(data: {
    username: string;
    avatarUrl: string;
    guildName: string;
    memberCount: number;
    settings: any;
  }) {
    const { username, avatarUrl, guildName, memberCount, settings } = data;

    // 1. Create Canvas (Standard 800x400 Dashboard size)
    const canvas = new Canvas(800, 400);
    const ctx = canvas.getContext('2d');

    // 2. Background Rendering
    if (settings.welcomeInBackgroundUrl && settings.welcomeInBackgroundUrl.startsWith('http')) {
      try {
        const bg = await loadImage(settings.welcomeInBackgroundUrl);
        ctx.drawImage(bg, 0, 0, 800, 400);
      } catch (e) {
        this.drawDefaultBackground(ctx);
      }
    } else {
      this.drawDefaultBackground(ctx);
    }

    // 3. Overlay / Tint
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Subtle dark overlay
    ctx.fillRect(0, 0, 800, 400);

    // 4. Draw Avatar (Circular with Border)
    try {
      const avatarSize = settings.welcomeInAvatarSize || 150;
      const avatarX = 400 - (avatarSize / 2);
      const avatarY = 50;
      
      const avatar = await loadImage(avatarUrl);
      
      ctx.save();
      // Draw Border
      ctx.beginPath();
      ctx.arc(400, avatarY + (avatarSize / 2), (avatarSize / 2) + 5, 0, Math.PI * 2);
      ctx.fillStyle = settings.welcomeInAvatarBorderColor || '#7367F0';
      ctx.fill();

      // Clip Avatar
      ctx.beginPath();
      ctx.arc(400, avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } catch (e) {
      console.error('[Canvas] Failed to draw avatar:', e);
    }

    // 5. Text Rendering
    ctx.textAlign = 'center';

    // Main Welcome Text
    ctx.fillStyle = settings.welcomeInMainTextColor || '#FFFFFF';
    ctx.font = `bold 45px Bagel`;
    ctx.fillText('WELCOME', 400, 260);

    // Username
    ctx.font = `35px Poppins`;
    ctx.fillText(username.toUpperCase(), 400, 310);

    // Server Info / Member Count
    ctx.font = `20px Poppins`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`YOU ARE MEMBER #${memberCount} IN ${guildName.toUpperCase()}`, 400, 355);

    // 6. Return Buffer
    return await canvas.toBuffer('png');
  }

  private static drawDefaultBackground(ctx: any) {
    // Elegant gradient background
    const grad = ctx.createLinearGradient(0, 0, 800, 400);
    grad.addColorStop(0, '#1e1e2f');
    grad.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 400);

    // Decorative geometric patterns
    ctx.strokeStyle = 'rgba(115, 103, 240, 0.1)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 800; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 200, 400);
      ctx.stroke();
    }
  }
}
