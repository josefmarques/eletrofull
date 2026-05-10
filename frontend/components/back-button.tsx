"use client"

import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
    fallbackUrl: string;
}

export const BackButton = ({ fallbackUrl }: Props) => {
    const router = useRouter();

    const handleClick = () => {
        // We can't know for sure if the previous page is within our app or if it's the expected list page.
        // A simple router.back() is usually what "Back" buttons do in apps.
        // However, if the user landed directly on this page (e.g. from a link), back() might go to blank or external site.
        // For a robust "go back or go to list", checking history length is tricky in React/Next.
        // But usually router.back() is the desired behavior for preserving state of previous page.
        if (window.history.length > 2) {
             router.back();
        } else {
            router.push(fallbackUrl);
        }
    }

    return (
        <Button variant="ghost" onClick={handleClick}>
            <ArrowLeftIcon />
        </Button>
    );
}
