// Static accessibility checks over every page: the parts of IS 5568 / WCAG 2.0 AA that can be
// checked from the markup alone. Run with: node --test frontend/tests/a11y.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = [
  ...readdirSync(root).filter((name) => name.endsWith('.html')),
  ...readdirSync(join(root, 'staff')).filter((name) => name.endsWith('.html')).map((name) => `staff/${name}`),
];
const read = (page) => readFileSync(join(root, page), 'utf8');
const isPublic = (page) => !page.startsWith('staff/');

for (const page of pages) {
  test(`${page}: language, title, one h1, skip link and main landmark`, () => {
    const html = read(page);
    assert.match(html, /<html[^>]*\blang="(en|he)"/);
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, 'exactly one h1');
    assert.match(html, /<a class="skip-link" href="#main-content">/);
    assert.match(html, /<main id="main-content"/);
    assert.match(html, /css\/a11y\.css/);
  });

  test(`${page}: icon ligatures are hidden from screen readers`, () => {
    const icons = read(page).match(/<span class="material-symbols-outlined[^>]*>/g) ?? [];
    icons.forEach((tag) => assert.match(tag, /aria-hidden="true"/, tag));
  });

  test(`${page}: images have alt text and buttons have names`, () => {
    const html = read(page);
    (html.match(/<img[^>]*>/g) ?? []).forEach((tag) => assert.match(tag, /\balt="/, tag));
    // A button whose only content is an icon needs an aria-label.
    const iconOnly = /<button(?![^>]*aria-label)[^>]*>\s*<span class="material-symbols-outlined[^>]*>[^<]*<\/span>\s*<\/button>/g;
    assert.deepEqual(html.match(iconOnly) ?? [], []);
  });

  if (isPublic(page) && page !== 'accessibility.html') {
    test(`${page}: links to the accessibility statement`, () => {
      assert.match(read(page), /href="accessibility\.html"/);
    });
  }
}

test('accessibility statement states the standard, the limitations, contact and date', () => {
  const html = read('accessibility.html');
  assert.match(html, /5568/);
  assert.match(html, /WCAG 2\.0/);
  assert.match(html, /מגבלות ידועות/);
  assert.match(html, /רכז\/ת הנגישות/);
  assert.match(html, /<time datetime="\d{4}-\d{2}-\d{2}">/);
});
