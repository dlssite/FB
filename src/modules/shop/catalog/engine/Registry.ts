import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { ShopItem, ShopCategory } from './Types';
import { Logger } from '../../../../utils/logger';

export class ShopRegistry {
  private static instance: ShopRegistry;
  private categories: Map<string, ShopCategory> = new Map();
  private items: Map<string, ShopItem> = new Map();
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): ShopRegistry {
    if (!ShopRegistry.instance) {
      ShopRegistry.instance = new ShopRegistry();
    }
    return ShopRegistry.instance;
  }

  /**
   * Scans the categories directory and loads all manifests and items.
   */
  public async loadCatalog() {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const categoriesPath = path.resolve(__dirname, '../categories');
    
    // Ensure the directory exists
    if (!fs.existsSync(categoriesPath)) {
      fs.mkdirSync(categoriesPath, { recursive: true });
      Logger.warn(`[ShopRegistry] Categories directory was missing, created it.`);
      return;
    }

    const folders = fs.readdirSync(categoriesPath);

    for (const folder of folders) {
      const folderPath = path.join(categoriesPath, folder);
      if (!fs.statSync(folderPath).isDirectory()) continue;

      try {
        // 1. Load Category Manifest (_category.ts)
        const manifestPath = path.join(folderPath, '_category.ts');
        if (fs.existsSync(manifestPath)) {
          const { category } = await import(pathToFileURL(manifestPath).href);
          if (category) {
            this.categories.set(category.identifier, category);
            Logger.info(`[ShopRegistry] Loaded category: ${category.name}`);
          }
        }

        // 2. Load Items (all other .ts files)
        const files = fs.readdirSync(folderPath);
        for (const file of files) {
          if (file === '_category.ts' || !file.endsWith('.ts')) continue;

          const itemPath = path.join(folderPath, file);
          const module = await import(pathToFileURL(itemPath).href);
          
          // An item file can export a single item or an array of items
          const exportedItems = Array.isArray(module.default) ? module.default : [module.default || module.item];
          
          for (const item of exportedItems) {
            if (item && item.id) {
              if (this.items.has(item.id)) {
                Logger.error(`[ShopRegistry] Duplicate Item ID detected: ${item.id}`);
                continue;
              }
              this.items.set(item.id, item);
            }
          }
        }
      } catch (err) {
        Logger.error(`[ShopRegistry] Failed to load folder ${folder}:`, err as any);
      }
    }

    })();

    await this.loadPromise;
    this.isLoaded = true;
    this.loadPromise = null;
    Logger.info(`[ShopRegistry] Catalog loaded: ${this.categories.size} categories, ${this.items.size} items.`);
  }

  public getItems(): ShopItem[] {
    return Array.from(this.items.values());
  }

  public getItemsByCategory(categoryIdentifier: string): ShopItem[] {
    return this.getItems().filter(i => i.category === categoryIdentifier);
  }

  public getItem(id: string): ShopItem | undefined {
    return this.items.get(id);
  }

  public getCategories(): ShopCategory[] {
    return Array.from(this.categories.values());
  }

  public getCategory(identifier: string): ShopCategory | undefined {
    return this.categories.get(identifier);
  }
}

export const shopRegistry = ShopRegistry.getInstance();
