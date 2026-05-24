const fs = require('fs');
const path = require('path');

// This script is intended to be run from inside the `fbt` folder.
const rootDir = path.join(__dirname, 'src');
const targetExtension = /\.(?:j|t)sx?$/;
const filesChanged = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!targetExtension.test(entry.name)) continue;
    patchFile(fullPath);
  }
}

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('interaction.editReply')) return;
  if (!content.includes('ContainerService.create') && !content.includes('ContainerService.simple')) return;

  const original = content;

  const replacementRegex = /\binteraction\.editReply\s*\(\s*(ContainerService\.(?:create|simple)\s*\()/g;
  content = content.replace(replacementRegex, 'replyV2(interaction, $1');

  // Ensure replyV2 is imported from the utils/container module.
  const importRegex = /import\s*{([^}]*)}\s*from\s*['"]([^'"\\n]*utils\/container)['"];?/;
  const importMatch = content.match(importRegex);
  if (importMatch) {
    const imports = importMatch[1];
    const modulePath = importMatch[2];
    if (!/\breplyV2\b/.test(imports)) {
      const cleanedImports = imports.trim().replace(/\s+/g, ' ');
      const newImports = cleanedImports.length > 0 ? `${cleanedImports}, replyV2` : 'replyV2';
      content = content.replace(importRegex, `import { ${newImports} } from '${modulePath}';`);
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesChanged.push(filePath);
  }
}

walk(rootDir);
console.log('Patched files:', filesChanged.length);
if (filesChanged.length) {
  filesChanged.forEach((file) => console.log(`- ${file}`));
} else {
  console.log('No files required patching.');
}
