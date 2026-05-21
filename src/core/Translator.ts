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
    let modulesPath = path.join(__dirname, '../modules');
    
    // In production (dist), __dirname is dist/core
    // We want dist/modules
    // In development (src), __dirname is src/core
    // We want src/modules
    
    if (!fs.existsSync(modulesPath)) {
      // Fallback: try one level up and then to src
      const alternativePath = path.join(__dirname, '../../src/modules');
      if (fs.existsSync(alternativePath)) {
        modulesPath = alternativePath;
      } else {
        return;
      }
    }

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
    const loadedModules = Object.entries(this.translations).map(([lang, modules]) => 
      `${lang}: [${Object.keys(modules).join(', ')}]`
    ).join(' | ');
    Logger.info(`Loaded translations: ${loadedModules}`, 'LANG' as any);
  }

  /**
   * Translates a key.
   * Usage: t('welcomer', 'welcome_message', 'en', { user: 'Ken' })
   */
  static t(module: string, keyPath: string, lang: string = 'en', data: Record<string, any> = {}): string {
    const langCode = lang.split('-')[0];
    
    const resolve = (obj: any, path: string): string | undefined => {
      if (!obj) return undefined;
      const value = path.split('.').reduce((prev, curr) => prev && prev[curr], obj);
      return typeof value === 'string' ? value : undefined;
    };

    const text = resolve(this.translations[langCode]?.[module], keyPath) || 
                 resolve(this.translations[this.defaultLang]?.[module], keyPath) || 
                 keyPath;

    // Simple variable replacement: {{user}} -> data.user
    let result = text;
    for (const [k, v] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    }

    return result;
  }

  /**
    * Debug method to inspect loaded translations
    */
  static debug() {
    return {
      languages: Object.keys(this.translations),
      structure: Object.entries(this.translations).reduce((acc, [lang, modules]) => {
        acc[lang] = Object.keys(modules);
        return acc;
      }, {} as Record<string, string[]>)
    };
  }
}
