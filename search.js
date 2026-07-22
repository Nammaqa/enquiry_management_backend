const fs = require('fs');
const path = require('path');

function searchFiles(dir, keyword) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules') searchFiles(fullPath, keyword);
    } else {
      if (['.js', '.ts', '.json'].includes(path.extname(fullPath))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`Match in ${fullPath}`);
        }
      }
    }
  }
}
searchFiles('src', 'cloudinary');
searchFiles('src', 'multer');
