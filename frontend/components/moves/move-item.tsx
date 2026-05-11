import { formatCurrency } from "@/lib/utils";
import { TableCell, TableRow } from "../ui/table";
import { Move } from "@/types/move";
import { ArrowRight, ShoppingCart } from "lucide-react";

type Props = {
    move: Move;
};

export const MoveItem = ({ move }: Props) => {
    const typeLabel = move.type === 'in' ? 'Entrada' : 'Saída';
    const typeColor = move.type === 'in' ? "text-green-600" : "text-red-600";

    // Determina estilo visual para Origem e Destino
    const isTransfer = !!move.transferId;
    const isManualIn = !isTransfer && move.type === 'in';
    const isSale = !isTransfer && move.type === 'out' && move.description?.startsWith('VENDA');
    const isManualOut = !isTransfer && !isSale && move.type === 'out';

    return (
        <TableRow className="group">
            <TableCell className="text-sm whitespace-nowrap">
                {new Date(move.date || move.createdAt || '').toLocaleDateString('pt-BR')}
            </TableCell>
            <TableCell>
                <span className={`${typeColor} font-medium text-sm`}>
                    {typeLabel}
                </span>
                {isTransfer && (
                    <span className="ml-1.5 inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-medium">
                        Transf.
                    </span>
                )}
            </TableCell>
            <TableCell className="text-sm max-w-[200px] truncate font-medium">
                {move.productName || move.productId}
            </TableCell>
            <TableCell className="text-center font-mono text-sm">{move.quantity}</TableCell>
            <TableCell className="text-right font-mono text-sm">{formatCurrency(move.unitPrice)}</TableCell>
            <TableCell className="text-sm">
                <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-medium ${isManualIn || isTransfer ? 'text-green-600' : isSale ? 'text-blue-600' : 'text-amber-600'}`}>
                        {move.origin || '-'}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className={`text-xs font-medium ${isManualOut || isTransfer ? 'text-red-600' : isSale ? 'text-blue-600' : 'text-green-600'}`}>
                        {isSale ? `Consumidor: ${move.destination?.replace('Consumidor Final', '') || move.destination}` : (move.destination || '-')}
                    </span>
                    {isSale && (
                        <ShoppingCart className="h-3 w-3 text-blue-500 shrink-0 ml-1" title="Venda" />
                    )}
                </div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]" title={move.description || ''}>
                {move.description || '-'}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
                {move.userName || '-'}
            </TableCell>
        </TableRow>
    );
};
