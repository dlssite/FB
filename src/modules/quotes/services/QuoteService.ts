import { Canvas, loadImage } from 'skia-canvas';
import { Message } from 'discord.js';

export type QuoteStyle = 'classic' | 'twitter' | 'reddit' | 'discord' | 'spotify' | 'polaroid' | 'neon';

export class QuoteService {
  /**
   * Generates a quote image using Canvas
   */
  static async generateQuote(message: Message, style: QuoteStyle = 'classic'): Promise<Buffer> {
    const canvas = new Canvas(1000, 400);
    const ctx = canvas.getContext('2d');
    
    const avatarUrl = message.author.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarUrl);
    
    switch (style) {
      case 'twitter':
        await this.renderTwitter(ctx, message, avatar);
        break;
      case 'reddit':
        await this.renderReddit(ctx, message, avatar);
        break;
      case 'discord':
        await this.renderDiscord(ctx, message, avatar);
        break;
      case 'spotify':
        await this.renderSpotify(ctx, message, avatar);
        break;
      case 'polaroid':
        await this.renderPolaroid(ctx, message, avatar);
        break;
      case 'neon':
        await this.renderNeon(ctx, message, avatar);
        break;
      case 'classic':
      default:
        await this.renderClassic(ctx, message, avatar);
        break;
    }

    return await canvas.toBuffer('png');
  }

  private static async renderClassic(ctx: any, message: Message, avatar: any) {
    // Background: Premium Glassmorphism Gradient
    const gradient = ctx.createLinearGradient(0, 0, 1000, 400);
    gradient.addColorStop(0, '#0F2027');
    gradient.addColorStop(0.5, '#203A43');
    gradient.addColorStop(1, '#2C5364');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, 400);

    // Subtle background orbs
    ctx.beginPath();
    const orbGradient = ctx.createRadialGradient(200, 100, 0, 200, 100, 300);
    orbGradient.addColorStop(0, 'rgba(115, 103, 240, 0.4)');
    orbGradient.addColorStop(1, 'rgba(115, 103, 240, 0)');
    ctx.fillStyle = orbGradient;
    ctx.arc(200, 100, 300, 0, Math.PI * 2);
    ctx.fill();

    // Frosted Glass Plate
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.roundRect(40, 40, 920, 320, 25);
    ctx.fill();
    ctx.stroke();

    // Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(140, 200, 75, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 65, 125, 150, 150);
    ctx.restore();
    
    // Avatar Ring
    ctx.beginPath();
    ctx.arc(140, 200, 75, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Quote Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    const text = message.content || '[No Text]';
    this.wrapText(ctx, `"${text}"`, 260, 150, 660, 48);

    // Author & Info
    ctx.shadowBlur = 0;
    ctx.font = 'italic 26px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`— ${message.author.username}`, 260, 320);
    
    const date = new Date(message.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    ctx.font = '20px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(date, 260, 350);
  }

  private static async renderDiscord(ctx: any, message: Message, avatar: any) {
    // Background: Discord Dark Mode
    ctx.fillStyle = '#313338';
    ctx.fillRect(0, 0, 1000, 400);

    // Hover effect background
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(0, 50, 1000, 300);

    // Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 110, 35, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 65, 75, 70, 70);
    ctx.restore();

    // Username
    ctx.fillStyle = '#f2f3f5';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(message.author.username, 160, 105);

    // Timestamp
    const timeStr = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date(message.createdAt).toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' });
    ctx.fillStyle = '#949ba4';
    ctx.font = '18px sans-serif';
    
    const nameWidth = ctx.measureText(message.author.username).width;
    ctx.fillText(`Today at ${timeStr}`, 160 + nameWidth + 15, 103);

    // Message Content
    ctx.fillStyle = '#dbdee1';
    ctx.font = '28px sans-serif';
    this.wrapText(ctx, message.content || '[No Text]', 160, 150, 800, 40);
  }

  private static async renderSpotify(ctx: any, message: Message, avatar: any) {
    // Background: Spotify Dark Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, '#2b3931');
    gradient.addColorStop(1, '#121212');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, 400);

    // Album Art Border (Spotify Green)
    ctx.strokeStyle = '#1db954';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(47, 47, 306, 306, 18);
    ctx.stroke();

    // Album Art (Avatar square with rounded corners)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(50, 50, 300, 300, 15);
    ctx.clip();
    ctx.drawImage(avatar, 50, 50, 300, 300);
    ctx.restore();

    // "Song" Title (Quote Text)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    this.wrapText(ctx, message.content || '[No Text]', 400, 120, 550, 50);

    // "Artist" Name
    ctx.fillStyle = '#b3b3b3';
    ctx.font = '28px sans-serif';
    ctx.fillText(message.author.username, 400, 250);

    // Playbar
    ctx.fillStyle = '#b3b3b3';
    ctx.font = '16px sans-serif';
    ctx.fillText('0:00', 400, 325);
    ctx.fillText('3:45', 920, 325);

    ctx.fillStyle = '#4f4f4f';
    ctx.roundRect(440, 318, 460, 6, 3);
    ctx.fill();

    ctx.fillStyle = '#1db954'; // Spotify Green progress
    ctx.roundRect(440, 318, 180, 6, 3);
    ctx.fill();
    
    // Playbar dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(620, 321, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  private static async renderPolaroid(ctx: any, message: Message, avatar: any) {
    // Background: Wood table texture or simple dark color
    ctx.fillStyle = '#2c2929';
    ctx.fillRect(0, 0, 1000, 400);

    // The Polaroid Paper
    ctx.save();
    // Subtle rotation
    ctx.translate(500, 200);
    ctx.rotate(-0.02);
    ctx.translate(-500, -200);

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#fdfbf7';
    ctx.fillRect(150, 20, 700, 360);
    ctx.restore();

    ctx.save();
    ctx.translate(500, 200);
    ctx.rotate(-0.02);
    ctx.translate(-500, -200);

    // Photo Box (Dark inner rect)
    ctx.fillStyle = '#111111';
    ctx.fillRect(180, 40, 300, 300);

    // Render Avatar inside Photo Box with vintage filter
    ctx.drawImage(avatar, 180, 40, 300, 300);
    ctx.fillStyle = 'rgba(255, 150, 50, 0.2)'; // warm vintage tint
    ctx.fillRect(180, 40, 300, 300);

    // Handwritten-style text for Quote
    ctx.fillStyle = '#222222';
    ctx.font = 'italic 36px serif'; // Fallback to italic serif for handwriting look
    const text = message.content || '[No Text]';
    this.wrapText(ctx, `"${text}"`, 510, 120, 310, 45);

    // Author
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`- ${message.author.username}`, 510, 280);

    ctx.restore();
  }

  private static async renderNeon(ctx: any, message: Message, avatar: any) {
    // Background: Deep synthwave purple
    ctx.fillStyle = '#0a0015';
    ctx.fillRect(0, 0, 1000, 400);

    // Neon Frame
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(20, 20, 960, 360, 25);
    ctx.stroke();
    
    // Cyan inner border
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(30, 30, 940, 340, 15);
    ctx.stroke();

    // Avatar (Hexagon mask)
    ctx.save();
    ctx.beginPath();
    const hexX = 140, hexY = 200, size = 80;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = hexX + size * Math.cos(angle);
      const y = hexY + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 60, 120, 160, 160);
    ctx.restore();
    
    // Hexagon Neon Border
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = hexX + size * Math.cos(angle);
      const y = hexY + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Quote Text (Hot Pink Glow)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 15;
    const text = message.content || '[No Text]';
    this.wrapText(ctx, `"${text}"`, 280, 150, 640, 50);

    // Author (Cyan Glow)
    ctx.shadowColor = '#00f3ff';
    ctx.fillStyle = '#00f3ff';
    ctx.font = 'italic 28px sans-serif';
    ctx.fillText(`// ${message.author.username}`, 280, 320);
    ctx.shadowBlur = 0;
  }

  private static async renderTwitter(ctx: any, message: Message, avatar: any) {
    // Background: Twitter Dark
    ctx.fillStyle = '#15202b';
    ctx.fillRect(0, 0, 1000, 400);

    // Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 100, 50, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 50, 50, 100, 100);
    ctx.restore();

    // Name & Handle
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(message.author.username, 170, 85);
    ctx.fillStyle = '#8899a6';
    ctx.font = '24px sans-serif';
    ctx.fillText(`@${message.author.username.toLowerCase().replace(/\\s/g, '')}`, 170, 120);

    // Quote Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '36px sans-serif';
    this.wrapText(ctx, message.content || '[No Text]', 50, 200, 900, 50);

    // Bottom info
    ctx.fillStyle = '#8899a6';
    ctx.font = '20px sans-serif';
    const timeStr = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date(message.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    ctx.fillText(`${timeStr} · ${dateStr} · Twitter for Flameborn`, 50, 360);
  }

  private static async renderReddit(ctx: any, message: Message, avatar: any) {
    // Background: Reddit Dark
    ctx.fillStyle = '#1a1a1b';
    ctx.fillRect(0, 0, 1000, 400);

    // Subreddit / User Header
    ctx.save();
    ctx.beginPath();
    ctx.arc(60, 60, 25, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 35, 35, 50, 50);
    ctx.restore();

    ctx.fillStyle = '#d7dadc';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`r/Flameborn`, 100, 55);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#818384';
    ctx.fillText(`u/${message.author.username} • 2h ago`, 100, 80);

    // Quote Text
    ctx.fillStyle = '#d7dadc';
    ctx.font = '32px sans-serif';
    this.wrapText(ctx, message.content || '[No Text]', 40, 160, 920, 45);

    // Vote Bar (Decorative)
    ctx.fillStyle = '#272729';
    ctx.roundRect(40, 320, 150, 50, 25);
    ctx.fill();
    ctx.fillStyle = '#ff4500'; // Reddit Orange
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('⬆ 1.2k ⬇', 60, 355);
  }

  private static wrapText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    let testY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, testY);
        line = words[n] + ' ';
        testY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, testY);
  }
}
