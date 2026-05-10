import { PageTitle } from "@/components/page-title";
import { UserForm } from "@/components/users/user-form";
import { BackButton } from "@/components/back-button";

export default function Page() {
    return (
        <div>
            <PageTitle 
                title="Novo Usuário" 
                leftSide={<BackButton fallbackUrl="/users" />} 
            />
            
            <UserForm />
        </div>
    );
}
