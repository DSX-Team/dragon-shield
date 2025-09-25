import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Users,
  Settings,
  Play,
  Layers,
  Wrench,
  Server,
  UserPlus,
  UserCheck,
  UsersIcon,
  Radio,
  Film,
  Tv,
  Music,
  Shield,
  Database,
  Activity,
  BarChart3,
  Package,
  Globe,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MenuGroup {
  title: string;
  icon: React.ComponentType<any>;
  items: MenuItem[];
}

interface MenuItem {
  title: string;
  path: string;
  icon?: React.ComponentType<any>;
  children?: MenuItem[];
}

const menuStructure: MenuGroup[] = [
  {
    title: "Dashboard",
    icon: BarChart3,
    items: [
      { title: "Overview", path: "/admin", icon: Activity },
      { title: "Statistics", path: "/admin/statistics", icon: BarChart3 },
    ]
  },
  {
    title: "Users",
    icon: Users,
    items: [
      {
        title: "User Lines",
        path: "/admin/users",
        icon: UserCheck,
        children: [
          { title: "Add User", path: "/admin/users/add" },
          { title: "Manage Users", path: "/admin/users" },
          { title: "Mass Edit Users", path: "/admin/users/mass-edit" },
        ]
      },
      {
        title: "Resellers",
        path: "/admin/resellers",
        icon: UsersIcon,
        children: [
          { title: "Add Reseller", path: "/admin/resellers/add" },
          { title: "Manage Resellers", path: "/admin/resellers" },
          { title: "Mass Edit Resellers", path: "/admin/resellers/mass-edit" },
        ]
      }
    ]
  },
  {
    title: "Content",
    icon: Play,
    items: [
      {
        title: "Channels",
        path: "/admin/channels",
        icon: Tv,
        children: [
          { title: "Add Channel", path: "/admin/channels/add" },
          { title: "Manage Channels", path: "/admin/channels" },
          { title: "Mass Edit Channels", path: "/admin/channels/mass-edit" },
        ]
      },
      {
        title: "Movies",
        path: "/admin/movies",
        icon: Film,
        children: [
          { title: "Add Movie", path: "/admin/movies/add" },
          { title: "Manage Movies", path: "/admin/movies" },
          { title: "Mass Edit Movies", path: "/admin/movies/mass-edit" },
        ]
      },
      {
        title: "Series",
        path: "/admin/series",
        icon: Tv,
        children: [
          { title: "Add Series", path: "/admin/series/add" },
          { title: "Manage Series", path: "/admin/series" },
          { title: "Mass Edit Series", path: "/admin/series/mass-edit" },
        ]
      },
      {
        title: "Radio Stations",
        path: "/admin/radio",
        icon: Radio,
        children: [
          { title: "Add Station", path: "/admin/radio/add" },
          { title: "Manage Stations", path: "/admin/radio" },
          { title: "Mass Edit Stations", path: "/admin/radio/mass-edit" },
        ]
      }
    ]
  },
  {
    title: "Bouquets",
    icon: Layers,
    items: [
      { title: "Add Bouquet", path: "/admin/bouquets/add", icon: Package },
      { title: "Manage Bouquets", path: "/admin/bouquets", icon: Layers },
      { title: "Order Bouquets", path: "/admin/bouquets/order", icon: Settings },
    ]
  },
  {
    title: "Management",
    icon: Wrench,
    items: [
      {
        title: "System",
        path: "/admin/system",
        icon: Settings,
        children: [
          { title: "General Settings", path: "/admin/settings" },
          { title: "Backup Settings", path: "/admin/backups" },
          { title: "Cache & Redis", path: "/admin/cache" },
        ]
      },
      {
        title: "Security",
        path: "/admin/security",
        icon: Shield,
        children: [
          { title: "Block User-Agents", path: "/admin/user-agents" },
          { title: "Block IPs", path: "/admin/blocked-ips" },
          { title: "Security Logs", path: "/admin/security-logs" },
        ]
      },
      {
        title: "Servers",
        path: "/admin/servers",
        icon: Server,
        children: [
          { title: "Add Server", path: "/admin/servers/add" },
          { title: "Manage Servers", path: "/admin/servers" },
          { title: "Server Status", path: "/admin/servers/status" },
        ]
      },
      {
        title: "Logs & Reports",
        path: "/admin/logs",
        icon: Database,
        children: [
          { title: "Connection Logs", path: "/admin/logs/connections" },
          { title: "Login Logs", path: "/admin/logs/logins" },
          { title: "Panel Logs", path: "/admin/logs/panel" },
          { title: "Stream Errors", path: "/admin/logs/streams" },
        ]
      }
    ]
  }
];

export function XUINavigation() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/admin" && currentPath === "/admin") return true;
    if (path !== "/admin" && currentPath.startsWith(path)) return true;
    return false;
  };

  const isGroupActive = (items: MenuItem[]): boolean => {
    return items.some(item => {
      if (isActive(item.path)) return true;
      if (item.children) return item.children.some(child => isActive(child.path));
      return false;
    });
  };

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const active = isActive(item.path);
    const childrenActive = hasChildren && item.children!.some(child => isActive(child.path));

    if (hasChildren) {
      return (
        <Collapsible key={item.title} defaultOpen={childrenActive}>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className={`${active || childrenActive ? 'bg-primary/10 text-primary' : ''}`}>
                {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                {!collapsed && <span>{item.title}</span>}
                {!collapsed && <ChevronDown className="ml-auto h-4 w-4" />}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.children!.map((child) => (
                  <SidebarMenuSubItem key={child.path}>
                    <SidebarMenuSubButton asChild>
                      <NavLink 
                        to={child.path}
                        className={({ isActive }) => 
                          isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                        }
                      >
                        {!collapsed && <span>{child.title}</span>}
                      </NavLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton asChild>
          <NavLink 
            to={item.path}
            className={({ isActive }) => 
              isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
            }
          >
            {item.icon && <item.icon className="mr-2 h-4 w-4" />}
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        {menuStructure.map((group) => {
          const groupActive = isGroupActive(group.items);
          
          return (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <group.icon className="mr-2 h-4 w-4" />
                {!collapsed && group.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => renderMenuItem(item))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}