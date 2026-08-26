import Link from "next/link";

/**
 * La figura de persona: tu cuenta, desde cualquier cabecera. Lleva a /cuenta;
 * sin sesion, /cuenta reenvia a /login?volver=/cuenta y se vuelve tras entrar.
 */
export function PersonaCuenta() {
  return (
    <Link
      href="/cuenta"
      aria-label="Tu cuenta"
      className="flex h-11 w-11 items-center justify-center rounded-full"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1.5-4 4-6 7-6s5.5 2 7 6" />
      </svg>
    </Link>
  );
}
