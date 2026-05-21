import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Finds a file with fallback between .ts and .js extensions.
 * Useful for supporting both dev (TypeScript) and production (compiled JavaScript) environments.
 *
 * @param dirPath - Directory to search in
 * @param filename - Filename without extension (e.g., 'aliases', '_command', 'api')
 * @returns Full path to the file (.ts or .js), or null if neither exists
 *
 * @example
 * const aliasPath = findFileWithFallback('./src/modules/core', 'aliases');
 * // Returns './src/modules/core/aliases.ts' or './src/modules/core/aliases.js' or null
 */
export function findFileWithFallback(dirPath: string, filename: string): string | null {
  let filePath = path.join(dirPath, `${filename}.ts`);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(dirPath, `${filename}.js`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
  }
  return filePath;
}

/**
 * Dynamically imports a module from a file path with proper URL handling.
 * Works in both ESM (dev with tsx) and compiled CommonJS environments.
 *
 * @param filePath - Full path to the file to import
 * @returns Imported module object
 *
 * @example
 * const module = await importModule('./dist/modules/core/commands.js');
 * const command = module.default || module;
 */
export async function importModule(filePath: string): Promise<any> {
  return import(pathToFileURL(filePath).href);
}

/**
 * Finds and imports a module, checking both .ts and .js extensions.
 * Combines findFileWithFallback and importModule for convenience.
 *
 * @param dirPath - Directory to search in
 * @param filename - Filename without extension
 * @returns Imported module object, or null if file not found
 *
 * @example
 * const aliasModule = await findAndImportModule('./src/modules/core', 'aliases');
 * if (aliasModule) {
 *   const aliases = Object.values(aliasModule)[0];
 * }
 */
export async function findAndImportModule(dirPath: string, filename: string): Promise<any> {
  const filePath = findFileWithFallback(dirPath, filename);
  if (!filePath) return null;
  return importModule(filePath);
}
