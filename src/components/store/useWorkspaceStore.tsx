import { create } from 'zustand'
import type { FileData, FilesDataSet, ContentDataSet } from '../../types/types'

interface WorkspaceStore {
    activeFile: FileData | null
    setActiveFile: (activeFile: FileData) => void,
    files: FilesDataSet | null,
    content: ContentDataSet | null,
    setDataSet: (files: FilesDataSet, content: ContentDataSet) => void,
    setContent: (content: ContentDataSet) => void,
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
    activeFile: null,
    setActiveFile: (selectedFile) => set({ activeFile: selectedFile }),
    files: null,
    content: null,
    setDataSet: (files, content) => set({files, content} ),
    setContent: (content) => set({content}) 
}))