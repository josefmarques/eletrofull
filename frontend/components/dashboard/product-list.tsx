import { Product } from "@/types/product";
import { cn, formatCurrency } from "@/lib/utils";
import { AlertTriangle, DollarSign, TrendingDown } from "lucide-react";

interface ProductListProps {
    title: string;
    description: string;
    products: Product[];
    emptyMessage?: string;
}

export function ProductList({ title, description, products, emptyMessage = "Nenhum produto encontrado" }: ProductListProps) {
    const hasExtraFields = products.some(p => p.stockPct !== undefined || p.frozenMoney !== undefined);

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="p-6 pb-4">
                <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
            <div className="p-6 pt-0">
                {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <TrendingDown className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm">{emptyMessage}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {products.map((product, index) => (
                            <div
                                key={`${product.id}-${index}`}
                                className={cn(
                                    "flex items-center justify-between border-b pb-3 last:border-0 last:pb-0",
                                    product.stockPct !== undefined && product.stockPct <= 50 && "border-l-2 border-l-destructive pl-3",
                                    product.stockPct !== undefined && product.stockPct > 50 && "border-l-2 border-l-warning pl-3",
                                )}
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm truncate">{product.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                        <span>Qtd: <strong>{product.quantity}</strong> {product.unitType}</span>
                                        {product.minimumQuantity > 0 && (
                                            <span className="opacity-60">Min: {product.minimumQuantity}</span>
                                        )}
                                    </div>
                                    {product.stockPct !== undefined && (
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <div className="h-1.5 w-full max-w-[120px] bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all",
                                                        product.stockPct <= 25
                                                            ? "bg-destructive"
                                                            : product.stockPct <= 50
                                                                ? "bg-warning"
                                                                : "bg-success"
                                                    )}
                                                    style={{ width: `${Math.min(product.stockPct, 100)}%` }}
                                                />
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-mono",
                                                product.stockPct <= 25 ? "text-destructive font-semibold" : "text-muted-foreground"
                                            )}>
                                                {product.stockPct}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right shrink-0 ml-4">
                                    <p className="font-medium text-sm">{formatCurrency(product.unitPrice)}</p>
                                    {(product.moneyAtRisk !== undefined || product.frozenMoney !== undefined) && (
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                                            <DollarSign className="h-3 w-3" />
                                            Parado: {formatCurrency(product.moneyAtRisk ?? product.frozenMoney ?? 0)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Sumário financeiro */}
                        <div className="pt-2 border-t mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{products.length} {products.length === 1 ? 'produto' : 'produtos'}</span>
                            <span className="font-medium flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-warning" />
                                Total parado: {formatCurrency(
                                    products.reduce((acc, p) => acc + (p.moneyAtRisk ?? p.frozenMoney ?? 0), 0)
                                )}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export function ProductListSkeleton() {
    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="p-6 pb-4">
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-48 bg-muted animate-pulse rounded mt-1" />
            </div>
            <div className="p-6 pt-0 space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <div>
                            <div className="h-4 w-32 bg-muted animate-pulse rounded mb-1" />
                            <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                        </div>
                        <div className="text-right">
                            <div className="h-4 w-16 bg-muted animate-pulse rounded mb-1" />
                            <div className="h-3 w-14 bg-muted animate-pulse rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
