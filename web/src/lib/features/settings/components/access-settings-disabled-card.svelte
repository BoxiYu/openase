<script lang="ts">
  import { FolderLock } from '@lucide/svelte'
</script>

<div class="border-border bg-muted/30 rounded-lg border p-4">
  <div class="flex items-start gap-3">
    <FolderLock class="text-muted-foreground mt-0.5 size-4 shrink-0" />
    <div class="space-y-1.5">
      <div class="text-sm font-semibold">Single-user mode</div>
      <p class="text-muted-foreground text-sm leading-6">
        Auth is disabled. The current user holds local highest privilege — no browser login or OIDC
        dependency. Project-scoped bindings are not active in this mode.
      </p>
    </div>
  </div>
</div>
