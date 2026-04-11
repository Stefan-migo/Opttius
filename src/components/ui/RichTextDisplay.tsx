"use client";

import React from "react";

import { cn } from "@/lib/utils";

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

const RichTextDisplay: React.FC<RichTextDisplayProps> = ({
  content,
  className,
}) => {
  if (!content) return null;

  // Convert markdown-style formatting to HTML
  const convertMarkdownToHtml = (text: string) => {
    let html = text;

    // Convert markdown formatting to HTML
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"); // **bold**
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>"); // *italic*
    html = html.replace(/__(.*?)__/g, "<u>$1</u>"); // __underline__

    // Handle line breaks
    html = html.replace(/\n/g, "<br>");

    // Wrap in paragraphs if not already wrapped
    if (!html.includes("<p>") && !html.includes("<div>")) {
      html = `<p>${html}</p>`;
    }

    return html;
  };

  // Create a sanitized HTML string that's safe to render
  const sanitizeHtml = (html: string) => {
    // Simple sanitization - remove script tags and dangerous attributes
    const sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/on\w+="[^"]*"/gi, "")
      .replace(/javascript:/gi, "");

    return sanitized;
  };

  const processedContent = sanitizeHtml(convertMarkdownToHtml(content));

  return (
    <div
      className={cn("prose prose-sm max-w-none", className)}
      dangerouslySetInnerHTML={{
        __html: processedContent,
      }}
    />
  );
};

export default RichTextDisplay;
