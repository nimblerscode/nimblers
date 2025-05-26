# Sidebar Component

A collapsible sidebar navigation component that provides an intuitive and space-efficient navigation experience for your application.

## Features

- **Expandable/Collapsible states** with smooth transitions
- **Icon-only mode** when collapsed for space efficiency
- **Grouped navigation items** with section headers
- **Active state indicators** for current page
- **Badge support** for notifications or counts
- **Keyboard navigation** and accessibility features
- **Responsive design** that adapts to different screen sizes

## Components

### SidebarProvider

The context provider that manages the sidebar's collapsed state.

```tsx
<SidebarProvider defaultCollapsed={false}>
  {/* Your sidebar and content */}
</SidebarProvider>
```

**Props:**

- `defaultCollapsed?: boolean` - Initial collapsed state (default: false)
- `children: React.ReactNode` - Child components

### Sidebar

The main sidebar container component.

```tsx
<Sidebar className="custom-class">{/* Sidebar content */}</Sidebar>
```

**Props:**

- `children: React.ReactNode` - Sidebar content
- `className?: string` - Additional CSS classes

### SidebarHeader

Header section of the sidebar, typically containing app branding.

```tsx
<SidebarHeader>
  <Heading as="h2" levelStyle="h3" color="brand.solid">
    My App
  </Heading>
  <Text fontSize="sm" color="content.secondary">
    Dashboard
  </Text>
</SidebarHeader>
```

### SidebarGroup

Groups related navigation items with an optional title.

```tsx
<SidebarGroup title="Main Navigation">
  {/* SidebarItem components */}
</SidebarGroup>
```

**Props:**

- `title?: string` - Group title (hidden when collapsed)
- `children: React.ReactNode` - Navigation items

### SidebarItem

Individual navigation item with icon, label, and optional badge.

```tsx
<SidebarItem
  icon={Home}
  label="Dashboard"
  href="/dashboard"
  active={true}
  badge={5}
/>
```

**Props:**

- `icon: LucideIcon` - Icon component from Lucide React
- `label: string` - Text label for the item
- `href?: string` - Navigation URL (creates a link)
- `onClick?: () => void` - Click handler (creates a button)
- `active?: boolean` - Whether the item is currently active
- `badge?: string | number` - Optional badge content

### SidebarFooter

Footer section of the sidebar, typically for user account actions.

```tsx
<SidebarFooter>
  <SidebarItem icon={User} label="Profile" href="/profile" />
  <SidebarItem icon={LogOut} label="Sign Out" onClick={handleSignOut} />
</SidebarFooter>
```

## Usage Examples

### Basic Sidebar

```tsx
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarGroup,
  SidebarItem,
  SidebarFooter,
  Heading,
  Text,
} from "@/app/design-system";
import { Home, Users, Settings, User, LogOut } from "@/app/design-system/icons";

function App() {
  return (
    <SidebarProvider>
      <div style={{ display: "flex", height: "100vh" }}>
        <Sidebar>
          <SidebarHeader>
            <Heading as="h2" levelStyle="h3" color="brand.solid">
              My App
            </Heading>
          </SidebarHeader>

          <SidebarGroup title="Main">
            <SidebarItem icon={Home} label="Dashboard" href="/" active />
            <SidebarItem icon={Users} label="Team" href="/team" />
            <SidebarItem icon={Settings} label="Settings" href="/settings" />
          </SidebarGroup>

          <SidebarFooter>
            <SidebarItem icon={User} label="Profile" href="/profile" />
            <SidebarItem
              icon={LogOut}
              label="Sign Out"
              onClick={() => signOut()}
            />
          </SidebarFooter>
        </Sidebar>

        <main style={{ flex: 1, padding: "24px" }}>
          {/* Your main content */}
        </main>
      </div>
    </SidebarProvider>
  );
}
```

### With Notification Badges

```tsx
<SidebarGroup title="Activity">
  <SidebarItem icon={Mail} label="Messages" href="/messages" badge={23} />
  <SidebarItem icon={Bell} label="Alerts" href="/alerts" badge="99+" />
  <SidebarItem icon={Users} label="Team Updates" href="/team" badge={7} />
</SidebarGroup>
```

### Starting Collapsed

```tsx
<SidebarProvider defaultCollapsed>
  <Sidebar>{/* Sidebar content */}</Sidebar>
</SidebarProvider>
```

### Using the Hook

```tsx
import { useSidebar } from "@/app/design-system";

function CustomComponent() {
  const { isCollapsed, toggleCollapsed } = useSidebar();

  return (
    <button onClick={toggleCollapsed}>
      {isCollapsed ? "Expand" : "Collapse"} Sidebar
    </button>
  );
}
```

## Styling

The sidebar uses Panda CSS with semantic design tokens:

- **Colors**: Uses `brand.solid`, `content.primary`, `border.default`, etc.
- **Spacing**: Consistent padding and margins using theme tokens
- **Transitions**: Smooth 0.3s ease-in-out transitions for state changes
- **Typography**: Theme-aware font sizes and weights

### Customization

You can customize the sidebar appearance by:

1. **Overriding CSS classes**: Pass custom `className` props
2. **Using CSS props**: Apply custom styles via the `css` prop on child components
3. **Theming**: Modify design tokens in your Panda CSS configuration

## Accessibility

The sidebar includes comprehensive accessibility features:

- **Keyboard Navigation**: Full keyboard support with Tab, Enter, and Space
- **ARIA Labels**: Proper labeling for screen readers
- **Focus Management**: Visible focus indicators
- **Semantic HTML**: Uses appropriate HTML elements and roles

## Responsive Behavior

- **Desktop**: Full sidebar with labels and icons
- **Collapsed**: Icon-only mode for space efficiency
- **Mobile**: Consider using a drawer/overlay pattern for mobile devices

## Integration with Routing

The sidebar works with any routing solution. For active state management:

```tsx
// With React Router
import { useLocation } from "react-router-dom";

function AppSidebar() {
  const location = useLocation();

  return (
    <SidebarItem
      icon={Home}
      label="Dashboard"
      href="/dashboard"
      active={location.pathname === "/dashboard"}
    />
  );
}

// With custom routing
function AppSidebar({ currentPath }: { currentPath: string }) {
  return (
    <SidebarItem
      icon={Home}
      label="Dashboard"
      href="/dashboard"
      active={currentPath === "/dashboard"}
    />
  );
}
```

## Performance Considerations

- **Context Optimization**: The sidebar context only re-renders when collapse state changes
- **Icon Loading**: Icons are tree-shaken from Lucide React
- **Smooth Transitions**: CSS transitions are optimized for performance
- **Memory Efficient**: Minimal state management and event listeners

## Best Practices

1. **Group Related Items**: Use `SidebarGroup` to organize navigation logically
2. **Consistent Icons**: Use icons from the same icon family (Lucide React)
3. **Clear Labels**: Use descriptive, concise labels for navigation items
4. **Badge Usage**: Use badges sparingly for important notifications only
5. **Active States**: Always indicate the current page/section
6. **Keyboard Support**: Ensure all interactive elements are keyboard accessible
