<script lang="ts">
  import { ScrollArea } from '$ui/scroll-area'
  import { cn } from '$lib/utils'
  import {
    ChevronRight,
    Folder,
    FolderOpen,
    GitBranch,
    Loader2,
  } from '@lucide/svelte'
  import type {
    ProjectConversationWorkspaceDiffRepo,
    ProjectConversationWorkspaceRepoMetadata,
    ProjectConversationWorkspaceTreeEntry,
  } from '$lib/api/chat'
  import { fileIcon, formatTotals, statusClass, statusLabel } from './project-conversation-workspace-browser-helpers'

  let {
    repos = [],
    selectedRepoPath = '',
    selectedRepo = null,
    selectedRepoDiff = null,
    treeNodes = new Map(),
    expandedDirs = new Set(),
    loadingDirs = new Set(),
    selectedFilePath = '',
    onOpenRepo,
    onToggleDir,
    onSelectFile,
  }: {
    repos?: ProjectConversationWorkspaceRepoMetadata[]
    selectedRepoPath?: string
    selectedRepo?: ProjectConversationWorkspaceRepoMetadata | null
    selectedRepoDiff?: ProjectConversationWorkspaceDiffRepo | null
    treeNodes?: Map<string, ProjectConversationWorkspaceTreeEntry[]>
    expandedDirs?: Set<string>
    loadingDirs?: Set<string>
    selectedFilePath?: string
    onOpenRepo?: (repoPath: string) => void
    onToggleDir?: (path: string) => void
    onSelectFile?: (path: string) => void
  } = $props()

  const rootEntries = $derived(treeNodes.get('') ?? [])
  const dirtyFiles = $derived(selectedRepoDiff?.files ?? [])

  let changesExpanded = $state(true)

  function filenameFromPath(path: string): string {
    return path.split('/').pop() ?? ''
  }
</script>

{#snippet treeLevel(entries: ProjectConversationWorkspaceTreeEntry[], depth: number)}
  {#each entries as entry}
    {#if entry.kind === 'directory'}
      {@const isExpanded = expandedDirs.has(entry.path)}
      {@const isLoading = loadingDirs.has(entry.path)}
      <button
        type="button"
        class="hover:bg-muted/50 flex w-full items-center gap-1 py-[3px] text-left text-[13px] transition-colors"
        style="padding-left: {depth * 16 + 8}px"
        onclick={() => onToggleDir?.(entry.path)}
      >
        <ChevronRight
          class={cn(
            'text-muted-foreground size-3 shrink-0 transition-transform duration-100',
            isExpanded && 'rotate-90',
          )}
        />
        {#if isExpanded}
          <FolderOpen class="text-muted-foreground size-3.5 shrink-0" />
        {:else}
          <Folder class="text-muted-foreground size-3.5 shrink-0" />
        {/if}
        <span class="min-w-0 flex-1 truncate">{entry.name}</span>
        {#if isLoading}
          <Loader2 class="text-muted-foreground size-3 shrink-0 animate-spin" />
        {/if}
      </button>
      {#if isExpanded}
        {@const children = treeNodes.get(entry.path) ?? []}
        {#if children.length > 0}
          {@render treeLevel(children, depth + 1)}
        {:else if isLoading}
          <div
            class="text-muted-foreground/60 py-1 text-[11px]"
            style="padding-left: {(depth + 1) * 16 + 28}px"
          >
            Loading…
          </div>
        {/if}
      {/if}
    {:else}
      <button
        type="button"
        class={cn(
          'hover:bg-muted/50 flex w-full items-center gap-1 py-[3px] text-left text-[13px] transition-colors',
          entry.path === selectedFilePath && 'bg-primary/10 text-primary',
        )}
        style="padding-left: {depth * 16 + 24}px"
        onclick={() => onSelectFile?.(entry.path)}
      >
        {#each [fileIcon(entry.name)] as Icon}
          <Icon class="size-3.5 shrink-0 opacity-60" />
        {/each}
        <span class="min-w-0 flex-1 truncate">{entry.name}</span>
      </button>
    {/if}
  {/each}
{/snippet}

<div class="border-border flex min-h-0 flex-col border-r">
  {#if repos.length > 1}
    <div class="border-border flex gap-1 border-b px-2 py-1.5">
      {#each repos as repo}
        <button
          type="button"
          class={cn(
            'hover:bg-muted/40 truncate rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
            repo.path === selectedRepoPath
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground',
          )}
          onclick={() => onOpenRepo?.(repo.path)}
        >
          {repo.name}
        </button>
      {/each}
    </div>
  {/if}

  <div class="min-h-0 flex-1">
    <ScrollArea class="h-full">
      <!-- File tree -->
      <div class="py-1">
        <div
          class="text-muted-foreground flex items-center px-2 pb-1 text-[10px] font-semibold tracking-wider uppercase"
        >
          Explorer
        </div>
        {#if rootEntries.length > 0}
          {@render treeLevel(rootEntries, 0)}
        {:else if loadingDirs.has('')}
          <div class="text-muted-foreground/60 px-4 py-2 text-[11px]">Loading files…</div>
        {:else}
          <div class="text-muted-foreground/60 px-4 py-2 text-[11px]">Empty directory</div>
        {/if}
      </div>

      <!-- Git changes -->
      {#if dirtyFiles.length > 0}
        <div class="border-border border-t py-1">
          <button
            type="button"
            class="text-muted-foreground hover:bg-muted/30 flex w-full items-center gap-1 px-2 pb-1 text-[10px] font-semibold tracking-wider uppercase transition-colors"
            onclick={() => (changesExpanded = !changesExpanded)}
          >
            <ChevronRight
              class={cn(
                'size-2.5 shrink-0 transition-transform duration-100',
                changesExpanded && 'rotate-90',
              )}
            />
            Changes
            <span
              class="bg-primary/15 text-primary ml-auto rounded-full px-1.5 text-[9px] font-bold"
            >
              {dirtyFiles.length}
            </span>
          </button>
          {#if changesExpanded}
            {#each dirtyFiles as file}
              <button
                type="button"
                class={cn(
                  'hover:bg-muted/50 flex w-full items-center gap-1.5 py-[3px] pl-4 pr-2 text-left text-[13px] transition-colors',
                  file.path === selectedFilePath && 'bg-primary/10 text-primary',
                )}
                onclick={() => onSelectFile?.(file.path)}
              >
                {#each [fileIcon(filenameFromPath(file.path))] as ChangeIcon}
                  <ChangeIcon class="size-3.5 shrink-0 opacity-60" />
                {/each}
                <span class="min-w-0 flex-1 truncate">{file.path.split('/').pop()}</span>
                <span class="text-muted-foreground/60 mr-1 hidden shrink-0 text-[10px] sm:inline">
                  {formatTotals(file.added, file.removed)}
                </span>
                <span
                  class={cn(
                    'w-3.5 shrink-0 text-center font-mono text-[10px] font-bold',
                    statusClass(file.status),
                  )}
                >
                  {statusLabel(file.status)}
                </span>
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </ScrollArea>
  </div>

  <!-- Branch status bar (bottom) -->
  {#if selectedRepo}
    <div
      class="border-border bg-muted/30 flex items-center gap-1.5 border-t px-3 py-1 text-[11px]"
    >
      <GitBranch class="text-muted-foreground size-3 shrink-0" />
      <span class="font-medium">{selectedRepo.branch}</span>
      <span class="text-muted-foreground/60 min-w-0 truncate font-mono text-[10px]">
        {selectedRepo.headCommit}
      </span>
    </div>
  {/if}
</div>
