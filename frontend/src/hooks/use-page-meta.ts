import { useEffect } from "react"

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = `${title} | DK Industry`
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta) }
    meta.content = description
    return () => { document.title = "DK Industry | Giải pháp cơ khí toàn diện" }
  }, [title, description])
}
