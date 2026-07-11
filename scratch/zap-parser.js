const fs = require('fs');
const html = fs.readFileSync('C:/Users/aaaa/Desktop/2026-07-10-ZAP-Report-.html', 'utf8');

const regex = /<a href="#alert-type-[0-9]+">(.*?)<\/a>/g;
const matches = [...html.matchAll(regex)];

const results = [...new Set(matches.map(m => m[1].replace(/<span>.*?<\/span>/g, '').trim()))];

console.log(results.join('\n'));
