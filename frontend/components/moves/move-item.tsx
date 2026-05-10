import { formatCurrency } from "@/lib/utils";
import { TableCell, TableRow } from "../ui/table";
import { Move } from "@/types/move";

type Props = {
    move: Move;
};

export const MoveItem = ({ move }: Props) => {
    return (
        <TableRow>
            <TableCell>{new Date(move.date || move.createdAt || '').toLocaleDateString('pt-BR')}</TableCell>
            <TableCell>
                <span className={move.type === 'in' ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {move.type === 'in' ? 'Entrada' : 'Saída'}
                </span>
            </TableCell>
            <TableCell>{move.productName || move.productId}</TableCell>
            <TableCell>{move.quantity}</TableCell>
            <TableCell>{formatCurrency(move.unitPrice)}</TableCell>
        </TableRow>
    );
};
