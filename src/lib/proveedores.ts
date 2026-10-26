// Proveedores de acceso externos. Google solo se activa si están sus dos variables en Hostinger
// (al guardar variables, Hostinger recompila y la pantalla de entrar muestra el botón).
export const googleActivo = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
