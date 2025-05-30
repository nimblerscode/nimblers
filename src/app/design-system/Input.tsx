"use client";

import {
  Input as AriaInput,
  Label as AriaLabel,
  type InputProps as AriaRACInputProps,
  type LabelProps as AriaRACLabelProps,
  type TextFieldProps as AriaRACTextFieldProps,
  type TextProps as AriaRACTextProps,
  Text as AriaText,
  TextField as AriaTextField,
} from "react-aria-components";
import { cva, cx } from "../../../styled-system/css"; // Path to your Panda CSS cva function
import { VStack } from "../../../styled-system/jsx";

// --- Input Field Styling --- //
const inputStyles = cva({
  base: {
    display: "block",
    width: "full",
    minWidth: 0, // For flex/grid items
    appearance: "none",
    bg: "surface.primary", // Use a surface color for the input background
    color: "content.primary",
    borderWidth: "thin",
    borderColor: "border.default",
    borderRadius: "sm",
    px: "3", // theme.spacing[3]
    py: "2", // theme.spacing[2]
    fontSize: "md",
    lineHeight: "normal",
    outline: "none", // We use _focusVisible for outline
    transition: "border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out",

    _hover: {
      borderColor: "border.strong", // Example: make border interactive on hover
    },
    _focusVisible: {
      ring: "focusRing.default solid 2px",
      ringOffset: "0.5",
      borderColor: "border.focus", // Often good to match focus ring or accent
    },
    _disabled: {
      backgroundColor: "disabled.background",
      color: "disabled.foreground",
      borderColor: "disabled.border",
      cursor: "not-allowed",
      _hover: {
        borderColor: "disabled.border", // Prevent hover change on disabled
      },
    },
    // Placeholder styling
    _placeholder: {
      color: "content.secondary", // Use a secondary/subtle text color for placeholder
      opacity: 0.7,
    },
    // Invalid state styling (React Aria Components applies data-invalid="true")
    "&[data-invalid='true']": {
      borderColor: "status.danger.border",
      _focusVisible: {
        outlineColor: "status.danger.solidHover",
        borderColor: "status.danger.border",
      },
    },
  },
  // We can add variants here if needed (e.g., size, or pre/post addon styles)
  variants: {
    variantSize: {
      sm: { fontSize: "sm", px: "2.5", py: "1.5" },
      md: { fontSize: "md", px: "3", py: "2" },
      lg: { fontSize: "lg", px: "3.5", py: "2.5" },
    },
  },
  defaultVariants: {
    variantSize: "md",
  },
});

export interface InputProps extends Omit<AriaRACInputProps, "size"> {
  variantSize?: "sm" | "md" | "lg";
  className?: string;
}

const Input = ({ className, variantSize, ...props }: InputProps) => {
  return (
    <AriaInput
      className={cx(inputStyles({ variantSize }), className)}
      {...props}
    />
  );
};
Input.displayName = "Input";

// // --- Label Styling --- //
const labelStyles = cva({
  base: {
    display: "block",
    color: "content.primary",
    fontWeight: "medium",
    fontSize: "sm",
    userSelect: "none",
    "&[data-disabled]": {
      backgroundColor: "disabled.background",
      color: "disabled.foreground",
    },
  },
});

export interface LabelProps extends AriaRACLabelProps {
  className?: string;
}
const Label = ({ className, ...props }: LabelProps) => {
  return <AriaLabel className={cx(labelStyles(), className)} {...props} />;
};
Label.displayName = "Label";

// // --- Text (Description/Error Message) Styling --- //
const textStyles = cva({
  base: {
    display: "block",
    fontSize: "sm",
    mt: "1.5", // Spacing below input
  },
  variants: {
    type: {
      description: {
        color: "page.textSecondary",
      },
      errorMessage: {
        color: "status.danger.textSubtle", // Using the subtle danger text color
        fontWeight: "medium",
      },
    },
  },
});

export interface TextProps extends AriaRACTextProps {
  className?: string;
  // React Aria Components uses `slot` to differentiate description and error message.
  // We don't need to pass type explicitly if slot is used correctly.
}
const Text = ({ className, ...props }: TextProps) => {
  // Default to description type if slot is not error-message
  const type = props.slot === "errorMessage" ? "errorMessage" : "description";
  return (
    <AriaText className={cx(textStyles({ type }), className)} {...props} />
  );
};
Text.displayName = "Text";

// --- TextField (Wrapper) Styling & Component --- //
// No specific styles for the wrapper itself typically, but it's the main export.

export interface TextFieldProps extends AriaRACTextFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validationErrors: string[]) => string);
  inputProps?: InputProps;
  labelProps?: LabelProps;
  descriptionProps?: TextProps;
  errorMessageProps?: TextProps;
}

const TextFieldRoot = ({
  label,
  description,
  errorMessage,
  inputProps,
  labelProps,
  descriptionProps,
  errorMessageProps,
  ...props
}: TextFieldProps) => {
  return (
    <AriaTextField {...props}>
      {(renderProps) => (
        <VStack gap="2" alignItems="flex-start">
          {label && <Label {...labelProps}>{label}</Label>}
          <Input
            {...inputProps}
            variantSize={inputProps?.variantSize || "md"}
          />
          {description && !renderProps.isInvalid && (
            <Text slot="description" {...descriptionProps}>
              {description}
            </Text>
          )}
          {errorMessage && renderProps.isInvalid && (
            <Text slot="errorMessage" {...errorMessageProps}>
              {typeof errorMessage === "function"
                ? errorMessage((renderProps as any).validationErrors)
                : errorMessage}
            </Text>
          )}
        </VStack>
      )}
    </AriaTextField>
  );
};

TextFieldRoot.displayName = "TextField";

// Exporting components for compound usage
export {
  TextFieldRoot, // Main export
  Input,
  Label,
  Text,
  inputStyles,
};
