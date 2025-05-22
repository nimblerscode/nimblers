import React from "react"; // Import React for JSX
import "../src/app/globals.css"; // Import your global styles

const preview: { [key: string]: any } = {
  // Using any for preview to bypass complex type issues for now
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" }, // Automatically mock actions for on... props
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [], // Initialize as an empty array of a suitable type if possible, or leave for push
  // addon-themes configuration
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Global theme for components",
      defaultValue: "default", // Your main theme from panda.config.ts (implicit)
      toolbar: {
        icon: "paintbrush",
        // Array of plain string values or MenuItem shape (see below)
        items: [
          { value: "default", title: "Default Grayscale" }, // Represents your main theme
          { value: "artisanEarth", title: "Artisan Earth" }, // Represents your named theme
        ],
        showName: true,
        // Change title based on selected value
        dynamicTitle: true,
      },
    },
  },
};

const withTheme = (
  Story: React.ComponentType,
  context: { globals: { theme?: string } },
) => {
  const theme = context.globals.theme;

  React.useEffect(() => {
    const iframeDocumentElement = document.documentElement;
    if (theme && theme !== "default") {
      iframeDocumentElement.setAttribute("data-panda-theme", theme);
    } else {
      iframeDocumentElement.removeAttribute("data-panda-theme");
    }
    // Optional: Return a cleanup function if needed, though for this attribute it might not be necessary
    // return () => {
    //   iframeDocumentElement.removeAttribute('data-panda-theme');
    // };
  }, [theme]);

  return <Story />;
};

// Ensure decorators is an array before pushing
if (!preview.decorators) {
  preview.decorators = [];
}
preview.decorators.push(withTheme);

export default preview;
