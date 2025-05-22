import { css } from "../../styled-system/css";
import styles from "../app/globals.css?url";

export const Document: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <html lang="en">
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
      <div
        id="root"
        className={css({
          backgroundColor: "gray.100",
        })}
      >
        {children}
      </div>
      <script>import("/src/client.tsx")</script>
    </body>
  </html>
);
