"use client"

import { Edit } from "lucide-react";
import type { Product } from "@/types/product";
import { Button } from "../ui/button";
import { TableCell, TableRow } from "../ui/table";
import Link from "next/link";
import { deleteProductAction } from "@/actions/product";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

type Props = {
	product: Product;
};

export const ProductItem = ({ product }: Props) => {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		const result = await deleteProductAction(product.id);

		if (result.error) {
			alert(result.error);
		}
		setIsDeleting(false);
	};

	return (
		<TableRow>
			<TableCell>{product.name}</TableCell>
			<TableCell className="hidden lg:block">{product.categoryName || "Sem categoria"}</TableCell>
			<TableCell>{formatCurrency(product.unitPrice)}</TableCell>
			<TableCell>
				{product.quantity ?? 0} {product.unitType}
			</TableCell>
			<TableCell className="flex products-center gap-2">
				<Link href={`/products/${product.id}`}>
					<Button>
						<Edit />
					</Button>
				</Link>

				<ConfirmDeleteDialog
					name={product.name}
					onConfirm={handleDelete}
					isDeleting={isDeleting}
				/>
			</TableCell>
		</TableRow>
	);
};
