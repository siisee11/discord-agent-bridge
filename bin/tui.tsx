/** @jsxImportSource @opentui/solid */
/** @jsxRuntime automatic */

import { TextAttributes, TextareaRenderable } from '@opentui/core';
import { render, useKeyboard, useRenderer, useTerminalDimensions } from '@opentui/solid';
import { For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js';

type TuiInput = {
  onCommand: (command: string, append: (line: string) => void) => Promise<boolean | void>;
  getProjects: () => Array<{
    session: string;
    window: string;
    ai: string;
    channel: string;
    open: boolean;
  }>;
};

const palette = {
  bg: '#0a0a0a',
  panel: '#141414',
  border: '#484848',
  text: '#eeeeee',
  muted: '#9a9a9a',
  primary: '#fab283',
  selectedBg: '#2b2b2b',
  selectedFg: '#ffffff',
};

const slashCommands = [
  { command: '/session_new', description: 'create new session' },
  { command: '/new', description: 'alias for /session_new' },
  { command: '/projects', description: 'list configured projects' },
  { command: '/help', description: 'show available commands' },
  { command: '/exit', description: 'close the TUI' },
  { command: '/quit', description: 'close the TUI' },
];

function TuiApp(props: { input: TuiInput; close: () => void }) {
  const dims = useTerminalDimensions();
  const renderer = useRenderer();
  const [value, setValue] = createSignal('');
  const [selected, setSelected] = createSignal(0);
  const [projects, setProjects] = createSignal<Array<{
    session: string;
    window: string;
    ai: string;
    channel: string;
    open: boolean;
  }>>([]);
  let textarea: TextareaRenderable;

  const openProjects = createMemo(() => projects().filter((item) => item.open));
  const sessionTree = createMemo(() => {
    const groups = new Map<string, Array<{ window: string; ai: string; channel: string }>>();
    openProjects().forEach((item) => {
      const list = groups.get(item.session) || [];
      list.push({ window: item.window, ai: item.ai, channel: item.channel });
      groups.set(item.session, list);
    });
    return Array.from(groups.entries())
      .map(([session, items]) => ({
        session,
        items: items.sort((a, b) => a.window.localeCompare(b.window)),
      }))
      .sort((a, b) => a.session.localeCompare(b.session));
  });

  const query = createMemo(() => {
    const next = value();
    if (!next.startsWith('/')) return null;
    if (next.includes(' ')) return null;
    return next.slice(1).toLowerCase();
  });

  const matches = createMemo(() => {
    const next = query();
    if (next === null) return [];
    if (next.length === 0) return slashCommands;
    return slashCommands.filter((item) => item.command.slice(1).startsWith(next));
  });

  const clampSelection = (offset: number) => {
    const items = matches();
    if (items.length === 0) return;
    const count = items.length;
    const next = (selected() + offset + count) % count;
    setSelected(next);
  };

  const applySelection = () => {
    const item = matches()[selected()];
    if (!item) return;
    const next = `${item.command} `;
    textarea.setText(next);
    setValue(next);
    textarea.gotoBufferEnd();
  };

  const submit = async () => {
    const raw = textarea?.plainText ?? '';
    const command = raw.trim();
    textarea?.setText('');
    setValue('');
    if (!command) return;

    const shouldClose = await props.input.onCommand(command, () => {});
    if (shouldClose) {
      renderer.destroy();
      props.close();
    }
  };

  useKeyboard((evt) => {
    if (evt.ctrl && evt.name === 'c') {
      evt.preventDefault();
      renderer.destroy();
      props.close();
    }
  });

  onMount(() => {
    const refresh = () => {
      setProjects(props.input.getProjects());
    };
    refresh();
    const timer = setInterval(refresh, 2000);
    onCleanup(() => clearInterval(timer));
    setTimeout(() => textarea?.focus(), 1);
  });

  return (
    <box width={dims().width} height={dims().height} backgroundColor={palette.bg} flexDirection="column">
      <box flexGrow={1} backgroundColor={palette.bg} alignItems="center" justifyContent="center" paddingLeft={2} paddingRight={2}>
        <box
          width={Math.max(40, Math.min(90, Math.floor(dims().width * 0.7)))}
          border
          borderColor={palette.border}
          backgroundColor={palette.panel}
          flexDirection="column"
        >
          <box paddingLeft={1} paddingRight={1}>
            <text fg={palette.primary} attributes={TextAttributes.BOLD}>Current sessions</text>
          </box>
          <Show when={sessionTree().length > 0} fallback={<box paddingLeft={1} paddingRight={1}><text fg={palette.muted}>No current sessions</text></box>}>
            <For each={sessionTree().slice(0, 6)}>
              {(session) => (
                <box flexDirection="column" paddingLeft={1} paddingRight={1} paddingBottom={1}>
                  <text fg={palette.text}>{`session: ${session.session}`}</text>
                  <For each={session.items}>
                    {(item, index) => (
                      <>
                        <text fg={palette.text}>{`${index() === session.items.length - 1 ? '`--' : '|--'} window: ${item.window}`}</text>
                        <text fg={palette.text}>{`${index() === session.items.length - 1 ? '    ' : '|   '}ai: ${item.ai}`}</text>
                        <text fg={palette.text}>{`${index() === session.items.length - 1 ? '    ' : '|   '}channel: ${item.channel}`}</text>
                      </>
                    )}
                  </For>
                </box>
              )}
            </For>
          </Show>
        </box>
      </box>

      <Show when={matches().length > 0}>
        <box backgroundColor={palette.bg} paddingLeft={2} paddingRight={2} paddingBottom={1}>
          <box border borderColor={palette.border} backgroundColor={palette.panel} flexDirection="column">
            <For each={matches().slice(0, 6)}>
              {(item, index) => (
                <box
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={selected() === index() ? palette.selectedBg : palette.panel}
                >
                  <text fg={selected() === index() ? palette.selectedFg : palette.text}>{item.command}</text>
                  <text fg={palette.muted}>{`  ${item.description}`}</text>
                </box>
              )}
            </For>
          </box>
        </box>
      </Show>

      <box backgroundColor={palette.bg} paddingLeft={2} paddingRight={2} paddingBottom={1}>
        <box border borderColor={palette.border} backgroundColor={palette.panel} flexDirection="column">
          <box paddingLeft={1} paddingRight={1}>
            <text fg={palette.primary} attributes={TextAttributes.BOLD}>{'agent-bridge> '}</text>
          </box>
          <box paddingLeft={1} paddingRight={1}>
            <textarea
              ref={(input: TextareaRenderable) => {
                textarea = input;
              }}
              minHeight={1}
              maxHeight={4}
              onSubmit={submit}
              keyBindings={[{ name: 'return', action: 'submit' }]}
              placeholder="Type a command"
              textColor={palette.text}
              focusedTextColor={palette.text}
              cursorColor={palette.primary}
              onContentChange={() => {
                const next = textarea.plainText;
                setValue(next);
                setSelected(0);
              }}
              onKeyDown={(event) => {
                if (matches().length === 0) return;
                if (event.name === 'up') {
                  event.preventDefault();
                  clampSelection(-1);
                  return;
                }
                if (event.name === 'down') {
                  event.preventDefault();
                  clampSelection(1);
                  return;
                }
                if (event.name === 'tab') {
                  event.preventDefault();
                  applySelection();
                  return;
                }
                if (event.name === 'return' && query() !== null) {
                  event.preventDefault();
                  applySelection();
                }
              }}
            />
          </box>
        </box>
      </box>
    </box>
  );
}

export function runTui(input: TuiInput): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      resolve();
    };
    void render(() => <TuiApp input={input} close={close} />, {
      targetFps: 60,
      exitOnCtrlC: false,
      autoFocus: true,
    });
  });
}
