"use client"

import { Edit, User as UserIcon, Store, Ban, CheckCircle2 } from "lucide-react";
import type { User } from "@/types/user";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { TableCell, TableRow } from "../ui/table";
import Link from "next/link";
import { toggleUserStatusAction } from "@/actions/user";
import { useState } from "react";

type Props = {
	user: User;
};

const ROLE_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
	admin: { label: "Admin Global", variant: "destructive" },
	manager: { label: "Gerente", variant: "default" },
	operator: { label: "Operador", variant: "secondary" },
};

export const UserItem = ({ user }: Props) => {
	const [isToggling, setIsToggling] = useState(false);
	const roleInfo = ROLE_MAP[user.role] || ROLE_MAP.operator;
	const isActive = user.isActive;

	const handleToggleStatus = async () => {
		if (isToggling) return;

		const actionLabel = isActive ? "desativar" : "reativar";
		const confirmed = window.confirm(
			`Tem certeza que deseja ${actionLabel} o usuário "${user.name}"?`
		);
		if (!confirmed) return;

		setIsToggling(true);
		const result = await toggleUserStatusAction(user.id);

		if (result.error) {
			alert(result.error);
		}
		setIsToggling(false);
	};

	return (
		<TableRow className={!isActive ? "opacity-70 bg-muted/20" : ""}>
			<TableCell>
				<div className="flex items-center gap-2">
					{user.avatar ? (
						<img
							src={user.avatar}
							alt={user.name}
							className="size-6 rounded-full object-cover"
						/>
					) : (
						<UserIcon className="size-6" />
					)}
					<span className={!isActive ? "line-through text-muted-foreground" : ""}>
						{user.name}
					</span>
				</div>
			</TableCell>
			<TableCell>{user.email}</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<Badge variant={roleInfo.variant}>
						{roleInfo.label}
					</Badge>
					{user.branchName && (
						<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
							<Store className="size-3" />
							{user.branchName}
						</span>
					)}
				</div>
			</TableCell>
			<TableCell className="flex items-center gap-2">
				<Link href={`/users/${user.id}`}>
					<Button size="sm" variant="outline">
						<Edit className="size-4" />
					</Button>
				</Link>

				{isActive ? (
					<Button
						size="sm"
						variant="outline"
						onClick={handleToggleStatus}
						disabled={isToggling}
						className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900"
					>
						<Ban className="size-4" />
						<span className="hidden sm:inline ml-1">Desativar</span>
					</Button>
				) : (
					<Button
						size="sm"
						variant="outline"
						onClick={handleToggleStatus}
						disabled={isToggling}
						className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
					>
						<CheckCircle2 className="size-4" />
						<span className="hidden sm:inline ml-1">Reativar</span>
					</Button>
				)}
			</TableCell>
		</TableRow>
	);
};
