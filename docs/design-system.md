# Design System do projeto Eletrosil

## 1. Introdução
Esta é a página dashboard do sistema, simples e minimalista.

## 2. Tokens

### Paleta de Cores
```css
--text: #131311;
--background: #f7f7f5;
--primary: #96947a;
--secondary: #c4c2b0;
--accent: #b1ae91;
--success: #4caf50;
--warning: #ff9800;
--error: #f44336;
--info: #2196f3;
```

### Tipografia
```css
--font-heading: 'Inter', sans-serif;
--font-body: sans-serif;
--font-size-h1: 32px;
--font-size-h2: 24px;
--font-size-h3: 20px;
--font-size-body: 16px;
--font-size-small: 14px;
--font-size-xs: 12px;
--font-weight-bold: 700;
--font-weight-semibold: 600;
--font-weight-regular: 400;
--line-height-tight: 1.2;
--line-height-normal: 1.5;
```

### Espaçamento
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
```

### Sombras
```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
```

### Bordas
```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

## 3. Componentes

### Botão
- **Border-radius**: `--radius-sm` (4px)
- **Sombra**: `--shadow-sm` na parte inferior
- **Fonte**: `--font-body`
- **Transição**: 0.2s ease para hover e focus

#### Variações
| Variação  | Background       | Texto   | Hover Background  |
|-----------|------------------|---------|-------------------|
| Primary   | `--primary`      | white   | escurecer 10%     |
| Secondary | `--secondary`    | `--text`| escurecer 10%     |
| Outline   | transparent      | `--primary` | `--primary` (texto branco) |
| Ghost     | transparent      | `--text`| `--secondary`     |

#### Estados
- **Default**: conforme tabela acima
- **Hover**: escurecer background em 10%
- **Focus**: outline com `--accent`
- **Disabled**: opacidade 0.5, cursor not-allowed

#### Tamanhos
- **Pequeno**: padding `--space-xs` `--space-sm`, fonte `--font-size-small`
- **Médio**: padding `--space-sm` `--space-md`, fonte `--font-size-body`
- **Grande**: padding `--space-md` `--space-lg`, fonte `--font-size-h3`

### Input
- **Border**: 1px solid `--secondary`
- **Border-radius**: `--radius-sm`
- **Padding**: `--space-sm` `--space-md`
- **Fonte**: `--font-body`
- **Estados**: focus com border `--primary`, disabled com opacidade 0.5

### Card
- **Background**: white
- **Border-radius**: `--radius-md`
- **Sombra**: `--shadow-sm`
- **Padding**: `--space-md`

## 4. Padrões de Layout
- **Flexbox** e **CSS Grid** para layouts responsivos
- Largura máxima do conteúdo: 1200px
- Breakpoints sugeridos:
  - Mobile: até 768px
  - Tablet: 768px - 1024px
  - Desktop: acima de 1024px 