"use client";

import { cn } from "@/lib/utils";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  forceLight?: boolean;
}

/**
 * Opttius Isotype Icon
 * Uses CSS variables for automatic theme adaptation.
 * Larger and vertically balanced.
 */
export function OpttiusIcon({
  className,
  forceLight = false,
  ...props
}: LogoProps) {
  return (
    <svg
      viewBox="0 0 121.07 121"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-12 w-12 drop-shadow-sm", className)}
      {...props}
    >
      <g transform="translate(0, 0.1)">
        <path
          fill="#1A2B23"
          className="transition-colors duration-500"
          d="M56.71.1c43.63-2.48,75.39,39.63,60.73,80.94-16.26,45.81-78.43,53.95-106.43,14.23C-16.11,56.82,9.81,2.77,56.71.1Z"
        />
        <path
          fill="#F9F7F2"
          className="transition-colors duration-500"
          d="M55.07,31.09v10.77h3.91s.32.29.32.32v9.72s-.29.32-.32.32h-3.91v18.48c0,.6-.59,2.71-.79,3.43-2.7,9.63-11.23,15.95-21.2,16.31v-9.93c4.55-.39,8.71-2.74,10.72-6.93.36-.76,1.33-3.46,1.33-4.16v-17.21H15.53v-10.35h29.6v-10.77h9.94Z"
        />
        <path
          fill="#D4AF37"
          className="transition-colors duration-500"
          d="M76,31.09v10.77h29.6v10.35h-29.6c.41,5.99-.77,12.97.53,18.8s6.04,9.34,11.74,9.71v9.72c-7.8.03-15.53-4.44-19.28-11.26-4.56-8.29-2.44-18.12-2.93-27.18-.23-.08-.46.21-.53.21h-3.49v-10.35h4.02v-10.77h9.94Z"
        />
      </g>
    </svg>
  );
}

/**
 * Opttius Wordmark / Text Logo
 * Refined for visual alignment with the icon.
 */
export function OpttiusLogoText({
  className,
  forceLight = false,
  ...props
}: LogoProps) {
  const textFill = forceLight
    ? "fill-admin-text-on-dark"
    : "fill-admin-text-primary";
  const sloganFill = forceLight
    ? "fill-admin-text-on-dark"
    : "fill-admin-text-primary/75";

  return (
    <svg
      viewBox="0 0 350.25 100"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-12 w-48 drop-shadow-sm pr-5 pl-0", className)}
      {...props}
    >
      <g>
        {/* Wordmark "Opttius" - Vertically centered exactly at 50 units (word height ~47) */}
        <g transform="translate(0, 24)">
          <path
            className={cn(textFill, "transition-colors duration-500")}
            d="M16.14,2.31c25.61-2.83,28.28,33.37,5.81,35.73C-5.55,40.93-6.89,4.86,16.14,2.31ZM9.98,28.97c4.78,5.04,14.02,4.7,18.22-.92,7.74-10.33-3.16-24.62-15.25-18.67-6.95,3.42-8.19,14.09-2.98,19.58Z"
          />
          <path
            className={cn(textFill, "transition-colors duration-500")}
            d="M49.57,33.82v12.82h-6.41V11.81c0-.83,6.18-.88,6.41-.64.32.32-.59,3.56.42,3.85.89-2.5,4.56-4.07,7.04-4.29,19.29-1.72,18.98,30.06-.8,27.33-2.8-.39-4.85-2.31-6.66-4.24ZM62.67,18.16c-4.07-4.09-11.7-2.24-12.9,3.67-2.87,14.07,16.39,14.77,15.22,1.5-.15-1.74-1.1-3.94-2.31-5.16Z"
          />
          <path
            className={cn(textFill, "transition-colors duration-500")}
            d="M84.19,4.76v6.84h7.69v5.13h-7.69v13.46c0,.15,1,1.55,1.25,1.74,2.28,1.81,5.57-.69,6.02-.25l1.29,4.7c-3.9,2.14-11.6,3.05-13.92-1.68-.26-.53-1.04-2.84-1.04-3.23v-14.74c0-.19-3.77.34-3.85-.25.14-.78-.17-4.71,0-4.88.16-.16,3.17.12,3.85,0v-6.84h6.41Z"
          />
          <path
            className="fill-admin-accent-primary transition-colors duration-500"
            d="M136.76,11.17v15.6c0,.57.94,3.18,1.35,3.78,2.71,3.93,10.29,1.75,11.02-2.95.41-2.69-.54-14.95.21-16.03.61-.87,4.96-.19,6.22-.4v26.5h-5.98c-.19,0,.14-3.37,0-3.85-1.9,2.09-4.12,3.94-7.05,4.27-15.86,1.81-11.67-16.21-12.12-26.23.45-1.36,5.05-.44,6.35-.7Z"
          />
          <path
            className="fill-admin-accent-primary transition-colors duration-500"
            d="M182.01,12.94c.43.69-1.45,4.97-1.89,5.06-.32.07-2.73-1.26-3.6-1.49-2.33-.62-10.54-1.25-8.08,2.94,2.12,3.61,13.15,1.82,14.38,9.14,1.96,11.68-15.81,11.69-21.93,6.1-.35-.54,2.15-4.66,2.59-4.66,2.29,2.88,14.76,5.29,12.96-.6-.94-3.06-13.13-1.67-14.35-8.73-1.93-11.23,12.91-11.69,19.93-7.75Z"
          />
          <path
            className="fill-admin-accent-primary transition-colors duration-500"
            d="M103.85,4.76v6.84h7.69c-.08.91.37,5.13-.64,5.13h-7.05v13.46c0,.15,1,1.55,1.25,1.74,2.28,1.81,5.52-.69,6.01-.25l1.28,4.68c-3.62,1.99-10.43,3.08-13.18-.69-.28-.38-1.77-3.57-1.77-3.78v-15.17c0-.19-3.77.34-3.85-.25.14-.78-.17-4.71,0-4.88.16-.16,3.17.12,3.85,0v-6.84h6.41Z"
          />
          <path
            className="fill-admin-accent-primary transition-colors duration-500"
            d="M123.08,37.67h-6.41V11.6c1.04.47,6.41-1.12,6.41.21v25.86Z"
          />
          <path
            className="fill-admin-accent-primary transition-colors duration-500"
            d="M118.69.15c6.07-1.37,6.87,7.09,1.52,7.52-4.9.39-5.8-6.55-1.52-7.52Z"
          />
        </g>

        {/* Slogan - Pushed lower and darkened slightly for hierarchy but kept "bright" */}
        <text
          x=".85"
          y="88"
          className={cn(
            sloganFill,
            "transition-colors duration-500 uppercase tracking-[0.25em] font-black",
          )}
          style={{ fontSize: "16px", fontFamily: "var(--font-heading)" }}
        >
          Sistema de Gestión Óptica
        </text>
      </g>
    </svg>
  );
}

/**
 * Combined Brand Component
 * Perfected alignment.
 */
export function OpttiusBrand({
  className,
  showText = true,
  forceLight = false,
}: {
  className?: string;
  showText?: boolean;
  forceLight?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-4 pl-5", className)}>
      <div className="flex-shrink-0 flex items-center justify-center">
        <OpttiusIcon
          forceLight={forceLight}
          className="h-10 w-10 md:h-11 md:w-11 transition-transform duration-500 hover:scale-110"
        />
      </div>
      {showText && (
        <div className="flex flex-col items-start justify-center">
          <OpttiusLogoText
            forceLight={forceLight}
            className="h-10 w-40 md:w-44"
          />
        </div>
      )}
    </div>
  );
}
/**
 * Opttius Vertical Logo (Compact)
 * Icon on top, wordmark below. No slogan.
 * Based on logoYopttius.svg paths.
 */
export function OpttiusLogoCompact({
  className,
  forceLight = false,
  ...props
}: LogoProps) {
  const textFill = forceLight
    ? "fill-admin-text-on-dark"
    : "fill-admin-text-primary";

  return (
    <svg
      viewBox="0 0 183 144"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-32 w-40 drop-shadow-md", className)}
      {...props}
    >
      <defs>
        <linearGradient
          id="vertical-icon-accent"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop
            offset="0%"
            style={{ stopColor: "var(--admin-accent-primary)" }}
          />
          <stop
            offset="100%"
            style={{
              stopColor:
                "var(--admin-accent-secondary, var(--admin-accent-primary))",
            }}
          />
        </linearGradient>
      </defs>
      <g>
        {/* Isotype - Top Section */}
        <g className="transition-all duration-500">
          <path
            className={cn(textFill, "transition-colors duration-500")}
            d="M80.89,0v16.35h5.94s.48.45.48.48v14.75s-.45.48-.48.48h-5.94v28.05c0,.91-.89,4.12-1.2,5.21-4.1,14.61-17.05,24.21-32.17,24.76v-15.07c6.91-.59,13.22-4.15,16.27-10.51.55-1.15,2.02-5.25,2.02-6.32v-26.13H20.89v-15.71h44.92V0h15.08Z"
          />
          <path
            fill="url(#vertical-icon-accent)"
            className="transition-colors duration-500"
            d="M112.66,0v16.35h44.92v15.71h-44.92c.63,9.09-1.16,19.69.8,28.53,1.9,8.59,9.16,14.17,17.81,14.74v14.75c-11.83.04-23.57-6.74-29.25-17.1-6.92-12.58-3.7-27.5-4.44-41.25-.35-.12-.7.32-.8.32h-5.29v-15.71h6.1V0h15.08Z"
          />
        </g>

        {/* Wordmark - Bottom Section */}
        <g className="transition-all duration-500">
          <path
            className={cn(textFill, "transition-colors duration-500")}
            d="M16.14,99.04c25.61-2.83,28.28,33.37,5.81,35.73-27.51,2.88-28.85-33.19-5.81-35.73ZM9.98,125.7c4.78,5.04,14.02,4.7,18.22-.92,7.74-10.33-3.16-24.62-15.25-18.67-6.95,3.42-8.19,14.09-2.98,19.58Z"
          />
          <path
            className={cn(textFill, "transition-colors duration-500")}
            d="M49.57,130.55v12.82h-6.41v-34.83c0-.83,6.18-.88,6.41-.64.32.32-.59,3.56.42,3.85.89-2.5,4.56-4.07,7.04-4.29,19.29-1.72,18.98,30.06-.8,27.33-2.8-.39-4.85-2.31-6.66-4.24ZM62.67,114.89c-4.07-4.09-11.7-2.24-12.9,3.67-2.87,14.07,16.39,14.77,15.22,1.5-.15-1.74-1.1-3.94-2.31-5.16Z"
          />
          <path
            className={cn(textFill, "transition-colors duration-500")}
            d="M84.19,101.49v6.84h7.69v5.13h-7.69v13.46c0,.15,1,1.55,1.25,1.74,2.28,1.81,5.57-.69,6.02-.25l1.29,4.7c-3.9,2.14-11.6,3.05-13.92-1.68-.26-.53-1.04-2.84-1.04-3.23v-14.74c0-.19-3.77.34-3.85-.25.14-.78-.17-4.71,0-4.88.16-.16,3.17.12,3.85,0v-6.84h6.41Z"
          />
          <path
            className="fill-admin-accent-primary transition-colors duration-500"
            d="M136.76,107.9v15.6c0,.57.94,3.18,1.35,3.78,2.71,3.93,10.29,1.75,11.02-2.95.41-2.69-.54-14.95.21-16.03.61-.87,4.96-.19,6.22-.4v26.5h-5.98c-.19,0,.14-3.37,0-3.85-1.9,2.09-4.12,3.94-7.05,4.27-15.86,1.81-11.67-16.21-12.12-26.23.45-1.36,5.05-.44,6.35-.7Z"
          />
          <path
            className="fill-admin-accent-primary transition-colors duration-500"
            d="M182.01,109.66c.43.69-1.45,4.97-1.89,5.06-.32.07-2.73-1.26-3.6-1.49-2.33-.62-10.54-1.25-8.08,2.94,2.12,3.61,13.15,1.82,14.38,9.14,1.96,11.68-15.81,11.69-21.93,6.1-.35-.54,2.15-4.66,2.59-4.66,2.29,2.88,14.76,5.29,12.96-.6-.94-3.06-13.13-1.67-14.35-8.73-1.93-11.23,12.91-11.69,19.93-7.75Z"
          />
          <path
            className="fill-admin-accent-primary transition-colors duration-500"
            d="M103.85,101.49v6.84h7.69c-.08.91.37,5.13-.64,5.13h-7.05v13.46c0,.15,1,1.55,1.25,1.74,2.28,1.81,5.52-.69,6.01-.25l1.28,4.68c-3.62,1.99-10.43,3.08-13.18-.69-.28-.38-1.77-3.57-1.77-3.78v-15.17c0-.19-3.77.34-3.85-.25.14-.78-.17-4.71,0-4.88.16-.16,3.17.12,3.85,0v-6.84h6.41Z"
          />
          <path
            className="fill-admin-accent-primary transition-colors duration-500"
            d="M123.08,134.4h-6.41v-26.07c1.04.47,6.41-1.12,6.41.21v25.86Z"
          />
          <path
            className="fill-admin-accent-primary transition-colors duration-500"
            d="M118.69,96.88c6.07-1.37,6.87,7.09,1.52,7.52-4.9.39-5.8-6.55-1.52-7.52Z"
          />
        </g>
      </g>
    </svg>
  );
}
