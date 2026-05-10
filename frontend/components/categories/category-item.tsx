"use client"

import { Edit } from "lucide-react";
import type { Category } from "@/types/category";
import { Button } from "../ui/button";
import { TableCell, TableRow } from "../ui/table";
import Link from "next/link";
import { deleteCategoryAction } from "@/actions/category";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

type Props = {
	category: Category;
};

export const CategoryItem = ({ category }: Props) => {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		const result = await deleteCategoryAction(category.id);

		if (result.error) {
			alert(result.error);
		}
		setIsDeleting(false);
	};

	return (
		<TableRow>
			<TableCell>{category.name}</TableCell>
			<TableCell>{category.productCount ?? 0} produto{category.productCount !== 1 ? 's' : ''}</TableCell>
			<TableCell className="flex items-center gap-2">
				<Link href={`/categories/${category.id}`}>
					<Button>
						<Edit />
					</Button>
				</Link>

				<ConfirmDeleteDialog
					name={category.name}
					onConfirm={handleDelete}
					isDeleting={isDeleting}
					disabled={(category.productCount ?? 0) > 0}
				/>
			</TableCell>
		</TableRow>
	);
};
