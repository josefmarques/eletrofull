"use client"

import { SearchIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "../ui/button";

export const ProductSearch = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [term, setTerm] = useState(searchParams.get("name")?.toString() || "");

    const handleSearch = () => {
        const params = new URLSearchParams(searchParams.toString());
        if (term) {
            params.set("name", term);
            params.delete("page"); // Reset pagination on search
        } else {
            params.delete("name");
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    return (
        <div className="border rounded-md p-4 mb-4 max-w-xl flex items-center gap-4">
            <InputGroup>
                <InputGroupInput
                    type="search"
                    placeholder="Pesquise um produto"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <InputGroupAddon>
                    <SearchIcon />
                </InputGroupAddon>
            </InputGroup>
            <Button variant="outline" onClick={handleSearch}>
                Buscar
            </Button>
        </div>
    );
}
