const fs = require('fs');
const path = require('path');

console.log('Starting build script to generate env.js...');
console.log('Checking Environment Variables:');
console.log('- SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('- SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
console.log('- GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

const envContent = `const ENV = {
    SUPABASE_URL: "${process.env.SUPABASE_URL || ''}",
    SUPABASE_ANON_KEY: "${process.env.SUPABASE_ANON_KEY || ''}",
    GEMINI_API_KEY: "${process.env.GEMINI_API_KEY || ''}"
};`;

const dirPath = path.join(__dirname, 'assets', 'js', 'config');
if (!fs.existsSync(dirPath)){
    fs.mkdirSync(dirPath, { recursive: true });
}

fs.writeFileSync(path.join(dirPath, 'env.js'), envContent);
console.log('env.js has been generated successfully.');
