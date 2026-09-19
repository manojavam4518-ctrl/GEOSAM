const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const destDir = path.join(__dirname, 'public', 'assets', 'couriers');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const logoSources = {
  'bluedart.png': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/1/1a/Blue_Dart_Express_logo.svg&output=png',
  'delhivery.png': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/f/ff/Delhivery_Logo_%282019%29.png',
  'dtdc.png': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/f/f0/DTDC_logo.png',
  'indiapost.png': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/3/30/India_Post_Logo.png',
  'shadowfax.png': 'https://www.shadowfax.in/sfx_logo_400_300.png',
  'xpressbees.png': 'https://www.xpressbees.com/assets/images/logo.png',
  'professional_couriers.png': 'https://www.tpcindia.com/images/logo.png',
  'allcargo_gati.png': 'https://gati.com/wp-content/uploads/2020/09/GATI-KWE-logo.png'
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: Status Code ${res.statusCode} for ${url}`));
        return;
      }

      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Successfully downloaded ${path.basename(dest)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  console.log('Starting courier logos download (v5)...');
  for (const [filename, url] of Object.entries(logoSources)) {
    const dest = path.join(destDir, filename);
    try {
      await download(url, dest);
    } catch (err) {
      console.error(`Error downloading ${filename}:`, err.message);
    }
  }
  console.log('Finished downloading courier logos.');
}

run();
