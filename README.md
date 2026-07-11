# Simplicio Canvas

MVP de programação visual por peças arquiteturais. Abra uma pasta local no navegador: o conteúdo textual é lido **somente na memória do browser**, as linguagens são detectadas, imports são extraídos e as relações internas/externas são renderizadas em Three.js. Nenhum arquivo é enviado.

## Demonstração

1. Execute `npm run dev` e abra a URL local.
2. Clique em **Abrir projeto** e escolha uma pasta.
3. Aguarde a análise; a barra inferior mostrará arquivos, imports, linguagens e itens ignorados.
4. Clique em uma peça para ver linguagem, linhas, tamanho, imports, pacotes externos e importadores reversos.

O analisador browser reconhece TypeScript/JavaScript, Python, Rust, Go, C#, Java/Kotlin e dezenas de extensões de configuração, frontend e documentação. Ele ignora `.git`, `node_modules`, ambientes virtuais, builds, binários e arquivos textuais acima de 1 MB.

## Enriquecimento com simplicio-mapper

Para projetos reais, o `simplicio-mapper` pode acrescentar símbolos, call graph e fluxos que regexes no browser não enxergam. Gere ou atualize o mapa fora do projeto que está sendo visualizado:

```bash
simplicio-mapper scan /caminho/do/projeto --sync --await --json
simplicio-mapper inspect /caminho/do/projeto --json
```

Na interface, use **Importar mapa** e selecione um artefato JSON produzido em `.simplicio/`. O MVP atual extrai os caminhos do artefato; a próxima etapa é consumir integralmente os contratos versionados de símbolos, chamadas e fluxos do mapper.

## Gramática das peças

Cada peça combina duas dimensões: **cor = camada** e **encaixe = contrato**. Presentation (coral) emite comandos; Application (âmbar) orquestra casos de uso; Domain (verde) preserva regras; Infrastructure (azul) adapta o mundo externo; Tests (violeta) produzem evidência; Docs (marfim) registram intenção; Config (cinza) monta políticas. A aba direita é a saída fornecida e a cavidade esquerda é a entrada requerida.

```bash
npm install
npm run dev
```
