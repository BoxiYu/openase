import {
  getProjectConversationWorkspace,
  getProjectConversationWorkspaceFilePatch,
  getProjectConversationWorkspaceFilePreview,
  listProjectConversationWorkspaceTree,
  type ProjectConversationWorkspaceFilePatch,
  type ProjectConversationWorkspaceFilePreview,
  type ProjectConversationWorkspaceMetadata,
  type ProjectConversationWorkspaceTreeEntry,
} from '$lib/api/chat'

export function createProjectConversationWorkspaceBrowserState(input: {
  getConversationId: () => string
}) {
  let metadata = $state<ProjectConversationWorkspaceMetadata | null>(null)
  let metadataLoading = $state(false)
  let metadataError = $state('')

  // Recursive tree: directory path → child entries
  let treeNodes = $state<Map<string, ProjectConversationWorkspaceTreeEntry[]>>(new Map())
  let expandedDirs = $state<Set<string>>(new Set())
  let loadingDirs = $state<Set<string>>(new Set())

  let preview = $state<ProjectConversationWorkspaceFilePreview | null>(null)
  let patch = $state<ProjectConversationWorkspaceFilePatch | null>(null)
  let fileLoading = $state(false)
  let fileError = $state('')
  let selectedRepoPath = $state('')
  let selectedFilePath = $state('')
  let loadRequestID = 0

  function setTreeEntries(dirPath: string, entries: ProjectConversationWorkspaceTreeEntry[]) {
    const nextTreeNodes = new Map(treeNodes)
    nextTreeNodes.set(dirPath, entries)
    treeNodes = nextTreeNodes
  }

  function setDirLoading(dirPath: string, loading: boolean) {
    const nextLoadingDirs = new Set(loadingDirs)
    if (loading) {
      nextLoadingDirs.add(dirPath)
    } else {
      nextLoadingDirs.delete(dirPath)
    }
    loadingDirs = nextLoadingDirs
  }

  function setDirExpanded(dirPath: string, expanded: boolean) {
    const nextExpandedDirs = new Set(expandedDirs)
    if (expanded) {
      nextExpandedDirs.add(dirPath)
    } else {
      nextExpandedDirs.delete(dirPath)
    }
    expandedDirs = nextExpandedDirs
  }

  function reset() {
    metadata = null
    metadataLoading = false
    metadataError = ''
    treeNodes = new Map()
    expandedDirs = new Set()
    loadingDirs = new Set()
    preview = null
    patch = null
    fileLoading = false
    fileError = ''
    selectedRepoPath = ''
    selectedFilePath = ''
  }

  async function refreshWorkspace(preserveSelection: boolean) {
    const conversationId = input.getConversationId()
    const requestID = ++loadRequestID
    metadataLoading = true
    metadataError = ''

    try {
      const payload = await getProjectConversationWorkspace(conversationId)
      if (requestID !== loadRequestID || conversationId !== input.getConversationId()) return

      metadata = payload.workspace
      if (!payload.workspace.available || payload.workspace.repos.length === 0) {
        selectedRepoPath = ''
        selectedFilePath = ''
        treeNodes = new Map()
        expandedDirs = new Set()
        loadingDirs = new Set()
        preview = null
        patch = null
        fileError = ''
        return
      }

      const nextRepoPath =
        preserveSelection &&
        payload.workspace.repos.some((repo) => repo.path === selectedRepoPath) &&
        selectedRepoPath
          ? selectedRepoPath
          : (payload.workspace.repos[0]?.path ?? '')

      const repoChanged = nextRepoPath !== selectedRepoPath
      const prevExpanded = repoChanged ? [] : [...expandedDirs]
      selectedRepoPath = nextRepoPath

      if (repoChanged) {
        selectedFilePath = ''
        expandedDirs = new Set()
        preview = null
        patch = null
      }

      // Clear cache and reload
      treeNodes = new Map()

      await loadDirEntries('', requestID)
      if (requestID !== loadRequestID) return

      // Re-expand previously expanded directories
      if (prevExpanded.length > 0) {
        await Promise.all(prevExpanded.map((dir) => loadDirEntries(dir, requestID)))
      }

      // Reload selected file if preserved
      if (preserveSelection && selectedFilePath && !repoChanged) {
        await loadFile(selectedFilePath, { requestID })
      }
    } catch (error) {
      if (requestID !== loadRequestID || conversationId !== input.getConversationId()) return
      metadata = null
      treeNodes = new Map()
      preview = null
      patch = null
      metadataError =
        error instanceof Error ? error.message : 'Failed to load the Project AI workspace.'
    } finally {
      if (requestID === loadRequestID && conversationId === input.getConversationId()) {
        metadataLoading = false
      }
    }
  }

  async function loadDirEntries(dirPath: string, externalRequestID?: number) {
    const conversationId = input.getConversationId()
    const repoPath = selectedRepoPath
    if (!repoPath || !conversationId) return

    const requestID = externalRequestID ?? loadRequestID

    setDirLoading(dirPath, true)

    try {
      const payload = await listProjectConversationWorkspaceTree(conversationId, {
        repoPath,
        path: dirPath,
      })
      if (requestID !== loadRequestID || repoPath !== selectedRepoPath) return

      setTreeEntries(dirPath, payload.workspaceTree.entries)
    } catch {
      // Individual directory load failures are silent — the directory shows as empty
    } finally {
      setDirLoading(dirPath, false)
    }
  }

  async function toggleDir(dirPath: string) {
    if (expandedDirs.has(dirPath)) {
      setDirExpanded(dirPath, false)
      return
    }

    setDirExpanded(dirPath, true)

    if (!treeNodes.has(dirPath)) {
      await loadDirEntries(dirPath)
    }
  }

  async function loadFile(path: string, options: { requestID?: number } = {}) {
    const conversationId = input.getConversationId()
    if (!selectedRepoPath || !conversationId) {
      preview = null
      patch = null
      return
    }

    const requestID = options.requestID ?? ++loadRequestID
    fileLoading = true
    fileError = ''
    selectedFilePath = path

    try {
      const [previewPayload, patchPayload] = await Promise.all([
        getProjectConversationWorkspaceFilePreview(conversationId, {
          repoPath: selectedRepoPath,
          path,
        }),
        getProjectConversationWorkspaceFilePatch(conversationId, {
          repoPath: selectedRepoPath,
          path,
        }),
      ])
      if (requestID !== loadRequestID || path !== selectedFilePath) return
      preview = previewPayload.filePreview
      patch = patchPayload.filePatch
    } catch (error) {
      if (requestID !== loadRequestID || path !== selectedFilePath) return
      preview = null
      patch = null
      fileError =
        error instanceof Error ? error.message : 'Failed to load the workspace file details.'
    } finally {
      if (requestID === loadRequestID && path === selectedFilePath) {
        fileLoading = false
      }
    }
  }

  function openRepo(repoPath: string) {
    if (!repoPath || repoPath === selectedRepoPath) return
    selectedRepoPath = repoPath
    selectedFilePath = ''
    expandedDirs = new Set()
    treeNodes = new Map()
    preview = null
    patch = null
    void loadDirEntries('')
  }

  function selectFile(path: string) {
    if (!path) return
    void loadFile(path)
  }

  return {
    get metadata() {
      return metadata
    },
    get metadataLoading() {
      return metadataLoading
    },
    get metadataError() {
      return metadataError
    },
    get treeNodes() {
      return treeNodes
    },
    get expandedDirs() {
      return expandedDirs
    },
    get loadingDirs() {
      return loadingDirs
    },
    get preview() {
      return preview
    },
    get patch() {
      return patch
    },
    get fileLoading() {
      return fileLoading
    },
    get fileError() {
      return fileError
    },
    get selectedRepoPath() {
      return selectedRepoPath
    },
    get selectedFilePath() {
      return selectedFilePath
    },
    reset,
    refreshWorkspace,
    toggleDir,
    openRepo,
    selectFile,
  }
}
