import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

const {
  getProjectConversationWorkspace,
  getProjectConversationWorkspaceFilePatch,
  getProjectConversationWorkspaceFilePreview,
  listProjectConversationWorkspaceTree,
} = vi.hoisted(() => ({
  getProjectConversationWorkspace: vi.fn(),
  getProjectConversationWorkspaceFilePatch: vi.fn(),
  getProjectConversationWorkspaceFilePreview: vi.fn(),
  listProjectConversationWorkspaceTree: vi.fn(),
}))

vi.mock('$lib/api/chat', () => ({
  getProjectConversationWorkspace,
  getProjectConversationWorkspaceFilePatch,
  getProjectConversationWorkspaceFilePreview,
  listProjectConversationWorkspaceTree,
}))

import type { ProjectConversationWorkspaceDiff } from '$lib/api/chat'
import ProjectConversationWorkspaceBrowser from './project-conversation-workspace-browser.svelte'

const workspaceMetadata = {
  conversationId: 'conversation-1',
  available: true,
  workspacePath: '/tmp/conversation-1',
  repos: [
    {
      name: 'openase',
      path: 'services/openase',
      branch: 'agent/conv-123',
      headCommit: '123456789abc',
      headSummary: 'Add workspace browser scaffolding',
      dirty: true,
      filesChanged: 1,
      added: 2,
      removed: 0,
    },
  ],
}

const workspaceDiff = {
  conversationId: 'conversation-1',
  workspacePath: '/tmp/conversation-1',
  dirty: true,
  reposChanged: 1,
  filesChanged: 1,
  added: 2,
  removed: 0,
  repos: [
    {
      name: 'openase',
      path: 'services/openase',
      branch: 'agent/conv-123',
      dirty: true,
      filesChanged: 1,
      added: 2,
      removed: 0,
      files: [{ path: 'README.md', status: 'modified', added: 2, removed: 0 }],
    },
  ],
} satisfies ProjectConversationWorkspaceDiff

function mockWorkspaceMetadata() {
  getProjectConversationWorkspace.mockResolvedValue({
    workspace: structuredClone(workspaceMetadata),
  })
}

function deferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

describe('ProjectConversationWorkspaceBrowser', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('reloads workspace metadata after the parent diff refresh completes', async () => {
    mockWorkspaceMetadata()
    listProjectConversationWorkspaceTree.mockResolvedValue({
      workspaceTree: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: '',
        entries: [{ path: 'README.md', name: 'README.md', kind: 'file', sizeBytes: 64 }],
      },
    })
    getProjectConversationWorkspaceFilePreview.mockResolvedValue({
      filePreview: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: 'README.md',
        sizeBytes: 64,
        mediaType: 'text/plain',
        previewKind: 'text',
        truncated: false,
        content: 'line one\nline two\n',
      },
    })
    getProjectConversationWorkspaceFilePatch.mockResolvedValue({
      filePatch: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: 'README.md',
        status: 'modified',
        diffKind: 'text',
        truncated: false,
        diff: '@@ -1 +1,2 @@\n line one\n+line two\n',
      },
    })

    const view = render(ProjectConversationWorkspaceBrowser, {
      props: {
        conversationId: 'conversation-1',
        workspaceDiff,
        workspaceDiffLoading: false,
      },
    })

    await waitFor(() => expect(getProjectConversationWorkspace).toHaveBeenCalledTimes(1))

    await view.rerender({
      conversationId: 'conversation-1',
      workspaceDiff,
      workspaceDiffLoading: true,
    })
    await view.rerender({
      conversationId: 'conversation-1',
      workspaceDiff,
      workspaceDiffLoading: false,
    })

    await waitFor(() => expect(getProjectConversationWorkspace).toHaveBeenCalledTimes(2))
  })

  it('lists root entries, expands directories, and shows the selected repo branch info', async () => {
    mockWorkspaceMetadata()
    listProjectConversationWorkspaceTree.mockImplementation(async (_conversationId, input) => ({
      workspaceTree: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: input.path,
        entries:
          input.path === ''
            ? [
                { path: 'src', name: 'src', kind: 'directory', sizeBytes: 0 },
                { path: 'README.md', name: 'README.md', kind: 'file', sizeBytes: 64 },
              ]
            : [{ path: 'src/main.ts', name: 'main.ts', kind: 'file', sizeBytes: 42 }],
      },
    }))

    const view = render(ProjectConversationWorkspaceBrowser, {
      props: {
        conversationId: 'conversation-1',
        workspaceDiff,
        workspaceDiffLoading: false,
      },
    })

    await view.findByRole('button', { name: 'README.md' })
    expect(listProjectConversationWorkspaceTree).toHaveBeenCalledWith('conversation-1', {
      repoPath: 'services/openase',
      path: '',
    })
    expect(view.container.textContent).toContain('agent/conv-123')
    expect(view.container.textContent).toContain('123456789abc')

    await fireEvent.click(view.getByRole('button', { name: 'src' }))

    await waitFor(() =>
      expect(listProjectConversationWorkspaceTree).toHaveBeenCalledWith('conversation-1', {
        repoPath: 'services/openase',
        path: 'src',
      }),
    )
    await view.findByRole('button', { name: 'main.ts' })
  })

  it('loads and renders file previews when a file is selected from the explorer', async () => {
    mockWorkspaceMetadata()
    listProjectConversationWorkspaceTree.mockResolvedValue({
      workspaceTree: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: '',
        entries: [{ path: 'README.md', name: 'README.md', kind: 'file', sizeBytes: 31 }],
      },
    })
    getProjectConversationWorkspaceFilePreview.mockResolvedValue({
      filePreview: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: 'README.md',
        sizeBytes: 31,
        mediaType: 'text/plain',
        previewKind: 'text',
        truncated: false,
        content: 'line alpha\nline beta\n',
      },
    })
    getProjectConversationWorkspaceFilePatch.mockResolvedValue({
      filePatch: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: 'README.md',
        status: 'modified',
        diffKind: 'binary',
        truncated: false,
        diff: '',
      },
    })

    const view = render(ProjectConversationWorkspaceBrowser, {
      props: {
        conversationId: 'conversation-1',
        workspaceDiff,
        workspaceDiffLoading: false,
      },
    })

    await fireEvent.click(await view.findByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(getProjectConversationWorkspaceFilePreview).toHaveBeenCalledWith('conversation-1', {
        repoPath: 'services/openase',
        path: 'README.md',
      })
      expect(getProjectConversationWorkspaceFilePatch).toHaveBeenCalledWith('conversation-1', {
        repoPath: 'services/openase',
        path: 'README.md',
      })
    })

    expect(view.container.textContent).toContain('README.md')
    expect(view.container.textContent).toContain('text/plain')
    expect(view.container.textContent).toContain('line alpha')
    expect(view.container.textContent).toContain('line beta')
  })

  it('renders git changes and opens a changed file from the status list', async () => {
    mockWorkspaceMetadata()
    listProjectConversationWorkspaceTree.mockResolvedValue({
      workspaceTree: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: '',
        entries: [],
      },
    })
    getProjectConversationWorkspaceFilePreview.mockResolvedValue({
      filePreview: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: 'src/new.ts',
        sizeBytes: 55,
        mediaType: 'text/plain',
        previewKind: 'text',
        truncated: false,
        content: 'export const ready = true;\n',
      },
    })
    getProjectConversationWorkspaceFilePatch.mockResolvedValue({
      filePatch: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: 'src/new.ts',
        status: 'added',
        diffKind: 'text',
        truncated: false,
        diff: '@@ -0,0 +1 @@\n+export const ready = true;\n',
      },
    })

    const gitStatusDiff = {
      ...workspaceDiff,
      repos: [
        {
          ...workspaceDiff.repos[0],
          files: [{ path: 'src/new.ts', status: 'added', added: 5, removed: 0 }],
        },
      ],
    } satisfies ProjectConversationWorkspaceDiff

    const view = render(ProjectConversationWorkspaceBrowser, {
      props: {
        conversationId: 'conversation-1',
        workspaceDiff: gitStatusDiff,
        workspaceDiffLoading: false,
      },
    })

    const changeButton = await view.findByRole('button', { name: /new\.ts/i })
    expect(view.container.textContent).toContain('Changes')
    expect(changeButton.textContent).toContain('+5 -0')
    expect(changeButton.textContent).toContain('A')

    await fireEvent.click(changeButton)

    await waitFor(() => {
      expect(getProjectConversationWorkspaceFilePreview).toHaveBeenCalledWith('conversation-1', {
        repoPath: 'services/openase',
        path: 'src/new.ts',
      })
      expect(getProjectConversationWorkspaceFilePatch).toHaveBeenCalledWith('conversation-1', {
        repoPath: 'services/openase',
        path: 'src/new.ts',
      })
    })

    expect(view.container.textContent).toContain('added')
    expect(view.container.textContent).toContain('+export const ready = true;')
  })

  it('preserves the expanded directory and selected file when the toolbar refresh is clicked', async () => {
    mockWorkspaceMetadata()
    listProjectConversationWorkspaceTree.mockImplementation(async (_conversationId, input) => ({
      workspaceTree: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: input.path,
        entries:
          input.path === ''
            ? [{ path: 'src', name: 'src', kind: 'directory', sizeBytes: 0 }]
            : [{ path: 'src/main.ts', name: 'main.ts', kind: 'file', sizeBytes: 42 }],
      },
    }))
    getProjectConversationWorkspaceFilePreview.mockResolvedValue({
      filePreview: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: 'src/main.ts',
        sizeBytes: 42,
        mediaType: 'text/plain',
        previewKind: 'text',
        truncated: false,
        content: 'export const refreshed = true;\n',
      },
    })
    getProjectConversationWorkspaceFilePatch.mockResolvedValue({
      filePatch: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: 'src/main.ts',
        status: 'modified',
        diffKind: 'text',
        truncated: false,
        diff: '@@ -1 +1 @@\n+export const refreshed = true;\n',
      },
    })

    const view = render(ProjectConversationWorkspaceBrowser, {
      props: {
        conversationId: 'conversation-1',
        workspaceDiff,
        workspaceDiffLoading: false,
      },
    })

    await fireEvent.click(await view.findByRole('button', { name: 'src' }))
    await fireEvent.click(await view.findByRole('button', { name: 'main.ts' }))

    await waitFor(() => {
      expect(getProjectConversationWorkspaceFilePreview).toHaveBeenCalledTimes(1)
      expect(getProjectConversationWorkspaceFilePatch).toHaveBeenCalledTimes(1)
    })

    await fireEvent.click(view.getByRole('button', { name: 'Refresh workspace browser' }))

    await waitFor(() => {
      expect(getProjectConversationWorkspace).toHaveBeenCalledTimes(2)
      expect(listProjectConversationWorkspaceTree).toHaveBeenCalledWith('conversation-1', {
        repoPath: 'services/openase',
        path: '',
      })
      expect(listProjectConversationWorkspaceTree).toHaveBeenCalledWith('conversation-1', {
        repoPath: 'services/openase',
        path: 'src',
      })
      expect(getProjectConversationWorkspaceFilePreview).toHaveBeenCalledTimes(2)
      expect(getProjectConversationWorkspaceFilePatch).toHaveBeenCalledTimes(2)
    })

    expect(view.container.textContent).toContain('main.ts')
    expect(view.container.textContent).toContain('export const refreshed = true;')
    expect(view.container.textContent).toContain('+export const refreshed = true;')
  })

  it('ignores stale file preview responses when the user selects a newer file', async () => {
    mockWorkspaceMetadata()
    listProjectConversationWorkspaceTree.mockResolvedValue({
      workspaceTree: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: '',
        entries: [
          { path: 'README.md', name: 'README.md', kind: 'file', sizeBytes: 31 },
          { path: 'package.json', name: 'package.json', kind: 'file', sizeBytes: 48 },
        ],
      },
    })

    const readmePreview = deferredPromise<{
      filePreview: {
        conversationId: string
        repoPath: string
        path: string
        sizeBytes: number
        mediaType: string
        previewKind: 'text'
        truncated: boolean
        content: string
      }
    }>()
    const readmePatch = deferredPromise<{
      filePatch: {
        conversationId: string
        repoPath: string
        path: string
        status: 'modified'
        diffKind: 'binary'
        truncated: boolean
        diff: string
      }
    }>()

    getProjectConversationWorkspaceFilePreview.mockImplementation(async (_conversationId, input) => {
      if (input.path === 'README.md') {
        return readmePreview.promise
      }
      return {
        filePreview: {
          conversationId: 'conversation-1',
          repoPath: 'services/openase',
          path: 'package.json',
          sizeBytes: 48,
          mediaType: 'application/json',
          previewKind: 'text',
          truncated: false,
          content: '{"name":"latest"}\n',
        },
      }
    })
    getProjectConversationWorkspaceFilePatch.mockImplementation(async (_conversationId, input) => {
      if (input.path === 'README.md') {
        return readmePatch.promise
      }
      return {
        filePatch: {
          conversationId: 'conversation-1',
          repoPath: 'services/openase',
          path: 'package.json',
          status: 'modified',
          diffKind: 'binary',
          truncated: false,
          diff: '',
        },
      }
    })

    const view = render(ProjectConversationWorkspaceBrowser, {
      props: {
        conversationId: 'conversation-1',
        workspaceDiff: {
          ...workspaceDiff,
          repos: [{ ...workspaceDiff.repos[0], files: [] }],
        },
        workspaceDiffLoading: false,
      },
    })

    await fireEvent.click(await view.findByRole('button', { name: 'README.md' }))
    await fireEvent.click(view.getByRole('button', { name: 'package.json' }))

    await waitFor(() => {
      expect(getProjectConversationWorkspaceFilePreview).toHaveBeenCalledWith('conversation-1', {
        repoPath: 'services/openase',
        path: 'package.json',
      })
      expect(view.container.textContent).toContain('package.json')
      expect(view.container.textContent).toContain('{"name":"latest"}')
    })

    readmePreview.resolve({
      filePreview: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: 'README.md',
        sizeBytes: 31,
        mediaType: 'text/plain',
        previewKind: 'text',
        truncated: false,
        content: 'stale readme\n',
      },
    })
    readmePatch.resolve({
      filePatch: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: 'README.md',
        status: 'modified',
        diffKind: 'binary',
        truncated: false,
        diff: '',
      },
    })
    await Promise.all([readmePreview.promise, readmePatch.promise])
    await Promise.resolve()

    expect(view.container.textContent).toContain('package.json')
    expect(view.container.textContent).toContain('{"name":"latest"}')
    expect(view.container.textContent).not.toContain('stale readme')
  })

  it('ignores stale tree responses from the previous repo after the user switches repos', async () => {
    getProjectConversationWorkspace.mockResolvedValue({
      workspace: {
        conversationId: 'conversation-1',
        available: true,
        workspacePath: '/tmp/conversation-1',
        repos: [
          {
            ...workspaceMetadata.repos[0],
          },
          {
            name: 'docs',
            path: 'services/docs',
            branch: 'agent/docs-123',
            headCommit: 'abcdef123456',
            headSummary: 'Docs branch',
            dirty: false,
            filesChanged: 0,
            added: 0,
            removed: 0,
          },
        ],
      },
    })

    const repoOneTree = deferredPromise<{
      workspaceTree: {
        conversationId: string
        repoPath: string
        path: string
        entries: Array<{ path: string; name: string; kind: 'file'; sizeBytes: number }>
      }
    }>()
    listProjectConversationWorkspaceTree.mockImplementation(async (_conversationId, input) => {
      if (input.repoPath === 'services/openase') {
        return repoOneTree.promise
      }
      return {
        workspaceTree: {
          conversationId: 'conversation-1',
          repoPath: 'services/docs',
          path: '',
          entries: [{ path: 'guide.md', name: 'guide.md', kind: 'file', sizeBytes: 20 }],
        },
      }
    })

    const multiRepoDiff = {
      ...workspaceDiff,
      reposChanged: 2,
      repos: [
        workspaceDiff.repos[0],
        {
          name: 'docs',
          path: 'services/docs',
          branch: 'agent/docs-123',
          dirty: false,
          filesChanged: 0,
          added: 0,
          removed: 0,
          files: [],
        },
      ],
    } satisfies ProjectConversationWorkspaceDiff

    const view = render(ProjectConversationWorkspaceBrowser, {
      props: {
        conversationId: 'conversation-1',
        workspaceDiff: multiRepoDiff,
        workspaceDiffLoading: false,
      },
    })

    await waitFor(() => expect(getProjectConversationWorkspace).toHaveBeenCalledTimes(1))
    await fireEvent.click(await view.findByRole('button', { name: 'docs' }))

    await waitFor(() => {
      expect(listProjectConversationWorkspaceTree).toHaveBeenCalledWith('conversation-1', {
        repoPath: 'services/docs',
        path: '',
      })
    })
    await view.findByRole('button', { name: 'guide.md' })

    repoOneTree.resolve({
      workspaceTree: {
        conversationId: 'conversation-1',
        repoPath: 'services/openase',
        path: '',
        entries: [{ path: 'README.md', name: 'README.md', kind: 'file', sizeBytes: 64 }],
      },
    })
    await repoOneTree.promise
    await Promise.resolve()

    expect(view.container.textContent).toContain('guide.md')
    expect(view.queryByRole('button', { name: 'README.md' })).toBeNull()
  })
})
