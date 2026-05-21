import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Logger } from '../utils/logger';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class Translator {
  private static translations: Record<string, Record<string, any>> = {};
  private static defaultLang = 'en';

  /**
   * Scans all modules and loads their lang JSON files.
   */
  static loadAll() {
    const modulesPath = path.join(__dirname, '../modules');
    if (!fs.existsSync(modulesPath)) return;

    const moduleDirs = fs.readdirSync(modulesPath);

    for (const moduleDir of moduleDirs) {
      const langPath = path.join(modulesPath, moduleDir, 'lang');
      if (fs.existsSync(langPath)) {
        const langFiles = fs.readdirSync(langPath).filter(f => f.endsWith('.json'));
        
        for (const file of langFiles) {
          const langCode = file.replace('.json', '');
          const content = JSON.parse(fs.readFileSync(path.join(langPath, file), 'utf8'));

          if (!this.translations[langCode]) this.translations[langCode] = {};
          this.translations[langCode][moduleDir] = content;
        }
      }
    }
    Logger.info(`Loaded languages: ${Object.keys(this.translations).join(', ')}`, 'LANG' as any);
  }

  /**
   * Translates a key.
   * Usage: t('welcomer', 'welcome_message', 'en', { user: 'Ken' })
   */
  static t(module: string, keyPath: string, lang: string = 'en', data: Record<string, any> = {}): string {
    const langCode = lang.split('-')[0];
    
    const resolve = (obj: any, path: string) => {
      return path.split('.').reduce((prev, curr) => prev && prev[curr], obj);
    };

    let text = resolve(this.translations[langCode]?.[module], keyPath) || 
               resolve(this.translations[this.defaultLang]?.[module], keyPath) || 
               keyPath;

    // Simple variable replacement: {{user}} -> data.user
    for (const [k, v] of Object.entries(data)) {
      text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    }

    return text;
  }
}
