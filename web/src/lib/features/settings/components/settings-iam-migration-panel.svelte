<script lang="ts">
  import type { SecurityAuthSettings } from '$lib/api/contracts'
  import { organizationPath } from '$lib/stores/app-context'
  import { authStore } from '$lib/stores/auth.svelte'
  import { Badge } from '$ui/badge'
  import { ArrowRight, KeyRound, ShieldCheck, Users } from '@lucide/svelte'
  import SecuritySettingsHumanAuthGuideLinks from './security-settings-human-auth-guide-links.svelte'

  let {
    auth = null,
    organizationId = '',
    projectAccessCurrent = false,
    projectAccessHref = '#access',
    showDocs = false,
  }: {
    auth?: SecurityAuthSettings | null
    organizationId?: string
    projectAccessCurrent?: boolean
    projectAccessHref?: string
    showDocs?: boolean
  } = $props()

  const activeMode = $derived(auth?.active_mode || authStore.authMode || 'disabled')
  const configuredMode = $derived(auth?.configured_mode || activeMode)
  const orgAdminBase = $derived(organizationId ? `${organizationPath(organizationId)}/admin` : '')
  const modeSummary = $derived(
    auth?.mode_summary ||
      (activeMode === 'oidc'
        ? 'OIDC is active. Human roles determine who can reach instance, organization, and project controls.'
        : 'Disabled mode keeps OpenASE in local single-user operation. The current user keeps local highest privilege without browser login or OIDC dependency.'),
  )
  const recommendedMode = $derived(
    auth?.recommended_mode ||
      (activeMode !== 'oidc'
        ? 'Keep disabled mode for personal or local-only use. Move to OIDC + instance_admin when you need real multi-user browser access control.'
        : ''),
  )
</script>

<div class="space-y-4">
  <!-- Auth mode status -->
  <div class="border-border bg-card rounded-lg border p-4">
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-muted-foreground text-xs font-medium">Auth mode</span>
      <div class="flex items-center gap-1.5">
        <span class="text-muted-foreground text-xs">Active</span>
        <Badge variant="secondary">{activeMode}</Badge>
      </div>
      {#if configuredMode !== activeMode}
        <div class="flex items-center gap-1.5">
          <span class="text-muted-foreground text-xs">Configured</span>
          <Badge variant="outline">{configuredMode}</Badge>
        </div>
      {/if}
    </div>
    <p class="text-muted-foreground mt-3 text-sm leading-6">{modeSummary}</p>
    {#if recommendedMode}
      <p class="text-muted-foreground mt-1.5 text-xs leading-5">{recommendedMode}</p>
    {/if}
  </div>

  <!-- IAM control planes -->
  <div class="grid gap-3 xl:grid-cols-3">
    <div class="border-border bg-card flex flex-col rounded-lg border p-4">
      <div class="flex items-center gap-2">
        <ShieldCheck class="text-muted-foreground size-4 shrink-0" />
        <span class="text-sm font-semibold">Instance auth and directory</span>
      </div>
      <p class="text-muted-foreground mt-2 flex-1 text-sm leading-6">
        Auth mode, OIDC rollout, bootstrap admins, user directory, and session governance.
      </p>
      <a
        class="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        href="/admin/auth"
      >
        Open <code class="text-xs">/admin/auth</code>
        <ArrowRight class="size-3.5" />
      </a>
    </div>

    <div class="border-border bg-card flex flex-col rounded-lg border p-4">
      <div class="flex items-center gap-2">
        <Users class="text-muted-foreground size-4 shrink-0" />
        <span class="text-sm font-semibold">Org members, invites, and roles</span>
      </div>
      <p class="text-muted-foreground mt-2 flex-1 text-sm leading-6">
        Org membership lifecycle, invites, and org-scoped role assignments.
      </p>
      {#if orgAdminBase}
        <a
          class="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          href={`${orgAdminBase}/members`}
        >
          Open org admin
          <ArrowRight class="size-3.5" />
        </a>
      {:else}
        <p class="text-muted-foreground mt-4 text-xs">Select an organization to open org admin.</p>
      {/if}
    </div>

    <div class="border-border bg-card flex flex-col rounded-lg border p-4">
      <div class="flex items-center gap-2">
        <KeyRound class="text-muted-foreground size-4 shrink-0" />
        <span class="text-sm font-semibold">Project access</span>
      </div>
      <p class="text-muted-foreground mt-2 flex-1 text-sm leading-6">
        Project-scoped role bindings and effective access for this project.
      </p>
      {#if projectAccessCurrent}
        <div class="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span class="size-1.5 rounded-full bg-green-500"></span>
          You are here — Settings → Access
        </div>
      {:else}
        <a
          class="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          href={projectAccessHref}
        >
          Open Settings → Access
          <ArrowRight class="size-3.5" />
        </a>
      {/if}
    </div>
  </div>

  {#if showDocs && auth?.docs?.length}
    <SecuritySettingsHumanAuthGuideLinks docs={auth.docs} />
  {/if}
</div>
