import { useIsFetching, useIsMutating } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { useNavigation } from "react-router-dom"

const logoUrl = import.meta.env.VITE_CLOUDINARY_LOGO_URL
  || "https://res.cloudinary.com/dgbounqav/image/upload/f_auto,q_auto/logo_dk_uhmnyn"

const SHOW_DELAY = 180
const MINIMUM_VISIBLE_TIME = 400

function LoadingArtwork({ visible = true }: { visible?: boolean }) {
  return <div
    className={`global-loading${visible ? " global-loading--visible" : ""}`}
    aria-hidden={!visible}
  >
    <div className="global-loading__content" role="status" aria-live="polite">
      <div className="global-loading__mark">
        <span className="global-loading__ring" aria-hidden="true" />
        <img src={logoUrl} alt="" />
      </div>
      <p>Đang tải...</p>
      <span className="sr-only">Vui lòng chờ, nội dung đang được tải.</span>
    </div>
  </div>
}

export function GlobalLoading() {
  const navigation = useNavigation()
  const initialQueries = useIsFetching({
    predicate: query => query.state.data === undefined,
  })
  const mutations = useIsMutating()
  const loading = navigation.state !== "idle" || initialQueries > 0 || mutations > 0
  const [visible, setVisible] = useState(false)
  const shownAt = useRef(0)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    if (loading && !visible) {
      timer = setTimeout(() => {
        shownAt.current = Date.now()
        setVisible(true)
      }, SHOW_DELAY)
    } else if (!loading && visible) {
      const remaining = Math.max(0, MINIMUM_VISIBLE_TIME - (Date.now() - shownAt.current))
      timer = setTimeout(() => setVisible(false), remaining)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [loading, visible])

  useEffect(() => {
    document.body.setAttribute("aria-busy", String(visible))
    return () => document.body.removeAttribute("aria-busy")
  }, [visible])

  return <LoadingArtwork visible={visible} />
}
