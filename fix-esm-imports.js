/**
 * 🔧 Post-Build ESM Fix Script
 * Adds .js extensions to all relative imports in compiled JavaScript files
 * Run automatically after TypeScript compilation
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');

function fixEsmImports() {
  console.log('🔧 Fixing ESM imports in dist/ directory...');
  
  // Recursively find all .js files
  function findJsFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findJsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
    return files;
  }
  
  const jsFiles = findJsFiles(DIST_DIR);
  console.log(`Found ${jsFiles.length} JavaScript files`);
  
  let filesFixed = 0;
  
  for (const file of jsFiles) {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;
    
    // Fix imports: from './path/to/module' -> from './path/to/module.js'
    // Pattern explanation:
    // - from\s+['"] : matches "from" keyword followed by quote
    // - \.\/ : matches relative path starting with ./
    // - [^'".]+ : matches path without quotes or dots
    // - (?<!\.js) : negative lookbehind - not already .js
    // - ['"]; : matches closing quote and semicolon
    
    // Fix single quotes with 'from': from './path' -> from './path.js'
    content = content.replace(
      /from\s+'(\.[^']+?)(?<!\.js)'/g,
      "from '$1.js'"
    );
    
    // Fix double quotes with 'from': from "./path" -> from "./path.js"
    content = content.replace(
      /from\s+"(\.[^"]+?)(?<!\.js)"/g,
      'from "$1.js"'
    );
    
    // Fix bare imports (side-effect imports): import './path' -> import './path.js'
    content = content.replace(
      /import\s+'(\.[^']+?)(?<!\.js)';/g,
      "import '$1.js';"
    );
    
    // Fix bare imports with double quotes: import "./path" -> import "./path.js"
    content = content.replace(
      /import\s+"(\.[^"]+?)(?<!\.js)";/g,
      'import "$1.js";'
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      filesFixed++;
    }
  }
  
  console.log(`✓ Fixed ${filesFixed} files with ESM imports`);
  
  // Verify the fix
  const indexFile = path.join(DIST_DIR, 'index.js');
  if (fs.existsSync(indexFile)) {
    const indexContent = fs.readFileSync(indexFile, 'utf8');
    const lines = indexContent.split('\n').slice(0, 10);
    
    const hasCorrectImport = lines.some(line => 
      line.includes("from './core/FlamebornClient.js") || 
      line.includes('from "./core/FlamebornClient.js')
    );
    
    if (hasCorrectImport) {
      console.log('✓ Verified: dist/index.js has correct imports with .js extensions');
    } else {
      console.log('⚠️ Warning: Could not verify .js extensions in imports');
      console.log('First 5 lines of dist/index.js:');
      lines.forEach(line => {
        if (line.includes('from')) console.log(`  ${line}`);
      });
    }
  }
}

try {
  fixEsmImports();
  process.exit(0);
} catch (error) {
  console.error('❌ Error fixing ESM imports:', error.message);
  process.exit(1);
}
