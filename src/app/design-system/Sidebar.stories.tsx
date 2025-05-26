// Demo components for the Sidebar - showcasing its functionality

import { Box } from "../../../styled-system/jsx";
import {
  Bell,
  Heart,
  Home,
  LogOut,
  Mail,
  PlusCircle,
  Search,
  Settings,
  User,
  Users,
} from "./icons";
import { Heading, Text } from "./index";
import {
  Sidebar,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarProvider,
} from "./Sidebar";

// Demo layout wrapper
function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box height="100vh" display="flex">
      {children}
      <Box flex="1" p="6" backgroundColor="gray.50">
        <Heading as="h1" levelStyle="h2" mb="4">
          Main Content Area
        </Heading>
        <Text>
          This is the main content area. The sidebar can be toggled to save
          space while still providing quick access to navigation items through
          icons.
        </Text>
      </Box>
    </Box>
  );
}

// Basic sidebar with common navigation items
export function DefaultSidebar() {
  return (
    <DemoLayout>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <Heading as="h2" levelStyle="h3" color="brand.solid">
              My App
            </Heading>
            <Text fontSize="sm" color="content.secondary">
              Dashboard
            </Text>
          </SidebarHeader>

          <SidebarGroup title="Main">
            <SidebarItem icon={Home} label="Dashboard" href="/" active />
            <SidebarItem icon={Users} label="Team" href="/team" />
            <SidebarItem
              icon={Mail}
              label="Messages"
              href="/messages"
              badge={3}
            />
            <SidebarItem
              icon={Bell}
              label="Notifications"
              href="/notifications"
              badge="12"
            />
          </SidebarGroup>

          <SidebarGroup title="Tools">
            <SidebarItem icon={Search} label="Search" href="/search" />
            <SidebarItem icon={PlusCircle} label="Create" href="/create" />
            <SidebarItem icon={Heart} label="Favorites" href="/favorites" />
          </SidebarGroup>

          <SidebarFooter>
            <SidebarItem icon={User} label="Profile" href="/profile" />
            <SidebarItem icon={Settings} label="Settings" href="/settings" />
            <SidebarItem
              icon={LogOut}
              label="Sign Out"
              onClick={() => alert("Signing out...")}
            />
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    </DemoLayout>
  );
}

// Sidebar that starts collapsed
export function CollapsedSidebar() {
  return (
    <DemoLayout>
      <SidebarProvider defaultCollapsed>
        <Sidebar>
          <SidebarHeader>
            <Heading as="h2" levelStyle="h3" color="brand.solid">
              My App
            </Heading>
          </SidebarHeader>

          <SidebarGroup title="Navigation">
            <SidebarItem icon={Home} label="Dashboard" href="/" active />
            <SidebarItem icon={Users} label="Team" href="/team" />
            <SidebarItem
              icon={Mail}
              label="Messages"
              href="/messages"
              badge={5}
            />
            <SidebarItem icon={Settings} label="Settings" href="/settings" />
          </SidebarGroup>

          <SidebarFooter>
            <SidebarItem icon={User} label="Profile" href="/profile" />
            <SidebarItem
              icon={LogOut}
              label="Sign Out"
              onClick={() => alert("Signing out...")}
            />
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    </DemoLayout>
  );
}

// Sidebar with notification badges
export function SidebarWithBadges() {
  return (
    <DemoLayout>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <Heading as="h2" levelStyle="h3" color="brand.solid">
              Notifications
            </Heading>
          </SidebarHeader>

          <SidebarGroup title="Activity">
            <SidebarItem icon={Home} label="Dashboard" href="/" />
            <SidebarItem
              icon={Mail}
              label="Messages"
              href="/messages"
              badge={23}
            />
            <SidebarItem
              icon={Bell}
              label="Alerts"
              href="/alerts"
              badge="99+"
            />
            <SidebarItem
              icon={Users}
              label="Team Updates"
              href="/team"
              badge={7}
            />
          </SidebarGroup>

          <SidebarGroup title="Content">
            <SidebarItem
              icon={PlusCircle}
              label="New Items"
              href="/new"
              badge="New"
            />
            <SidebarItem
              icon={Heart}
              label="Favorites"
              href="/favorites"
              badge={12}
            />
          </SidebarGroup>

          <SidebarFooter>
            <SidebarItem icon={Settings} label="Settings" href="/settings" />
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    </DemoLayout>
  );
}

// Interactive example showing click handlers
export function InteractiveSidebar() {
  return (
    <DemoLayout>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <Heading as="h2" levelStyle="h3" color="brand.solid">
              Interactive
            </Heading>
          </SidebarHeader>

          <SidebarGroup title="Actions">
            <SidebarItem
              icon={Home}
              label="Dashboard"
              onClick={() => alert("Navigating to Dashboard")}
              active
            />
            <SidebarItem
              icon={Users}
              label="Team"
              onClick={() => alert("Opening Team page")}
            />
            <SidebarItem
              icon={PlusCircle}
              label="Create New"
              onClick={() => alert("Opening create dialog")}
            />
            <SidebarItem
              icon={Search}
              label="Search"
              onClick={() => alert("Opening search")}
            />
          </SidebarGroup>

          <SidebarFooter>
            <SidebarItem
              icon={Settings}
              label="Settings"
              onClick={() => alert("Opening settings")}
            />
            <SidebarItem
              icon={LogOut}
              label="Sign Out"
              onClick={() => alert("Signing out...")}
            />
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    </DemoLayout>
  );
}
