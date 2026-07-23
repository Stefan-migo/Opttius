"use client";

import { MoreVertical } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  description?: string;
  badge?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  defaultExpanded?: boolean;
  collapsible?: boolean;
}

interface Props {
  groups: NavGroup[];
  pathname: string;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (id: string) => void;
  onNavigate?: () => void;
}

export function SidebarNav({
  groups,
  pathname,
  expandedGroups,
  onToggleGroup,
  onNavigate,
}: Props) {
  return (
    <nav className="saas-sidebar-nav flex-1 min-h-0 overflow-y-auto py-2">
      <ul className="space-y-1 px-2" role="list">
        {groups.map((group) => {
          const isExpanded =
            expandedGroups[group.id] ?? group.defaultExpanded ?? false;
          const isGroupActive = group.items.some(
            (item) =>
              pathname === item.href ||
              (item.href !== "/admin/saas-management" &&
                pathname.startsWith(item.href)),
          );
          return (
            <li key={group.id}>
              <div
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-xl mb-1 transition-all duration-200",
                  isGroupActive
                    ? "bg-[#C5A059]/20 text-[#C5A059]"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
              >
                <group.icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-semibold flex-1 font-display">
                  {group.label}
                </span>
                {group.collapsible && (
                  <button
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      onToggleGroup(group.id);
                    }}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </button>
                )}
              </div>
              {(isExpanded || !group.collapsible) && group.items.length > 0 && (
                <ul className="ml-4 space-y-0.5 mt-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/admin/saas-management" &&
                        pathname.startsWith(item.href));
                    return (
                      <li key={item.href}>
                        <Link
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 group/item",
                            isActive
                              ? "bg-[#C5A059]/15 text-[#C5A059] border-l-2 border-[#C5A059]"
                              : "text-white/50 hover:bg-white/5 hover:text-white",
                          )}
                          href={item.href}
                          onClick={onNavigate}
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium flex-1">
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className="bg-[#C5A059]/20 text-[#C5A059] text-xs font-bold px-1.5 py-0.5 rounded-md">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
