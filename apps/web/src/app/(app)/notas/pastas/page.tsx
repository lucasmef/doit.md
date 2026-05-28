import { redirect } from 'next/navigation'

// `/notas/pastas` foi consolidado no navegador de pastas em `/notas`.
export default function PastasIndexRedirect() {
  redirect('/notas')
}
