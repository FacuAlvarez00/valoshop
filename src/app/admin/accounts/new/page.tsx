import AdminAccountForm from "@/components/admin/AdminAccountForm";

export default function NewAccountPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Nueva cuenta</h1>
        <p className="text-muted text-sm mt-1">
          Creá una cuenta ficticia con los skins de la Valorant API
        </p>
      </div>
      <AdminAccountForm />
    </div>
  );
}
