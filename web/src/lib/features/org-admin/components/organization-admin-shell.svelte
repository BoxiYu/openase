<script lang="ts">
  import type {
    OrganizationDashboardSummary,
    OrganizationTokenUsageSummary,
  } from '$lib/api/contracts'
  import {
    getEffectivePermissions,
    listOrganizationMemberships,
    type EffectivePermissionsResponse,
  } from '$lib/api/auth'
  import { ApiError } from '$lib/api/client'
  import { getOrganizationSummary, getOrganizationTokenUsage } from '$lib/api/openase'
  import { PageScaffold } from '$lib/components/layout'
  import { appStore } from '$lib/stores/app.svelte'
  import { organizationPath } from '$lib/stores/app-context'
  import { cn } from '$lib/utils'
  import { ArrowLeft } from '@lucide/svelte'
  import type { Snippet } from 'svelte'

  let {
    organizationId,
    currentPath,
    children,
  }: {
    organizationId: string
    currentPath: string
    children: Snippet
  } = $props()

  const currentOrg = $derived(appStore.currentOrg)
  let loading = $state(false)
  let permissions = $state<EffectivePermissionsResponse | null>(null)
  let summary = $state<OrganizationDashboardSummary | null>(null)
  let tokenSummary = $state<OrganizationTokenUsageSummary | null>(null)
  let memberStats = $state({ active: 0, invited: 0, suspended: 0 })

  const adminTabs = $derived([
    { label: 'Members', href: `${organizationPath(organizationId)}/admin/members` },
    { label: 'Invitations', href: `${organizationPath(organizationId)}/admin/invitations` },
    { label: 'Roles', href: `${organizationPath(organizationId)}/admin/roles` },
    { label: 'Credentials', href: `${organizationPath(organizationId)}/admin/credentials` },
    { label: 'Settings', href: `${organizationPath(organizationId)}/admin/settings` },
  ])

  function dateRange() {
    const end = new Date()
    const start = new Date(end)
    start.setUTCDate(end.getUTCDate() - 6)
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    }
  }

  $effect(() => {
    if (!organizationId) {
      permissions = null
      summary = null
      tokenSummary = null
      memberStats = { active: 0, invited: 0, suspended: 0 }
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const load = async () => {
      loading = true
      try {
        const [nextPermissions, nextSummary, nextMemberships, nextTokenUsage] = await Promise.all([
          getEffectivePermissions({ orgId: organizationId }),
          getOrganizationSummary(organizationId, { signal: controller.signal }),
          listOrganizationMemberships(organizationId, { signal: controller.signal }),
          getOrganizationTokenUsage(organizationId, dateRange(), { signal: controller.signal }),
        ])
        if (cancelled) return
        permissions = nextPermissions
        summary = nextSummary.organization ?? null
        tokenSummary = nextTokenUsage.summary ?? null
        memberStats = {
          active: nextMemberships.filter((item) => item.status === 'active').length,
          invited: nextMemberships.filter((item) => item.activeInvitation).length,
          suspended: nextMemberships.filter((item) => item.status === 'suspended').length,
        }
      } catch (caughtError) {
        if (cancelled || controller.signal.aborted) return
        // Diagnostics are non-critical — silently degrade
        if (!(caughtError instanceof ApiError)) {
          console.warn('Failed to load org admin diagnostics', caughtError)
        }
      } finally {
        if (!cancelled) loading = false
      }
    }

    void load()
    return () => {
      cancelled = true
      controller.abort()
    }
  })
</script>

<svelte:head>
  <title>{currentOrg?.name ?? 'Organization'} admin — OpenASE</title>
</svelte:head>

<PageScaffold
  title="{currentOrg?.name ?? 'Organization'} admin"
  description="Members, invitations, roles, credentials, and organization settings."
>
  <div class="space-y-6">
    <!-- Stat strip -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="border-border bg-card rounded-lg border px-4 py-3">
        <div class="text-muted-foreground text-xs font-medium tracking-wide uppercase">Members</div>
        <div class="mt-2 text-2xl font-semibold tabular-nums">
          {loading ? '—' : memberStats.active}
        </div>
        <div class="text-muted-foreground mt-0.5 text-xs">
          {memberStats.invited} pending · {memberStats.suspended} suspended
        </div>
      </div>

      <div class="border-border bg-card rounded-lg border px-4 py-3">
        <div class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Projects
        </div>
        <div class="mt-2 text-2xl font-semibold tabular-nums">
          {loading ? '—' : (summary?.project_count ?? 0)}
        </div>
        <div class="text-muted-foreground mt-0.5 text-xs">
          {summary?.active_project_count ?? 0} active
        </div>
      </div>

      <div class="border-border bg-card rounded-lg border px-4 py-3">
        <div class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Your org roles
        </div>
        <div class="mt-2 text-sm font-semibold">
          {loading
            ? '—'
            : permissions?.roles?.length
              ? permissions.roles.join(', ')
              : 'No org roles'}
        </div>
        <div class="text-muted-foreground mt-0.5 text-xs">
          {permissions?.groups?.length ?? 0} synced groups
        </div>
      </div>

      <div class="border-border bg-card rounded-lg border px-4 py-3">
        <div class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          7d tokens
        </div>
        <div class="mt-2 text-2xl font-semibold tabular-nums">
          {loading ? '—' : (tokenSummary?.total_tokens ?? 0)}
        </div>
        <div class="text-muted-foreground mt-0.5 text-xs">
          avg {tokenSummary?.avg_daily_tokens ?? 0}/day
        </div>
      </div>
    </div>

    <!-- Tab navigation -->
    <div class="border-border border-b">
      <nav class="-mb-px flex flex-wrap gap-x-1">
        {#each adminTabs as tab (tab.href)}
          <a
            href={tab.href}
            class={cn(
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              currentPath === tab.href
                ? 'border-foreground text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:border-border border-transparent',
            )}
          >
            {tab.label}
          </a>
        {/each}
        <div class="ml-auto flex items-center pb-1">
          <a
            href={organizationPath(organizationId)}
            class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            <ArrowLeft class="size-3" />
            Back to org
          </a>
        </div>
      </nav>
    </div>

    {@render children()}
  </div>
</PageScaffold>
