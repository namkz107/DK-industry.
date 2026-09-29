import { useEffect } from "react"

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const fullTitle = `${title} | Cơ khí Đăng Khoa`
    document.title = fullTitle
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta) }
    meta.content = description
    const setProperty = (property: string, content: string) => {
      let element = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
      if (!element) { element = document.createElement("meta"); element.setAttribute("property", property); document.head.appendChild(element) }
      element.content = content
    }
    setProperty("og:title", fullTitle)
    setProperty("og:description", description)
    const siteUrl = String(import.meta.env.VITE_SITE_URL || "").replace(/\/$/, "")
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (siteUrl) {
      if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical) }
      canonical.href = `${siteUrl}${window.location.pathname}`
      setProperty("og:url", canonical.href)
    } else canonical?.remove()
    return () => { document.title = "Cơ khí Đăng Khoa | Giải pháp cơ khí toàn diện" }
  }, [title, description])
}
