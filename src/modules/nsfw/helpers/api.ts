export const NSFW_CATEGORIES = {
  ANIME: [
    'hentai', 'hneko', 'hkitsune', 'kemonomimi', 'hanal', 'hmidriff', 'hthigh', 'hboobs', 'paizuri', 'tentacle', 'yaoi', 'yuri'
  ],
  REAL: [
    'ass', 'pussy', 'thigh', 'boobs', 'anal', 'gonewild', '4k', 'pgif'
  ],
  HARDCORE: [
    'fuck', 'sex', 'ffm', 'mmf', 'dp', 'bdsm', 'gangbang'
  ],
  MISC: [
    'coffee', 'food', 'holo', 'kanna'
  ]
};

export class NsfwApi {
  /**
   * Fetches content from NekoBot API
   */
  static async fetchNekoBot(type: string): Promise<string | null> {
    try {
      const response = await fetch(`https://nekobot.xyz/api/image?type=${type}`);
      const data: any = await response.json();
      return data.message || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Fetches content from Waifu.pics API
   */
  static async fetchWaifuPics(type: string): Promise<string | null> {
    try {
      const response = await fetch(`https://api.waifu.pics/nsfw/${type}`);
      const data: any = await response.json();
      return data.url || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Fetches content from Rule34.xxx
   */
  static async fetchRule34(tags: string): Promise<string | null> {
    try {
      const response = await fetch(`https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${tags}+-scat+-gore&limit=50`);
      const data: any = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      
      const randomPost = data[Math.floor(Math.random() * data.length)];
      return randomPost.file_url || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Fetches random content based on a general category
   */
  static async fetchRandom(category: string): Promise<string | null> {
    // 1. Hardcore / Specific tags via Rule34
    const r34Categories = ['fuck', 'sex', 'ffm', 'mmf', 'dp', 'bdsm', 'gangbang'];
    if (r34Categories.includes(category)) {
      return await this.fetchRule34(category);
    }

    // 2. Try NekoBot 
    let url = await this.fetchNekoBot(category);
    if (url) return url;

    // 3. Fallback to Waifu.pics
    const mapping: Record<string, string> = {
      'hentai': 'waifu',
      'hneko': 'neko',
      'blowjob': 'blowjob',
      'trap': 'trap'
    };
    
    if (mapping[category]) {
      url = await this.fetchWaifuPics(mapping[category]);
    }

    return url;
  }
}
