// Downloads the three free fonts into the fonts/ folder. Run once:  node get-fonts.js
// Needs Node 18 or newer and an internet connection.
const fs = require('fs'), path = require('path');
const base = 'https://cdn.jsdelivr.net/fontsource/fonts/';
const files = {
  'nunito-latin-wght.woff2': base + 'nunito:vf@5.3.0/latin-wght-normal.woff2',
  'nunito-latin-ext-wght.woff2': base + 'nunito:vf@5.3.0/latin-ext-wght-normal.woff2',
  'noto-sans-arabic-arabic-wght.woff2': base + 'noto-sans-arabic:vf@5.3.0/arabic-wght-normal.woff2'
};
(async () => {
  fs.mkdirSync('fonts', { recursive: true });
  let failed = 0;
  for (const [name, url] of Object.entries(files)) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      fs.writeFileSync(path.join('fonts', name), Buffer.from(await res.arrayBuffer()));
      console.log('OK   ' + name);
    } catch (e) { failed++; console.log('FAIL ' + name + ' (' + e.message + ')'); }
  }
  fs.writeFileSync(path.join('fonts', 'LICENSES.txt'),
    'Nunito and Noto Sans Arabic are free fonts under the SIL Open Font License 1.1.\nLicense text: https://openfontlicense.org\n');
  console.log(failed ? '\n' + failed + ' font(s) failed. Check your internet and run it again. The site still works without them.' : '\nAll fonts downloaded.');
})();
