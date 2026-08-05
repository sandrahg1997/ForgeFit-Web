import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"ForgeFit", description:"Entrenamiento, progreso y récords", manifest:"/manifest.webmanifest", icons:{icon:[{ url:"/icon-192.png", sizes:"192x192", type:"image/png" },{ url:"/icon-512.png", sizes:"512x512", type:"image/png" }], apple:"/apple-touch-icon.png"} };
export const viewport: Viewport = { themeColor:"#0b1120", colorScheme:"dark" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="es"><body>{children}</body></html>; }
