import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
    message: string;
    label: string;
    href: string;
}

export function EmptyState({ message, label, href }: Props) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <p className="mb-4">{message}</p>
            <Link href={href}>
                <Button>{label}</Button>
            </Link>
        </div>
    );
}
