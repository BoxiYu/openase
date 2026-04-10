<script lang="ts">
  import { cn } from '$lib/utils'
  import { detectLanguage } from './lang'

  let {
    code = '',
    filePath = '',
    language = '',
    class: className = '',
  }: {
    /** Source code to display */
    code?: string
    /** Used to auto-detect language when `language` is not set */
    filePath?: string
    /** Explicit language override (shiki language id) */
    language?: string
    class?: string
  } = $props()

  const lang = $derived(language || detectLanguage(filePath))

  // Lazy-load shiki and cache the highlighter instance
  let html = $state('')
  let lastKey = ''

  $effect(() => {
    const key = `${lang}::${code}`
    if (key === lastKey) return
    lastKey = key

    const currentCode = code
    const currentLang = lang

    if (!currentCode) {
      html = ''
      return
    }

    void highlight(currentCode, currentLang, key)
  })

  async function highlight(source: string, langId: string, key: string) {
    try {
      const { codeToHtml } = await import('shiki')
      const result = await codeToHtml(source, {
        lang: langId,
        theme: 'github-dark-default',
      })
      // Only apply if this is still the current request
      if (lastKey === key) {
        html = result
      }
    } catch {
      // Language not supported by shiki — fall back to plain text
      if (lastKey === key) {
        html = ''
      }
    }
  }
</script>

<div class={cn('code-viewer min-h-0 overflow-auto font-mono text-[13px] leading-6', className)}>
  {#if html}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html html}
  {:else}
    <pre class="whitespace-pre-wrap p-4">{code}</pre>
  {/if}
</div>

<style>
  .code-viewer :global(pre) {
    margin: 0;
    padding: 1rem;
    overflow-x: auto;
    background: transparent !important;
  }
  .code-viewer :global(code) {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    counter-reset: line;
  }
  .code-viewer :global(code .line) {
    display: inline-block;
    width: 100%;
    min-height: 1.5rem;
  }
  .code-viewer :global(code .line::before) {
    counter-increment: line;
    content: counter(line);
    display: inline-block;
    width: 2.5rem;
    margin-right: 1rem;
    text-align: right;
    color: color-mix(in srgb, currentColor 25%, transparent);
    user-select: none;
    font-size: 0.75rem;
  }
</style>
