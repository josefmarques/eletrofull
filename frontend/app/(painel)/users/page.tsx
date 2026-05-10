import { Pagination } from "@/components/pagination";
import { PageTitle } from "@/components/page-title";
import { UserItem } from "@/components/users/user-item";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { userService } from "@/services/user";
import { User } from "@/types/user";
import Link from "next/link";

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const LIMIT = 10;

export default async function Page({ searchParams }: Props) {
    const params = await searchParams;
    const tab = typeof params.tab === 'string' ? params.tab : 'active';
    const page = typeof params.page === 'string' ? parseInt(params.page) : 1;
    const offset = (page - 1) * LIMIT;
    const includeInactive = tab === 'inactive';

    // Busca dados em paralelo: ativos + inativos (para contagem nas abas)
    const [usersRes, inactiveCountRes] = await Promise.all([
        userService.getUsers(offset, LIMIT + 1, includeInactive),
        includeInactive
            ? Promise.resolve({ data: null }) // já temos os dados
            : userService.getUsers(0, 1, true), // só pra saber se tem inativos
    ]);

    const allFetchedUsers = (usersRes.data as User[]) || [];
    const hasMore = allFetchedUsers.length > LIMIT;
    const users = hasMore ? allFetchedUsers.slice(0, LIMIT) : allFetchedUsers;
    const count = hasMore ? (page * LIMIT) + 1 : (page - 1) * LIMIT + users.length;

    const inactiveCountData = (inactiveCountRes?.data as User[]) || [];
    const hasInactive = inactiveCountData.length > 0 || tab === 'inactive';

    return (
        <div>
            <PageTitle
                title="Usuários"
                rightSide={
                    <Link href="/users/add">
                        <Button>Novo Usuário</Button>
                    </Link>
                }
            />

            <Tabs value={tab}>
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="active" asChild>
                            <Link href="/users?tab=active" scroll={false}>
                                Ativos
                                {!hasInactive && (
                                    <span className="ml-1.5 text-xs text-muted-foreground">
                                        ({users.length})
                                    </span>
                                )}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="inactive" asChild>
                            <Link href="/users?tab=inactive" scroll={false}>
                                Inativos (Bloqueados)
                                {hasInactive && (
                                    <span className="ml-1.5 text-xs text-muted-foreground">
                                        ({inactiveCountData.length > 0 ? '...' : '0'})
                                    </span>
                                )}
                        </Link>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="active">
                    {users.length === 0 ? (
                        <EmptyState
                            message="Nenhum usuário ativo cadastrado."
                            label="Novo Usuário"
                            href="/users/add"
                        />
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Função</TableHead>
                                        <TableHead className="w-[180px]">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((item) => (
                                        <UserItem key={item.id} user={item} />
                                    ))}
                                </TableBody>
                            </Table>

                            <Pagination limit={LIMIT} count={count} />
                        </>
                    )}
                </TabsContent>

                <TabsContent value="inactive">
                    {users.length === 0 ? (
                        <EmptyState
                            message="Nenhum usuário inativo."
                            label="Ver Ativos"
                            href="/users"
                        />
                    ) : (
                        <>
                            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-3 mb-4">
                                <p className="text-sm text-amber-800 dark:text-amber-300">
                                    ⚠️ Usuários inativos não podem fazer login. Use o botão "Reativar" para restaurar o acesso.
                                </p>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Função</TableHead>
                                        <TableHead className="w-[180px]">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((item) => (
                                        <UserItem key={item.id} user={item} />
                                    ))}
                                </TableBody>
                            </Table>

                            <Pagination limit={LIMIT} count={count} />
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
