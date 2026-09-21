import { createBrowserRouter } from "react-router-dom"
import { AppLayout } from "@/components/app-layout"

export const router = createBrowserRouter([{ element: <AppLayout />, children: [
  { path: "/", lazy: async () => { const module = await import("@/pages/home-page"); return { Component: module.HomePage } } },
  { path: "/dich-vu", lazy: async () => { const module = await import("@/pages/services-page"); return { Component: module.ServicesPage } } },
  { path: "/du-an", lazy: async () => { const module = await import("@/pages/projects-page"); return { Component: module.ProjectsPage } } },
  { path: "/san-pham", lazy: async () => { const module = await import("@/pages/products-page"); return { Component: module.ProductsPage } } },
  { path: "*", lazy: async () => { const module = await import("@/pages/not-found-page"); return { Component: module.NotFoundPage } } },
]}])
