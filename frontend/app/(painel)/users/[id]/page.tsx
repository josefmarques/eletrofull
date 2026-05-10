import { PageTitle } from "@/components/page-title";
import { UserForm } from "@/components/users/user-form";
import { BackButton } from "@/components/back-button";
import { userService } from "@/services/user";
import { redirect } from "next/navigation";
import { User } from "@/types/user";

type Props = {
    params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
    const { id } = await params;
    const userRes = await userService.getUserById(id);
    const user = userRes.data as User | null;

    if (!user) {
        redirect('/users');
    }

    return (
        <div>
            <PageTitle 
                title="Editar Usuário" 
                leftSide={<BackButton fallbackUrl="/users" />} 
            />
            
            <UserForm user={user} />
        </div>
    );
}
