import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BlurText from "../BlurText";

describe("BlurText", () => {
  it("renders each word as a span when animateBy='words'", () => {
    const { container } = render(
      <BlurText text="Hola mundo" animateBy="words" />,
    );
    const spans = container.querySelectorAll("span");
    // 2 words → 2 spans (trailing nbsp is inside each span)
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toContain("Hola");
    expect(spans[1].textContent).toContain("mundo");
  });

  it("renders each letter as a span when animateBy='letters'", () => {
    const { container } = render(
      <BlurText text="Hola" animateBy="letters" />,
    );
    const spans = container.querySelectorAll("span");
    expect(spans.length).toBe(4);
    expect(spans[0].textContent).toBe("H");
    expect(spans[3].textContent).toBe("a");
  });

  it("applies custom className alongside blur-text", () => {
    render(<BlurText text="test" className="custom-cls" />);
    const wrapper = document.querySelector(".blur-text");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass("custom-cls");
  });

  it("renders with default props and no errors", () => {
    const { container } = render(<BlurText />);
    const spans = container.querySelectorAll("span");
    // empty string → one empty segment → one span
    expect(spans.length).toBe(1);
  });

  it("inserts non-breaking spaces between words", () => {
    const { container } = render(
      <BlurText text="a b c" animateBy="words" />,
    );
    const spans = container.querySelectorAll("span");
    // 3 words → 3 spans
    expect(spans.length).toBe(3);
    // Each span has the letter + trailing nbsp (except last)
    expect(spans[0].textContent).toBe("a\u00A0");
    expect(spans[1].textContent).toBe("b\u00A0");
    expect(spans[2].textContent).toBe("c");
  });
});
