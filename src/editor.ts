import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { nord } from '@milkdown/theme-nord';
import '@milkdown/theme-nord/style.css';
import { listener, listenerCtx } from '@milkdown/plugin-listener';

export async function createEditor(
  root: HTMLElement,
  initialValue: string,
  onChange: (markdown: string) => void
) {
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root);
      ctx.set(defaultValueCtx, initialValue);
      
      const listener = ctx.get(listenerCtx);
      listener.markdownUpdated((_ctx, markdown) => {
        onChange(markdown);
      });
    })
    .config(nord)
    .use(commonmark)
    .use(listener)
    .create();

  return editor;
}
