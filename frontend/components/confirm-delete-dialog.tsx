"use client"

import { Delete } from "lucide-react"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Props = {
    name: string;
    onConfirm: () => void;
    isDeleting: boolean;
    disabled?: boolean;
}

export function ConfirmDeleteDialog({ name, onConfirm, isDeleting, disabled }: Props) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="destructive" disabled={disabled}>
                    <Delete />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tem certeza?</DialogTitle>
                    <DialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente "{name}".
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
                            {isDeleting ? "Excluindo..." : "Excluir"}
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
