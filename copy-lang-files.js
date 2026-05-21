import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyLangFiles() {
  const srcModulesDir = path.join(__dirname, 'src/modules');
  const distModulesDir = path.join(__dirname, 'dist/modules');

  if (!fs.existsSync(srcModulesDir)) {
    console.error('❌ src/modules directory not found');
    return;
  }

  const moduleDirs = fs.readdirSync(srcModulesDir);

  for (const moduleDir of moduleDirs) {
    const langSrcDir = path.join(srcModulesDir, moduleDir, 'lang');
    const langDistDir = path.join(distModulesDir, moduleDir, 'lang');

    if (fs.existsSync(langSrcDir)) {
      // Create dist lang directory if it doesn't exist
      if (!fs.existsSync(langDistDir)) {
        fs.mkdirSync(langDistDir, { recursive: true });
      }

      // Copy all JSON files
      const langFiles = fs.readdirSync(langSrcDir).filter(f => f.endsWith('.json'));
      for (const file of langFiles) {
        const srcFile = path.join(langSrcDir, file);
        const distFile = path.join(langDistDir, file);
        fs.copyFileSync(srcFile, distFile);
      }
    }
  }

  console.log('✅ Language files copied to dist/modules');
}

copyLangFiles();
