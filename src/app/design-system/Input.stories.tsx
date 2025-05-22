import { useState } from "react";
import { Button } from "./Button";
import {
  TextFieldRoot as TextField,
  // Input, // Unused based on previous attempt
  // Label, // Unused
  // TextFieldDescription, // Unused
  // TextFieldErrorMessage, // Unused
  type TextFieldProps,
  // type InputProps, // Unused based on previous attempt
} from "./Input";

const meta = {
  title: "Design System/TextField",
  component: TextField,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    description: { control: "text" },
    errorMessage: { control: "text" }, // For simplicity, storybook controls string errors
    isDisabled: { control: "boolean" },
    isReadOnly: { control: "boolean" },
    isRequired: { control: "boolean" },
    // placeholder on inputProps can be added if needed
    inputProps: { control: "object" }, // Allows setting placeholder, type etc.
  },
};

export default meta;

export const Default = {
  args: {
    label: "Name",
    inputProps: {
      placeholder: "Enter your name",
      defaultValue: "",
    },
  },
};

export const WithValue = {
  args: {
    label: "Email",
    inputProps: {
      type: "email",
      defaultValue: "jane.doe@example.com",
    },
  },
};

export const WithDescription = {
  args: {
    label: "Password",
    description: "Your password must be at least 8 characters long.",
    inputProps: {
      type: "password",
      placeholder: "Enter your password",
      defaultValue: "",
    },
  },
};

export const Disabled = {
  args: {
    label: "Username",
    isDisabled: true,
    inputProps: {
      defaultValue: "cannotchange",
    },
  },
};

export const ReadOnly = {
  args: {
    label: "Account ID",
    isReadOnly: true,
    inputProps: {
      defaultValue: "USER-12345",
    },
  },
};

export const Invalid = {
  args: {
    label: "Confirmation Code",
    // To simulate invalid state in story, TextField needs isInvalid prop.
    // RAC typically handles this based on validation.
    // For story demonstration, we can set it directly if TextField allows it,
    // or rely on internal validation if we pass specific values.
    isInvalid: true,
    errorMessage: "The code you entered is incorrect.",
    inputProps: {
      defaultValue: "WRONGCODE",
    },
  },
};

export const Required = {
  render: (args: TextFieldProps) => {
    const [value, setValue] = useState("");
    const [isInvalid, setIsInvalid] = useState(false);
    const [errorMessageText, setErrorMessageText] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!value && args.isRequired) {
        setIsInvalid(true);
        setErrorMessageText("This field is required.");
      } else {
        setIsInvalid(false);
        setErrorMessageText("");
        alert(`Form submitted with value: ${value}`);
      }
    };

    return (
      <form onSubmit={handleSubmit} style={{ width: "300px" }}>
        <TextField
          {...args}
          label={args.label || "Required Field"}
          value={value}
          onChange={(v) => {
            setValue(v);
            if (args.isRequired && !v) {
              setIsInvalid(true);
              setErrorMessageText("This field is required.");
            } else if (args.isRequired && v) {
              setIsInvalid(false);
              setErrorMessageText("");
            }
          }}
          isInvalid={isInvalid}
          errorMessage={errorMessageText}
          inputProps={{
            placeholder: "Type something...",
            ...(args.inputProps || {}),
          }}
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          style={{ marginTop: "1rem" }}
        >
          Submit
        </Button>
      </form>
    );
  },
  args: {
    label: "Required Input",
    isRequired: true,
  },
};

export const WithDifferentSizes = {
  render: (_args: TextFieldProps) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <TextField
        label="Small Input"
        inputProps={{ variantSize: "sm", placeholder: "Small" }}
      />
      <TextField
        label="Medium Input (Default)"
        inputProps={{ variantSize: "md", placeholder: "Medium" }}
      />
      <TextField
        label="Large Input"
        inputProps={{ variantSize: "lg", placeholder: "Large" }}
      />
    </div>
  ),
  args: {},
};
