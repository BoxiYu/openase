<script lang="ts">
  import {
    getEffectivePermissions,
    listProjectRoleBindings,
    type EffectivePermissionsResponse,
    type RoleBinding,
  } from '$lib/api/auth'
  import { ApiError } from '$lib/api/client'
  import { appStore } from '$lib/stores/app.svelte'
  import { authStore } from '$lib/stores/auth.svelte'
  import { toastStore } from '$lib/stores/toast.svelte'
  import { Badge } from '$ui/badge'
  import { Users } from '@lucide/svelte'
  import AccessSettingsDisabledCard from './access-settings-disabled-card.svelte'
  import SecuritySettingsHumanAuthAccessCard from './security-settings-human-auth-access-card.svelte'
  import SecuritySettingsHumanAuthBindingSection from './security-settings-human-auth-binding-section.svelte'
  import SecuritySettingsHumanAuthSignInHint from './security-settings-human-auth-sign-in-hint.svelte'
  import {
    createRoleBindingForScope,
    deleteRoleBindingForScope,
  } from './security-settings-human-auth.data'
  import {
    defaultBindingDraftForScope,
    formatError,
    type BindingDraft,
  } from './security-settings-human-auth.model'

  let accessLoading = $state(false)
  let accessError = $state('')
  let mutationKey = $state('')
  let projectPermissions = $state<EffectivePermissionsResponse | null>(null)
  let projectBindings = $state<RoleBinding[]>([])
  let projectDraft = $state<BindingDraft>(defaultBindingDraftForScope('project'))

  const currentOrgId = $derived(appStore.currentOrg?.id ?? '')
  const currentProjectId = $derived(appStore.currentProject?.id ?? '')
  const currentProjectName = $derived(appStore.currentProject?.name ?? '')
  const currentGroups = $derived(projectPermissions?.groups ?? [])
  const canManageProjectBindings = $derived(
    projectPermissions?.permissions.includes('rbac.manage') ?? false,
  )

  async function loadProjectAccess(projectId: string) {
    const [nextPermissions, nextBindings] = await Promise.all([
      getEffectivePermissions({ projectId }),
      listProjectRoleBindings(projectId),
    ])
    projectPermissions = nextPermissions
    projectBindings = nextBindings
  }

  $effect(() => {
    const projectId = currentProjectId
    if (authStore.authMode !== 'oidc' || !authStore.authenticated || !projectId) {
      accessLoading = false
      accessError = ''
      projectPermissions = null
      projectBindings = []
      return
    }

    let cancelled = false

    const load = async () => {
      accessLoading = true
      accessError = ''
      try {
        await loadProjectAccess(projectId)
      } catch (caughtError) {
        if (cancelled) return
        accessError = formatError(caughtError, 'Failed to load project access.')
      } finally {
        if (!cancelled) accessLoading = false
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  })

  function patchDraft(patch: Partial<BindingDraft>) {
    projectDraft = { ...projectDraft, ...patch }
  }

  async function handleCreateBinding() {
    const orgId = currentOrgId
    const projectId = currentProjectId
    if (!projectId) return

    mutationKey = 'project:create'
    accessError = ''
    try {
      await createRoleBindingForScope('project', orgId, projectId, projectDraft)
      await loadProjectAccess(projectId)
      projectDraft = defaultBindingDraftForScope('project')
      toastStore.success('Project role binding added.')
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Failed to create project role binding.'
      accessError = message
      toastStore.error(message)
    } finally {
      mutationKey = ''
    }
  }

  async function handleDeleteBinding(bindingId: string) {
    const orgId = currentOrgId
    const projectId = currentProjectId
    if (!projectId) return

    mutationKey = `project:delete:${bindingId}`
    accessError = ''
    try {
      await deleteRoleBindingForScope('project', orgId, projectId, bindingId)
      await loadProjectAccess(projectId)
      toastStore.success('Project role binding removed.')
    } catch (caughtError) {
      const message =
        caughtError instanceof ApiError ? caughtError.detail : 'Failed to delete project role binding.'
      accessError = message
      toastStore.error(message)
    } finally {
      mutationKey = ''
    }
  }
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-foreground text-base font-semibold">Access</h2>
    <p class="text-muted-foreground mt-1 text-sm">
      Project-scoped role bindings and effective access for this project.
    </p>
  </div>

  {#if authStore.authMode !== 'oidc'}
    <AccessSettingsDisabledCard />
  {:else if !authStore.authenticated}
    <SecuritySettingsHumanAuthSignInHint />
  {:else if accessLoading}
    <div class="space-y-3">
      <div class="bg-muted h-24 animate-pulse rounded-lg"></div>
      <div class="bg-muted h-64 animate-pulse rounded-lg"></div>
    </div>
  {:else}
    <div class="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <SecuritySettingsHumanAuthAccessCard
        title="Project effective access"
        subtitle={currentProjectName}
        roles={projectPermissions?.roles ?? []}
        permissions={projectPermissions?.permissions ?? []}
        emptyRoles="No project roles"
        emptyPermissions="No project permissions"
      />

      <div class="border-border bg-card space-y-3 rounded-lg border p-4">
        <div class="flex items-center gap-2">
          <Users class="text-muted-foreground size-4" />
          <div class="text-sm font-semibold">Current principal and groups</div>
        </div>
        <div class="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <div class="text-muted-foreground text-xs uppercase tracking-[0.22em]">Principal</div>
            <div class="mt-2 font-medium">
              {authStore.user?.displayName || authStore.user?.primaryEmail || 'Authenticated user'}
            </div>
            <div class="text-muted-foreground mt-1 text-xs">
              {authStore.user?.primaryEmail || authStore.user?.id || 'OIDC browser session'}
            </div>
          </div>
          <div>
            <div class="text-muted-foreground text-xs uppercase tracking-[0.22em]">Synced groups</div>
            <div class="mt-2 flex flex-wrap gap-2">
              {#if currentGroups.length > 0}
                {#each currentGroups as group (group.issuer + ':' + group.group_key)}
                  <Badge variant="outline">{group.group_name || group.group_key}</Badge>
                {/each}
              {:else}
                <span class="text-muted-foreground text-xs">No synchronized groups</span>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>

    {#if accessError}
      <div class="text-destructive text-sm">{accessError}</div>
    {/if}

    <SecuritySettingsHumanAuthBindingSection
      scope="project"
      bindings={projectBindings}
      canManage={canManageProjectBindings}
      draft={projectDraft}
      {mutationKey}
      onSubjectKind={(_, value) => patchDraft({ subjectKind: value })}
      onSubjectKey={(_, value) => patchDraft({ subjectKey: value })}
      onRoleKey={(_, value) => patchDraft({ roleKey: value })}
      onExpiresAt={(_, value) => patchDraft({ expiresAtLocal: value })}
      onCreate={() => void handleCreateBinding()}
      onDelete={(_, bindingId) => void handleDeleteBinding(bindingId)}
    />

    <p class="text-muted-foreground px-0.5 text-xs leading-5">
      Project bindings layer on top of inherited organization access. Fix org membership or org
      roles in org admin first if someone cannot reach the org at all.
    </p>
  {/if}
</div>
