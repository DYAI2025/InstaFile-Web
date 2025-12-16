const { detectContentType } = require('../detection-utils');

const samples = [
  {
    label: 'Full HTML document',
    content: `<!DOCTYPE html>
<html lang="en">
  <head><title>Sample</title></head>
  <body><div id="app">Hello</div></body>
</html>`
  },
  {
    label: 'HTML snippet',
    content: '<section><h1>Headline</h1><p>Paragraph.</p></section>'
  },
  {
    label: 'TypeScript interface',
    content: 'interface User { id: number; name: string; }\nconst anon: User = { id: 1, name: "A" };'
  },
  {
    label: 'JavaScript function',
    content: 'function greet(name) { console.log(name); }\nconst arrow = () => ({ ok: true });'
  },
  {
    label: 'Markdown doc',
    content: '# Title\n\nSome **bold** text with a [link](https://example.com).'
  }
];

console.log('\nFormat detection sanity check');
samples.forEach(({ label, content }) => {
  const detected = detectContentType(content);
  console.log(`- ${label}: ${detected}`);
});
