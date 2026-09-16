/**
 * Click-to-focus for an unfocused SQL editor.
 *
 * On macOS WKWebView, a blurred contenteditable keeps its last selection. Clicking
 * after the scroller has moved can restore that caret (jumping the viewport) and
 * treat the click as a range from the old caret to the pointer. The scrollbar
 * pointer guard does not cover wheel/trackpad scrolling (#9296).
 */

export interface UnfocusedQueryEditorPointerEvent {
  button: number;
  clientX: number;
  clientY: number;
  detail: number;
  shiftKey: boolean;
  preventDefault(): void;
}

export interface UnfocusedQueryEditorScroller {
  scrollLeft: number;
  scrollTop: number;
}

export interface UnfocusedQueryEditorView {
  hasFocus: boolean;
  focus(): void;
  scrollDOM: UnfocusedQueryEditorScroller;
  posAtCoords(coords: { x: number; y: number }): number | null;
  dispatch(spec: { selection: { anchor: number }; userEvent?: string }): void;
}

export function shouldStabilizeUnfocusedQueryEditorPointerDown(event: Pick<UnfocusedQueryEditorPointerEvent, "button" | "detail" | "shiftKey">, view: Pick<UnfocusedQueryEditorView, "hasFocus"> | null | undefined): boolean {
  if (!view || view.hasFocus) return false;
  if (event.button !== 0) return false;
  if (event.shiftKey) return false;
  if (event.detail > 1) return false;
  return true;
}

export function preserveQueryEditorScrollPosition(scroller: UnfocusedQueryEditorScroller) {
  const scrollLeft = scroller.scrollLeft;
  const scrollTop = scroller.scrollTop;
  return () => {
    if (scroller.scrollLeft !== scrollLeft) scroller.scrollLeft = scrollLeft;
    if (scroller.scrollTop !== scrollTop) scroller.scrollTop = scrollTop;
  };
}

/** Prevents the browser from scrolling the old caret into view, then places the caret at the click. */
export function stabilizeUnfocusedQueryEditorPointerDown(view: UnfocusedQueryEditorView, event: UnfocusedQueryEditorPointerEvent, scheduleFrame?: (callback: () => void) => void): boolean {
  if (!shouldStabilizeUnfocusedQueryEditorPointerDown(event, view)) return false;

  event.preventDefault();
  const restoreScroll = preserveQueryEditorScrollPosition(view.scrollDOM);
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
  view.focus();
  restoreScroll();
  if (pos != null) {
    view.dispatch({
      selection: { anchor: pos },
      userEvent: "select.pointer",
    });
    restoreScroll();
  }
  const schedule = scheduleFrame ?? (typeof requestAnimationFrame === "function" ? requestAnimationFrame : (callback) => callback());
  schedule(restoreScroll);
  return true;
}
