export const NAV_CONFIG = Object.freeze([
  {
    id: "brainstorm",
    href: "/app/brainstorm",
    label: "Brainstorm",
    visible: true,
    enabled: true,
  },
  {
    id: "requirements",
    href: "/app/views/requirements",
    label: "Requirements",
    visible: true,
    enabled: true,
  },
  {
    id: "council",
    href: "/app/council",
    label: "Council",
    visible: true,
    enabled: false,
    disabledLabel: "Coming soon",
  },
  {
    id: "nodes",
    href: "/app/nodes",
    label: "Nodes",
    visible: false,
    enabled: true,
  },
  {
    id: "views",
    href: "/app/views",
    label: "Views",
    visible: false,
    enabled: true,
  },
  {
    id: "proposals",
    href: "/app/proposals",
    label: "Proposals",
    visible: false,
    enabled: true,
  },
  {
    id: "wizard",
    href: "/app/wizard",
    label: "Wizard",
    visible: false,
    enabled: true,
  },
  {
    id: "audit",
    href: "/app/audit",
    label: "Audit",
    visible: false,
    enabled: true,
  },
  {
    id: "tour",
    href: "/app/tour",
    label: "Tour",
    visible: false,
    enabled: true,
  },
  {
    id: "export",
    href: "/app/nodes#bundle-json",
    label: "Export",
    visible: false,
    enabled: true,
  },
]);

export function getNavItemById(id) {
  return NAV_CONFIG.find((item) => item.id === id) || null;
}
