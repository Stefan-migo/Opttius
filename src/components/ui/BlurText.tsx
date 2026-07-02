"use client";

import { useEffect, useMemo, useRef } from "react";

type BlurTextProps = {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  onAnimationComplete?: () => void;
  stepDuration?: number;
  as?: keyof JSX.IntrinsicElements;
  style?: React.CSSProperties;
};

const BlurText: React.FC<BlurTextProps> = ({
  text = "",
  delay = 200,
  className = "",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  onAnimationComplete,
  stepDuration = 0.35,
  as = "p",
  style,
}) => {
  const elements = animateBy === "words" ? text.split(" ") : text.split("");
  const ref = useRef<HTMLElement>(null);
  const animateRef = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animateRef.current = true;
          ref.current?.classList.add("blur-text--animate");
          observer.unobserve(ref.current as Element);
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const tagName = as as keyof JSX.IntrinsicElements;
  const Component = tagName;

  const totalDuration = stepDuration * 2;

  return (
    <>
      <style>{`
        @keyframes blurReveal-top {
          0%   { filter: blur(10px); opacity: 0; transform: translateY(-50px); }
          50%  { filter: blur(5px);  opacity: 0.5; transform: translateY(5px); }
          100% { filter: blur(0px);  opacity: 1; transform: translateY(0); }
        }
        @keyframes blurReveal-bottom {
          0%   { filter: blur(10px); opacity: 0; transform: translateY(50px); }
          50%  { filter: blur(5px);  opacity: 0.5; transform: translateY(-5px); }
          100% { filter: blur(0px);  opacity: 1; transform: translateY(0); }
        }
        .blur-text--animate > span {
          animation: blurReveal-${direction} ${totalDuration}s linear both;
        }
      `}</style>
      <Component
        className={`blur-text ${className} flex flex-wrap justify-center text-center`}
        ref={ref}
        style={style}
      >
        {elements.map((segment, index) => (
          <span
            key={index}
            onAnimationEnd={
              index === elements.length - 1 ? onAnimationComplete : undefined
            }
            style={{
              display: "inline-block",
              willChange: "transform, filter, opacity",
              fontFamily: style?.fontFamily || "inherit",
              fontWeight: style?.fontWeight || "inherit",
              fontStyle: style?.fontStyle || "inherit",
              fontSize: "inherit",
              lineHeight: "inherit",
              letterSpacing: "inherit",
              animationDelay: `${(index * delay) / 1000}s`,
            }}
          >
            {segment === " " ? "\u00A0" : segment}
            {animateBy === "words" && index < elements.length - 1 && "\u00A0"}
          </span>
        ))}
      </Component>
    </>
  );
};

export default BlurText;
