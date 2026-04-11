"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  ChevronDown,
  ChevronRight,
  Home,
  Leaf,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import React, { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigationVariants = cva(
  "relative bg-white border-b shadow-sm transition-all duration-300",
  {
    variants: {
      variant: {
        primary: "bg-white border-gray-200",
        line: "border-line-primary/20",
        transparent: "bg-transparent border-transparent",
        solid: "bg-line-primary text-white border-line-primary",
      },
      size: {
        compact: "py-2",
        normal: "py-4",
        spacious: "py-6",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "normal",
    },
  },
);

const megaMenuVariants = cva(
  "absolute top-full left-0 right-0 bg-white border-t shadow-lg opacity-0 invisible transition-all duration-300 transform translate-y-[-10px] group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 z-50",
  {
    variants: {
      lineTheme: {
        default: "border-t-brand-primary",
        alma: "border-t-[#9B201A]",
        ecos: "border-t-[#12406F]",
        jade: "border-t-[#345511]",
        umbral: "border-t-[#EA4F12]",
        utopica: "border-t-[#392E13]",
      },
    },
    defaultVariants: {
      lineTheme: "default",
    },
  },
);

interface NavItem {
  label: string;
  href?: string;
  onClick?: () => void;
  badge?: string;
  icon?: React.ReactNode;
  children?: NavItem[];
  lineTheme?: "default" | "alma" | "ecos" | "jade" | "umbral" | "utopica";
  featured?: boolean;
}

interface NavigationMenuProps extends VariantProps<typeof navigationVariants> {
  items: NavItem[];
  className?: string;
  logo?: React.ReactNode;
  actions?: React.ReactNode;
  onItemClick?: (item: NavItem) => void;
}

interface MegaMenuProps {
  item: NavItem;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
  className?: string;
  separator?: React.ReactNode;
}

export function NavigationMenu({
  items,
  className,
  logo,
  actions,
  variant,
  size,
  onItemClick,
}: NavigationMenuProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleItemHover = (label: string) => {
    setActiveMenu(label);
  };

  const handleMenuLeave = () => {
    setActiveMenu(null);
  };

  return (
    <nav className={cn(navigationVariants({ variant, size }), className)}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center space-x-8">
            {logo && <div className="flex-shrink-0">{logo}</div>}

            {/* Main Navigation Items */}
            <div className="hidden md:flex items-center space-x-1">
              {items.map((item, index) => (
                <NavItemComponent
                  isActive={activeMenu === item.label}
                  item={item}
                  key={`${item.label}-${index}`}
                  onClick={onItemClick}
                  onHover={handleItemHover}
                  onLeave={handleMenuLeave}
                />
              ))}
            </div>
          </div>

          {/* Actions Section */}
          {actions && (
            <div className="flex items-center space-x-4">{actions}</div>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavItemComponent({
  item,
  isActive,
  onHover,
  onLeave,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onHover: (label: string) => void;
  onLeave: () => void;
  onClick?: (item: NavItem) => void;
}) {
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (onClick) {
      onClick(item);
    }
    if (item.onClick) {
      item.onClick();
    }
  };

  return (
    <div
      className="relative group"
      onMouseEnter={() => hasChildren && onHover(item.label)}
      onMouseLeave={() => hasChildren && onLeave()}
    >
      <Button
        asChild={!!item.href}
        className={cn(
          "group/button relative px-4 py-2 h-auto font-medium transition-all duration-200 hover:bg-line-lightest/50",
          isActive && "text-line-primary bg-line-lightest/30",
        )}
        variant="ghost"
        onClick={handleClick}
      >
        {item.href ? (
          <a className="flex items-center space-x-2" href={item.href}>
            {item.icon && <span className="w-4 h-4">{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge && (
              <Badge className="ml-2 text-xs" variant="secondary">
                {item.badge}
              </Badge>
            )}
            {hasChildren && (
              <ChevronDown className="w-4 h-4 transition-transform group-hover/button:rotate-180" />
            )}
          </a>
        ) : (
          <div className="flex items-center space-x-2">
            {item.icon && <span className="w-4 h-4">{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge && (
              <Badge className="ml-2 text-xs" variant="secondary">
                {item.badge}
              </Badge>
            )}
            {hasChildren && (
              <ChevronDown className="w-4 h-4 transition-transform group-hover/button:rotate-180" />
            )}
          </div>
        )}
      </Button>

      {/* Mega Menu */}
      {hasChildren && (
        <MegaMenu
          className={cn(megaMenuVariants({ lineTheme: item.lineTheme }))}
          isOpen={isActive}
          item={item}
          onClose={onLeave}
        />
      )}
    </div>
  );
}

function MegaMenu({ item, isOpen, onClose, className }: MegaMenuProps) {
  if (!item.children) return null;

  return (
    <div className={className}>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {item.children.map((child, index) => (
            <div className="space-y-4" key={`${child.label}-${index}`}>
              <div className="flex items-center space-x-2">
                {child.icon && (
                  <div className="w-5 h-5 text-line-primary">{child.icon}</div>
                )}
                <h3 className="font-semibold text-foreground text-lg">
                  {child.label}
                </h3>
                {child.featured && (
                  <Badge className="text-xs" variant="secondary">
                    Popular
                  </Badge>
                )}
              </div>

              {child.children && (
                <ul className="space-y-2">
                  {child.children.map((grandchild, gIndex) => (
                    <li key={`${grandchild.label}-${gIndex}`}>
                      <a
                        className="flex items-center space-x-2 text-muted-foreground hover:text-line-primary transition-colors duration-200 group"
                        href={grandchild.href}
                        onClick={() => {
                          if (grandchild.onClick) grandchild.onClick();
                          onClose();
                        }}
                      >
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span>{grandchild.label}</span>
                        {grandchild.badge && (
                          <Badge className="text-xs" variant="outline">
                            {grandchild.badge}
                          </Badge>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Breadcrumb({
  items,
  className,
  separator = <ChevronRight className="w-4 h-4 text-muted-foreground" />,
}: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center space-x-2 text-sm", className)}>
      <a
        className="flex items-center text-muted-foreground hover:text-line-primary transition-colors"
        href="/"
      >
        <Home className="w-4 h-4" />
        <span className="sr-only">Home</span>
      </a>

      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {separator}
          {item.href ? (
            <a
              className="text-muted-foreground hover:text-line-primary transition-colors"
              href={item.href}
            >
              {item.label}
            </a>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// Sample navigation configuration for OPTTIUS
export const daLuzNavigationItems: NavItem[] = [
  {
    label: "Productos",
    href: "/productos",
    icon: <ShoppingBag className="w-4 h-4" />,
    children: [
      {
        label: "Línea Alma Terra",
        icon: <Leaf className="w-5 h-5" />,
        lineTheme: "alma",
        featured: true,
        children: [
          { label: "Cremas Faciales", href: "/productos/cremas-faciales" },
          {
            label: "Aceites Corporales",
            href: "/productos/aceites-corporales",
          },
          { label: "Hidrolatos", href: "/productos/hidrolatos" },
        ],
      },
      {
        label: "Línea Ecos",
        icon: <Sparkles className="w-5 h-5" />,
        lineTheme: "ecos",
        children: [
          { label: "Tónicos", href: "/productos/tonicos" },
          { label: "Serums", href: "/productos/serums" },
          { label: "Mascarillas", href: "/productos/mascarillas" },
        ],
      },
      {
        label: "Línea Jade Ritual",
        icon: <Leaf className="w-5 h-5" />,
        lineTheme: "jade",
        children: [
          { label: "Rituales de Belleza", href: "/productos/rituales" },
          {
            label: "Aceites Esenciales",
            href: "/productos/aceites-esenciales",
          },
        ],
      },
    ],
  },
  {
    label: "Membresía",
    href: "/membresia",
    badge: "7 meses",
    children: [
      {
        label: "Programa Completo",
        children: [
          { label: "Visión General", href: "/membresia" },
          { label: "Módulos", href: "/membresia/modulos" },
          { label: "Beneficios", href: "/membresia/beneficios" },
        ],
      },
    ],
  },
  {
    label: "Servicios",
    href: "/servicios",
    children: [
      {
        label: "Consultas Personalizadas",
        children: [
          { label: "Análisis de Piel", href: "/servicios/analisis" },
          { label: "Rutinas Personalizadas", href: "/servicios/rutinas" },
        ],
      },
    ],
  },
  {
    label: "Blog",
    href: "/blog",
  },
];
