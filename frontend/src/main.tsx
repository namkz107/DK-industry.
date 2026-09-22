import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { router } from "@/router"
import "@/index.css"
import { AuthProvider } from "@/contexts/auth-context"

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, gcTime: 30 * 60_000 } } })

createRoot(document.getElementById("root")!).render(<StrictMode><QueryClientProvider client={queryClient}><AuthProvider><RouterProvider router={router}/></AuthProvider></QueryClientProvider></StrictMode>)
