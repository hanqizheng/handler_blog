import React, { createRef } from "react";

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MarkdownEditor from "../index";
import type { MarkdownEditorRef } from "../type";

describe("MarkdownEditor component", () => {
  it("should render without crashing", () => {
    const { container } = render(<MarkdownEditor />);
    expect(container).toMatchSnapshot();
  });

  it("should render with default value", () => {
    render(<MarkdownEditor defaultValue="# Hello World" />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("should render with placeholder", async () => {
    render(<MarkdownEditor placeholder="Enter markdown..." />);
    // Slate renders placeholder as a data attribute element with a delay
    await waitFor(() => {
      const placeholderElement = document.querySelector(
        '[data-slate-placeholder="true"]',
      );
      expect(placeholderElement).toBeInTheDocument();
      expect(placeholderElement?.textContent).toBe("Enter markdown...");
    });
  });

  it("should call onChange when using ref.setMarkdown", async () => {
    const handleChange = jest.fn();
    const ref = createRef<MarkdownEditorRef>();
    render(
      <MarkdownEditor ref={ref} defaultValue="" onChange={handleChange} />,
    );

    const editor = document.querySelector('[data-slate-editor="true"]');
    expect(editor).toBeInTheDocument();

    // Use ref to set markdown which triggers onChange
    await act(async () => {
      ref.current?.setMarkdown("# Test");
    });

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith("# Test");
    });
  });

  it("should work in controlled mode", async () => {
    const TestComponent = () => {
      const [value, setValue] = React.useState("# Initial");
      return (
        <div>
          <MarkdownEditor value={value} onChange={setValue} />
          <div data-testid="display-value">{value}</div>
        </div>
      );
    };

    render(<TestComponent />);
    expect(screen.getByText("Initial")).toBeInTheDocument();
  });

  it("should have readOnly attribute when disabled", () => {
    render(<MarkdownEditor disabled defaultValue="# Test" />);

    const editor = document.querySelector('[data-slate-editor="true"]');
    expect(editor).toHaveAttribute("contenteditable", "false");
  });

  it("should apply custom className", () => {
    const { container } = render(<MarkdownEditor className="custom-class" />);
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should apply custom style", () => {
    const customStyle = { border: "2px solid red" };
    const { container } = render(<MarkdownEditor style={customStyle} />);
    expect(container.firstChild).toHaveStyle(customStyle);
  });

  it("should expose ref methods", () => {
    const ref = createRef<MarkdownEditorRef>();
    render(<MarkdownEditor ref={ref} defaultValue="# Test" />);

    expect(ref.current).toBeDefined();
    expect(ref.current?.getMarkdown).toBeDefined();
    expect(ref.current?.setMarkdown).toBeDefined();
    expect(ref.current?.focus).toBeDefined();
  });

  it("should update via ref.setMarkdown", async () => {
    const ref = createRef<MarkdownEditorRef>();
    render(<MarkdownEditor ref={ref} defaultValue="# Initial" />);

    expect(screen.getByText("Initial")).toBeInTheDocument();

    // Update via ref - wrap in act to handle state updates
    await act(async () => {
      ref.current?.setMarkdown("# Updated via ref");
    });

    await waitFor(() => {
      expect(screen.getByText("Updated via ref")).toBeInTheDocument();
    });
  });

  it("should get markdown via ref.getMarkdown", () => {
    const ref = createRef<MarkdownEditorRef>();
    render(<MarkdownEditor ref={ref} defaultValue="# Test Content" />);

    expect(ref.current?.getMarkdown()).toBe("# Test Content");
  });

  it("should handle empty value", () => {
    const { container } = render(<MarkdownEditor value="" />);
    expect(container).toMatchSnapshot();
  });

  it("should handle undefined value", () => {
    const { container } = render(<MarkdownEditor value={undefined} />);
    expect(container).toMatchSnapshot();
  });

  it("should be readOnly in readOnly mode", () => {
    render(<MarkdownEditor readOnly defaultValue="# Read Only" />);
    const editor = document.querySelector('[data-slate-editor="true"]');
    expect(editor).toHaveAttribute("contenteditable", "false");
  });

  it("should sync external value changes", async () => {
    const TestComponent = () => {
      const [value, setValue] = React.useState("# Initial");

      return (
        <div>
          <MarkdownEditor value={value} onChange={setValue} />
          <button onClick={() => setValue("# External Update")}>
            Update Externally
          </button>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByText("Initial")).toBeInTheDocument();

    const button = screen.getByRole("button", { name: "Update Externally" });
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("External Update")).toBeInTheDocument();
    });
  });
});
