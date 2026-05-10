import { TableCell, TableRow } from "@/components/ui/table";

export function MoveItemSkeleton() {
    return (
        <TableRow>
            <TableCell>
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </TableCell>
            <TableCell>
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            </TableCell>
            <TableCell>
                <div className="h-4 w-48 bg-muted animate-pulse rounded" />
            </TableCell>
            <TableCell>
                <div className="h-4 w-12 bg-muted animate-pulse rounded mx-auto" />
            </TableCell>
            <TableCell>
                <div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" />
            </TableCell>
        </TableRow>
    );
}
