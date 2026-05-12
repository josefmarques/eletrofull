"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { cashSessionService } from "@/services/cash-session";
import { branchClientService } from "@/services/branch-client";
import { getClientApi } from "@/lib/client-api";
import {
  Loader2, Lock, Unlock, Plus, Minus, DollarSign,
  ArrowUpRight, ArrowDownRight, FileText, CheckCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

type Movement = {
  id: string; type: string; amount: number;
  description: string | null; createdAt: string;
};

export default function CaixaPage() {
  const { addToast } = useToast();
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("0.00");
  const [closingBalance, setClosingBalance] = useState("");
  const [closeObservations, setCloseObservations] = useState("");
  const [report, setReport] = useState<any>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [movementAmount, setMovementAmount] = useState("");
  const [movementDesc, setMovementDesc] = useState("");
  const [showMovementModal, setShowMovementModal] = useState<"withdrawal" | "deposit" | null>(null);

  const getUserId = async () => {
    const api = getClientApi();
    const r = await api.get("/auth/me");
    return r.data?.data;
  };

  useEffect(() => {
    branchClientService.getBranches().then((res) => {
      setBranches(res?.data || []);
      getUserId().then((u) => {
        if (u?.branchId) setSelectedBranchId(u.branchId);
        else if (res?.data?.[0]) setSelectedBranchId(res.data[0].id);
      });
    });
  }, []);

  const fetchSession = async (showLoader: boolean = true) => {
    if (!selectedBranchId) return;
    if (showLoader) setLoading(true);
    const res = await cashSessionService.getCurrentSession(selectedBranchId);
    if (res?.data) {
      setSession(res.data);
      setReport(null);
      setMovements([]);
    } else {
      setSession(null);
    }
    if (showLoader) setLoading(false);
  };

  const refreshSession = () => fetchSession(false);

  // Nome da unidade para o titulo dinamico
  const caixaBranchName = selectedBranchId
    ? branches.find((b) => b.id === selectedBranchId)?.name || "Unidade nao encontrada"
    : "Selecione uma unidade";

  useEffect(() => {
    if (selectedBranchId) fetchSession();
  }, [selectedBranchId]);

  const handleOpen = async () => {
    const res = await cashSessionService.openSession(selectedBranchId, openingBalance);
    if (res.error) {
      addToast({ title: "Erro", description: res.error, type: "error" });
    } else {
      addToast({ title: "Caixa aberto!", description: `Saldo inicial: R$ ${openingBalance}`, type: "success" });
      refreshSession();
    }
  };

  const handleMovement = async () => {
    if (!session || !showMovementModal || !movementAmount) return;
    const fn = showMovementModal === "withdrawal"
      ? cashSessionService.addWithdrawal
      : cashSessionService.addDeposit;
    const label = showMovementModal === "withdrawal" ? "Sangria" : "Aporte";
    const res = await fn(session.id, movementAmount, movementDesc || undefined);
    if (res.error) {
      addToast({ title: "Erro", description: res.error, type: "error" });
    } else {
      addToast({ title: `${label} registrada`, description: `R$ ${movementAmount}`, type: "success" });
      setMovementAmount("");
      setMovementDesc("");
      setShowMovementModal(null);

      refreshSession();
    }
  };

  const handleClose = async () => {
    if (!session || !closingBalance) return;
    const res = await cashSessionService.closeSession(session.id, closingBalance, closeObservations || undefined);
    if (res.error) {
      addToast({ title: "Erro", description: res.error, type: "error" });
    } else {
      addToast({ title: "Caixa fechado!", type: "success" });
      const reportRes = await cashSessionService.getSessionReport(session.id);
      if (reportRes?.data) setReport(reportRes.data);
      setSession(null);
    }
  };

  const numeric = (v: any) => Number(v) || 0;
  const fmt = (v: number) => v.toFixed(2);

  if (report) {
    const s = report.session;
    const diff = numeric(report.difference);
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <PageTitle title="Relatório de Fechamento" />

        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-5 w-5 text-blue-500" /> Caixa Fechado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Abertura</p><p className="font-medium">{new Date(s.openedAt).toLocaleString("pt-BR")}</p></div>
              <div><p className="text-muted-foreground">Fechamento</p><p className="font-medium">{s.closedAt ? new Date(s.closedAt).toLocaleString("pt-BR") : "—"}</p></div>
            </div>
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between"><span>Saldo Inicial</span><span>R$ {fmt(numeric(s.openingBalance))}</span></div>
              <div className="flex justify-between text-green-600"><span>+ Vendas</span><span>R$ {fmt(numeric(s.totalSales))}</span></div>
              <div className="flex justify-between text-green-500"><span>+ Aportes</span><span>R$ {fmt(numeric(s.totalDeposits))}</span></div>
              <div className="flex justify-between text-red-500"><span>− Sangrias</span><span>R$ {fmt(numeric(s.totalWithdrawals))}</span></div>
              <div className="flex justify-between font-bold border-t pt-2"><span>Saldo Esperado</span><span>R$ {fmt(numeric(report.expectedBalance))}</span></div>
              <div className="flex justify-between"><span>Saldo Informado</span><span>R$ {fmt(numeric(s.closingBalance))}</span></div>
            </div>
            <div className={`border-t pt-3 ${diff === 0 ? "text-green-600" : diff > 0 ? "text-red-500" : "text-yellow-500"}`}>
              <div className="flex justify-between text-lg font-bold">
                <span>{diff === 0 ? "Caixa Fechado" : diff > 0 ? "Quebra (Falta)" : "Quebra (Sobra)"}</span>
                <span>R$ {fmt(Math.abs(diff))}</span>
              </div>
            </div>
            {s.observations && <p className="text-sm text-muted-foreground border-t pt-2">Obs: {s.observations}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Movimentos do Turno</CardTitle></CardHeader>
          <CardContent className="p-0">
            {(!report.movements || report.movements.length === 0) ? (
              <p className="text-center py-4 text-muted-foreground">Nenhum movimento registrado.</p>
            ) : (
              <div className="divide-y">
                {report.movements.map((m: Movement) => (
                  <div key={m.id} className="flex items-center justify-between p-3 text-sm">
                    <div className="flex items-center gap-2">
                      {m.type === "withdrawal" ? (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      ) : m.type === "deposit" ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <DollarSign className="h-4 w-4 text-blue-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          {m.type === "withdrawal" ? "Sangria" : m.type === "deposit" ? "Aporte" : "Venda"}
                        </p>
                        {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                      </div>
                    </div>
                    <span className={`font-semibold ${m.type === "withdrawal" ? "text-red-500" : "text-green-600"}`}>
                      {m.type === "withdrawal" ? "-" : "+"}R$ {m.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => setReport(null)}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageTitle title={`Controle de Caixa - ${caixaBranchName}`} />

      <Card>
        <CardHeader><CardTitle className="text-base">Selecionar Unidade</CardTitle></CardHeader>
        <CardContent>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            <option value="">Selecione uma unidade</option>
            {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>
        </CardContent>
      </Card>

      {loading && <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Carregando...</div>}

      {!loading && !session && selectedBranchId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Unlock className="h-5 w-5 text-green-500" /> Caixa Fechado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Saldo Inicial (R$)</label>
              <Input type="number" step="0.01" value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)} />
            </div>
            <Button onClick={handleOpen} className="w-full"><Unlock className="mr-2 h-4 w-4" /> Abrir Caixa</Button>
          </CardContent>
        </Card>
      )}

      {!loading && session && (() => {
        const pt = session.paymentTotals || {};
        const totalVendasReal = Object.values(pt).reduce((a: any, b: any) => Number(a) + Number(b), 0);
        const totalDinheiro = numeric(pt.cash);

        return (
        <>
          {/* Dashboard */}
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-green-700">
                <Lock className="h-5 w-5" /> Sessão Ativa
                <Badge variant="outline" className="ml-auto text-xs">Aberto desde {new Date(session.openedAt).toLocaleTimeString("pt-BR")}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-muted-foreground text-xs">Saldo Inicial</p>
                  <p className="font-bold text-lg">R$ {fmt(numeric(session.openingBalance))}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-muted-foreground text-xs">Vendas</p>

                  <p className="font-bold text-lg text-green-600">R$ {fmt(totalVendasReal)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-muted-foreground text-xs">Sangrias</p>
                  <p className="font-bold text-lg text-red-500">R$ {fmt(numeric(session.totalWithdrawals))}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-muted-foreground text-xs">Aportes</p>
                  <p className="font-bold text-lg text-green-500">R$ {fmt(numeric(session.totalDeposits))}</p>
                </div>
              </div>
              <div className="mt-4 bg-white rounded-lg p-4 border flex justify-between items-center">
                <span className="text-muted-foreground">Saldo Atual (esperado)</span>
                <span className="text-2xl font-bold">

                  R$ {fmt(numeric(session.openingBalance) + totalDinheiro + numeric(session.totalDeposits) - numeric(session.totalWithdrawals))}
                </span>
              </div>
            </CardContent>
          </Card>

              {/* Composição das Vendas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-blue-500" /> Composição das Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const pt = session.paymentTotals || {};
                  const methods = [
                    { key: "cash", label: "Dinheiro", color: "text-green-600" },
                    { key: "pix", label: "PIX", color: "text-blue-600" },
                    { key: "credit_card", label: "Cartão de Crédito", color: "text-purple-600" },
                    { key: "debit_card", label: "Cartão de Débito", color: "text-orange-600" },
                  ];
                  return methods.map(({ key, label, color }) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className={`font-semibold ${color}`}>
                        R$ {fmt(numeric(pt[key]))}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Minus className="h-4 w-4 text-red-500" /> Sangria</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Retirada de dinheiro do caixa (ex: pagamento de despesa)</p>
                <Button variant="outline" className="w-full text-red-500" onClick={() => setShowMovementModal("withdrawal")}>
                  <ArrowDownRight className="mr-2 h-4 w-4" /> Nova Sangria
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Plus className="h-4 w-4 text-green-500" /> Aporte</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Reforço de troco ou entrada extra de dinheiro</p>
                <Button variant="outline" className="w-full text-green-500" onClick={() => setShowMovementModal("deposit")}>
                  <ArrowUpRight className="mr-2 h-4 w-4" /> Novo Aporte
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Fechamento */}
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" /> Fechamento de Turno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-medium">Instruções</p>
                <p className="text-xs mt-1">Conte o dinheiro físico na gaveta e informe o valor abaixo. O sistema calculará a diferença.</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Saldo Final (contagem física) *</label>
                <Input type="number" step="0.01" value={closingBalance}
                  onChange={(e) => setClosingBalance(e.target.value)}
                  placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Observações</label>
                <Input type="text" value={closeObservations}
                  onChange={(e) => setCloseObservations(e.target.value)}
                  placeholder="Ex: diferença por pagamento de motoboy" />
              </div>
              <Button onClick={handleClose} className="w-full" variant="secondary" disabled={!closingBalance}>
                <Lock className="mr-2 h-4 w-4" /> Fechar Caixa e Gerar Relatório
              </Button>
            </CardContent>
          </Card>
        </>
      );
      })()}

      {/* Modal de Sangria/Aporte */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setShowMovementModal(null)}>
          <div className="bg-background rounded-lg border shadow-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-4">
              {showMovementModal === "withdrawal" ? "Nova Sangria" : "Novo Aporte"}
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Valor (R$) *</label>
                <Input type="number" step="0.01" value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)} placeholder="0.00" autoFocus />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Descrição</label>
                <Input type="text" value={movementDesc}
                  onChange={(e) => setMovementDesc(e.target.value)}
                  placeholder={showMovementModal === "withdrawal" ? "Ex: Pagamento motoboy" : "Ex: Reforço de troco"} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowMovementModal(null)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleMovement} disabled={!movementAmount}>
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
