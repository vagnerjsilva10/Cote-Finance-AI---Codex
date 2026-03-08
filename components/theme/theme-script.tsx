const themeScript = `
  (function () {
    try {
      var key = 'cote-theme';
      var stored = window.localStorage.getItem(key);
      var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle('dark', theme === 'dark');
    } catch (error) {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.classList.add('dark');
    }
  })();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
