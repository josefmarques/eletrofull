"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
    limit: number;
    count: number;
}

export const Pagination = ({ limit, count }: Props) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const page = parseInt(searchParams.get("page") || "1");

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex justify-end gap-2 mt-4">
            <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
            >
                Anterior
            </Button>
            <Button
                variant="outline"
                disabled={page * limit >= count}
                onClick={() => handlePageChange(page + 1)}
            >
                Próximo
            </Button>
        </div>
    );
}
