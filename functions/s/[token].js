// Oriente One v1.2.0 | Página do sponsor com QR Codes (/s/:token)
export const onRequestGet = ({ request, env }) => env.ASSETS.fetch(new URL('/sponsor', request.url));
