<script lang="ts">
  import { cn } from '$lib/utils'

  let {
    diff = '',
    class: className = '',
  }: {
    /** Raw unified diff string */
    diff?: string
    class?: string
  } = $props()

  type DiffLineKind = 'add' | 'del' | 'hunk' | 'header' | 'context'

  function classify(line: string): DiffLineKind {
    if (line.startsWith('@@')) return 'hunk'
    if (line.startsWith('+++') || line.startsWith('---')) return 'header'
    if (line.startsWith('+')) return 'add'
    if (line.startsWith('-')) return 'del'
    return 'context'
  }

  const lines = $derived((diff ?? '').split('\n'))
</script>

<div
  class={cn('diff-viewer min-h-0 overflow-auto font-mono text-[13px] leading-6', className)}
>
  <div class="px-0 py-2">
    {#each lines as line, i}
      {@const kind = classify(line)}
      <div
        class={cn(
          'min-h-6 whitespace-pre-wrap px-4',
          kind === 'add' && 'bg-emerald-500/10 text-emerald-300',
          kind === 'del' && 'bg-rose-500/10 text-rose-300',
          kind === 'hunk' && 'bg-sky-500/8 text-sky-400',
          kind === 'header' && 'text-neutral-500',
        )}
      >
        <span
          class="mr-3 inline-block w-8 select-none text-right text-[11px] opacity-40"
        >{i + 1}</span>{line}
      </div>
    {/each}
  </div>
</div>
