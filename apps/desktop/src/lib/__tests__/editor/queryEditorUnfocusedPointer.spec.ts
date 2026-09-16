import { describe, expect, it, vi } from "vitest";
import { preserveQueryEditorScrollPosition, shouldStabilizeUnfocusedQueryEditorPointerDown, stabilizeUnfocusedQueryEditorPointerDown, type UnfocusedQueryEditorView } from "@/lib/editor/queryEditorUnfocusedPointer";

function createEvent(
  overrides: Partial<{
    button: number;
    clientX: number;
    clientY: number;
    detail: number;
    shiftKey: boolean;
  }> = {},
) {
  return {
    button: 0,
    clientX: 120,
    clientY: 80,
    detail: 1,
    shiftKey: false,
    preventDefault: vi.fn(),
    ...overrides,
  };
}

function createView(hasFocus = false, pos: number | null = 42): UnfocusedQueryEditorView {
  const scrollDOM = { scrollLeft: 40, scrollTop: 320 };
  return {
    hasFocus,
    focus: vi.fn(() => {
      scrollDOM.scrollLeft = 0;
      scrollDOM.scrollTop = 0;
    }),
    posAtCoords: vi.fn(() => pos),
    dispatch: vi.fn(() => {
      scrollDOM.scrollLeft = 8;
      scrollDOM.scrollTop = 16;
    }),
    scrollDOM,
  };
}

describe("shouldStabilizeUnfocusedQueryEditorPointerDown", () => {
  it("handles an unmodified left click on an unfocused editor", () => {
    expect(
      shouldStabilizeUnfocusedQueryEditorPointerDown(createEvent(), {
        hasFocus: false,
      }),
    ).toBe(true);
  });

  it("leaves focused clicks, Shift-extend, multi-click, and non-primary buttons alone", () => {
    expect(
      shouldStabilizeUnfocusedQueryEditorPointerDown(createEvent(), {
        hasFocus: true,
      }),
    ).toBe(false);
    expect(shouldStabilizeUnfocusedQueryEditorPointerDown(createEvent({ shiftKey: true }), { hasFocus: false })).toBe(false);
    expect(shouldStabilizeUnfocusedQueryEditorPointerDown(createEvent({ detail: 2 }), { hasFocus: false })).toBe(false);
    expect(shouldStabilizeUnfocusedQueryEditorPointerDown(createEvent({ detail: 3 }), { hasFocus: false })).toBe(false);
    expect(shouldStabilizeUnfocusedQueryEditorPointerDown(createEvent({ button: 1 }), { hasFocus: false })).toBe(false);
    expect(shouldStabilizeUnfocusedQueryEditorPointerDown(createEvent(), null)).toBe(false);
  });
});

describe("preserveQueryEditorScrollPosition", () => {
  it("restores a scroller that jumped during focus", () => {
    const scroller = { scrollLeft: 40, scrollTop: 320 };
    const restoreScroll = preserveQueryEditorScrollPosition(scroller);
    scroller.scrollLeft = 0;
    scroller.scrollTop = 0;
    restoreScroll();
    expect(scroller).toEqual({ scrollLeft: 40, scrollTop: 320 });
  });
});

describe("stabilizeUnfocusedQueryEditorPointerDown", () => {
  it("prevents the default focus scroll and restores the viewport", () => {
    const view = createView();
    const event = createEvent();
    const scheduled: Array<() => void> = [];

    expect(stabilizeUnfocusedQueryEditorPointerDown(view, event, (callback) => scheduled.push(callback))).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(view.posAtCoords).toHaveBeenCalledWith({ x: 120, y: 80 });
    expect(view.focus).toHaveBeenCalledOnce();
    expect(view.dispatch).toHaveBeenCalledWith({
      selection: { anchor: 42 },
      userEvent: "select.pointer",
    });
    expect(view.scrollDOM).toEqual({ scrollLeft: 40, scrollTop: 320 });

    view.scrollDOM.scrollLeft = 12;
    view.scrollDOM.scrollTop = 8;
    scheduled[0]?.();
    expect(view.scrollDOM).toEqual({ scrollLeft: 40, scrollTop: 320 });
  });

  it("does not intercept a focused editor click", () => {
    const view = createView(true);
    const event = createEvent();

    expect(stabilizeUnfocusedQueryEditorPointerDown(view, event)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(view.focus).not.toHaveBeenCalled();
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  it("focuses without moving the caret when the click is outside the document", () => {
    const view = createView(false, null);
    const event = createEvent();

    expect(stabilizeUnfocusedQueryEditorPointerDown(view, event, () => {})).toBe(true);
    expect(view.focus).toHaveBeenCalledOnce();
    expect(view.dispatch).not.toHaveBeenCalled();
  });
});
