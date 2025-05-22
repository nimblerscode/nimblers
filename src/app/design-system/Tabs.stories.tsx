import { TTabs } from "./Tabs";

const meta = {
  title: "Design System/Tabs",
  component: TTabs.Root,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "radio",
      options: ["horizontal", "vertical"],
      description: "The orientation of the tabs",
      table: {
        defaultValue: { summary: "horizontal" },
      },
    },
  },
};

export default meta;

// Basic usage story
export const Basic = {
  render: () => (
    <TTabs.Root>
      <TTabs.List aria-label="Basic tabs example">
        <TTabs.Tab id="tab1">Overview</TTabs.Tab>
        <TTabs.Tab id="tab2">Members</TTabs.Tab>
        <TTabs.Tab id="tab3">Settings</TTabs.Tab>
      </TTabs.List>
      <TTabs.Panel id="tab1">
        Organization overview content goes here.
      </TTabs.Panel>
      <TTabs.Panel id="tab2">Members management content goes here.</TTabs.Panel>
      <TTabs.Panel id="tab3">
        Settings configuration content goes here.
      </TTabs.Panel>
    </TTabs.Root>
  ),
};

// Vertical orientation story
export const Vertical = {
  render: () => (
    <TTabs.Root orientation="vertical">
      <TTabs.List aria-label="Vertical tabs example">
        <TTabs.Tab id="vtab1">Personal Info</TTabs.Tab>
        <TTabs.Tab id="vtab2">Security</TTabs.Tab>
        <TTabs.Tab id="vtab3">Notifications</TTabs.Tab>
      </TTabs.List>
      <TTabs.Panel id="vtab1">
        Personal information settings content.
      </TTabs.Panel>
      <TTabs.Panel id="vtab2">Security settings and preferences.</TTabs.Panel>
      <TTabs.Panel id="vtab3">
        Notification preferences and settings.
      </TTabs.Panel>
    </TTabs.Root>
  ),
};

// Disabled tabs story
export const WithDisabledTabs = {
  render: () => (
    <TTabs.Root>
      <TTabs.List aria-label="Tabs with disabled state">
        <TTabs.Tab id="dtab1">Active Tab</TTabs.Tab>
        <TTabs.Tab id="dtab2" isDisabled>
          Disabled Tab
        </TTabs.Tab>
        <TTabs.Tab id="dtab3">Another Tab</TTabs.Tab>
      </TTabs.List>
      <TTabs.Panel id="dtab1">Content for the active tab.</TTabs.Panel>
      <TTabs.Panel id="dtab2">
        This content is not accessible when tab is disabled.
      </TTabs.Panel>
      <TTabs.Panel id="dtab3">Content for another tab.</TTabs.Panel>
    </TTabs.Root>
  ),
};

// Custom styled tabs story
export const CustomStyling = {
  render: () => (
    <TTabs.Root>
      <TTabs.List
        aria-label="Custom styled tabs"
        css={{
          gap: "2",
          "& [data-selected]": {
            borderColor: "accent.default",
          },
        }}
      >
        <TTabs.Tab id="custom1" css={{ fontWeight: "bold" }}>
          Bold Tab
        </TTabs.Tab>
        <TTabs.Tab id="custom2" css={{ textTransform: "uppercase" }}>
          Uppercase Tab
        </TTabs.Tab>
      </TTabs.List>
      <TTabs.Panel id="custom1">Content with custom styled tab.</TTabs.Panel>
      <TTabs.Panel id="custom2">More content with custom styling.</TTabs.Panel>
    </TTabs.Root>
  ),
};
