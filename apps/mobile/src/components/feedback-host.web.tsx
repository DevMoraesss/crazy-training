import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import {
  clearFeedback,
  dismissNotice,
  getEmptyFeedback,
  getFeedback,
  respondToDialog,
  subscribeFeedback,
  type FeedbackDialog,
  type ToastNotice,
} from '@/lib/feedback-store';

export function FeedbackHost() {
  const snapshot = useSyncExternalStore(subscribeFeedback, getFeedback, getEmptyFeedback);
  const dialog = snapshot.dialogs[0];
  useEffect(() => () => clearFeedback(), []);
  return (
    <>
      <div className="feedback-notices" aria-label="Notificações">
        {snapshot.notices.slice(0, 3).map((notice) => (
          <Notice key={notice.id} notice={notice} dialogOpen={Boolean(dialog)} />
        ))}
      </div>
      {dialog ? <Dialog key={dialog.id} dialog={dialog} /> : null}
    </>
  );
}
function Notice({ notice, dialogOpen }: { notice: ToastNotice; dialogOpen: boolean }) {
  const [paused, setPaused] = useState(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);
  useEffect(() => {
    if (notice.duration === null || paused || dialogOpen) return;
    const timer = setTimeout(() => dismissNotice(notice.id), notice.duration);
    return () => clearTimeout(timer);
  }, [notice.id, notice.duration, paused, dialogOpen]);
  const close = () => {
    dismissNotice(notice.id);
    if (previousFocus.current?.isConnected) previousFocus.current.focus();
  };
  return (
    <section
      className={`feedback-notice feedback-notice--${notice.tone}`}
      role={notice.tone === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <span className="feedback-notice-icon" aria-hidden="true">
        {notice.tone === 'success' ? '✓' : notice.tone === 'error' ? '!' : 'i'}
      </span>
      <div className="feedback-notice-copy">
        <strong>{notice.title}</strong>
        {notice.message ? <p>{notice.message}</p> : null}
      </div>
      <button
        type="button"
        className="feedback-dismiss"
        aria-label={`Fechar notificação: ${notice.title}`}
        onClick={close}
      >
        <span aria-hidden="true">×</span>
      </button>
    </section>
  );
}
function Dialog({ dialog }: { dialog: FeedbackDialog }) {
  const element = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node.showModal();
    return () => {
      node.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={element}
      className="feedback-dialog"
      aria-labelledby={`feedback-title-${dialog.id}`}
      aria-describedby={`feedback-message-${dialog.id}`}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (!buttons.some((button) => button === document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        respondToDialog(dialog.id, null);
      }}
      onClose={() => respondToDialog(dialog.id, null)}
    >
      <div className="feedback-dialog-body">
        <h2 id={`feedback-title-${dialog.id}`}>{dialog.title}</h2>
        <p id={`feedback-message-${dialog.id}`}>{dialog.message}</p>
      </div>
      <div
        className={`feedback-dialog-actions ${dialog.actions.length > 1 ? 'feedback-dialog-actions--multiple' : ''}`}
      >
        {dialog.cancelLabel ? (
          <button
            type="button"
            className="feedback-action feedback-action--cancel feedback-action--dismiss"
            autoFocus
            onClick={() => respondToDialog(dialog.id, null)}
          >
            {dialog.cancelLabel}
          </button>
        ) : null}
        {dialog.actions.map((action, index) => (
          <button
            key={index}
            type="button"
            autoFocus={!dialog.cancelLabel && index === 0}
            className={`feedback-action ${action.style === 'destructive' ? 'feedback-action--destructive' : index === 0 ? 'feedback-action--primary' : 'feedback-action--cancel'}`}
            onClick={() => respondToDialog(dialog.id, index)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </dialog>
  );
}
