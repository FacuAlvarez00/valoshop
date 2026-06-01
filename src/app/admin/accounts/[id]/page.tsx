import { notFound } from "next/navigation";
import { getAccountById } from "@/lib/data";
import AdminAccountForm from "@/components/admin/AdminAccountForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditAccountPage({ params }: Props) {
  const { id } = await params;
  const account = getAccountById(id);
  if (!account) notFound();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Editar cuenta</h1>
        <p className="text-muted text-sm mt-1">{account.title}</p>
      </div>
      <AdminAccountForm account={account} />
    </div>
  );
}
