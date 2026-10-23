"use client";

import { useId, useState, type ReactNode, type Ref } from "react";
import { AnimatePresence, domMax, LazyMotion, MotionConfig, useIsPresent, useReducedMotion, type HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";
import { Icon } from "./ui";

const easeOut = [0.16, 1, 0.3, 1] as const;

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.24, ease: easeOut }}>
      <LazyMotion features={domMax} strict>{children}</LazyMotion>
    </MotionConfig>
  );
}

export function ActionButton({ children, disabled, type = "button", ...props }: HTMLMotionProps<"button">) {
  const reduceMotion = useReducedMotion();
  return <m.button type={type} disabled={disabled} whileTap={disabled || reduceMotion ? undefined : { scale: 0.985 }} transition={{ duration: 0.12 }} {...props}>{children}</m.button>;
}

export function Disclosure({ title, children, className = "", label }: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const reduceMotion = useReducedMotion();
  return (
    <div className={`disclosure ${className}`}>
      <button className="disclosure-trigger" type="button" aria-label={label} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((current) => !current)}>
        {title}
        <m.span className="disclosure-chevron" aria-hidden="true" initial={false} animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}><Icon name="chevron" size={18} /></m.span>
      </button>
      {/* Keep fields mounted, but remove collapsed content from focus and AT. */}
      <m.div id={panelId} className="disclosure-panel" inert={!open} aria-hidden={!open} initial={false} animate={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.24, ease: easeOut }}>
        <div className="disclosure-body"><div className="disclosure-content">{children}</div></div>
      </m.div>
    </div>
  );
}

export function ErrorNotice({ message, id }: { message?: string | null; id?: string }) {
  return <AnimatePresence initial={false}>{message && <ErrorContent key="error" message={message} id={id} />}</AnimatePresence>;
}

function ErrorContent({ message, id }: { message: string; id?: string }) {
  const isPresent = useIsPresent();
  const reduceMotion = useReducedMotion();
  return <m.div id={id} className="error-banner" role={isPresent ? "alert" : undefined} aria-hidden={!isPresent} initial={{ opacity: 0.6, y: reduceMotion ? 0 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.16 }}>{message}</m.div>;
}

export function StatusLabel({ children, state }: { children: ReactNode; state: string }) {
  return <span className="status-label"><AnimatePresence initial={false} mode="popLayout"><StatusText key={state}>{children}</StatusText></AnimatePresence></span>;
}

function StatusText({ children, ref }: { children: ReactNode; ref?: Ref<HTMLSpanElement> }) {
  const isPresent = useIsPresent();
  const reduceMotion = useReducedMotion();
  return <m.span ref={ref} className="status-text" aria-hidden={!isPresent} initial={{ opacity: 0, y: reduceMotion ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -5 }} transition={{ duration: reduceMotion ? 0 : 0.16 }}>{children}</m.span>;
}

export function PendingMark() {
  const reduceMotion = useReducedMotion();
  return (
    <svg className="pending-mark" aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3h12v13l-5 5H4V7Z" opacity=".25" />
      <m.path d="M8 3h12v13l-5 5H4V7Z" initial={false} animate={reduceMotion ? { pathLength: 1, pathOffset: 0 } : { pathLength: [0.15, 0.55, 0.15], pathOffset: [0, 1] }} transition={reduceMotion ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: "linear" }} />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}

export function SuccessMark() {
  const reduceMotion = useReducedMotion();
  return (
    <svg className="success-mark" aria-hidden="true" width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4h32v32l-8 8H4V12Z" opacity=".18" />
      <m.path d="M12 4h32v32l-8 8H4V12Z" initial={{ pathLength: reduceMotion ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduceMotion ? 0 : 0.4, ease: easeOut }} />
      <m.path d="m15 24 6 6 13-14" initial={{ pathLength: reduceMotion ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduceMotion ? 0 : 0.24, delay: reduceMotion ? 0 : 0.18, ease: easeOut }} />
    </svg>
  );
}
