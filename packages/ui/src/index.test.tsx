import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionCard, StatusPill } from "./index.js";

describe("SectionCard", () => {
  it("renders eyebrow, title and children", () => {
    render(
      <SectionCard eyebrow="Gallery" title="Premium Shots">
        <div>Body content</div>
      </SectionCard>
    );

    expect(screen.getByText("Gallery")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Premium Shots" })).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });
});

describe("StatusPill", () => {
  it("renders provided label", () => {
    render(<StatusPill label="готово" tone="success" />);
    expect(screen.getByText("готово")).toBeInTheDocument();
  });
});
