/*
import { useCallback, useRef } from "react";

const STORAGE_KEY: string = "document_v1";
const DEBOUNCE_MS = 1500

//Need to find what is going to be stored.
interface StoredDocument {
    //
}


export function useDocumentStorage() {

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // -- Save ----
    //Debounces - waits DEBOUNCE_MS after the last call before writing.

    const saveDocument = useCallback((): void => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current)
        }

        debounceTimer.current = setTimeout(() => {
            try {
                const doc: StoredDocument
            }
        })

    })
}
    */