"use client";

import { useEffect, useState } from "react";
import type { Key } from "react-aria-components";
import {
  HStack,
  Icon,
  Select,
  SelectItem,
  Text,
  VStack,
} from "@/app/design-system";
import { Heart, Moon, Sun } from "@/app/design-system/icons";

interface Theme {
  id: string;
  name: string;
  description: string;
  icon: typeof Sun;
}

const themes: Theme[] = [
  {
    id: "light",
    name: "Light",
    description: "Clean and bright interface",
    icon: Sun,
  },
  {
    id: "dark",
    name: "Dark",
    description: "Easy on the eyes",
    icon: Moon,
  },
  {
    id: "artisanEarth",
    name: "Artisan Earth",
    description: "Warm and natural tones",
    icon: Heart,
  },
];

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<string>("light");

  // Get current theme from document on mount
  useEffect(() => {
    const theme =
      document.documentElement.getAttribute("data-panda-theme") || "light";
    setCurrentTheme(theme);
  }, []);

  const handleThemeChange = (selectedKey: Key | null) => {
    if (!selectedKey) return;

    const themeId = String(selectedKey);
    setCurrentTheme(themeId);

    // Apply theme to document
    document.documentElement.setAttribute("data-panda-theme", themeId);

    // Store theme preference in localStorage
    localStorage.setItem("preferred-theme", themeId);
  };

  // Load saved theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("preferred-theme");
    if (savedTheme && themes.some((theme) => theme.id === savedTheme)) {
      setCurrentTheme(savedTheme);
      document.documentElement.setAttribute("data-panda-theme", savedTheme);
    }
  }, []);

  return (
    <VStack gap="2" alignItems="stretch">
      <Select
        selectedKey={currentTheme}
        onSelectionChange={handleThemeChange}
        variantSize="sm"
        aria-label="Select theme"
        placeholder="Select theme"
      >
        {themes.map((theme) => (
          <SelectItem key={theme.id} id={theme.id} textValue={theme.name}>
            {(_renderProps) => (
              <HStack gap="3" alignItems="center" width="full">
                <Icon icon={theme.icon} size={16} />
                <VStack gap="0" alignItems="start" flex="1">
                  <Text fontSize="sm" fontWeight="medium">
                    {theme.name}
                  </Text>
                  <Text fontSize="xs" color="content.secondary">
                    {theme.description}
                  </Text>
                </VStack>
                {theme.id === currentTheme && (
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    color="content.primary"
                    css={{
                      backgroundColor: "border.default",
                      px: "2",
                      py: "0.5",
                      borderRadius: "sm",
                      border: "1px solid",
                      borderColor: "border.strong",
                    }}
                  >
                    Active
                  </Text>
                )}
              </HStack>
            )}
          </SelectItem>
        ))}
      </Select>
    </VStack>
  );
}
