import { useEffect } from "react"

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = `${title} | Cơ khí Đăng Khoa`
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta) }
    meta.content = description
    return () => { document.title = "Cơ khí Đăng Khoa | Giải pháp cơ khí toàn diện" }
  }, [title, description])
}
