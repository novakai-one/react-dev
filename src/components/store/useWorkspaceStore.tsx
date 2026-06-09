import { create } from 'zustand'
import type { TextFile } from '../../types/types'

interface WorkspaceStore {
    activeFile: TextFile | null
    setActiveFile: (content: TextFile) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
    activeFile: null,
    setActiveFile: (content) => set({ activeFile: content })
}))