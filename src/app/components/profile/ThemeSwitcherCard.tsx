"use client";

import { Card, CardContent, CardTitle } from "@/app/design-system/Card";
import { VStack } from "@/app/design-system/Layout";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function ThemeSwitcherCard() {
  return (
    <Card>
      <CardContent>
        <VStack gap="4" alignItems="stretch">
          <CardTitle>Theme</CardTitle>
          <ThemeSwitcher />
        </VStack>
      </CardContent>
    </Card>
  );
}
