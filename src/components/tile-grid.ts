import {
  createChange,
  createFocusRecovery,
  createRovingFocus,
  createTypeahead,
  definePrimitive,
  elements,
  isTypeaheadKey,
  labelOf,
  selects,
  spatialMove,
  type ChangeDetails,
  type PrimitiveOptions,
} from "@ui-sdk/core";

export type TileGridReason = "item-press" | "list-navigation" | "clear-press" | "imperative";

export type TileGridOptions = PrimitiveOptions & {
  multiple?: boolean;
  followFocus?: boolean;
  value?: string | string[] | null;
  defaultValue?: string | string[] | null;
  onValueChange?: (value: string | string[] | null, details: ChangeDetails<TileGridReason>) => void;
};

type TileGridState = {
  multiple: boolean;
  followFocus: boolean;
  value: string | string[] | null;
  focused: string | null;
};

export type TileGridItemProps = {
  value: string;
  label?: string;
  disabled?: boolean;
  index?: number;
};

const isPicked = (value: TileGridState["value"], key: string) =>
  Array.isArray(value) ? value.includes(key) : value === key;

const hasPicked = (value: TileGridState["value"]) =>
  Array.isArray(value) ? value.length > 0 : value !== null;

export const tileGrid = definePrimitive({
  name: "tile-grid",
  options: {
    multiple: "boolean",
    followFocus: "boolean",
    value: "value",
    defaultValue: "value",
    onValueChange: "callback",
  },
  controlled: ["value"],
  state: (options: TileGridOptions): TileGridState => ({
    multiple: Boolean(options.multiple),
    followFocus: Boolean(options.followFocus),
    value: options.value ?? options.defaultValue ?? (options.multiple ? [] : null),
    focused: null,
  }),
  sync: (options) => ({
    ...(options.multiple === undefined ? {} : { multiple: options.multiple }),
    ...(options.followFocus === undefined ? {} : { followFocus: options.followFocus }),
    ...(options.value === undefined ? {} : { value: options.value }),
  }),
  api: (context) => {
    const change = createChange(context);
    let typeahead: ReturnType<typeof createTypeahead> | undefined;
    const getTypeahead = () => (typeahead ??= createTypeahead());
    let mover: ReturnType<typeof spatialMove> | undefined;
    const roving = createRovingFocus<TileGridState, TileGridItemProps>(context, {
      slot: "item",
      key: "focused",
      disabled: (item) => Boolean(item.props.disabled),
      preferred: (item) => isPicked(context.store.get().value, item.key),
      claims: (state, item) => !item.props.disabled && (!hasPicked(state.value) || isPicked(state.value, item.key)),
      move: (event, moveCtx) => (mover ??= spatialMove())(event, moveCtx),
    });
    let recovery: ReturnType<typeof createFocusRecovery<TileGridItemProps>> | undefined;
    const getRecovery = () =>
      (recovery ??= createFocusRecovery<TileGridItemProps>({
        fallback: (lost) => {
          const items = roving.items();
          return (items[lost.props.index ?? 0] ?? items.at(-1))?.el;
        },
      }));

    const resolveKey = (needle: string) => {
      const bound = elements<TileGridItemProps>(context, "item");
      const exact = bound.find((i) => i.key === needle);
      if (exact) return exact.props.disabled ? null : exact.key;
      const lower = needle.toLowerCase();
      const named = bound.find((i) => (i.props.label ?? labelOf(i.el)).toLowerCase() === lower);
      return named && !named.props.disabled ? named.key : null;
    };

    return {
      roving,
      getRecovery,
      items: () =>
        elements<TileGridItemProps>(context, "item")
          .filter((i) => !i.props.disabled)
          .map((i) => ({ value: i.key, label: i.props.label ?? labelOf(i.el) })),
      toggle(key: string, event?: Event, reason: TileGridReason = "item-press") {
        const resolved = resolveKey(key);
        if (!resolved) return false;
        const { multiple, value } = context.store.get();
        if (multiple) {
          const cur = Array.isArray(value) ? value : [];
          const next = cur.includes(resolved) ? cur.filter((k) => k !== resolved) : [...cur, resolved];
          return change("value", next, { reason, event });
        }
        return change("value", value === resolved ? null : resolved, { reason, event });
      },
      setValue(next: string | string[] | null) {
        const { multiple } = context.store.get();
        if (next === null) return change("value", multiple ? [] : null, { reason: "imperative" });
        if (multiple) {
          const raw = Array.isArray(next) ? next : [next];
          const keys = raw.map(resolveKey).filter((k): k is string => k !== null);
          return change("value", [...new Set(keys)], { reason: "imperative" });
        }
        const raw = Array.isArray(next) ? next[0] ?? null : next;
        const resolved = raw ? resolveKey(raw) : null;
        if (raw && !resolved) return false;
        return change("value", resolved, { reason: "imperative" });
      },
      clear() {
        const { multiple } = context.store.get();
        return change("value", multiple ? [] : null, { reason: "clear-press" });
      },
      keydown(event: KeyboardEvent, el: HTMLElement) {
        if (event.defaultPrevented) return;
        const moved = roving.keydown(event, el);
        if (moved) {
          const { multiple, followFocus } = context.store.get();
          const target = context.props<TileGridItemProps>("item", moved.key);
          if (!multiple && followFocus && !target?.disabled) {
            change("value", moved.key, { reason: "list-navigation", event });
          }
          return;
        }
        if (isTypeaheadKey(event) && (event.key !== " " || getTypeahead().active())) {
          const items = roving.items();
          const index = getTypeahead()(
            event.key,
            items.map((item) => item.props.label ?? labelOf(item.el)),
            items.findIndex((item) => item.el === el),
          );
          if (index !== -1) {
            event.preventDefault();
            const dest = items[index]!;
            roving.focus(dest.key);
            const { multiple, followFocus } = context.store.get();
            if (!multiple && followFocus && !dest.props.disabled) {
              change("value", dest.key, { reason: "list-navigation", event });
            }
          }
        }
      },
    };
  },
  slots: (slot) => ({
    root: slot({
      role: "group",
    }),
    item: slot<TileGridItemProps, { selected: boolean; disabled: boolean }>({
      role: "button",
      focus: "roving",
      props: {
        value: "string",
        label: "string",
        disabled: "boolean",
        index: "number",
      },
      selects: selects({ focused: ({ key }) => [key, null] }),
      state: (state, { key, props }) => ({
        selected: isPicked(state.value, key),
        disabled: Boolean(props.disabled),
      }),
      attrs: (state, part) => {
        const selected = isPicked(state.value, part.key);
        const disabled = Boolean(part.props.disabled);
        return {
          type: "button",
          tabindex: part.api.roving.tabIndex(state, part),
          "aria-pressed": String(selected),
          "aria-disabled": disabled ? "true" : undefined,
          "data-pressed": selected ? "" : undefined,
          "data-disabled": disabled ? "" : undefined,
        };
      },
      press: ({ api, key, props }, event) => {
        if (props.disabled) return;
        api.roving.remember(key);
        api.toggle(key, event, "item-press");
      },
      on: {
        keydown: (event, { el, api }) => {
          if (el) api.keydown(event, el);
        },
      },
      bind: (el, part) => {
        const unbindFocus = part.api.roving.bind(el, part);
        const unbindRecovery = part.api.getRecovery().bind(el, part);
        return () => {
          unbindFocus();
          unbindRecovery();
        };
      },
    }),
  }),
  agent: {
    actions: ["setValue", "toggle", "clear"],
    items: (api) => api.items(),
  },
});
