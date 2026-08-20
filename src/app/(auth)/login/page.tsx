// TODO(fase 3): formulario de acceso.
//
// Usa `authClient.signIn.email(...)` de @/lib/auth-client. No hay registro
// abierto: las cuentas las da de alta el admin.

export default function PaginaLogin() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <p className="text-sm opacity-70">
        Andamiaje. El formulario de acceso llega en la fase 3.
      </p>
    </main>
  );
}
