<script lang="ts">
  import { cn } from '$lib/utils'
  import { FileCode2 } from '@lucide/svelte'
  import { CodeViewer, DiffViewer } from '$lib/components/code'
  import type {
    ProjectConversationWorkspaceFilePatch,
    ProjectConversationWorkspaceFilePreview,
    ProjectConversationWorkspaceRepoMetadata,
  } from '$lib/api/chat'

  let {
    selectedRepo = null,
    selectedFilePath = '',
    preview = null,
    patch = null,
    fileLoading = false,
    fileError = '',
  }: {
    selectedRepo?: ProjectConversationWorkspaceRepoMetadata | null
    selectedFilePath?: string
    preview?: ProjectConversationWorkspaceFilePreview | null
    patch?: ProjectConversationWorkspaceFilePatch | null
    fileLoading?: boolean
    fileError?: string
  } = $props()

  const fileName = $derived(selectedFilePath.split('/').pop() ?? '')
  const hasDiff = $derived(patch?.diffKind === 'text' && !!patch.diff)
</script>

<div class="flex min-h-0 flex-col">
  {#if !selectedRepo}
    <div
      class="text-muted-foreground flex flex-1 items-center justify-center px-6 text-center text-sm"
    >
      Select a repo to browse its files.
    </div>
  {:else if !selectedFilePath}
    <div
      class="text-muted-foreground flex flex-1 items-center justify-center px-6 text-center text-sm"
    >
      <div class="space-y-2">
        <FileCode2 class="text-muted-foreground/30 mx-auto size-10" />
        <p>Select a file to view its contents</p>
      </div>
    </div>
  {:else if fileError}
    <div class="border-destructive/20 bg-destructive/5 m-4 rounded-lg border p-3">
      <p class="text-destructive text-sm">{fileError}</p>
    </div>
  {:else}
    <!-- File tab bar -->
    <div class="border-border bg-muted/30 flex items-center gap-2 border-b px-3 py-1.5">
      <FileCode2 class="text-muted-foreground size-3.5 shrink-0" />
      <span class="min-w-0 truncate text-[13px] font-medium">{fileName}</span>
      {#if patch?.status && patch.status !== 'modified'}
        <span
          class={cn(
            'rounded px-1 text-[10px] font-bold uppercase',
            patch.status === 'added'
              ? 'bg-emerald-500/15 text-emerald-600'
              : patch.status === 'deleted'
                ? 'bg-rose-500/15 text-rose-600'
                : 'bg-sky-500/15 text-sky-600',
          )}
        >
          {patch.status}
        </span>
      {/if}
      {#if preview}
        <span class="text-muted-foreground/50 ml-auto text-[10px]">
          {preview.mediaType} · {preview.sizeBytes} B
        </span>
      {/if}
      {#if fileLoading}
        <span class="text-muted-foreground/50 text-[10px]">Loading…</span>
      {/if}
    </div>

    <!-- Unified content: diff or syntax-highlighted preview -->
    <div class="min-h-0 flex-1 overflow-auto">
      {#if hasDiff}
        <DiffViewer diff={patch?.diff ?? ''} class="h-full" />
      {:else if preview?.previewKind === 'binary'}
        <div class="text-muted-foreground px-4 py-8 text-center text-sm">
          Binary file — not rendered inline.
        </div>
      {:else if preview}
        <CodeViewer
          code={preview.content ?? ''}
          filePath={selectedFilePath}
          class="h-full"
        />
      {:else if fileLoading}
        <div class="text-muted-foreground px-4 py-8 text-center text-sm">Loading…</div>
      {:else}
        <div class="text-muted-foreground px-4 py-8 text-center text-sm">
          Select a file to view its contents.
        </div>
      {/if}
    </div>
  {/if}
</div>
