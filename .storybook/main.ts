import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [
    "../src/app/design-system/**/*.stories.@(js|jsx|ts|tsx|mdx)",
    "../src/app/pages/organization/**/*.stories.@(js|jsx|ts|tsx|mdx)",
    "../src/app/components/**/*.stories.@(js|jsx|ts|tsx|mdx)",
    "../src/app/pages/**/*.stories.@(js|jsx|ts|tsx|mdx)",
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-interactions",
    "@storybook/addon-themes",
  ],
  framework: "@storybook/react-vite",
};

export default config;
