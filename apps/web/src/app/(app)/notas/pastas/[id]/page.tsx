import { redirect } from 'next/navigation'

// `/notas/pastas/[id]` foi consolidado no navegador de pastas em `/notas?folder=<id>`.
export default async function PastaDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/notas?folder=${id}`)
}
