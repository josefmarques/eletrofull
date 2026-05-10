import { ArrowUpRightIcon, FolderCode, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import Link from "next/link";

export function EmptyProducts() {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Inbox />
				</EmptyMedia>
				<EmptyTitle>Nenhum produto encontrado</EmptyTitle>
			</EmptyHeader>
			<EmptyContent>
				<div className="flex gap-2">
					<Link href="/products/add">
						<Button>Novo Produto</Button>
					</Link>
				</div>
			</EmptyContent>
		</Empty>
	);
}
