"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useEffect, useState, Suspense } from "react"

type Branch = { id: string; name: string };

type Props = {
  isAdmin?: boolean;
  branches?: Branch[];
}

function FilterContent({ isAdmin = false, branches = [] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedBranch, setSelectedBranch] = useState("all");

  useEffect(() => {
    const branch = searchParams.get("branch");
    setSelectedBranch(branch || "all");
  }, [searchParams]);

  const onBranchChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("branch");
    } else {
      params.set("branch", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const currentPeriod = searchParams.get("period") || "7";
  const onPeriodChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-4">
      {isAdmin && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">Loja:</span>
          <Select value={selectedBranch} onValueChange={onBranchChange}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Rede Completa (Todas)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Rede Completa (Todas)</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">Período:</span>
        <Select value={currentPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[150px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function DashboardFilter(props: Props) {
  return (
    <Suspense fallback={<div className="h-10 w-32 bg-muted animate-pulse rounded" />}>
      <FilterContent {...props} />
    </Suspense>
  );
}