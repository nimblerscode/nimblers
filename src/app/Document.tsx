import { css } from "../../styled-system/css";
import styles from "../app/globals.css?url";

export const Document: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <html lang="en" data-panda-theme="light">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Nimblers - and Smart Storefront AI assistant</title>
      <link rel="modulepreload" href="/src/client.tsx" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      />
      <link rel="stylesheet" href={styles} />
    </head>
    <body>
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for theme initialization before React hydration
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                const savedTheme = localStorage.getItem('preferred-theme');
                if (savedTheme && ['light', 'dark', 'artisanEarth'].includes(savedTheme)) {
                  document.documentElement.setAttribute('data-panda-theme', savedTheme);
                }
              } catch (e) {
                // Ignore localStorage errors
              }
            })();
          `,
        }}
      />
      <div
        id="root"
        className={css({
          backgroundColor: "page.background",
          color: "page.foreground",
          minHeight: "100vh",
        })}
      >
        {children}
      </div>
      <script>import("/src/client.tsx")</script>
    </body>
  </html>
);
