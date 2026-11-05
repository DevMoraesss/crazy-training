export type FeedbackTone = 'success' | 'error' | 'info';
export type ToastNotice = { id: number; title: string; message?: string; tone: FeedbackTone; duration: number | null };
export type DialogAction = { label: string; style?: 'default' | 'destructive' };
export type FeedbackDialog = {
  id: number;
  title: string;
  message: string;
  actions: DialogAction[];
  cancelLabel: string | null;
  resolve: (index: number | null) => void;
};
type Snapshot = { notices: ToastNotice[]; dialogs: FeedbackDialog[] };
const EMPTY: Snapshot = { notices: [], dialogs: [] };
let state = EMPTY;
let nextId = 0;
const listeners = new Set<() => void>();
function update(next: Snapshot) {
  state = next;
  for (const listener of listeners) listener();
}
export const subscribeFeedback = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getFeedback = () => state;
export const getEmptyFeedback = () => EMPTY;

export function pushNotice(
  title: string,
  message?: string,
  options: { tone?: FeedbackTone; duration?: number | null } = {},
) {
  const tone = options.tone ?? 'error';
  if (state.notices.some((notice) => notice.title === title && notice.message === message && notice.tone === tone))
    return;
  const notice = {
    id: ++nextId,
    title,
    message,
    tone,
    duration: options.duration === undefined ? (tone === 'error' ? null : 6000) : options.duration,
  };
  update({ ...state, notices: [...state.notices, notice] });
}
export function dismissNotice(id: number) {
  update({ ...state, notices: state.notices.filter((notice) => notice.id !== id) });
}
export function openFeedbackDialog(
  title: string,
  message: string,
  actions: DialogAction[],
  cancelLabel: string | null,
): Promise<number | null> {
  return new Promise((resolve) =>
    update({ ...state, dialogs: [...state.dialogs, { id: ++nextId, title, message, actions, cancelLabel, resolve }] }),
  );
}
export function respondToDialog(id: number, index: number | null) {
  const dialog = state.dialogs[0];
  if (!dialog || dialog.id !== id || (index !== null && !dialog.actions[index])) return;
  update({ ...state, dialogs: state.dialogs.slice(1) });
  dialog.resolve(index);
}
/** Ao desmontar a raiz, nenhuma confirmação pendente pode autorizar uma ação. */
export function clearFeedback() {
  const pending = state.dialogs;
  update(EMPTY);
  for (const dialog of pending) dialog.resolve(null);
}
