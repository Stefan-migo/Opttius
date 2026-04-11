"use client";

import React from "react";

import { POSHeader, type POSHeaderProps } from "./POSHeader";
import { POSSidebar, type POSSidebarProps } from "./POSSidebar";

interface POSLayoutProps {
  children: React.ReactNode;

  // Header props
  headerProps?: Partial<POSHeaderProps>;

  // Sidebar props
  showSidebar?: boolean;
  sidebarProps?: Partial<POSSidebarProps>;
}

export function POSLayout({
  children,
  headerProps,
  showSidebar = false,
  sidebarProps,
}: POSLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-[var(--admin-bg-primary)] pb-40 lg:pb-0">
      {/* Header */}
      {headerProps && <POSHeader {...headerProps} />}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (optional) */}
        {showSidebar && sidebarProps && <POSSidebar {...sidebarProps} />}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

// Compositional variants for different layouts

/**
 * Quick Sale Layout - Optimized for fast product sales
 */
export function POSQuickSaleLayout({
  children,
  ...props
}: Omit<POSLayoutProps, "showSidebar">) {
  return (
    <POSLayout showSidebar={false} {...props}>
      {children}
    </POSLayout>
  );
}

/**
 * Advanced Sale Layout - Full featured with sidebar
 */
export function POSAdvancedSaleLayout({
  children,
  ...props
}: Omit<POSLayoutProps, "showSidebar">) {
  return (
    <POSLayout showSidebar={true} {...props}>
      {children}
    </POSLayout>
  );
}
