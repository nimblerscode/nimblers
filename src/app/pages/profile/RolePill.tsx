import { Pill } from "@/app/design-system/Pill";

export const getRoleColorScheme = (role: string) => {
  switch (role) {
    case "Owner":
      return "brand";
    case "Admin":
      return "info";
    case "Editor":
      return "success";
    default:
      return "warning";
  }
};

export function RolePill({ role }: { role: string }) {
  return (
    <Pill variant={getRoleColorScheme(role)} size="sm">
      {role}
    </Pill>
  );
}
