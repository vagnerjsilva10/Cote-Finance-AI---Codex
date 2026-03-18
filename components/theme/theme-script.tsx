const themeScript = `
  (function () {
    try {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.classList.add('dark');
    } catch (error) {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.classList.add('dark');
    }
  })();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
