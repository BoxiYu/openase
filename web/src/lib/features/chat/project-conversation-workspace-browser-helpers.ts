import type { Component } from 'svelte'
import {
  File,
  FileCode2,
  FileImage,
  FileJson2,
  FileText,
  FileTerminal,
  FileSpreadsheet,
  FileCog,
  FileArchive,
  FileMusic,
  FileVideo,
  FileBraces,
  FileType,
  Lock,
  Database,
  Settings,
} from '@lucide/svelte'
import type {
  ProjectConversationWorkspaceFileStatus,
  ProjectConversationWorkspaceRepoMetadata,
} from '$lib/api/chat'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = Component<any>

const EXT_ICON_MAP: Record<string, IconComponent> = {
  // Code files
  ts: FileCode2,
  tsx: FileCode2,
  js: FileCode2,
  jsx: FileCode2,
  mjs: FileCode2,
  cjs: FileCode2,
  py: FileCode2,
  rb: FileCode2,
  go: FileCode2,
  rs: FileCode2,
  java: FileCode2,
  kt: FileCode2,
  cs: FileCode2,
  cpp: FileCode2,
  c: FileCode2,
  h: FileCode2,
  hpp: FileCode2,
  swift: FileCode2,
  php: FileCode2,
  lua: FileCode2,
  r: FileCode2,
  scala: FileCode2,
  zig: FileCode2,
  v: FileCode2,
  dart: FileCode2,
  ex: FileCode2,
  exs: FileCode2,
  erl: FileCode2,
  elm: FileCode2,
  hs: FileCode2,
  ml: FileCode2,
  clj: FileCode2,
  // Web / markup
  html: FileBraces,
  htm: FileBraces,
  vue: FileBraces,
  svelte: FileBraces,
  xml: FileBraces,
  xsl: FileBraces,
  xslt: FileBraces,
  // Style
  css: FileType,
  scss: FileType,
  sass: FileType,
  less: FileType,
  styl: FileType,
  // JSON / config data
  json: FileJson2,
  jsonc: FileJson2,
  json5: FileJson2,
  // Markup / docs
  md: FileText,
  mdx: FileText,
  txt: FileText,
  rst: FileText,
  tex: FileText,
  adoc: FileText,
  // Shell / terminal
  sh: FileTerminal,
  bash: FileTerminal,
  zsh: FileTerminal,
  fish: FileTerminal,
  ps1: FileTerminal,
  bat: FileTerminal,
  cmd: FileTerminal,
  // Config / settings
  yaml: FileCog,
  yml: FileCog,
  toml: FileCog,
  ini: FileCog,
  env: FileCog,
  conf: FileCog,
  cfg: FileCog,
  properties: FileCog,
  // Data / DB
  sql: Database,
  csv: FileSpreadsheet,
  tsv: FileSpreadsheet,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  // Image
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  svg: FileImage,
  webp: FileImage,
  ico: FileImage,
  bmp: FileImage,
  avif: FileImage,
  // Audio
  mp3: FileMusic,
  wav: FileMusic,
  ogg: FileMusic,
  flac: FileMusic,
  aac: FileMusic,
  // Video
  mp4: FileVideo,
  mkv: FileVideo,
  avi: FileVideo,
  mov: FileVideo,
  webm: FileVideo,
  // Archives
  zip: FileArchive,
  tar: FileArchive,
  gz: FileArchive,
  bz2: FileArchive,
  xz: FileArchive,
  '7z': FileArchive,
  rar: FileArchive,
  // Lock files
  lock: Lock,
  // Settings
  editorconfig: Settings,
}

const FILENAME_ICON_MAP: Record<string, IconComponent> = {
  dockerfile: FileCog,
  makefile: FileCog,
  rakefile: FileCog,
  gemfile: FileCog,
  procfile: FileCog,
  vagrantfile: FileCog,
  justfile: FileCog,
  '.gitignore': FileCog,
  '.gitattributes': FileCog,
  '.gitmodules': FileCog,
  '.dockerignore': FileCog,
  '.eslintrc': FileCog,
  '.prettierrc': FileCog,
  '.env': FileCog,
  '.env.local': FileCog,
  '.env.example': FileCog,
}

/**
 * Returns the appropriate lucide icon component for a given filename.
 */
export function fileIcon(filename: string): IconComponent {
  const lower = filename.toLowerCase()

  // Check exact filename matches first
  const byName = FILENAME_ICON_MAP[lower]
  if (byName) return byName

  // Check extension
  const dotIndex = lower.lastIndexOf('.')
  if (dotIndex >= 0) {
    const ext = lower.slice(dotIndex + 1)
    const byExt = EXT_ICON_MAP[ext]
    if (byExt) return byExt
  }

  return File
}

export function repoDirtyLabel(repo: ProjectConversationWorkspaceRepoMetadata) {
  return repo.dirty
    ? `${repo.filesChanged} file${repo.filesChanged === 1 ? '' : 's'} changed`
    : 'Clean'
}

export function formatTotals(added: number, removed: number) {
  return `+${added} -${removed}`
}

export function directorySegments(path: string) {
  return path.split('/').filter((segment) => segment.length > 0)
}

export function joinSegments(segments: string[]) {
  return segments.join('/')
}

export function statusLabel(status: ProjectConversationWorkspaceFileStatus) {
  switch (status) {
    case 'added':
      return 'A'
    case 'deleted':
      return 'D'
    case 'renamed':
      return 'R'
    case 'untracked':
      return 'U'
    default:
      return 'M'
  }
}

export function statusClass(status: ProjectConversationWorkspaceFileStatus) {
  switch (status) {
    case 'added':
    case 'untracked':
      return 'text-emerald-600'
    case 'deleted':
      return 'text-rose-600'
    case 'renamed':
      return 'text-amber-600'
    default:
      return 'text-sky-600'
  }
}
