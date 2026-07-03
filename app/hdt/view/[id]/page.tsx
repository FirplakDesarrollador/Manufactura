import HdtForm from '@/components/hdt/HdtForm'

interface ViewHdtPageProps {
    params: Promise<{ id: string }>
}

export default async function ViewHdtPage({ params }: ViewHdtPageProps) {
    const { id } = await params
    return <HdtForm mode="view" hdtId={id} />
}
