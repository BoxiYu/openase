import type { ProjectConversationWorkspaceDiff } from '$lib/api/chat'

/**
 * Shared reactive state that lets the workspace browser render outside the
 * assistant panel (in the main content area) while the conversation controller
 * that owns the data lives inside the panel.
 *
 * - Written by: ProjectConversationContent (syncs conversation data)
 * - Read by: ProjectShellFrame (renders the browser in <main>)
 */
class WorkspaceBrowserPortal {
  open = $state(false)
  conversationId = $state('')
  workspaceDiff: ProjectConversationWorkspaceDiff | null = $state(null)
  workspaceDiffLoading = $state(false)

  toggle() {
    this.open = !this.open
  }

  close() {
    this.open = false
  }
}

export const workspaceBrowserPortal = new WorkspaceBrowserPortal()
