import { create } from 'zustand'
import type { TextFile } from '../../types/types'

interface WorkspaceStore {
    activeContent: TextFile | null
    setActiveContent: (content: TextFile) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
    activeContent: null,
    setActiveContent: (content) => set({ activeContent: content })
}))