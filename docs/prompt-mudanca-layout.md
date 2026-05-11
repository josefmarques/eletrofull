Atenção, siga as instruções do prompt que vou passar agora, porém, se alguma configuração for inviável você pode alterar para a forma melhor recomendada, mas tome essa decisão apenas se a nova configuração for ruim: "Função: Especialista em UI/UX Design e Desenvolvedor Frontend Senior.
Objetivo: Refatorar a interface visual do sistema Eletrosil, aplicando rigorosamente um novo Design System personalizado em todas as páginas e componentes, substituindo o padrão visual anterior.
Contexto e Fonte da Verdade:
Leia o arquivo /home/zemarques/eletrosil/design-system.md. Este documento é a única fonte da verdade para cores, tipografia, bordas, sombras e espaçamentos a partir de agora. O estilo desejado é simples e minimalista.
Plano de Execução UI/UX:
    Configuração Global (Tailwind e CSS):
        Atualize os arquivos globals.css e tailwind.config.ts para mapear os tokens do Design System.
        Substitua as cores padrão do Shadcn pelas cores definidas no .md (ex: --background: 247 247 245 para #f7f7f5, --primary: 150 148 122 para #96947a, etc.).
        Atualize a variável de raio padrão (--radius) para 4px (0.25rem), conforme o --radius-sm do design system.
    Ajuste de Tema (Dark Mode):
        Como o Design System atual foi focado em Light Mode, gere variáveis equivalentes (em harmonia com a paleta terrosa) para o Dark Mode no globals.css, garantindo contraste adequado sem usar preto puro, ou desative o dark mode temporariamente caso a paleta não se adeque.
    Refatoração de Componentes (Shadcn UI):
        Botões (components/ui/button.tsx): Ajuste as variantes do Tailwind (default, secondary, outline, ghost) para que o comportamento de hover e focus respeite a tabela de variações do .md. Certifique-se de que a sombra e o arredondamento (rounded-sm) estejam aplicados.
        Inputs (components/ui/input.tsx): Aplique a borda sólida com a cor --secondary, cantos de 4px e o estado de focus com a cor --primary.
        Cards (components/ui/card.tsx): Garanta que o fundo seja branco no tema claro, com bordas de 8px (--radius-md), padding de 16px e a sombra --shadow-sm.
    Varredura e Aplicação nas Páginas:
        Analise todos os arquivos dentro de frontend/src/app/(painel)/ (incluindo Dashboard, PDV, Estoque, Vendas, etc.).
        Remova classes de estilo antigas (como rounded-xl ou bg-slate-50) que entrem em conflito com o novo Design System.
        Aplique a regra de layout máximo de 1200px usando containers centralizados onde aplicável (ex: max-w-7xl mx-auto).
Regras Estritas de Segurança (Guardrails):
    RESTRIÇÃO ABSOLUTA: Não altere, adicione ou remova nenhum arquivo dentro da pasta backend/.
    RESTRIÇÃO DE LÓGICA: Não remova ou altere propriedades de estado (React hooks), IDs, atributos data-testid, lógicas de formulário (onSubmit), ou gatilhos de eventos (onClick, onChange).
    Limite sua atuação estritamente à refatoração de classes do Tailwind (ex: className="...") e arquivos de estilização.
Requisito de Entrega:
O sistema deve rodar com a nova identidade visual terrosa/minimalista de forma homogênea. Nenhuma página deve apresentar componentes com bordas hiper-arredondadas ou cores que fujam da paleta definida no design-system.md "dockee