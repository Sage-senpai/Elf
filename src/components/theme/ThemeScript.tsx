/**
 * Inline blocking script that sets the `dark` class on <html> BEFORE
 * React hydrates. Without this, dark-mode users see a cream flash on
 * every navigation.
 *
 * Reads `elf-theme` from localStorage:
 *   "dark"  -> add .dark
 *   "light" -> remove .dark
 *   anything else / missing -> follow prefers-color-scheme
 */
export function ThemeScript() {
  const code = `
(function () {
  try {
    var stored = localStorage.getItem('elf-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || (stored !== 'light' && prefersDark);
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();
`.trim();
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
