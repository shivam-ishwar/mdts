import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Button, Modal, Typography } from "antd";
import { useBlocker, useLocation, type BlockerFunction } from "react-router-dom";

type SaveHandler = () => void | boolean | Promise<void | boolean>;
type DiscardHandler = () => void | Promise<void>;

type UnsavedChangesContextValue = {
  hasUnsavedChanges: boolean;
  markDirty: () => void;
  markClean: () => void;
  setHasUnsavedChanges: (value: boolean) => void;
  registerSaveHandler: (handler: SaveHandler | null) => void;
  registerDiscardHandler: (handler: DiscardHandler | null) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

const EDITABLE_SELECTOR = [
  "input:not([type='hidden']):not([type='button']):not([type='submit']):not([type='reset'])",
  "textarea",
  "select",
  "[contenteditable='true']",
].join(", ");

const SAVE_KEYWORDS = ["save", "update", "create", "submit", "add", "apply", "done"];

const normalize = (value: string | null | undefined) => (value || "").replace(/\s+/g, " ").trim().toLowerCase();

const isElementVisible = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && element.offsetParent !== null;
};

const getElementKey = (element: Element, index: number) => {
  const htmlElement = element as HTMLElement;
  const parts = [
    element.tagName.toLowerCase(),
    htmlElement.id,
    htmlElement.getAttribute("name"),
    htmlElement.getAttribute("data-testid"),
    htmlElement.getAttribute("aria-label"),
    htmlElement.getAttribute("placeholder"),
    String(index),
  ];

  return parts.filter(Boolean).join("::");
};

const readElementValue = (element: Element) => {
  if (element instanceof HTMLInputElement) {
    if (element.type === "checkbox" || element.type === "radio") {
      return element.checked ? "checked" : "unchecked";
    }
    if (element.type === "file") {
      return Array.from(element.files || [])
        .map((file) => `${file.name}:${file.size}`)
        .join("|");
    }
    return element.value;
  }

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return element.value;
  }

  return (element as HTMLElement).innerText || (element as HTMLElement).textContent || "";
};

const createSnapshot = () => {
  const items = Array.from(document.querySelectorAll(EDITABLE_SELECTOR));

  return items
    .filter((element) => element instanceof HTMLElement && isElementVisible(element))
    .map((element, index) => `${getElementKey(element, index)}=${readElementValue(element)}`)
    .join("||");
};

const hasValidationErrors = () =>
  Boolean(document.querySelector(".ant-form-item-has-error, [aria-invalid='true'], .Mui-error"));

const findAutoSaveCandidate = () => {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(
      "button, input[type='submit'], input[type='button'], .ant-btn, [role='button']",
    ),
  );

  return elements.find((element) => {
    if (!isElementVisible(element)) return false;
    if ((element as HTMLButtonElement).disabled || element.getAttribute("aria-disabled") === "true") return false;

    const label = normalize(
      element.textContent ||
        element.getAttribute("aria-label") ||
        element.getAttribute("title") ||
        ("value" in element ? (element as HTMLInputElement).value : ""),
    );

    return SAVE_KEYWORDS.some((keyword) => label.includes(keyword));
  });
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const UnsavedChangesProvider = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const baselineSnapshotRef = useRef("");
  const saveHandlerRef = useRef<SaveHandler | null>(null);
  const discardHandlerRef = useRef<DiscardHandler | null>(null);
  const syncFrameRef = useRef<number | null>(null);

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
        hasUnsavedChanges &&
        (currentLocation.pathname !== nextLocation.pathname ||
          currentLocation.search !== nextLocation.search ||
          currentLocation.hash !== nextLocation.hash),
    [hasUnsavedChanges],
  );

  const blocker = useBlocker(shouldBlock);

  const syncDirtyState = useCallback(() => {
    if (syncFrameRef.current != null) {
      window.cancelAnimationFrame(syncFrameRef.current);
    }

    syncFrameRef.current = window.requestAnimationFrame(() => {
      const nextSnapshot = createSnapshot();
      setHasUnsavedChanges(nextSnapshot !== baselineSnapshotRef.current);
    });
  }, []);

  const captureBaseline = useCallback(() => {
    baselineSnapshotRef.current = createSnapshot();
    setHasUnsavedChanges(false);
  }, []);

  useEffect(() => {
    const resetBaseline = () => captureBaseline();

    resetBaseline();
    const timer = window.setTimeout(resetBaseline, 300);

    return () => window.clearTimeout(timer);
  }, [captureBaseline, location.key, location.pathname, location.search, location.hash]);

  useEffect(() => {
    const handlePotentialDirtyChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(EDITABLE_SELECTOR)) return;
      syncDirtyState();
    };

    document.addEventListener("input", handlePotentialDirtyChange, true);
    document.addEventListener("change", handlePotentialDirtyChange, true);

    return () => {
      document.removeEventListener("input", handlePotentialDirtyChange, true);
      document.removeEventListener("change", handlePotentialDirtyChange, true);
      if (syncFrameRef.current != null) {
        window.cancelAnimationFrame(syncFrameRef.current);
      }
    };
  }, [syncDirtyState]);

  useEffect(() => {
    if (blocker.state === "blocked") {
      setModalOpen(true);
    } else if (blocker.state === "unblocked") {
      setModalOpen(false);
    }
  }, [blocker.state]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const proceedAfterSave = useCallback(() => {
    setModalOpen(false);
    if (blocker.state === "blocked") {
      blocker.proceed();
    }
  }, [blocker]);

  const handleDiscard = useCallback(async () => {
    if (discardHandlerRef.current) {
      await discardHandlerRef.current();
    }

    captureBaseline();
    setModalOpen(false);

    if (blocker.state === "blocked") {
      blocker.proceed();
    }
  }, [blocker, captureBaseline]);

  const handleSave = useCallback(async () => {
    setSaveInProgress(true);

    try {
      if (saveHandlerRef.current) {
        const result = await saveHandlerRef.current();
        if (result === false) return;

        captureBaseline();
        proceedAfterSave();
        return;
      }

      const saveCandidate = findAutoSaveCandidate();
      if (!saveCandidate) return;

      saveCandidate.click();
      await wait(700);

      if (hasValidationErrors()) return;

      captureBaseline();
      proceedAfterSave();
    } finally {
      setSaveInProgress(false);
    }
  }, [captureBaseline, proceedAfterSave]);

  const value = useMemo<UnsavedChangesContextValue>(
    () => ({
      hasUnsavedChanges,
      markDirty: () => setHasUnsavedChanges(true),
      markClean: captureBaseline,
      setHasUnsavedChanges,
      registerSaveHandler: (handler) => {
        saveHandlerRef.current = handler;
      },
      registerDiscardHandler: (handler) => {
        discardHandlerRef.current = handler;
      },
    }),
    [captureBaseline, hasUnsavedChanges],
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <Modal
        centered
        closable={!saveInProgress}
        footer={[
          <Button
            key="discard"
            danger
            disabled={saveInProgress}
            onClick={() => void handleDiscard()}
          >
            Discard
          </Button>,
          <Button
            key="save"
            loading={saveInProgress}
            type="primary"
            onClick={() => void handleSave()}
          >
            Save
          </Button>,
        ]}
        getContainer={document.body}
        maskClosable={false}
        onCancel={() => {
          if (saveInProgress) return;
          setModalOpen(false);
          if (blocker.state === "blocked") {
            blocker.reset();
          }
        }}
        open={modalOpen}
        title="Unsaved changes"
        zIndex={4000}
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          You have unsaved changes on this page. Save them before leaving, or discard them and continue.
        </Typography.Paragraph>
      </Modal>
    </UnsavedChangesContext.Provider>
  );
};

export const useUnsavedChanges = () => {
  const context = useContext(UnsavedChangesContext);

  if (!context) {
    throw new Error("useUnsavedChanges must be used inside UnsavedChangesProvider.");
  }

  return context;
};
